"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Site {
  id: string;
  domain: string;
}

interface GscMetric {
  time: string;
  page_url: string;
  keyword: string | null;
  clicks: number;
  impressions: number;
  position: number | null;
  ctr: number | null;
}

interface KeywordRow {
  keyword: string;
  page_url: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  trend: "up" | "down" | "stable" | "new";
}

const PAGE_SIZE = 20;

export default function PositionTrackingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [metrics, setMetrics] = useState<GscMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"position" | "clicks" | "impressions">("position");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const fetchSites = async () => {
      try {
        const data: Site[] = await apiFetch("/sites/");
        setSites(data);
        if (data.length > 0) setSelectedSiteId(data[0].id);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [router]);

  useEffect(() => {
    if (!selectedSiteId) return;

    const fetchMetrics = async () => {
      setMetricsLoading(true);
      setError("");
      try {
        const data: GscMetric[] = await apiFetch(
          `/analytics/sites/${selectedSiteId}/gsc?limit=5000`
        );
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
        setMetrics([]);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedSiteId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, selectedSiteId]);

  const keywordRows: KeywordRow[] = useMemo(() => {
    const map = new Map<
      string,
      {
        keyword: string;
        page_url: string;
        positions: number[];
        clicks: number;
        impressions: number;
        lastPosition: number;
      }
    >();

    for (const m of metrics) {
      if (!m.keyword) continue;
      const key = m.keyword.toLowerCase();
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          keyword: m.keyword,
          page_url: m.page_url,
          positions: m.position ? [m.position] : [],
          clicks: m.clicks || 0,
          impressions: m.impressions || 0,
          lastPosition: m.position || 0,
        });
      } else {
        existing.clicks += m.clicks || 0;
        existing.impressions += m.impressions || 0;
        if (m.position) {
          existing.positions.push(m.position);
          existing.lastPosition = m.position;
        }
      }
    }

    return Array.from(map.values()).map((item) => {
      const avgPos =
        item.positions.length > 0
          ? item.positions.reduce((a, b) => a + b, 0) / item.positions.length
          : item.lastPosition;

      let trend: KeywordRow["trend"] = "stable";
      if (item.positions.length >= 2) {
        const first = item.positions[0];
        const last = item.positions[item.positions.length - 1];
        if (last < first - 0.5) trend = "up";
        else if (last > first + 0.5) trend = "down";
      } else {
        trend = "new";
      }

      return {
        keyword: item.keyword,
        page_url: item.page_url,
        position: Number(avgPos.toFixed(1)),
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
        trend,
      };
    });
  }, [metrics]);

  const filtered = useMemo(() => {
    let rows = [...keywordRows];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.keyword.toLowerCase().includes(q) ||
          r.page_url.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      if (sortBy === "position") return a.position - b.position;
      if (sortBy === "clicks") return b.clicks - a.clicks;
      return b.impressions - a.impressions;
    });

    return rows;
  }, [keywordRows, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const top3 = keywordRows.filter((r) => r.position > 0 && r.position <= 3).length;
    const top10 = keywordRows.filter((r) => r.position > 0 && r.position <= 10).length;
    const top20 = keywordRows.filter((r) => r.position > 0 && r.position <= 20).length;
    const top100 = keywordRows.filter((r) => r.position > 0 && r.position <= 100).length;
    return { top3, top10, top20, top100, total: keywordRows.length };
  }, [keywordRows]);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 7) pages.push(i);
      else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2)
        pages.push(i);
    }
    return pages;
  }, [totalPages, currentPage]);

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Position Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suivi des positions dans le temps · Top 3 / 10 / 20 / 100 · Tendances
          </p>
        </div>

        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-w-[220px]"
        >
          {sites.length === 0 && <option value="">No sites</option>}
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.domain}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {sites.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-10 text-center text-muted-foreground">
          No sites yet. Add one from the Sites page.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Keywords", value: stats.total },
              { label: "Top 3", value: stats.top3 },
              { label: "Top 10", value: stats.top10 },
              { label: "Top 20", value: stats.top20 },
              { label: "Top 100", value: stats.top100 },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card rounded-lg border border-border p-5">
                <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-2xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un mot-clé ou une page..."
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-w-[260px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "position" | "clicks" | "impressions")
              }
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="position">Trier par position</option>
              <option value="clicks">Trier par clics</option>
              <option value="impressions">Trier par impressions</option>
            </select>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            {metricsLoading ? (
              <div className="p-8 text-muted-foreground text-sm">Loading keywords...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                {keywordRows.length === 0
                  ? `Aucune donnée pour ${selectedSite?.domain || "ce site"}. Importez d'abord les données GSC.`
                  : "Aucun résultat pour cette recherche."}
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground font-medium border-b border-border">
                      <th className="text-left px-5 py-3">Keyword</th>
                      <th className="text-left px-5 py-3">Page</th>
                      <th className="text-right px-5 py-3">Position</th>
                      <th className="text-right px-5 py-3">Clicks</th>
                      <th className="text-right px-5 py-3">Impressions</th>
                      <th className="text-right px-5 py-3">CTR</th>
                      <th className="text-center px-5 py-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.keyword} className="border-b border-border hover:bg-muted">
                        <td className="px-5 py-3 text-primary font-medium max-w-[200px] truncate">
                          {row.keyword}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground max-w-[240px] truncate">
                          {row.page_url}
                        </td>
                        <td className="px-5 py-3 text-right text-foreground font-medium">
                          {row.position > 0 ? row.position : "-"}
                        </td>
                        <td className="px-5 py-3 text-right text-foreground">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-foreground">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-foreground">
                          {(row.ctr * 100).toFixed(2)}%
                        </td>
                        <td className="px-5 py-3 text-center">
                          {row.trend === "up" && (
                            <span className="text-success text-xs font-medium">↑ Up</span>
                          )}
                          {row.trend === "down" && (
                            <span className="text-destructive text-xs font-medium">↓ Down</span>
                          )}
                          {row.trend === "stable" && (
                            <span className="text-muted-foreground text-xs">→ Stable</span>
                          )}
                          {row.trend === "new" && (
                            <span className="text-info text-xs font-medium">New</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {filtered.length.toLocaleString()} mots-clés · Page {currentPage} /{" "}
                    {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    {visiblePages.map((page, idx) => {
                      const prev = visiblePages[idx - 1];
                      const showEllipsis = prev !== undefined && page - prev > 1;
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground text-sm">…</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[36px] px-2 py-1.5 text-sm rounded-md border transition ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}