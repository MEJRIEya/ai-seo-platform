"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

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
      lcp?: { display?: string; title?: string };
      cls?: { display?: string };
      inp?: { display?: string };
      fcp?: { display?: string };
    };
  } | null;
  psi_desktop: {
    summary?: {
      performance?: number;
      seo?: number;
    };
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
    <div className="flex flex-col items-center p-4 rounded-xl border border-gray-200 bg-white">
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
  const auditId = params.auditId as string; // si tu gardes [siteId], utilise params.siteId

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/audit/${auditId}`);
      setAudit(data);
      setError("");
      return data as AuditData;
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

  if (loading && !audit) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-gray-500">
        Chargement de l&apos;audit...
      </div>
    );
  }

  if (error && !audit) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>
        <Link href="/dashboard" className="text-violet-600 text-sm mt-4 inline-block">
          ← Dashboard
        </Link>
      </div>
    );
  }

  if (!audit) return null;

  const pending = audit.status === "pending" || audit.status === "running";
  const mobile = audit.psi_mobile?.summary;
  const desktop = audit.psi_desktop?.summary;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Audit SEO gratuit
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {audit.domain || "Site"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Statut :{" "}
            <span className="font-medium text-gray-800">{audit.status}</span>
            {audit.is_free && " · Plan free"}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-violet-600 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      {pending && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 animate-pulse">
          Analyse PageSpeed en cours (mobile + desktop). Actualisation
          automatique…
        </div>
      )}

      {audit.status === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Échec de l&apos;audit : {audit.error_message || "erreur inconnue"}
        </div>
      )}

      {audit.status === "done" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <h2 className="font-semibold text-gray-900 mb-3">
              Core Web Vitals (mobile)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">LCP</p>
                <p className="font-medium">{mobile?.lcp?.display ?? "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">CLS</p>
                <p className="font-medium">{mobile?.cls?.display ?? "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">INP</p>
                <p className="font-medium">{mobile?.inp?.display ?? "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">FCP</p>
                <p className="font-medium">{mobile?.fcp?.display ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Audit gratuit utilisé</p>
            <p className="mt-1 text-amber-800/80">
              Pour connecter Google Search Console, GA4 et les recommandations
              IA, passez Premium ou achetez des crédits.
            </p>
            <Link
              href="/dashboard/billing"
              className="inline-block mt-3 font-semibold text-violet-700 hover:underline"
            >
              Voir les offres →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}