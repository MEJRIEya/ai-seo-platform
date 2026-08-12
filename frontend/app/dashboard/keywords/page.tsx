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
}

const PAGE_SIZE = 25;

export default function KeywordOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [metrics, setMetrics] = useState<GscMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"clicks" | "impressions" | "position" | "ctr">("clicks");
  const [currentPage, setCurrentPage] = useState(1);
  const [minPosition, setMinPosition] = useState("");
  const [maxPosition, setMaxPosition] = useState("");

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
  }, [search, sortBy, selectedSiteId, minPosition, maxPosition]);

  const keywordRows: KeywordRow[] = useMemo(() => {
    const map = new Map<
      string,
      {
        keyword: string;
        page_url: string;
        positions: number[];
        clicks: number;
        impressions: number;
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
        });
      } else {
        existing.clicks += m.clicks || 0;
        existing.impressions += m.impressions || 0;
        if (m.position) existing.positions.push(m.position);
      }
    }

    return Array.from(map.values()).map((item) => {
      const avgPos =
        item.positions.length > 0
          ? item.positions.reduce((a, b) => a + b, 0) / item.positions.length
          : 0;

      return {
        keyword: item.keyword,
        page_url: item.page_url,
        position: Number(avgPos.toFixed(1)),
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
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

    const minPos = minPosition ? parseFloat(minPosition) : null;
    const maxPos = maxPosition ? parseFloat(maxPosition) : null;

    if (minPos !== null && !isNaN(minPos)) {
      rows = rows.filter((r) => r.position >= minPos);
    }
    if (maxPos !== null && !isNaN(maxPos)) {
      rows = rows.filter((r) => r.position > 0 && r.position <= maxPos);
    }

    rows.sort((a, b) => {
      if (sortBy === "clicks") return b.clicks - a.clicks;
      if (sortBy === "impressions") return b.impressions - a.impressions;
      if (sortBy === "position") return a.position - b.position;
      return b.ctr - a.ctr;
    });

    return rows;
  }, [keywordRows, search, sortBy, minPosition, maxPosition]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const totalClicks = keywordRows.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = keywordRows.reduce((s, r) => s + r.impressions, 0);
    const withPos = keywordRows.filter((r) => r.position > 0);
    const avgPos =
      withPos.length > 0
        ? withPos.reduce((s, r) => s + r.position, 0) / withPos.length
        : 0;
    const avgCtr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      total: keywordRows.length,
      totalClicks,
      totalImpressions,
      avgPos: Number(avgPos.toFixed(1)),
      avgCtr: Number(avgCtr.toFixed(2)),
    };
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
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Keyword Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Performance des mots-clés · Clics, impressions, CTR · Filtres par position
          </p>
        </div>

        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 min-w-[220px]"
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
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      {sites.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
          No sites yet. Add one from the Sites page.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Keywords</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Total Clicks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalClicks.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Impressions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalImpressions.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Avg. Position</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.avgPos || "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Avg. CTR</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.avgCtr ? `${stats.avgCtr}%` : "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un mot-clé..."
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={minPosition}
              onChange={(e) => setMinPosition(e.target.value)}
              placeholder="Pos. min"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={maxPosition}
              onChange={(e) => setMaxPosition(e.target.value)}
              placeholder="Pos. max"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "clicks" | "impressions" | "position" | "ctr"
                )
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-700"
            >
              <option value="clicks">Trier par clics</option>
              <option value="impressions">Trier par impressions</option>
              <option value="position">Trier par position</option>
              <option value="ctr">Trier par CTR</option>
            </select>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            {metricsLoading ? (
              <div className="p-8 text-gray-500 text-sm">Loading keywords...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                {keywordRows.length === 0
                  ? "Aucune donnée de mots-clés. Importez d'abord les données GSC."
                  : "Aucun résultat pour ces filtres."}
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                      <th className="text-left px-5 py-3">Keyword</th>
                      <th className="text-left px-5 py-3">Page</th>
                      <th className="text-right px-5 py-3">Position</th>
                      <th className="text-right px-5 py-3">Clicks</th>
                      <th className="text-right px-5 py-3">Impressions</th>
                      <th className="text-right px-5 py-3">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.keyword} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-blue-600 font-medium max-w-[200px] truncate">
                          {row.keyword}
                        </td>
                        <td className="px-5 py-3 text-gray-500 max-w-[240px] truncate">
                          {row.page_url}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900 font-medium">
                          {row.position > 0 ? row.position : "-"}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {(row.ctr * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {filtered.length.toLocaleString()} mots-clés · Page {currentPage} / {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    {visiblePages.map((page, idx) => {
                      const prev = visiblePages[idx - 1];
                      const showEllipsis = prev !== undefined && page - prev > 1;
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-gray-400 text-sm">…</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[36px] px-2 py-1.5 text-sm rounded-md border transition ${
                              currentPage === page
                                ? "bg-gray-900 text-white border-gray-900"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
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