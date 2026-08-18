"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface NavItem {
  name: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/admin" },
  { name: "Users", href: "/admin/users" },
  { name: "Sites", href: "/admin/sites" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const checkAdmin = async () => {
      try {
        const me = await apiFetch("/auth/me");
        if (!me.is_admin) {
          router.push("/dashboard");
          return;
        }
        setAuthorized(true);
      } catch {
        router.push("/auth/login");
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-500">
        Vérification des accès...
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[#f4f5f7]">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 flex items-center gap-2 px-5 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            SEO Plateform
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-900 text-white px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
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
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <Link
            href="/dashboard"
            className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
          >
            ← Retour au dashboard
          </Link>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
          <div className="text-sm text-gray-500">
            Admin <span className="mx-1">›</span>{" "}
            <span className="text-gray-900">
              {NAV_ITEMS.find((i) => i.href === pathname)?.name || ""}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}