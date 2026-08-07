"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
}

interface GscMetric {
  clicks: number;
  impressions: number;
  position: number | null;
  ctr: number | null;
  keyword?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [metrics, setMetrics] = useState({
    clicks: 0,
    impressions: 0,
    avgPosition: 0,
    avgCtr: 0,
    keywordsCount: 0,
  });
  const [topKeywords, setTopKeywords] = useState<
    { keyword: string; position: number; clicks: number }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const fetchData = async () => {
      try {
        const sitesRes = await fetch("http://127.0.0.1:8000/sites/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!sitesRes.ok) throw new Error("Impossible de récupérer les sites");
        const sitesData: Site[] = await sitesRes.json();
        setSites(sitesData);

        // On prend de préférence twenty.tn
        const mainSite =
          sitesData.find((s) => s.domain.includes("twenty")) || sitesData[0];
        setSelectedSite(mainSite || null);

        if (mainSite) {
          const gscRes = await fetch(
            `http://127.0.0.1:8000/analytics/sites/${mainSite.id}/gsc`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (gscRes.ok) {
            const gscData: GscMetric[] = await gscRes.json();

            const totalClicks = gscData.reduce((sum, m) => sum + (m.clicks || 0), 0);
            const totalImpressions = gscData.reduce(
              (sum, m) => sum + (m.impressions || 0),
              0
            );
            const positions = gscData
              .filter((m) => m.position)
              .map((m) => m.position as number);
            const ctrs = gscData.filter((m) => m.ctr).map((m) => m.ctr as number);

            // Top keywords
            const keywordsMap = new Map<
              string,
              { clicks: number; position: number }
            >();

            gscData.forEach((m) => {
              if (m.keyword) {
                const existing = keywordsMap.get(m.keyword) || {
                  clicks: 0,
                  position: m.position || 0,
                };
                keywordsMap.set(m.keyword, {
                  clicks: existing.clicks + (m.clicks || 0),
                  position: m.position || existing.position,
                });
              }
            });

            const sortedKeywords = Array.from(keywordsMap.entries())
              .map(([keyword, data]) => ({
                keyword,
                clicks: data.clicks,
                position: data.position,
              }))
              .sort((a, b) => b.clicks - a.clicks)
              .slice(0, 5);

            setTopKeywords(sortedKeywords);

            setMetrics({
              clicks: totalClicks,
              impressions: totalImpressions,
              avgPosition: positions.length
                ? Number(
                    (
                      positions.reduce((a, b) => a + b, 0) / positions.length
                    ).toFixed(1)
                  )
                : 0,
              avgCtr: ctrs.length
                ? Number(
                    ((ctrs.reduce((a, b) => a + b, 0) / ctrs.length) * 100).toFixed(
                      2
                    )
                  )
                : 0,
              keywordsCount: keywordsMap.size,
            });
          }
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
      {/* Header */}
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

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Organic Clicks</p>
          <p className="text-2xl font-semibold text-gray-900">
            {metrics.clicks.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Impressions</p>
          <p className="text-2xl font-semibold text-gray-900">
            {metrics.impressions.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Organic Keywords</p>
          <p className="text-2xl font-semibold text-gray-900">
            {metrics.keywordsCount}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Avg. Position</p>
          <p className="text-2xl font-semibold text-gray-900">
            {metrics.avgPosition || "-"}
          </p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Keywords */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Top Keywords</h2>
          </div>

          {topKeywords.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No keyword data yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-2 grid grid-cols-3 text-xs text-gray-400 font-medium">
                <span>Keyword</span>
                <span className="text-right">Position</span>
                <span className="text-right">Clicks</span>
              </div>
              {topKeywords.map((kw) => (
                <div
                  key={kw.keyword}
                  className="px-5 py-3 grid grid-cols-3 text-sm hover:bg-gray-50"
                >
                  <span className="text-blue-600 truncate">{kw.keyword}</span>
                  <span className="text-right text-gray-700">
                    {kw.position?.toFixed(1) || "-"}
                  </span>
                  <span className="text-right text-gray-700">{kw.clicks}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sites */}
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
                    <p className="text-sm font-medium text-gray-900">
                      {site.domain}
                    </p>
                    <p className="text-xs text-gray-500">
                      {site.gsc_property_url ? "GSC" : "No GSC"} ·{" "}
                      {site.ga4_property_id ? "GA4" : "No GA4"}
                    </p>
                  </div>
                  <button className="text-sm text-blue-600 hover:underline">
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}