"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, downloadFile } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Site {
  id: string;
  domain: string;
}

interface Ga4Report {
  site: string;
  period: string;
  summary: {
    total_sessions: number;
    total_users: number;
    total_pageviews: number;
  };
  top_pages: { page_url: string; sessions: number; pageviews: number }[];
  daily_trend: { date: string; sessions: number }[];
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

const DAYS_OPTIONS = [
  { label: "7 derniers jours", value: 7 },
  { label: "30 derniers jours", value: 30 },
  { label: "90 derniers jours", value: 90 },
];

export default function Ga4ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Ga4Report | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  // Génère (ou régénère) le rapport GA4 pour le site + la période sélectionnés
  const generateReport = async (siteId: string, periodDays: number) => {
    setReportLoading(true);
    setError("");
    try {
      const data: Ga4Report = await apiFetch(
        `/analytics/sites/${siteId}/report/ga4?days=${periodDays}`
      );
      setReport(data);
    } catch (err: any) {
      setError(err.message);
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSiteId) return;
    generateReport(selectedSiteId, days);
  }, [selectedSiteId, days]);

  const handleExportPdf = async () => {
    if (!selectedSiteId || !report) return;
    setExporting(true);
    setError("");
    try {
      await downloadFile(
        `/analytics/sites/${selectedSiteId}/report/ga4/pdf?days=${days}`,
        `rapport-ga4-${report.site}.pdf`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/dashboard/reports"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ← Reports
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">
            Google Analytics 4 Report
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 min-w-[200px]"
          >
            {sites.length === 0 && <option value="">No sites</option>}
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain}
              </option>
            ))}
          </select>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900"
          >
            {DAYS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => generateReport(selectedSiteId, days)}
            disabled={!selectedSiteId || reportLoading}
            className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {reportLoading ? "Génération..." : "Régénérer"}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!report || exporting}
            className="text-sm bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? "Génération..." : "Export PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      {sites.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
          No sites yet.
        </div>
      ) : reportLoading || !report ? (
        <div className="text-gray-500">Génération du rapport...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* En-tête façon "couverture" du rapport */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-green-600 font-semibold mb-1">
                NexRank · Analytics
              </p>
              <h2 className="text-2xl font-bold text-gray-900">
                GA4 Traffic Report
              </h2>
              <p className="text-sm text-gray-500 mt-1">{report.site}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Generated on {today}</p>
              <p className="text-xs text-gray-400">Period: {report.period}</p>
            </div>
          </div>

          {/* KPI cards — vert, distinct du bleu GSC */}
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Traffic Overview
          </h3>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 border-l-2 border-green-600 rounded p-4">
              <p className="text-xs text-gray-500 mb-1">Sessions</p>
              <p className="text-2xl font-bold text-green-700">
                {formatNumber(report.summary.total_sessions)}
              </p>
            </div>
            <div className="bg-green-50 border-l-2 border-green-600 rounded p-4">
              <p className="text-xs text-gray-500 mb-1">Users</p>
              <p className="text-2xl font-bold text-green-700">
                {formatNumber(report.summary.total_users)}
              </p>
            </div>
            <div className="bg-green-50 border-l-2 border-green-600 rounded p-4">
              <p className="text-xs text-gray-500 mb-1">Pageviews</p>
              <p className="text-2xl font-bold text-green-700">
                {formatNumber(report.summary.total_pageviews)}
              </p>
            </div>
          </div>

          {/* Graphique aire — une seule métrique, distinct du double axe GSC */}
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Sessions Trend
          </h3>
          <div className="mb-8">
            {report.daily_trend.length === 0 ? (
              <div className="text-sm text-gray-400 py-8 text-center">
                No trend data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={report.daily_trend}>
                  <defs>
                    <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={(value) =>
  new Date(String(value)).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  })
}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip
                    labelFormatter={(value) =>
  new Date(String(value)).toLocaleDateString("fr-FR")
}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fill="url(#sessionsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Table pages — colonnes GA4 uniquement, pas de clics/impressions */}
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Top Pages by Traffic
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-medium border-b border-gray-200">
                <th className="text-left py-2">Page</th>
                <th className="text-right py-2">Sessions</th>
                <th className="text-right py-2">Pageviews</th>
              </tr>
            </thead>
            <tbody>
              {report.top_pages.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">
                    No data
                  </td>
                </tr>
              ) : (
                report.top_pages.map((p) => (
                  <tr key={p.page_url} className="border-b border-gray-50">
                    <td className="py-2 text-green-700 truncate max-w-[400px]">
                      {p.page_url}
                    </td>
                    <td className="py-2 text-right">{formatNumber(p.sessions)}</td>
                    <td className="py-2 text-right">{formatNumber(p.pageviews)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p className="text-xs text-gray-400 mt-8 pt-4 border-t border-gray-100">
            Report data is taken from Google Analytics 4 via NexRank.
          </p>
        </div>
      )}
    </div>
  );
}