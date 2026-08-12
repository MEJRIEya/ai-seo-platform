"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeToolkit, setActiveToolkit] = useState(getActiveToolkit(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setActiveToolkit(getActiveToolkit(pathname));
  }, [pathname]);

  const current = toolkits.find((t) => t.id === activeToolkit) || toolkits[0];

  return (
    <div className="h-screen flex overflow-hidden bg-[#f4f5f7]">
            {/* Icon rail — fixe */}
      <aside className="w-14 h-screen bg-[#111827] flex flex-col items-center py-3 gap-1 shrink-0 z-30">
        <div className="mb-4 w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
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
                    ? "bg-white/15 text-white"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
                title={tk.name}
              >
                {tk.name.slice(0, 3).toUpperCase()}
              </button>

              {/* Card au survol */}
              <div className="pointer-events-none absolute left-full top-0 ml-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="pointer-events-auto w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-3">
                  <div className="px-4 pb-2 mb-1 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{tk.name}</p>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {tk.groups.map((group, gIdx) => (
                      <div key={gIdx} className="px-2 py-1">
                        {group.label && (
                          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
          className="w-10 h-10 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white text-[10px]"
          title="Log out"
        >
          OUT
        </button>
      </aside>

      {/* Sidebar secondaire — fixe, contenu interne scrollable si long */}
      <aside
        className={`h-screen bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0 border-r-0"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 min-w-[240px] shrink-0">
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            {current.name}
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center transition"
            title="Hide navigation"
          >
            «
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto min-w-[240px]">
          {current.groups.map((group, idx) => (
            <div key={idx} className="mb-1">
              {group.label && (
                <p className="px-6 mt-4 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
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
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
        {/* Header fixe */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 flex items-center justify-center transition shrink-0"
                title="Show navigation"
              >
                »
              </button>
            )}
            <div className="text-sm text-gray-500 truncate">
              Home <span className="mx-1">›</span>{" "}
              <span className="text-gray-900">{current.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button className="hidden sm:inline-flex text-sm font-medium bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md transition">
              Start free trial
            </button>
            <button
              onClick={() => router.push("/dashboard/sites")}
              className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-800 transition"
            >
              + Add Site
            </button>
          </div>
        </header>

        {/* SEUL le contenu de la page scroll */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}