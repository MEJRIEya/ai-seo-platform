"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
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
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="h-screen flex bg-[#f4f5f7] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            SEO Plateform
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navGroups.map((group, idx) => (
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

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/auth/login");
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
          <div className="text-sm text-gray-500">
            Home <span className="mx-1">›</span>{" "}
            <span className="text-gray-900">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-800 transition">
              + Add Site
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}