"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface PlanDetails {
  name: string;
  max_sites: number;
  ai_recommendations: boolean;
  pdf_export: boolean;
  price_display: string;
}

interface PlansResponse {
  free: PlanDetails;
  pro: PlanDetails;
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  current_period_end: string | null;
  has_used_trial: boolean;
  limits: PlanDetails;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai en cours",
  past_due: "Paiement en retard",
  canceled: "Annulé",
};

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
          included ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
        }`}
      >
        {included ? "✓" : "–"}
      </span>
      <span className={included ? "text-gray-700" : "text-gray-400"}>{label}</span>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<"trial" | "checkout" | "portal" | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const load = async () => {
      try {
        const [plansData, subData] = await Promise.all([
          apiFetch("/billing/plans"),
          apiFetch("/billing/subscription"),
        ]);
        setPlans(plansData);
        setSubscription(subData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    const billingParam = searchParams.get("billing");
    if (billingParam === "success") {
      setMessage("Paiement confirmé — votre abonnement est en cours d'activation.");
    } else if (billingParam === "cancelled") {
      setError("Le paiement a été annulé. Vous pouvez réessayer à tout moment.");
    }
  }, [searchParams]);

  const handleStartTrial = async () => {
    setActionLoading("trial");
    setError("");
    try {
      const data: { checkout_url: string } = await apiFetch("/billing/start-trial", {
        method: "POST",
      });
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const handleCheckout = async () => {
    setActionLoading("checkout");
    setError("");
    try {
      const data: { checkout_url: string } = await apiFetch("/billing/checkout", {
        method: "POST",
      });
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    setActionLoading("portal");
    setError("");
    try {
      const data: { portal_url: string } = await apiFetch("/billing/portal", {
        method: "POST",
      });
      window.location.href = data.portal_url;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const isPro = subscription?.plan === "pro";
  const isFree = subscription?.plan === "free";
  const canStartTrial = isFree && !subscription?.has_used_trial;
  const canUpgradeNow = isFree && subscription?.has_used_trial;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Billing &amp; Plans</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Choisissez le plan adapté à vos besoins
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}
      {message && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
          {message}
        </div>
      )}

      {subscription && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
              Plan actuel
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">
                {subscription.limits.name}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isPro ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {STATUS_LABELS[subscription.status] || subscription.status}
              </span>
            </div>
            {subscription.current_period_end && (
              <p className="text-xs text-gray-400 mt-1">
                {subscription.status === "trialing" ? "Fin de l'essai" : "Prochain renouvellement"}
                {": "}
                {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>

          {isPro && (
            <button
              onClick={handleOpenPortal}
              disabled={actionLoading === "portal"}
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {actionLoading === "portal" ? "Redirecting..." : "Gérer mon abonnement"}
            </button>
          )}
        </div>
      )}

      {/* Comparaison des plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan Free */}
        <div
          className={`bg-white rounded-lg border p-6 ${
            isFree ? "border-gray-900" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {plans?.free.name || "Free"}
            </h2>
            {isFree && (
              <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">
                Actuel
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-5">
            {plans?.free.price_display}
          </p>

          <div className="space-y-2.5 mb-6">
            <FeatureRow label={`${plans?.free.max_sites} site connecté`} included={true} />
            <FeatureRow label="Recommandations IA" included={!!plans?.free.ai_recommendations} />
            <FeatureRow label="Export PDF" included={!!plans?.free.pdf_export} />
          </div>

          {isFree && (
            <p className="text-xs text-gray-400 text-center">Votre plan actuel</p>
          )}
        </div>

        {/* Plan Pro */}
        <div
          className={`bg-white rounded-lg border-2 p-6 relative ${
            isPro ? "border-green-600" : "border-gray-900"
          }`}
        >
          {!isPro && (
            <span className="absolute -top-3 left-6 text-xs bg-gray-900 text-white px-3 py-1 rounded-full">
              Recommandé
            </span>
          )}

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {plans?.pro.name || "Pro"}
            </h2>
            {isPro && (
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                Actuel
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-5">
            {plans?.pro.price_display}
          </p>

          <div className="space-y-2.5 mb-6">
            <FeatureRow label={`Jusqu'à ${plans?.pro.max_sites} sites connectés`} included={true} />
            <FeatureRow label="Recommandations IA" included={!!plans?.pro.ai_recommendations} />
            <FeatureRow label="Export PDF" included={!!plans?.pro.pdf_export} />
          </div>

          {canStartTrial && (
            <button
              onClick={handleStartTrial}
              disabled={actionLoading === "trial"}
              className="w-full text-sm bg-green-600 text-white px-4 py-2.5 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === "trial" ? "Redirecting..." : "Démarrer l'essai gratuit de 14 jours"}
            </button>
          )}

          {canUpgradeNow && (
            <button
              onClick={handleCheckout}
              disabled={actionLoading === "checkout"}
              className="w-full text-sm bg-gray-900 text-white px-4 py-2.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {actionLoading === "checkout" ? "Redirecting..." : "Passer au plan Pro"}
            </button>
          )}

          {isPro && (
            <p className="text-xs text-gray-400 text-center">Votre plan actuel</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Aucune surprise : la carte bancaire n'est débitée qu'à la fin de la période d'essai.
        Annulez à tout moment depuis "Gérer mon abonnement".
      </p>
    </div>
  );
}