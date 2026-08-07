"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Site Performance", href: "/dashboard/performance" },
  { name: "Site Audit", href: "/dashboard/audit" },
  { name: "Position Tracking", href: "/dashboard/positions" },
  { name: "Analytics", href: "/dashboard/analytics" },
  { name: "Recommendations", href: "/dashboard/recommendations" },
  { name: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-[#f4f5f7]">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            AI SEO
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              SEO
            </p>
          </div>

          <div className="space-y-0.5 px-3">
            {menuItems.map((item) => {
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