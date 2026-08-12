"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Site {
  id: string;
  domain: string;
  gsc_property_url: string | null;
  ga4_property_id: string | null;
  google_account_id: string | null;
  created_at: string;
}

interface GoogleAccount {
  id: string;
  google_email: string;
  connected_at: string;
}

export default function SitesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal ajout
  const [showAddModal, setShowAddModal] = useState(false);
  const [domain, setDomain] = useState("");
  const [gscPropertyUrl, setGscPropertyUrl] = useState("");
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [googleAccountId, setGoogleAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSites = async () => {
    try {
      const data: Site[] = await apiFetch("/sites/");
      setSites(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchGoogleAccounts = async () => {
    try {
      // Adapte si ton endpoint est différent
      const data: GoogleAccount[] = await apiFetch("/google/accounts").catch(() => []);
      setGoogleAccounts(data);
      if (data.length > 0 && !googleAccountId) {
        setGoogleAccountId(data[0].id);
      }
    } catch {
      setGoogleAccounts([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    Promise.all([fetchSites(), fetchGoogleAccounts()]).finally(() =>
      setLoading(false)
    );
  }, [router]);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch("/sites/", {
        method: "POST",
        body: JSON.stringify({
          domain: domain.trim(),
          gsc_property_url: gscPropertyUrl.trim() || null,
          ga4_property_id: ga4PropertyId.trim() || null,
          google_account_id: googleAccountId || null,
        }),
      });

      setSuccess("Site ajouté avec succès");
      setShowAddModal(false);
      setDomain("");
      setGscPropertyUrl("");
      setGa4PropertyId("");
      await fetchSites();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm("Supprimer ce site ? Cette action est irréversible.")) return;

    setDeletingId(siteId);
    setError("");
    try {
      await apiFetch(`/sites/${siteId}`, { method: "DELETE" });
      setSites((prev) => prev.filter((s) => s.id !== siteId));
      setSuccess("Site supprimé");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConnectGoogle = () => {
    // Redirige vers le flow OAuth backend
    window.location.href = "http://127.0.0.1:8000/google/connect";
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez vos sites et leurs connexions GSC / GA4
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConnectGoogle}
            className="text-sm border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition"
          >
            Connecter Google
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
          >
            + Ajouter un site
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
          {success}
        </div>
      )}

      {/* Liste des sites */}
      <div className="bg-white rounded-lg border border-gray-200">
        {sites.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="mb-1">Aucun site pour le moment</p>
            <p className="text-sm">Ajoutez votre premier site pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="px-5 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-gray-400">
              <div className="col-span-4">Domain</div>
              <div className="col-span-3">Search Console</div>
              <div className="col-span-3">Google Analytics</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {sites.map((site) => (
              <div
                key={site.id}
                className="px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50"
              >
                <div className="col-span-4">
                  <p className="text-sm font-medium text-gray-900">{site.domain}</p>
                  <p className="text-xs text-gray-400">
                    Ajouté le{" "}
                    {new Date(site.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="col-span-3">
                  {site.gsc_property_url ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Connecté
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Non connecté
                    </span>
                  )}
                </div>

                <div className="col-span-3">
                  {site.ga4_property_id ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Connecté
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Non connecté
                    </span>
                  )}
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => handleDelete(site.id)}
                    disabled={deletingId === site.id}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-40"
                  >
                    {deletingId === site.id ? "..." : "Supprimer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajouter un site */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ajouter un site
            </h2>

            <form onSubmit={handleAddSite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domaine *
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                  placeholder="www.exemple.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL propriété GSC
                </label>
                <input
                  type="text"
                  value={gscPropertyUrl}
                  onChange={(e) => setGscPropertyUrl(e.target.value)}
                  placeholder="https://www.exemple.com/ ou sc-domain:exemple.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID propriété GA4
                </label>
                <input
                  type="text"
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  placeholder="123456789"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {googleAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compte Google
                  </label>
                  <select
                    value={googleAccountId}
                    onChange={(e) => setGoogleAccountId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    {googleAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.google_email || acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !domain.trim()}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40"
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