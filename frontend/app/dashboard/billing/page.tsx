"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

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
          included
            ? "bg-success/15 text-success"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {included ? "✓" : "–"}
      </span>
      <span className={included ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
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
  const [actionLoading, setActionLoading] = useState<
    "trial" | "checkout" | "portal" | null
  >(null);

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
      setMessage(
        "Paiement confirmé — votre abonnement est en cours d'activation."
      );
    } else if (billingParam === "cancelled") {
      setError("Le paiement a été annulé. Vous pouvez réessayer à tout moment.");
    }
  }, [searchParams]);

  const handleStartTrial = async () => {
    setActionLoading("trial");
    setError("");
    try {
      const data: { checkout_url: string } = await apiFetch(
        "/billing/start-trial",
        { method: "POST" }
      );
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
      const data: { checkout_url: string } = await apiFetch(
        "/billing/checkout",
        { method: "POST" }
      );
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
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const isPro = subscription?.plan === "pro";
  const isFree = subscription?.plan === "free";
  const canStartTrial = isFree && !subscription?.has_used_trial;
  const canUpgradeNow = isFree && subscription?.has_used_trial;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground">
          Billing &amp; Plans
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choisissez le plan adapté à vos besoins
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-success/10 text-success text-sm p-3 rounded-md">
          {message}
        </div>
      )}

      {subscription && (
        <Card>
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                Plan actuel
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground">
                  {subscription.limits.name}
                </span>
                <Badge variant={isPro ? "secondary" : "outline"}>
                  {STATUS_LABELS[subscription.status] || subscription.status}
                </Badge>
              </div>
              {subscription.current_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subscription.status === "trialing"
                    ? "Fin de l'essai"
                    : "Prochain renouvellement"}
                  {": "}
                  {new Date(subscription.current_period_end).toLocaleDateString(
                    "fr-FR"
                  )}
                </p>
              )}
            </div>

            {isPro && (
              <Button
                variant="outline"
                onClick={handleOpenPortal}
                disabled={actionLoading === "portal"}
              >
                {actionLoading === "portal"
                  ? "Redirecting..."
                  : "Gérer mon abonnement"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <Card className={isFree ? "ring-2 ring-foreground" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plans?.free.name || "Free"}</CardTitle>
              {isFree && <Badge>Actuel</Badge>}
            </div>
            <p className="text-2xl font-bold text-foreground">
              {plans?.free.price_display}
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <FeatureRow
              label={`${plans?.free.max_sites} site connecté`}
              included={true}
            />
            <FeatureRow
              label="Recommandations IA"
              included={!!plans?.free.ai_recommendations}
            />
            <FeatureRow
              label="Export PDF"
              included={!!plans?.free.pdf_export}
            />
            {isFree && (
              <p className="text-xs text-muted-foreground text-center pt-4">
                Votre plan actuel
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pro */}
        <Card
          className={
            isPro ? "ring-2 ring-success relative" : "ring-2 ring-primary relative"
          }
        >
          {!isPro && (
            <span className="absolute -top-3 left-6 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full">
              Recommandé
            </span>
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plans?.pro.name || "Pro"}</CardTitle>
              {isPro && (
                <Badge className="bg-success text-success-foreground hover:bg-success">
                  Actuel
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">
              {plans?.pro.price_display}
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <FeatureRow
              label={`Jusqu'à ${plans?.pro.max_sites} sites connectés`}
              included={true}
            />
            <FeatureRow
              label="Recommandations IA"
              included={!!plans?.pro.ai_recommendations}
            />
            <FeatureRow
              label="Export PDF"
              included={!!plans?.pro.pdf_export}
            />

            {canStartTrial && (
              <Button
                className="w-full mt-4 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleStartTrial}
                disabled={actionLoading === "trial"}
              >
                {actionLoading === "trial"
                  ? "Redirecting..."
                  : "Démarrer l'essai gratuit de 14 jours"}
              </Button>
            )}

            {canUpgradeNow && (
              <Button
                className="w-full mt-4"
                onClick={handleCheckout}
                disabled={actionLoading === "checkout"}
              >
                {actionLoading === "checkout"
                  ? "Redirecting..."
                  : "Passer au plan Pro"}
              </Button>
            )}

            {isPro && (
              <p className="text-xs text-muted-foreground text-center pt-4">
                Votre plan actuel
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Aucune surprise : la carte bancaire n&apos;est débitée qu&apos;à la fin
        de la période d&apos;essai. Annulez à tout moment depuis &quot;Gérer mon
        abonnement&quot;.
      </p>
    </div>
  );
}