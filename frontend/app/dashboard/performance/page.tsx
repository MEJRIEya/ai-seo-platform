"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
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
  top_keywords_gsc: { keyword: string; clicks: number; position: number | null }[];
  top_pages_gsc: { page_url: string; clicks: number; impressions: number }[];
  top_pages_ga4: { page_url: string; sessions: number; pageviews: number }[];
  daily_trend: { date: string; clicks: number; sessions: number }[];
}

type TabKey = "keywords" | "pages_gsc" | "pages_ga4";

export default function PerformancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [report, setReport] = useState<SiteReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("keywords");
  const [error, setError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

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

    const fetchReport = async () => {
      setReportLoading(true);
      setError("");
      try {
        const reportData: SiteReport = await apiFetch(
          `/analytics/sites/${selectedSiteId}/report`
        );
        setReport(reportData);
      } catch (err: any) {
        setError(err.message);
        setReport(null);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
  }, [selectedSiteId]);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      {/* Header + site selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Site Performance</h1>

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
      ) : reportLoading ? (
        <div className="text-gray-500">Loading report...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Clicks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.gsc_summary.total_clicks.toLocaleString() ?? "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Impressions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.gsc_summary.total_impressions.toLocaleString() ?? "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Avg. Position</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.gsc_summary.avg_position?.toFixed(1) ?? "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Avg. CTR</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.gsc_summary.avg_ctr
                  ? `${(report.gsc_summary.avg_ctr * 100).toFixed(2)}%`
                  : "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.ga4_summary.total_sessions.toLocaleString() ?? "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.ga4_summary.total_users.toLocaleString() ?? "-"}
              </p>
            </div>
          </div>

          {/* Trend chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-medium text-gray-900 mb-4">
              Clicks & Sessions Trend
              {selectedSite && (
                <span className="text-gray-400 font-normal"> — {selectedSite.domain}</span>
              )}
            </h2>
            {!report || report.daily_trend.length === 0 ? (
              <div className="text-sm text-gray-400 py-8 text-center">
                No trend data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={report.daily_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    }
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("fr-FR")
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="clicks"
                    name="Clics (GSC)"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions (GA4)"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabbed tables */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab("keywords")}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "keywords"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Keywords
              </button>
              <button
                onClick={() => setActiveTab("pages_gsc")}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "pages_gsc"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Pages (Search)
              </button>
              <button
                onClick={() => setActiveTab("pages_ga4")}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "pages_ga4"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Pages (Traffic)
              </button>
            </div>

            <div className="p-2">
              {activeTab === "keywords" && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 font-medium">
                      <th className="text-left px-3 py-2">Keyword</th>
                      <th className="text-right px-3 py-2">Position</th>
                      <th className="text-right px-3 py-2">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!report || report.top_keywords_gsc.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                          No keyword data yet
                        </td>
                      </tr>
                    )}
                    {report?.top_keywords_gsc.map((kw) => (
                      <tr key={kw.keyword} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-blue-600">{kw.keyword}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {kw.position?.toFixed(1) ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{kw.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "pages_gsc" && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 font-medium">
                      <th className="text-left px-3 py-2">Page</th>
                      <th className="text-right px-3 py-2">Clicks</th>
                      <th className="text-right px-3 py-2">Impressions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!report || report.top_pages_gsc.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                          No page data yet
                        </td>
                      </tr>
                    )}
                    {report?.top_pages_gsc.map((p) => (
                      <tr key={p.page_url} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-blue-600 truncate max-w-[420px]">
                          {p.page_url}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{p.clicks}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {p.impressions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "pages_ga4" && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 font-medium">
                      <th className="text-left px-3 py-2">Page</th>
                      <th className="text-right px-3 py-2">Sessions</th>
                      <th className="text-right px-3 py-2">Pageviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!report || report.top_pages_ga4.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                          No traffic data yet
                        </td>
                      </tr>
                    )}
                    {report?.top_pages_ga4.map((p) => (
                      <tr key={p.page_url} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-blue-600 truncate max-w-[420px]">
                          {p.page_url}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{p.sessions}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {p.pageviews}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}