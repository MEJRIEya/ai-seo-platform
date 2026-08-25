"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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

interface RecommendationLite {
  id: string;
  severity: "critical" | "important" | "opportunity";
  status: "open" | "done" | "dismissed";
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
  time: string;
  page_url: string;
  keyword: string | null;
  clicks: number;
  impressions: number;
  position: number | null;
  ctr: number | null;
}

interface QuickWin {
  keyword: string;
  page_url: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

function KpiCard({
  label,
  value,
  colorVar,
}: {
  label: string;
  value: string;
  colorVar: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <span
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: `var(${colorVar})` }}
      />
      <CardContent className="pt-6 pl-5">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-heading font-semibold text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SeverityLegendRow({
  colorVar,
  label,
  count,
}: {
  colorVar: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: `var(${colorVar})` }}
        />
        <span className="text-foreground">{label}</span>
      </div>
      <span className="font-medium text-foreground">{count}</span>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
}) {
  const positive = delta != null && delta > 0;
  const negative = delta != null && delta < 0;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-heading font-semibold text-foreground tabular-nums">
        {value}
      </p>
      <div className="flex items-center gap-2 text-xs">
        {sub && <span className="text-muted-foreground">{sub}</span>}
        {delta != null && (
          <span
            className={
              positive
                ? "text-success font-medium"
                : negative
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
            }
          >
            {positive ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function buildQuickWins(gscData: GscMetric[]): QuickWin[] {
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

  for (const m of gscData) {
    if (!m.keyword || m.position == null) continue;
    const key = m.keyword.toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        keyword: m.keyword,
        page_url: m.page_url,
        positions: [m.position],
        clicks: m.clicks || 0,
        impressions: m.impressions || 0,
      });
    } else {
      existing.clicks += m.clicks || 0;
      existing.impressions += m.impressions || 0;
      existing.positions.push(m.position);
    }
  }

  return Array.from(map.values())
    .map((item) => {
      const pos =
        item.positions.reduce((a, b) => a + b, 0) / item.positions.length;
      const ctr = item.impressions > 0 ? item.clicks / item.impressions : 0;
      return {
        keyword: item.keyword,
        page_url: item.page_url,
        position: Number(pos.toFixed(1)),
        clicks: item.clicks,
        impressions: item.impressions,
        ctr,
      };
    })
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8);
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [report, setReport] = useState<SiteReport | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationLite[]>(
    []
  );
  const [cwv, setCwv] = useState<CwvReport | null>(null);
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const fetchSites = async () => {
      try {
        const sitesData: Site[] = await apiFetch("/sites/");
        setSites(sitesData);
        if (sitesData.length > 0) {
          setSelectedSiteId(sitesData[0].id);
        }
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

    const fetchAll = async () => {
      setReportLoading(true);
      setError("");
      try {
        const [reportData, recsData, cwvData, gscData] = await Promise.all([
          apiFetch(`/analytics/sites/${selectedSiteId}/report`),
          apiFetch(`/api/sites/${selectedSiteId}/recommendations`).catch(
            () => []
          ),
          apiFetch(`/analytics/sites/${selectedSiteId}/report/cwv`).catch(
            () => null
          ),
          apiFetch(`/analytics/sites/${selectedSiteId}/gsc?limit=3000`).catch(
            () => []
          ),
        ]);

        setReport(reportData);
        setRecommendations(recsData ?? []);
        setCwv(cwvData);
        setQuickWins(buildQuickWins((gscData as GscMetric[]) ?? []));
      } catch (err: any) {
        setError(err.message);
        setReport(null);
        setQuickWins([]);
      } finally {
        setReportLoading(false);
      }
    };

    fetchAll();
  }, [selectedSiteId]);

  const severityCounts = useMemo(() => {
    const openOnly = recommendations.filter((r) => r.status === "open");
    return {
      critical: openOnly.filter((r) => r.severity === "critical").length,
      important: openOnly.filter((r) => r.severity === "important").length,
      opportunity: openOnly.filter((r) => r.severity === "opportunity")
        .length,
    };
  }, [recommendations]);

  const severityPieData = [
    {
      name: "Critique",
      value: severityCounts.critical,
      colorVar: "--severity-critical",
    },
    {
      name: "Important",
      value: severityCounts.important,
      colorVar: "--severity-important",
    },
    {
      name: "Opportunité",
      value: severityCounts.opportunity,
      colorVar: "--severity-opportunity",
    },
  ].filter((d) => d.value > 0);

  const cwvPieData = cwv
    ? [
        {
          name: "Bonnes",
          value: cwv.summary.nb_pages_bonnes,
          colorVar: "--success",
        },
        {
          name: "À améliorer",
          value: cwv.summary.nb_pages_a_ameliorer,
          colorVar: "--warning",
        },
        {
          name: "Faibles",
          value: cwv.summary.nb_pages_faibles,
          colorVar: "--destructive",
        },
      ].filter((d) => d.value > 0)
    : [];

  const keywordCount = report?.top_keywords_gsc?.length ?? 0;

  const cwvScore = useMemo(() => {
    if (!cwv || cwv.summary.total_pages_analysees === 0) return null;
    const t = cwv.summary.total_pages_analysees;
    const good = cwv.summary.nb_pages_bonnes;
    const mid = cwv.summary.nb_pages_a_ameliorer;
    return Math.round((good * 100 + mid * 50) / t);
  }, [cwv]);

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const totalOpenRecs =
    severityCounts.critical +
    severityCounts.important +
    severityCounts.opportunity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-heading font-semibold text-foreground">
          SEO Dashboard
          {selectedSite && (
            <span className="text-primary">: {selectedSite.domain}</span>
          )}
        </h1>

        <div className="flex items-center gap-3">
          {sites.length > 0 && (
            <Select
  value={selectedSiteId}
  onValueChange={(v) => setSelectedSiteId(v ?? "")}
>
  <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder="Sélectionner un site">
                  {() => sites.find((s) => s.id === selectedSiteId)?.domain}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => router.push("/dashboard/sites")}>
            + Add Site
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucun site pour l&apos;instant.{" "}
            <button
              onClick={() => router.push("/dashboard/sites")}
              className="text-primary hover:underline"
            >
              Ajoutez votre premier site
            </button>
          </CardContent>
        </Card>
      ) : reportLoading ? (
        <div className="text-muted-foreground">Loading report...</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Organic Clicks"
              value={report?.gsc_summary.total_clicks.toLocaleString() ?? "-"}
              colorVar="--chart-1"
            />
            <KpiCard
              label="Impressions"
              value={
                report?.gsc_summary.total_impressions.toLocaleString() ?? "-"
              }
              colorVar="--chart-3"
            />
            <KpiCard
              label="Avg. Position"
              value={report?.gsc_summary.avg_position?.toFixed(1) ?? "-"}
              colorVar="--chart-4"
            />
            <KpiCard
              label="Sessions (GA4)"
              value={
                report?.ga4_summary.total_sessions.toLocaleString() ?? "-"
              }
              colorVar="--chart-2"
            />
          </div>

          {/* Domain overview — style Semrush */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* SEO panel */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-semibold">
                    SEO
                  </span>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>Scope: Site</span>
                    <span>·</span>
                    <span>{selectedSite?.domain ?? "—"}</span>
                    <span>·</span>
                    <span>
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <OverviewStat
                    label="Tech Score (CWV)"
                    value={cwvScore != null ? String(cwvScore) : "—"}
                    sub={
                      cwv
                        ? `${cwv.summary.total_pages_analysees} pages`
                        : "No audit"
                    }
                  />
                  <OverviewStat
                    label="Organic Clicks"
                    value={
                      report?.gsc_summary.total_clicks.toLocaleString() ?? "—"
                    }
                    sub="GSC"
                  />
                  <OverviewStat
                    label="Organic Keywords"
                    value={keywordCount.toLocaleString()}
                    sub="Tracked in GSC"
                  />
                  <OverviewStat
                    label="Impressions"
                    value={
                      report?.gsc_summary.total_impressions.toLocaleString() ??
                      "—"
                    }
                  />
                  <OverviewStat
                    label="Avg. Position"
                    value={
                      report?.gsc_summary.avg_position?.toFixed(1) ?? "—"
                    }
                  />
                  <OverviewStat
                    label="Sessions"
                    value={
                      report?.ga4_summary.total_sessions.toLocaleString() ??
                      "—"
                    }
                    sub="GA4"
                  />
                </div>

                {report && report.daily_trend.length > 1 && (
                  <div className="mt-6 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={report.daily_trend}>
                        <defs>
                          <linearGradient
                            id="sparkClicks"
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
                        <Area
                          type="monotone"
                          dataKey="clicks"
                          stroke="var(--chart-1)"
                          strokeWidth={1.5}
                          fill="url(#sparkClicks)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insights panel */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 px-2.5 py-0.5 text-xs font-semibold">
                    Insights
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => router.push("/dashboard/recommendations")}
                  >
                    Open AI recs
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <OverviewStat
                    label="Open recs"
                    value={String(totalOpenRecs)}
                    sub="AI"
                  />
                  <OverviewStat
                    label="Critical"
                    value={String(severityCounts.critical)}
                  />
                  <OverviewStat
                    label="Opportunities"
                    value={String(severityCounts.opportunity)}
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-muted-foreground">
                      Quick wins (pos 4–20)
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {quickWins.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-muted-foreground">
                      CWV weak pages
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {cwv?.summary.nb_pages_faibles ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-muted-foreground">Avg CTR</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {report?.gsc_summary.avg_ctr != null
                        ? `${(report.gsc_summary.avg_ctr * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Clicks &amp; Sessions Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!report || report.daily_trend.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No trend data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={report.daily_trend}>
                    <defs>
                      <linearGradient
                        id="fillClicks"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="fillSessions"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--chart-2)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--chart-2)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 12,
                        fill: "var(--muted-foreground)",
                      }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      }
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{
                        fontSize: 12,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{
                        fontSize: 12,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--popover-foreground)",
                        fontSize: 13,
                      }}
                      labelFormatter={(value) =>
  new Date(String(value)).toLocaleDateString("fr-FR")
                      }
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      name="Clics (GSC)"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="url(#fillClicks)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="sessions"
                      name="Sessions (GA4)"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      fill="url(#fillSessions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* AI + CWV pies */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">
                  AI Recommendations
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/dashboard/recommendations")}
                >
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent>
                {totalOpenRecs === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Aucune recommandation à traiter pour l&apos;instant.
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={severityPieData}
                          dataKey="value"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {severityPieData.map((entry, i) => (
                            <Cell key={i} fill={`var(${entry.colorVar})`} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1">
                      <p className="text-2xl font-heading font-semibold text-foreground mb-1">
                        {totalOpenRecs}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          à traiter
                        </span>
                      </p>
                      <SeverityLegendRow
                        colorVar="--severity-critical"
                        label="Critique"
                        count={severityCounts.critical}
                      />
                      <SeverityLegendRow
                        colorVar="--severity-important"
                        label="Important"
                        count={severityCounts.important}
                      />
                      <SeverityLegendRow
                        colorVar="--severity-opportunity"
                        label="Opportunité"
                        count={severityCounts.opportunity}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Core Web Vitals
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/dashboard/site-audit")}
                >
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent>
                {!cwv || cwv.summary.total_pages_analysees === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Aucune analyse technique pour l&apos;instant.
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={cwvPieData}
                          dataKey="value"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {cwvPieData.map((entry, i) => (
                            <Cell key={i} fill={`var(${entry.colorVar})`} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1">
                      <p className="text-2xl font-heading font-semibold text-foreground mb-1">
                        {cwv.summary.total_pages_analysees}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          pages analysées
                        </span>
                      </p>
                      <SeverityLegendRow
                        colorVar="--success"
                        label="Bonnes"
                        count={cwv.summary.nb_pages_bonnes}
                      />
                      <SeverityLegendRow
                        colorVar="--warning"
                        label="À améliorer"
                        count={cwv.summary.nb_pages_a_ameliorer}
                      />
                      <SeverityLegendRow
                        colorVar="--destructive"
                        label="Faibles"
                        count={cwv.summary.nb_pages_faibles}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Wins */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Quick Wins
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Position 4–20 · Impressions élevées · Potentiel de clics
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/dashboard/opportunities")}
              >
                Voir tout
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {quickWins.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  Aucun quick win détecté pour l&apos;instant.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Pos.</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quickWins.map((w) => (
                      <TableRow key={w.keyword}>
                        <TableCell className="text-primary font-medium max-w-[220px] truncate">
                          {w.keyword}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.position}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(w.ctr * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {w.clicks}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Top Keywords + Sites */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Top Keywords
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!report || report.top_keywords_gsc.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    No keyword data yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead className="text-right">Position</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.top_keywords_gsc.map((kw) => (
                        <TableRow key={kw.keyword}>
                          <TableCell className="text-primary truncate max-w-[180px]">
                            {kw.keyword}
                          </TableCell>
                          <TableCell className="text-right">
                            {kw.position?.toFixed(1) ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {kw.clicks}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Your Sites
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/sites")}
                >
                  + Add Site
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {sites.map((site) => (
                    <div
                      key={site.id}
                      className={
                        "px-5 py-3 flex items-center justify-between hover:bg-muted cursor-pointer " +
                        (site.id === selectedSiteId ? "bg-accent/50" : "")
                      }
                      onClick={() => setSelectedSiteId(site.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {site.domain}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {site.gsc_property_url ? "GSC" : "No GSC"} ·{" "}
                          {site.ga4_property_id ? "GA4" : "No GA4"}
                        </p>
                      </div>
                      <span className="text-sm text-primary">
                        {site.id === selectedSiteId ? "Selected" : "View"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}