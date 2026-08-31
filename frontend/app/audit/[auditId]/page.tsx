"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface AuditData {
  id: string;
  site_id: string;
  domain: string | null;
  status: string;
  is_free: boolean;
  score_global: number | null;
  score_performance_mobile: number | null;
  score_performance_desktop: number | null;
  score_seo: number | null;
  psi_mobile: {
    summary?: {
      performance?: number;
      seo?: number;
      lcp?: { display?: string };
      cls?: { display?: string };
      inp?: { display?: string };
      fcp?: { display?: string };
    };
  } | null;
  psi_desktop: {
    summary?: { performance?: number; seo?: number };
  } | null;
  error_message: string | null;
}

function ScoreRing({
  label,
  score,
}: {
  label: string;
  score: number | null | undefined;
}) {
  const value = score ?? null;
  const color =
    value == null
      ? "text-gray-400"
      : value >= 90
        ? "text-green-600"
        : value >= 50
          ? "text-amber-500"
          : "text-red-500";

  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`text-3xl font-bold ${color}`}>
        {value != null ? value : "—"}
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center">{label}</div>
    </div>
  );
}

export default function AuditResultPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auditId || auditId === "undefined") {
      setError("Identifiant d'audit manquant. Relancez l'audit depuis l'accueil.");
      setLoading(false);
      return null;
    }
    try {
      const data = (await apiFetch(`/audit/${auditId}`)) as AuditData;
      setAudit(data);
      setError("");
      return data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      return null;
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      const data = await load();
      if (cancelled || !data) return;
      if (data.status === "done" || data.status === "failed") {
        if (timer) clearInterval(timer);
      }
    };

    tick();
    timer = setInterval(tick, 3000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [load, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-bold text-gray-900">
            AI SEO Platform
          </Link>
          <Link
            href="/dashboard/billing"
            className="text-sm font-medium text-violet-600 hover:underline"
          >
            Passer Premium
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {loading && !audit && (
          <p className="text-center text-gray-500">Chargement de l&apos;audit…</p>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <div className="mt-3">
              <Link href="/" className="font-medium text-violet-600">
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        )}

        {audit && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-violet-600 font-medium">
                Audit SEO gratuit
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                {audit.domain || "Site"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Statut : <strong>{audit.status}</strong>
                {audit.is_free ? " · Offre free (1 audit)" : ""}
              </p>
            </div>

            {(audit.status === "pending" || audit.status === "running") && (
              <div className="animate-pulse rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                Analyse PageSpeed en cours (mobile + desktop). Actualisation
                automatique…
              </div>
            )}

            {audit.status === "failed" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Échec : {audit.error_message || "erreur inconnue"}
              </div>
            )}

            {audit.status === "done" && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <ScoreRing label="Score global" score={audit.score_global} />
                  <ScoreRing
                    label="Perf. mobile"
                    score={audit.score_performance_mobile}
                  />
                  <ScoreRing
                    label="Perf. desktop"
                    score={audit.score_performance_desktop}
                  />
                  <ScoreRing label="SEO" score={audit.score_seo} />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h2 className="mb-3 font-semibold text-gray-900">
                    Core Web Vitals (mobile)
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-400">LCP</p>
                      <p className="font-medium">
                        {audit.psi_mobile?.summary?.lcp?.display ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">CLS</p>
                      <p className="font-medium">
                        {audit.psi_mobile?.summary?.cls?.display ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">INP</p>
                      <p className="font-medium">
                        {audit.psi_mobile?.summary?.inp?.display ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">FCP</p>
                      <p className="font-medium">
                        {audit.psi_mobile?.summary?.fcp?.display ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                  <p className="font-semibold">Audit gratuit terminé</p>
                  <p className="mt-1 text-amber-900/80">
                    Le dashboard complet (GSC, GA4, positions, IA) est réservé
                    aux comptes Premium.
                  </p>
                  <Link
                    href="/dashboard/billing"
                    className="mt-3 inline-block font-semibold text-violet-700 hover:underline"
                  >
                    Voir les offres Premium →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}