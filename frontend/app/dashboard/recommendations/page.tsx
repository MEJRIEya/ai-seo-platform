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
  { label: string; badge: string; rail: string }
> = {
  critical: {
    label: "Critique",
    badge:
      "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
    rail: "bg-destructive",
  },
  important: {
    label: "Important",
    badge: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/20",
    rail: "bg-warning",
  },
  opportunity: {
    label: "Opportunité",
    badge: "bg-info/10 text-info ring-1 ring-inset ring-info/20",
    rail: "bg-info",
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
  const [info, setInfo] = useState("");

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

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
    setInfo("");
    fetchRecs(selectedSiteId).finally(() => setRecsLoading(false));
  }, [selectedSiteId]);

  const handleGenerate = async (force = false) => {
    if (!selectedSiteId) return;

    if (force) {
      const ok = window.confirm(
        "Cela supprimera toutes les recommandations existantes (y compris celles marquées faites ou ignorées) et en générera de nouvelles. Continuer ?"
      );
      if (!ok) return;
    }

    setGenerating(true);
    setError("");
    setInfo("");

    try {
      const qs = force ? "?force=true" : "";
      const res = await apiFetch(
        `/api/sites/${selectedSiteId}/recommendations/generate${qs}`,
        { method: "POST" }
      );

      // Cache hit : pas d'appel Grok
      if (res?.status === "already_exists") {
        setInfo(
          res.message ||
            "Des recommandations existent déjà. Utilisez « Régénérer » pour forcer une nouvelle analyse."
        );
        setGenerating(false);
        return;
      }

      setInfo(
        force
          ? "Régénération lancée… actualisation dans quelques secondes."
          : "Analyse lancée… actualisation dans quelques secondes."
      );

      setTimeout(() => {
        fetchRecs(selectedSiteId).finally(() => {
          setGenerating(false);
          setInfo("");
        });
      }, 4000);
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const handleStatusChange = async (rec: Recommendation, newStatus: Status) => {
    setUpdatingId(rec.id);
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
      setRecs((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: rec.status } : r))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const base = {
      critical: 0,
      important: 0,
      opportunity: 0,
      open: 0,
      done: 0,
    };
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
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [recs, severityFilter, statusFilter]);

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Diagnostics et actions générés par l&rsquo;IA à partir de vos
            données GA4 et Search Console.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-w-[220px]"
          >
            {sites.length === 0 && <option value="">No sites</option>}
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain}
              </option>
            ))}
          </select>

          {recs.length === 0 ? (
            <button
              onClick={() => handleGenerate(false)}
              disabled={!selectedSiteId || generating}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating && (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
              )}
              {generating ? "Analyse en cours..." : "Lancer une analyse"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("open");
                  setSeverityFilter("all");
                }}
                className="text-sm border border-border bg-card text-foreground px-4 py-2 rounded-md hover:bg-muted transition"
              >
                Voir les recommandations ({recs.length})
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={!selectedSiteId || generating}
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating && (
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                )}
                {generating ? "Régénération..." : "Régénérer"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {info && !error && (
        <div className="bg-primary/10 text-primary text-sm p-3 rounded-md">
          {info}
        </div>
      )}

      {sites.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-10 text-center text-muted-foreground">
          No sites yet. Add one from the Sites page.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <p className="text-sm text-muted-foreground">Critique</p>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {counts.critical}
              </p>
            </div>
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-warning" />
                <p className="text-sm text-muted-foreground">Important</p>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {counts.important}
              </p>
            </div>
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-info" />
                <p className="text-sm text-muted-foreground">Opportunité</p>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {counts.opportunity}
              </p>
            </div>
            <div className="bg-card rounded-lg border border-border p-5">
              <p className="text-sm text-muted-foreground mb-1">Résolues</p>
              <p className="text-2xl font-semibold text-foreground">
                {counts.done}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {recs.length}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-card border border-border rounded-md p-1">
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
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-input rounded-md px-3 py-1.5 text-xs bg-background text-foreground"
            >
              <option value="open">À traiter</option>
              <option value="done">Résolues</option>
              <option value="dismissed">Ignorées</option>
              <option value="all">Toutes</option>
            </select>
          </div>

          {recsLoading ? (
            <div className="text-muted-foreground">
              Loading recommendations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm mb-1">
                {recs.length === 0
                  ? "Aucune recommandation pour ce site pour l'instant."
                  : "Aucune recommandation ne correspond à ces filtres."}
              </p>
              {recs.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Cliquez sur « Lancer une analyse » pour générer un diagnostic
                  à partir des données{" "}
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
                    className={`relative bg-card rounded-lg border border-border pl-5 pr-5 py-4 flex items-start gap-4 transition ${
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
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success ring-1 ring-inset ring-success/20">
                            Résolue
                          </span>
                        )}
                        {rec.status === "dismissed" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Ignorée
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(rec.created_at)}
                        </span>
                      </div>

                      <h3
                        className={`text-sm font-semibold text-foreground mb-1 ${
                          isResolved ? "line-through" : ""
                        }`}
                      >
                        {rec.title}
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {rec.reasoning}
                      </p>

                      {rec.estimated_impact && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
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
                            className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40 whitespace-nowrap"
                          >
                            Marquer fait
                          </button>
                          <button
                            onClick={() => handleStatusChange(rec, "dismissed")}
                            disabled={isUpdating}
                            className="text-xs font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted transition disabled:opacity-40 whitespace-nowrap"
                          >
                            Ignorer
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(rec, "open")}
                          disabled={isUpdating}
                          className="text-xs font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted transition disabled:opacity-40 whitespace-nowrap"
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