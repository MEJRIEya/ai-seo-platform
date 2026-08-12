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

type WidgetId = "overview" | "top_pages" | "top_queries" | "header";

const AVAILABLE_WIDGETS: { id: WidgetId; label: string; group: string }[] = [
  { id: "header", label: "Report header / logo", group: "Layout" },
  { id: "overview", label: "Search Performance Overview", group: "GSC" },
  { id: "top_pages", label: "Top 10 Pages", group: "GSC" },
  { id: "top_queries", label: "Top 10 Queries", group: "GSC" },
];

export default function GscReportEditorPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [metrics, setMetrics] = useState<GscMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportTitle, setReportTitle] = useState("Google Search Console Report");
  const [widgets, setWidgets] = useState<WidgetId[]>([
    "header",
    "overview",
    "top_pages",
    "top_queries",
  ]);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const load = async () => {
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
    load();
  }, [router]);

  useEffect(() => {
    if (!selectedSiteId) return;
    const loadMetrics = async () => {
      try {
        const data: GscMetric[] = await apiFetch(
          `/analytics/sites/${selectedSiteId}/gsc?limit=5000`
        );
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
        setMetrics([]);
      }
    };
    loadMetrics();
  }, [selectedSiteId]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  const stats = useMemo(() => {
    const clicks = metrics.reduce((s, m) => s + (m.clicks || 0), 0);
    const impressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0);
    const withPos = metrics.filter((m) => m.position && m.position > 0);
    const avgPos =
      withPos.length > 0
        ? withPos.reduce((s, m) => s + (m.position || 0), 0) / withPos.length
        : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return {
      clicks,
      impressions,
      avgPos: Number(avgPos.toFixed(2)),
      ctr: Number(ctr.toFixed(2)),
    };
  }, [metrics]);

  const topPages = useMemo(() => {
    const map = new Map<
      string,
      { clicks: number; impressions: number; positions: number[] }
    >();
    for (const m of metrics) {
      const key = m.page_url || "/";
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          clicks: m.clicks || 0,
          impressions: m.impressions || 0,
          positions: m.position ? [m.position] : [],
        });
      } else {
        existing.clicks += m.clicks || 0;
        existing.impressions += m.impressions || 0;
        if (m.position) existing.positions.push(m.position);
      }
    }
    return Array.from(map.entries())
      .map(([page, v]) => ({
        page,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        position:
          v.positions.length > 0
            ? Number(
                (
                  v.positions.reduce((a, b) => a + b, 0) / v.positions.length
                ).toFixed(1)
              )
            : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [metrics]);

  const topKeywords = useMemo(() => {
    const map = new Map<
      string,
      { clicks: number; impressions: number; positions: number[] }
    >();
    for (const m of metrics) {
      if (!m.keyword) continue;
      const key = m.keyword.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          clicks: m.clicks || 0,
          impressions: m.impressions || 0,
          positions: m.position ? [m.position] : [],
        });
      } else {
        existing.clicks += m.clicks || 0;
        existing.impressions += m.impressions || 0;
        if (m.position) existing.positions.push(m.position);
      }
    }
    return Array.from(map.entries())
      .map(([keyword, v]) => ({
        keyword,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        position:
          v.positions.length > 0
            ? Number(
                (
                  v.positions.reduce((a, b) => a + b, 0) / v.positions.length
                ).toFixed(1)
              )
            : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [metrics]);

  const addWidget = (id: WidgetId) => {
    if (!widgets.includes(id)) setWidgets((w) => [...w, id]);
  };

  const removeWidget = (id: WidgetId) => {
    setWidgets((w) => w.filter((x) => x !== id));
  };

  if (loading) return <div className="text-gray-500 p-6">Loading editor...</div>;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* ===== LEFT: Integrations / Widgets ===== */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Integrations
          </p>
          <input
            type="text"
            placeholder="Search widgets..."
            className="mt-2 w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {["Layout", "GSC"].map((group) => (
            <div key={group} className="mb-3">
              <p className="px-4 py-1 text-[11px] font-semibold text-gray-400 uppercase">
                {group}
              </p>
              {AVAILABLE_WIDGETS.filter((w) => w.group === group).map((w) => {
                const active = widgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() =>
                      active ? removeWidget(w.id) : addWidget(w.id)
                    }
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                      active ? "text-gray-900 font-medium" : "text-gray-600"
                    }`}
                  >
                    <span>{w.label}</span>
                    <span className="text-xs text-gray-400">
                      {active ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* ===== CENTER: Report canvas ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f0f1f3]">
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Reports list
            </button>
            <span className="text-gray-300">›</span>
            {editingTitle ? (
              <input
                autoFocus
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="text-sm font-medium border border-gray-300 rounded px-2 py-1"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="text-sm font-medium text-gray-900 truncate hover:underline"
              >
                {reportTitle} ✎
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md"
            >
              Generate PDF report
            </button>
          </div>
        </div>

        {/* Period bar (UI only for now) */}
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-3 text-sm text-gray-600 print:hidden">
          <span className="text-amber-600 text-xs">Period</span>
          <span className="border border-gray-200 rounded px-2 py-1 bg-gray-50">
            Last imported data
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-400">
            Generated on {new Date().toLocaleDateString()}
          </span>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="max-w-4xl mx-auto bg-white shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-0">
            {/* Header widget */}
            {widgets.includes("header") && (
              <div className="relative border-b border-dashed border-gray-200 p-8">
                <button
                  onClick={() => removeWidget("header")}
                  className="absolute top-3 right-3 text-xs text-gray-400 hover:text-red-500 print:hidden"
                >
                  Remove
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg text-gray-900">
                      AI SEO Platform
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedSite?.domain}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>Generated on {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <h1 className="text-3xl font-light text-gray-800 mt-10 text-center">
                  {reportTitle}
                </h1>
              </div>
            )}

            {/* Overview */}
            {widgets.includes("overview") && (
              <div className="relative border-b border-dashed border-gray-200 p-8">
                <button
                  onClick={() => removeWidget("overview")}
                  className="absolute top-3 right-3 text-xs text-gray-400 hover:text-red-500 print:hidden"
                >
                  Remove
                </button>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Search Performance Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Clicks", value: stats.clicks.toLocaleString() },
                    {
                      label: "Impressions",
                      value: stats.impressions.toLocaleString(),
                    },
                    {
                      label: "Average CTR",
                      value: stats.ctr ? `${stats.ctr}%` : "-",
                    },
                    {
                      label: "Average Position",
                      value: stats.avgPos || "-",
                    },
                  ].map((k) => (
                    <div
                      key={k.label}
                      className="border border-gray-100 rounded-lg p-4"
                    >
                      <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                      <p className="text-2xl font-semibold text-blue-600">
                        {k.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top pages */}
            {widgets.includes("top_pages") && (
              <div className="relative border-b border-dashed border-gray-200 p-8">
                <button
                  onClick={() => removeWidget("top_pages")}
                  className="absolute top-3 right-3 text-xs text-gray-400 hover:text-red-500 print:hidden"
                >
                  Remove
                </button>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Top 10 Pages
                </h2>
                <p className="text-xs text-gray-400 mb-4">Metrics: Page</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2">Page</th>
                      <th className="text-right py-2">Clicks</th>
                      <th className="text-right py-2">Impressions</th>
                      <th className="text-right py-2">CTR</th>
                      <th className="text-right py-2">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map((row) => (
                      <tr key={row.page} className="border-b border-gray-50">
                        <td className="py-2 max-w-[220px] truncate">
                          {row.page}
                        </td>
                        <td className="py-2 text-right">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {row.ctr.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right">
                          {row.position || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top queries */}
            {widgets.includes("top_queries") && (
              <div className="relative p-8">
                <button
                  onClick={() => removeWidget("top_queries")}
                  className="absolute top-3 right-3 text-xs text-gray-400 hover:text-red-500 print:hidden"
                >
                  Remove
                </button>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Top 10 Queries
                </h2>
                <p className="text-xs text-gray-400 mb-4">Metrics: Query</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2">Query</th>
                      <th className="text-right py-2">Clicks</th>
                      <th className="text-right py-2">Impressions</th>
                      <th className="text-right py-2">CTR</th>
                      <th className="text-right py-2">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topKeywords.map((row) => (
                      <tr key={row.keyword} className="border-b border-gray-50">
                        <td className="py-2 max-w-[220px] truncate text-blue-600 font-medium">
                          {row.keyword}
                        </td>
                        <td className="py-2 text-right">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {row.ctr.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right">
                          {row.position || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {widgets.length === 0 && (
              <div className="p-16 text-center text-gray-400">
                Add widgets from the left panel to build your report.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}