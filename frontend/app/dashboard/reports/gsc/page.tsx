"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, downloadFile } from "@/lib/api";

interface Site {
  id: string;
  domain: string;
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
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function GscReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [report, setReport] = useState<SiteReport | null>(null);
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

  useEffect(() => {
    if (!selectedSiteId) return;

    const fetchReport = async () => {
      setReportLoading(true);
      setError("");
      try {
        const data: SiteReport = await apiFetch(
          "/analytics/sites/" + selectedSiteId + "/report"
        );
        setReport(data);
      } catch (err: any) {
        setError(err.message);
        setReport(null);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
  }, [selectedSiteId]);

  const handleExportPdf = async () => {
    if (!selectedSiteId || !report) return;
    setExporting(true);
    setError("");
    try {
      await downloadFile(
        "/analytics/sites/" + selectedSiteId + "/report/pdf",
        "rapport-" + report.site + ".pdf"
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
            Google Search Console Report
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
          <button
            onClick={handleExportPdf}
            disabled={!report || exporting}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="text-gray-500">Loading report...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
                NexRank
              </p>
              <h2 className="text-2xl font-bold text-gray-900">
                Google Search Console Report
              </h2>
              <p className="text-sm text-gray-500 mt-1">{report.site}</p>
            </div>
            <p className="text-xs text-gray-400">Generated on {today}</p>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Search Performance Overview
          </h3>
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div>
              <p className="text-xs text-gray-500 mb-1">Clicks</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(report.gsc_summary.total_clicks)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Impressions</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(report.gsc_summary.total_impressions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Average CTR</p>
              <p className="text-2xl font-bold text-blue-600">
                {report.gsc_summary.avg_ctr
                  ? (report.gsc_summary.avg_ctr * 100).toFixed(2) + "%"
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Average Position</p>
              <p className="text-2xl font-bold text-blue-600">
                {report.gsc_summary.avg_position?.toFixed(2) ?? "-"}
              </p>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Top 10 Pages
          </h3>
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="text-xs text-gray-400 font-medium border-b border-gray-200">
                <th className="text-left py-2">Page</th>
                <th className="text-right py-2">Clicks</th>
                <th className="text-right py-2">Impressions</th>
              </tr>
            </thead>
            <tbody>
              {report.top_pages_gsc.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">
                    No data
                  </td>
                </tr>
              ) : (
                report.top_pages_gsc.map((p) => (
                  <tr key={p.page_url} className="border-b border-gray-50">
                    <td className="py-2 text-blue-600 truncate max-w-[400px]">
                      {p.page_url}
                    </td>
                    <td className="py-2 text-right">{formatNumber(p.clicks)}</td>
                    <td className="py-2 text-right">{formatNumber(p.impressions)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Top 10 Queries
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-medium border-b border-gray-200">
                <th className="text-left py-2">Query</th>
                <th className="text-right py-2">Clicks</th>
                <th className="text-right py-2">Average Position</th>
              </tr>
            </thead>
            <tbody>
              {report.top_keywords_gsc.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">
                    No data
                  </td>
                </tr>
              ) : (
                report.top_keywords_gsc.map((kw) => (
                  <tr key={kw.keyword} className="border-b border-gray-50">
                    <td className="py-2">{kw.keyword}</td>
                    <td className="py-2 text-right">{formatNumber(kw.clicks)}</td>
                    <td className="py-2 text-right">
                      {kw.position?.toFixed(2) ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p className="text-xs text-gray-400 mt-8 pt-4 border-t border-gray-100">
            Report data is taken from Google Search Console via NexRank.
          </p>
        </div>
      )}
    </div>
  );
}