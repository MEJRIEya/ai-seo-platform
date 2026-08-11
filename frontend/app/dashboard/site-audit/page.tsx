"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
}

interface CoreWebVital {
  id: string;
  time: string;
  site_id: string;
  page_url: string;
  niveau: "page" | "origin" | "lab";
  lcp: number | null;
  lcp_categorie: "good" | "needs_improvement" | "poor" | null;
  inp: number | null;
  inp_categorie: "good" | "needs_improvement" | "poor" | null;
  cls: number | null;
  cls_categorie: "good" | "needs_improvement" | "poor" | null;
  fcp: number | null;
  fcp_categorie: "good" | "needs_improvement" | "poor" | null;
}

const CATEGORIE_STYLES: Record<string, string> = {
  good: "bg-green-50 text-green-700",
  needs_improvement: "bg-amber-50 text-amber-700",
  poor: "bg-red-50 text-red-700",
};

const CATEGORIE_LABELS: Record<string, string> = {
  good: "Bon",
  needs_improvement: "À améliorer",
  poor: "Faible",
};

const NIVEAU_LABELS: Record<string, string> = {
  page: "Données réelles (page)",
  origin: "Données réelles (domaine)",
  lab: "Test en labo",
};

function MetricBadge({
  valeur,
  categorie,
  unite,
}: {
  valeur: number | null;
  categorie: string | null;
  unite: string;
}) {
  if (valeur === null || categorie === null) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const displayValue = unite === "" ? valeur.toFixed(2) : `${Math.round(valeur)}${unite}`;
  const style = CATEGORIE_STYLES[categorie] || "bg-gray-100 text-gray-500";

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-sm font-medium text-gray-900">{displayValue}</span>
      <span className={`text-[11px] px-2 py-0.5 rounded-full ${style}`}>
        {CATEGORIE_LABELS[categorie] || categorie}
      </span>
    </div>
  );
}

export default function SiteAuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [vitals, setVitals] = useState<CoreWebVital[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingCountRef = useRef(0);

  // --- Chargement initial des sites ---
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

  // --- Chargement des Core Web Vitals pour le site sélectionné ---
  const fetchVitals = useCallback(async (siteId: string) => {
    try {
      const data: CoreWebVital[] = await apiFetch(
        `/api/sites/${siteId}/core-web-vitals`
      );
      setVitals(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      setVitals([]);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!selectedSiteId) return;
    setVitalsLoading(true);
    setError("");
    fetchVitals(selectedSiteId).finally(() => setVitalsLoading(false));

    // Nettoyage du polling si on change de site en cours de route
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedSiteId, fetchVitals]);

  // --- Déclenchement d'un rafraîchissement (tâche async côté backend) ---
  const handleRefresh = async () => {
    if (!selectedSiteId) return;
    setRefreshing(true);
    setError("");

    try {
      await apiFetch(
        `/api/sites/${selectedSiteId}/core-web-vitals/refresh?nb_pages=10`,
        { method: "POST" }
      );
    } catch (err: any) {
      setError(err.message);
      setRefreshing(false);
      return;
    }

    // La tâche tourne en arrière-plan (jusqu'à plusieurs minutes).
    // On vérifie périodiquement si de nouveaux résultats sont arrivés.
    pollingCountRef.current = 0;
    const nombreAvant = vitals.length;
    const dateAvant = vitals[0]?.time;

    pollingRef.current = setInterval(async () => {
      pollingCountRef.current += 1;
      const data = await fetchVitals(selectedSiteId);

      const nouveauxResultats =
        data.length > 0 && data[0]?.time !== dateAvant;

      // On arrête le polling si de nouveaux résultats sont détectés,
      // ou après 2 minutes (12 x 10s) pour ne pas tourner indéfiniment.
      if (nouveauxResultats || pollingCountRef.current >= 12) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setRefreshing(false);
      }
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      {/* Header + site selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Site Audit</h1>

        <div className="flex items-center gap-3">
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

          <button
            onClick={handleRefresh}
            disabled={!selectedSiteId || refreshing}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {refreshing ? "Analyse en cours..." : "Rafraîchir"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      {refreshing && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-md">
          Récupération des Core Web Vitals en cours (jusqu'à quelques minutes selon
          les pages)... Cette page se mettra à jour automatiquement.
        </div>
      )}

      {sites.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
          No sites yet. Add one from the Sites page.
        </div>
      ) : vitalsLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : vitals.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
          Aucune donnée Core Web Vitals pour
          {selectedSite ? ` ${selectedSite.domain}` : " ce site"}. Clique sur
          "Rafraîchir" pour lancer une première analyse.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                <th className="text-left px-5 py-3">Page</th>
                <th className="text-left px-5 py-3">Source</th>
                <th className="text-left px-5 py-3">LCP</th>
                <th className="text-left px-5 py-3">INP</th>
                <th className="text-left px-5 py-3">CLS</th>
                <th className="text-left px-5 py-3">FCP</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-blue-600 truncate max-w-[280px]">
                    {v.page_url}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {NIVEAU_LABELS[v.niveau] || v.niveau}
                  </td>
                  <td className="px-5 py-3">
                    <MetricBadge valeur={v.lcp} categorie={v.lcp_categorie} unite="ms" />
                  </td>
                  <td className="px-5 py-3">
                    <MetricBadge valeur={v.inp} categorie={v.inp_categorie} unite="ms" />
                  </td>
                  <td className="px-5 py-3">
                    <MetricBadge valeur={v.cls} categorie={v.cls_categorie} unite="" />
                  </td>
                  <td className="px-5 py-3">
                    <MetricBadge valeur={v.fcp} categorie={v.fcp_categorie} unite="ms" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}