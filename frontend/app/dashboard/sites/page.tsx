"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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

function ConnectionBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-50 gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Connecté
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100">
      Non connecté
    </Badge>
  );
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
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Vous devez être connecté pour lier un compte Google.");
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    window.location.href = `${API_URL}/google/connect?token=${encodeURIComponent(token)}`;
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
          <Button variant="outline" onClick={handleConnectGoogle}>
            Connecter Google
          </Button>
          <Button onClick={() => setShowAddModal(true)}>+ Ajouter un site</Button>
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {sites.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="mb-1">Aucun site pour le moment</p>
            <p className="text-sm">Ajoutez votre premier site pour commencer</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Search Console</TableHead>
                <TableHead>Google Analytics</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell>
                    <p className="text-sm font-medium text-gray-900">{site.domain}</p>
                    <p className="text-xs text-gray-400">
                      Ajouté le{" "}
                      {new Date(site.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ConnectionBadge connected={!!site.gsc_property_url} />
                  </TableCell>
                  <TableCell>
                    <ConnectionBadge connected={!!site.ga4_property_id} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(site.id)}
                      disabled={deletingId === site.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === site.id ? "..." : "Supprimer"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal Ajouter un site */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un site</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="domain">Domaine *</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
                placeholder="www.exemple.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gsc">URL propriété GSC</Label>
              <Input
                id="gsc"
                value={gscPropertyUrl}
                onChange={(e) => setGscPropertyUrl(e.target.value)}
                placeholder="https://www.exemple.com/ ou sc-domain:exemple.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ga4">ID propriété GA4</Label>
              <Input
                id="ga4"
                value={ga4PropertyId}
                onChange={(e) => setGa4PropertyId(e.target.value)}
                placeholder="123456789"
              />
            </div>

            {googleAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>Compte Google</Label>
                <Select
                  value={googleAccountId}
                  onValueChange={(v) => setGoogleAccountId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un compte">
                      {
                        googleAccounts.find((a) => a.id === googleAccountId)
                          ?.google_email
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {googleAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.google_email || acc.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddModal(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || !domain.trim()}>
                {submitting ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}