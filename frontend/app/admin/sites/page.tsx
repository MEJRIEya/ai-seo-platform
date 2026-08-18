"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface AdminSite {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
  created_at: string;
  owner_email: string;
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const data: AdminSite[] = await apiFetch("/admin/sites");
        setSites(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {sites.length} site{sites.length > 1 ? "s" : ""} connecté
          {sites.length > 1 ? "s" : ""}, tous utilisateurs confondus.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {sites.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            Aucun site connecté pour l&rsquo;instant.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                <th className="text-left px-5 py-3">Domaine</th>
                <th className="text-left px-5 py-3">Propriétaire</th>
                <th className="text-left px-5 py-3">GSC</th>
                <th className="text-left px-5 py-3">GA4</th>
                <th className="text-left px-5 py-3">Ajouté le</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const gscBadge = site.gsc_property_url
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500";
                const ga4Badge = site.ga4_property_id
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500";

                return (
                  <tr key={site.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {site.domain}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{site.owner_email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${gscBadge}`}>
                        {site.gsc_property_url ? "Connected" : "Not set"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${ga4Badge}`}>
                        {site.ga4_property_id ? "Connected" : "Not set"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(site.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}