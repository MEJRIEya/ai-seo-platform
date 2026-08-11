"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
  created_at: string;
}

interface GoogleAccount {
  id: string;
  google_email: string;
}

export default function SitesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    domain: "",
    gsc_property_url: "",
    ga4_property_id: "",
    google_account_id: "",
  });

  const loadData = async () => {
    try {
      const sitesData = await apiFetch("/sites/");
      const accountsData = await apiFetch("/google/accounts");
      setSites(sitesData);
      setAccounts(accountsData);
      if (accountsData.length > 0) {
        setForm((f) => ({ ...f, google_account_id: accountsData[0].id }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/sites/", {
        method: "POST",
        body: JSON.stringify({
          domain: form.domain,
          gsc_property_url: form.gsc_property_url,
          ga4_property_id: form.ga4_property_id || null,
          google_account_id: form.google_account_id,
        }),
      });
      setShowModal(false);
      setForm((f) => ({ ...f, domain: "", gsc_property_url: "", ga4_property_id: "" }));
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm("Supprimer ce site et toutes ses donnees associees ?")) return;
    try {
      await apiFetch("/sites/" + siteId, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={accounts.length === 0}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add Site
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      {accounts.length === 0 && (
        <div className="bg-amber-50 text-amber-700 text-sm p-4 rounded-md">
          Aucun compte Google connecte. Connectez d'abord un compte Google avant d'ajouter un site.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {sites.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            Aucun site pour l'instant. Cliquez sur "+ Add Site" pour commencer.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                <th className="text-left px-5 py-3">Domain</th>
                <th className="text-left px-5 py-3">GSC</th>
                <th className="text-left px-5 py-3">GA4</th>
                <th className="text-right px-5 py-3">Actions</th>
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
                const detailUrl = "/dashboard/performance?site=" + site.id;

                return (
                  <tr key={site.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{site.domain}</td>
                    <td className="px-5 py-3">
                      <span className={"text-xs px-2 py-1 rounded-full " + gscBadge}>
                        {site.gsc_property_url ? "Connected" : "Not set"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={"text-xs px-2 py-1 rounded-full " + ga4Badge}>
                        {site.ga4_property_id ? "Connected" : "Not set"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right space-x-3">
                      <a href={detailUrl} className="text-blue-600 hover:underline">
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Ajouter un site</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Domaine
                </label>
                <input
                  required
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="exemple.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Propriete Search Console
                </label>
                <input
                  required
                  value={form.gsc_property_url}
                  onChange={(e) =>
                    setForm({ ...form, gsc_property_url: e.target.value })
                  }
                  placeholder="sc-domain:exemple.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ID Propriete GA4 (optionnel)
                </label>
                <input
                  value={form.ga4_property_id}
                  onChange={(e) =>
                    setForm({ ...form, ga4_property_id: e.target.value })
                  }
                  placeholder="123456789"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Compte Google
                </label>
                <select
                  value={form.google_account_id}
                  onChange={(e) =>
                    setForm({ ...form, google_account_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.google_email || acc.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm px-4 py-2 rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-sm px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}