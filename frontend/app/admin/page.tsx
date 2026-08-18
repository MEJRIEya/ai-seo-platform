"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface AdminStats {
  total_users: number;
  active_users: number;
  total_sites: number;
  total_recommendations: number;
  recommendations_open: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data: AdminStats = await apiFetch("/admin/stats");
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Vue d&rsquo;ensemble de la plateforme, tous utilisateurs confondus.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Utilisateurs</p>
          <p className="text-2xl font-semibold text-gray-900">
            {stats?.total_users ?? "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Comptes actifs</p>
          <p className="text-2xl font-semibold text-gray-900">
            {stats?.active_users ?? "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Sites connectés</p>
          <p className="text-2xl font-semibold text-gray-900">
            {stats?.total_sites ?? "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Recommandations générées</p>
          <p className="text-2xl font-semibold text-gray-900">
            {stats?.total_recommendations ?? "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">À traiter</p>
          <p className="text-2xl font-semibold text-gray-900">
            {stats?.recommendations_open ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}