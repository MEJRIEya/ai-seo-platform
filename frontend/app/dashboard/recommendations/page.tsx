"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
}

type Severity = "critical" | "important" | "opportunity";
type Status = "open" | "done" | "dismissed";

interface Recommendation {
  id: string;
  site_id: string;
  title: string;
  reasoning: string;
  severity: Severity;
  status: Status;
  estimated_impact: string | null;
  created_at: string;
}

type SeverityFilter = "all" | Severity;
type StatusFilter = "open" | "done" | "dismissed" | "all";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; badge: string; dot: string; rail: string }
> = {
  critical: {
    label: "Critique",
    badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    dot: "bg-red-500",
    rail: "bg-red-500",
  },
  important: {
    label: "Important",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    dot: "bg-amber-500",
    rail: "bg-amber-500",
  },
  opportunity: {
    label: "Opportunité",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    dot: "bg-blue-500",
    rail: "bg-blue-500",
  },
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  important: 1,
  opportunity: 2,
};

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "hier";
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  // --- Sites ---
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
        if (sitesData.length > 0) setSelectedSiteId(sitesData[0].id);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [router]);

  // --- Recommendations ---
  const fetchRecs = async (siteId: string) => {
    try {
      const data: Recommendation[] = await apiFetch(
        `/api/sites/${siteId}/recommendations`
      );
      setRecs(data);
    } catch (err: any) {
      setError(err.message);
      setRecs([]);
    }
  };

  useEffect(() => {
    if (!selectedSiteId) return;
    setRecsLoading(true);
    setError("");
    fetchRecs(selectedSiteId).finally(() => setRecsLoading(false));
  }, [selectedSiteId]);

  const handleGenerate = async () => {
    if (!selectedSiteId) return;
    setGenerating(true);
    setError("");
    try {
      await apiFetch(`/api/sites/${selectedSiteId}/recommendations/generate`, {
        method: "POST",
      });
      // L'analyse tourne en arrière-plan (worker Celery) — on laisse un peu
      // de marge puis on rafraîchit une fois.
      setTimeout(() => {
        fetchRecs(selectedSiteId).finally(() => setGenerating(false));
      }, 4000);
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const handleStatusChange = async (rec: Recommendation, newStatus: Status) => {
    setUpdatingId(rec.id);
    // mise à jour optimiste
    setRecs((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, status: newStatus } : r))
    );
    try {
      await apiFetch(
        `/api/recommendations/${rec.id}/status?new_status=${newStatus}`,
        { method: "PATCH" }
      );
    } catch (err: any) {
      setError(err.message);
      // rollback si ça échoue
      setRecs((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: rec.status } : r))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // --- Derived data ---
  const counts = useMemo(() => {
    const base = { critical: 0, important: 0, opportunity: 0, open: 0, done: 0 };
    for (const r of recs) {
      base[r.severity] += 1;
      if (r.status === "open") base.open += 1;
      if (r.status === "done") base.done += 1;
    }
    return base;
  }, [recs]);

  const filtered = useMemo(() => {
    return recs
      .filter((r) => severityFilter === "all" || r.severity === severityFilter)
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .sort((a, b) => {
        const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sev !== 0) return sev;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [recs, severityFilter, statusFilter]);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      {/* Header + site selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Recommendations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Diagnostics et actions générés par l&rsquo;IA à partir de vos données
            GA4 et Search Console.
          </p>
        </div>

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
            onClick={handleGenerate}
            disabled={!selectedSiteId || generating}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating && (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {generating ? "Analyse en cours..." : "Lancer une analyse"}
          </button>
        </div>
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
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <p className="text-sm text-gray-500">Critique</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{counts.critical}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <p className="text-sm text-gray-500">Important</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{counts.important}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-sm text-gray-500">Opportunité</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {counts.opportunity}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Résolues</p>
              <p className="text-2xl font-semibold text-gray-900">
                {counts.done}
                <span className="text-sm font-normal text-gray-400">
                  {" "}
                  / {recs.length}
                </span>
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1">
              {(
                [
                  ["all", "Toutes"],
                  ["critical", "Critique"],
                  ["important", "Important"],
                  ["opportunity", "Opportunité"],
                ] as [SeverityFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSeverityFilter(value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                    severityFilter === value
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-gray-700"
            >
              <option value="open">À traiter</option>
              <option value="done">Résolues</option>
              <option value="dismissed">Ignorées</option>
              <option value="all">Toutes</option>
            </select>
          </div>

          {/* List */}
          {recsLoading ? (
            <div className="text-gray-500">Loading recommendations...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-sm mb-1">
                {recs.length === 0
                  ? "Aucune recommandation pour ce site pour l'instant."
                  : "Aucune recommandation ne correspond à ces filtres."}
              </p>
              {recs.length === 0 && (
                <p className="text-gray-400 text-xs">
                  Cliquez sur &laquo; Lancer une analyse &raquo; pour générer un
                  diagnostic à partir des données{" "}
                  {selectedSite ? `de ${selectedSite.domain}` : "du site"}.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((rec) => {
                const cfg = SEVERITY_CONFIG[rec.severity];
                const isUpdating = updatingId === rec.id;
                const isResolved = rec.status !== "open";

                return (
                  <div
                    key={rec.id}
                    className={`relative bg-white rounded-lg border border-gray-200 pl-5 pr-5 py-4 flex items-start gap-4 transition ${
                      isResolved ? "opacity-60" : ""
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${cfg.rail}`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                        {rec.status === "done" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-inset ring-green-200">
                            Résolue
                          </span>
                        )}
                        {rec.status === "dismissed" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Ignorée
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {timeAgo(rec.created_at)}
                        </span>
                      </div>

                      <h3
                        className={`text-sm font-semibold text-gray-900 mb-1 ${
                          isResolved ? "line-through" : ""
                        }`}
                      >
                        {rec.title}
                      </h3>

                      <p className="text-sm text-gray-600 leading-relaxed mb-2">
                        {rec.reasoning}
                      </p>

                      {rec.estimated_impact && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">
                            Impact estimé :
                          </span>
                          {rec.estimated_impact}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {rec.status === "open" ? (
                        <>
                          <button
                            onClick={() => handleStatusChange(rec, "done")}
                            disabled={isUpdating}
                            className="text-xs font-medium px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-40 whitespace-nowrap"
                          >
                            Marquer fait
                          </button>
                          <button
                            onClick={() => handleStatusChange(rec, "dismissed")}
                            disabled={isUpdating}
                            className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 whitespace-nowrap"
                          >
                            Ignorer
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(rec, "open")}
                          disabled={isUpdating}
                          className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 whitespace-nowrap"
                        >
                          Rouvrir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}