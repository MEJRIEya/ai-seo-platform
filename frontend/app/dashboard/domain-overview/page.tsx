"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
}

interface DailyTrend {
  date: string;
  clicks: number;
  sessions: number;
}

interface SiteReport {
  site: string;
  gsc_summary: {
    total_clicks: number;
    total_impressions: number;
    avg_position: number | null;
    avg_ctr: number | null;
  };
  ga4_summary: {
    total_sessions: number;
    total_users: number;
    total_pageviews: number;
  };
  top_keywords_gsc: {
    keyword: string;
    clicks: number;
    position: number | null;
  }[];
  daily_trend: DailyTrend[];
}

interface CwvReport {
  site: string;
  summary: {
    total_pages_analysees: number;
    nb_pages_bonnes: number;
    nb_pages_a_ameliorer: number;
    nb_pages_faibles: number;
  };
}

interface GscMetric {
  keyword: string | null;
  page_url: string;
  clicks: number;
  impressions: number;
  position: number | null;
  ctr: number | null;
}

function StatBlock({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-heading font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Regroupe les keywords en "topics" simples (1er mot significatif) */
function buildTopics(
  keywords: { keyword: string; clicks: number; impressions?: number }[]
) {
  const map = new Map<string, { clicks: number; count: number }>();

  for (const k of keywords) {
    const raw = k.keyword.trim().toLowerCase();
    if (!raw) continue;
    const parts = raw.split(/\s+/).filter(Boolean);
    const topic = parts[0] || raw;
    const prev = map.get(topic) || { clicks: 0, count: 0 };
    prev.clicks += k.clicks || 0;
    prev.count += 1;
    map.set(topic, prev);
  }

  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      clicks: v.clicks,
      count: v.count,
      level: v.clicks > 50 ? "High" : v.clicks > 10 ? "Medium" : "Low",
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6);
}

export default function DomainOverviewPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [query, setQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [report, setReport] = useState<SiteReport | null>(null);
  const [cwv, setCwv] = useState<CwvReport | null>(null);
  const [gscRows, setGscRows] = useState<GscMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const loadSites = async () => {
      try {
        const data: Site[] = await apiFetch("/sites/");
        setSites(data);
        if (data.length > 0) {
          setSelectedSiteId(data[0].id);
          setQuery(data[0].domain);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, [router]);

  const loadDomain = async (siteId: string) => {
    if (!siteId) return;
    setSearching(true);
    setError("");
    try {
      const [reportData, cwvData, gscData] = await Promise.all([
        apiFetch(`/analytics/sites/${siteId}/report`),
        apiFetch(`/analytics/sites/${siteId}/report/cwv`).catch(() => null),
        apiFetch(`/analytics/sites/${siteId}/gsc?limit=2000`).catch(() => []),
      ]);
      setReport(reportData);
      setCwv(cwvData);
      setGscRows(gscData ?? []);
    } catch (err: any) {
      setError(err.message);
      setReport(null);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (selectedSiteId) loadDomain(selectedSiteId);
  }, [selectedSiteId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!q) return;

    const match = sites.find(
      (s) =>
        s.domain.toLowerCase().includes(q) ||
        q.includes(s.domain.toLowerCase())
    );

    if (!match) {
      setError(
        "Ce domaine n’est pas connecté. Ajoutez-le dans Sites et reliez GSC/GA4. L’analyse concurrente libre nécessite une API tierce."
      );
      return;
    }

    setError("");
    setSelectedSiteId(match.id);
    setQuery(match.domain);
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  const techScore = useMemo(() => {
    if (!cwv || cwv.summary.total_pages_analysees === 0) return null;
    const t = cwv.summary.total_pages_analysees;
    return Math.round(
      (cwv.summary.nb_pages_bonnes * 100 +
        cwv.summary.nb_pages_a_ameliorer * 50) /
        t
    );
  }, [cwv]);

  const topics = useMemo(() => {
    const fromReport =
      report?.top_keywords_gsc.map((k) => ({
        keyword: k.keyword,
        clicks: k.clicks,
      })) ?? [];
    if (fromReport.length > 0) return buildTopics(fromReport);

    const agg = new Map<string, number>();
    for (const m of gscRows) {
      if (!m.keyword) continue;
      agg.set(m.keyword, (agg.get(m.keyword) || 0) + (m.clicks || 0));
    }
    return buildTopics(
      Array.from(agg.entries()).map(([keyword, clicks]) => ({
        keyword,
        clicks,
      }))
    );
  }, [report, gscRows]);

  const topPages = useMemo(() => {
    const map = new Map<
      string,
      { clicks: number; impressions: number; positions: number[] }
    >();
    for (const m of gscRows) {
      const url = m.page_url || "/";
      const prev = map.get(url) || {
        clicks: 0,
        impressions: 0,
        positions: [],
      };
      prev.clicks += m.clicks || 0;
      prev.impressions += m.impressions || 0;
      if (m.position != null) prev.positions.push(m.position);
      map.set(url, prev);
    }
    return Array.from(map.entries())
      .map(([page, v]) => ({
        page,
        clicks: v.clicks,
        impressions: v.impressions,
        position:
          v.positions.length > 0
            ? v.positions.reduce((a, b) => a + b, 0) / v.positions.length
            : null,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [gscRows]);

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero search — style Domain Overview */}
      <Card>
        <CardContent className="pt-10 pb-8 px-6 md:px-12 text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Domain Overview
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Insights sur vos sites connectés : trafic organique GSC, sessions
            GA4, Core Web Vitals et topics dérivés de vos mots-clés.
          </p>

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto pt-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter domain (must be a connected site)"
              className="flex-1 h-11"
            />
            <Button type="submit" className="h-11 px-6" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>

          {selectedSite && (
            <p className="text-sm text-muted-foreground">
              Last checked:{" "}
              <span className="text-primary font-medium">
                {selectedSite.domain}
              </span>
            </p>
          )}

          {sites.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {sites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSiteId(s.id);
                    setQuery(s.domain);
                    setError("");
                  }}
                  className={
                    "text-xs px-3 py-1 rounded-full border transition " +
                    (s.id === selectedSiteId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted")
                  }
                >
                  {s.domain}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {sites.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucun site connecté.{" "}
            <button
              onClick={() => router.push("/dashboard/sites")}
              className="text-primary hover:underline"
            >
              Ajouter un site
            </button>
          </CardContent>
        </Card>
      )}

      {selectedSiteId && !searching && report && (
        <>
          {/* Score + traffic row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Tech Score (CWV)
                    </p>
                    <p className="text-4xl font-heading font-bold text-foreground tabular-nums">
                      {techScore ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cwv
                        ? `${cwv.summary.total_pages_analysees} pages analysées`
                        : "Pas d’audit CWV"}
                    </p>
                  </div>
                  <div className="h-16 w-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {techScore ?? "—"}
                    </span>
                  </div>
                </div>
                {cwv && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-success/10 text-success py-2">
                      Good {cwv.summary.nb_pages_bonnes}
                    </div>
                    <div className="rounded-md bg-warning/10 text-warning py-2">
                      NI {cwv.summary.nb_pages_a_ameliorer}
                    </div>
                    <div className="rounded-md bg-destructive/10 text-destructive py-2">
                      Poor {cwv.summary.nb_pages_faibles}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <StatBlock
                    label="Org. Search Clicks"
                    value={report.gsc_summary.total_clicks.toLocaleString()}
                    sub="Google Search Console"
                  />
                  <StatBlock
                    label="Sessions"
                    value={report.ga4_summary.total_sessions.toLocaleString()}
                    sub="Google Analytics 4"
                  />
                  <StatBlock
                    label="Impressions"
                    value={report.gsc_summary.total_impressions.toLocaleString()}
                  />
                  <StatBlock
                    label="Avg. Position"
                    value={report.gsc_summary.avg_position?.toFixed(1) ?? "—"}
                  />
                </div>

                {report.daily_trend.length > 1 && (
                  <div className="mt-4 h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={report.daily_trend}>
                        <defs>
                          <linearGradient
                            id="ovClicks"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--chart-1)"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--chart-1)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="clicks"
                          stroke="var(--chart-1)"
                          fill="url(#ovClicks)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key topics + CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <span className="text-primary">✦</span> Key Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Pas assez de mots-clés pour dériver des topics.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {topics.map((t) => (
                      <div
                        key={t.name}
                        className="rounded-xl border border-border bg-muted/40 p-3"
                      >
                        <p className="font-medium text-foreground capitalize truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Traffic: {t.level} · {t.clicks} clicks · {t.count} kw
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Get a complete analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-2 list-disc pl-4">
                  <li>Vue d’ensemble GSC + GA4 de votre domaine</li>
                  <li>Tendance des clics dans le temps</li>
                  <li>Topics issus de vos requêtes réelles</li>
                  <li>Santé technique (Core Web Vitals)</li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/dashboard/performance")}
                  >
                    Site Overview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/dashboard/keywords")}
                  >
                    Keywords
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push("/dashboard/site-audit")}
                  >
                    Site Audit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top pages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Top Pages</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/dashboard/top-pages")}
              >
                Voir tout
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {topPages.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  Aucune page GSC pour l’instant.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Pos.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPages.map((p) => (
                      <TableRow key={p.page}>
                        <TableCell className="text-primary max-w-[320px] truncate">
                          {p.page}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.clicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.position != null ? p.position.toFixed(1) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {searching && (
        <div className="text-center text-muted-foreground py-12">
          Loading domain data...
        </div>
      )}
    </div>
  );
}