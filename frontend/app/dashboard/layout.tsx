"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { name: string; href: string };
type NavGroup = { label: string; items: NavItem[] };
type Toolkit = {
  id: string;
  name: string;
  groups: NavGroup[];
};

const toolkits: Toolkit[] = [
  {
    id: "seo",
    name: "SEO",
    groups: [
      {
        label: "",
        items: [{ name: "Dashboard", href: "/dashboard" }],
      },
      {
        label: "Site Performance",
        items: [
          { name: "Site Overview", href: "/dashboard/performance" },
          { name: "Position Tracking", href: "/dashboard/positions" },
          { name: "Site Audit", href: "/dashboard/site-audit" },
        ],
      },
      {
        label: "Keyword Research",
        items: [
          { name: "Keyword Overview", href: "/dashboard/keywords" },
          { name: "Top Pages", href: "/dashboard/top-pages" },
        ],
      },
      {
        label: "AI Insights",
        items: [
          { name: "Recommendations", href: "/dashboard/recommendations" },
        ],
      },
      {
        label: "Account",
        items: [
          { name: "Sites", href: "/dashboard/sites" },
          { name: "Billing", href: "/dashboard/billing" },
          { name: "Settings", href: "/dashboard/settings" },
        ],
      },
    ],
  },
  {
    id: "reports",
    name: "Reports",
    groups: [
      {
        label: "",
        items: [{ name: "My Reports", href: "/dashboard/reports" }],
      },
      {
        label: "Templates",
        items: [
          { name: "Google Analytics 4", href: "/dashboard/reports/ga4" },
          { name: "Google Search Console", href: "/dashboard/reports/gsc" },
          { name: "Monthly SEO", href: "/dashboard/reports/monthly-seo" },
        ],
      },
      {
        label: "Builder",
        items: [
          { name: "Create report", href: "/dashboard/reports/create" },
          { name: "Templates", href: "/dashboard/reports/templates" },
        ],
      },
    ],
  },
  {
    id: "content",
    name: "Content",
    groups: [
      {
        label: "",
        items: [{ name: "Dashboard", href: "/dashboard/content" }],
      },
      {
        label: "AI Tools",
        items: [
          { name: "AI Article Generator", href: "/dashboard/content/ai-article" },
          { name: "Content Optimizer", href: "/dashboard/content/optimizer" },
          { name: "Topic Finder", href: "/dashboard/content/topics" },
        ],
      },
      {
        label: "Library",
        items: [{ name: "My Content", href: "/dashboard/content/library" }],
      },
    ],
  },
];

function getActiveToolkit(pathname: string): string {
  if (pathname.startsWith("/dashboard/reports")) return "reports";
  if (pathname.startsWith("/dashboard/content")) return "content";
  return "seo";
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  has_used_trial: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeToolkit, setActiveToolkit] = useState(getActiveToolkit(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");

  useEffect(() => {
    setActiveToolkit(getActiveToolkit(pathname));
  }, [pathname]);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data: SubscriptionInfo = await apiFetch("/billing/subscription");
        setSubscription(data);
      } catch {
        // Silencieux
      }
    };
    fetchSubscription();
  }, []);

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setTrialError("");
    try {
      const data: { checkout_url: string } = await apiFetch("/billing/start-trial", {
        method: "POST",
      });
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setTrialError(err.message || "Impossible de démarrer l'essai");
      setTrialLoading(false);
    }
  };

  const current = toolkits.find((t) => t.id === activeToolkit) || toolkits[0];

  const showTrialButton =
    subscription && subscription.plan === "free" && !subscription.has_used_trial;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Icon rail — fixe, surface sombre dédiée indépendante du thème */}
      <aside className="w-14 h-screen bg-rail flex flex-col items-center py-3 gap-1 shrink-0 z-30">
        <div className="mb-4 w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
          AI
        </div>

        {toolkits.map((tk) => {
          const isActive = activeToolkit === tk.id;
          return (
            <div key={tk.id} className="relative group">
              <button
                onClick={() => {
                  setActiveToolkit(tk.id);
                  setSidebarOpen(true);
                  const firstHref = tk.groups[0]?.items[0]?.href;
                  if (firstHref) router.push(firstHref);
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-semibold transition ${
                  isActive
                    ? "bg-white/15 text-rail-foreground-active"
                    : "text-rail-foreground hover:bg-white/10 hover:text-rail-foreground-active"
                }`}
                title={tk.name}
              >
                {tk.name.slice(0, 3).toUpperCase()}
              </button>

              {/* Card au survol */}
              <div className="pointer-events-none absolute left-full top-0 ml-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="pointer-events-auto w-56 bg-popover rounded-xl shadow-xl ring-1 ring-foreground/10 py-3">
                  <div className="px-4 pb-2 mb-1 border-b border-border">
                    <p className="text-sm font-semibold text-popover-foreground">
                      {tk.name}
                    </p>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {tk.groups.map((group, gIdx) => (
                      <div key={gIdx} className="px-2 py-1">
                        {group.label && (
                          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {group.label}
                          </p>
                        )}
                        {group.items.map((item) => (
                          <button
                            key={item.href}
                            onClick={() => {
                              setActiveToolkit(tk.id);
                              setSidebarOpen(true);
                              router.push(item.href);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition ${
                              pathname === item.href
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/auth/login");
          }}
          className="w-10 h-10 rounded-lg text-rail-foreground hover:bg-white/10 hover:text-rail-foreground-active text-[10px]"
          title="Log out"
        >
          OUT
        </button>
      </aside>

      {/* Sidebar secondaire */}
      <aside
        className={`h-screen bg-card border-r border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0 border-r-0"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border min-w-[240px] shrink-0">
          <span className="font-heading font-bold text-foreground text-lg tracking-tight">
            {current.name}
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition"
            title="Hide navigation"
          >
            «
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto min-w-[240px]">
          {current.groups.map((group, idx) => (
            <div key={idx} className="mb-1">
              {group.label && (
                <p className="px-6 mt-4 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5 px-3">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm transition ${
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
       <header className="h-14 bg-card border-b border-border flex items-center px-4 md:px-6 justify-between gap-4 shrink-0">
  <div className="flex items-center gap-2 min-w-0">
    {!sidebarOpen && (
      <button
        onClick={() => setSidebarOpen(true)}
        className="w-8 h-8 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition shrink-0"
        title="Show navigation"
      >
        »
      </button>
    )}
    <div className="text-sm text-muted-foreground truncate">
      Home <span className="mx-1">›</span>{" "}
      <span className="text-foreground">{current.name}</span>
    </div>
  </div>

  <div className="flex items-center gap-3 shrink-0">
    {trialError && (
      <span className="hidden md:inline text-xs text-destructive">
        {trialError}
      </span>
    )}

    {showTrialButton && (
      <Button
        onClick={handleStartTrial}
        disabled={trialLoading}
        className="hidden sm:inline-flex bg-success text-success-foreground hover:bg-success/90"
        size="sm"
      >
        {trialLoading ? "Redirecting..." : "Start free trial"}
      </Button>
    )}

    {subscription?.plan === "pro" && (
      <Badge
        variant="secondary"
        className="hidden sm:inline-flex bg-success/10 text-success hover:bg-success/10"
      >
        {subscription.status === "trialing" ? "Trial active" : "Pro plan"}
      </Badge>
    )}

    {/* Light / Dark mode */}
    <ThemeToggle />

    <Button onClick={() => router.push("/dashboard/sites")} size="sm">
      + Add Site
    </Button>
  </div>
</header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}