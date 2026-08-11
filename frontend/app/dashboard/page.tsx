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
  top_keywords_gsc: { keyword: string; clicks: number; position: number | null }[];
  daily_trend: DailyTrend[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [report, setReport] = useState<SiteReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const fetchData = async () => {
      try {
        const sitesData: Site[] = await apiFetch("/sites/");
        setSites(sitesData);

        const mainSite =
          sitesData.find((s) => s.domain.includes("twenty")) || sitesData[0];
        setSelectedSite(mainSite || null);

        if (mainSite) {
          const reportData: SiteReport = await apiFetch(
            `/analytics/sites/${mainSite.id}/report`
          );
          setReport(reportData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            SEO Dashboard
            {selectedSite && (
              <span className="text-blue-600">: {selectedSite.domain}</span>
            )}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Organic Clicks</p>
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
          <p className="text-sm text-gray-500 mb-1">Sessions (GA4)</p>
          <p className="text-2xl font-semibold text-gray-900">
            {report?.ga4_summary.total_sessions.toLocaleString() ?? "-"}
          </p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-medium text-gray-900 mb-4">Clicks & Sessions Trend</h2>
        {!report || report.daily_trend.length === 0 ? (
          <div className="text-sm text-gray-400 py-8 text-center">
            No trend data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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

      {/* Two columns: Top Keywords + Sites */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Top Keywords</h2>
          </div>

          {!report || report.top_keywords_gsc.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No keyword data yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-2 grid grid-cols-3 text-xs text-gray-400 font-medium">
                <span>Keyword</span>
                <span className="text-right">Position</span>
                <span className="text-right">Clicks</span>
              </div>
              {report.top_keywords_gsc.map((kw) => (
                <div
                  key={kw.keyword}
                  className="px-5 py-3 grid grid-cols-3 text-sm hover:bg-gray-50"
                >
                  <span className="text-blue-600 truncate">{kw.keyword}</span>
                  <span className="text-right text-gray-700">
                    {kw.position?.toFixed(1) ?? "-"}
                  </span>
                  <span className="text-right text-gray-700">{kw.clicks}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Your Sites</h2>
            <button className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition">
              + Add Site
            </button>
          </div>

          {sites.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No sites yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{site.domain}</p>
                    <p className="text-xs text-gray-500">
                      {site.gsc_property_url ? "GSC" : "No GSC"} ·{" "}
                      {site.ga4_property_id ? "GA4" : "No GA4"}
                    </p>
                  </div>
                  <button className="text-sm text-blue-600 hover:underline">View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}