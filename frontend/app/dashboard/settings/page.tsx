"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface GoogleAccount {
  id: string;
  google_email: string;
  scopes?: string;
  created_at?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profil
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const load = async () => {
      try {
        const me: User = await apiFetch("/auth/me");
        setUser(me);
        setFullName(me.full_name || "");

        try {
          const googleAccounts: GoogleAccount[] = await apiFetch("/google/accounts");
          setAccounts(googleAccounts);
        } catch {
          setAccounts([]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const updated: User = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName }),
      });
      setUser(updated);
      setSuccess("Profil mis à jour");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch("/auth/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setSuccess("Mot de passe modifié");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleConnectGoogle = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    // Ouvre le flow OAuth (le backend redirige vers Google)
    window.location.href = `http://127.0.0.1:8000/google/connect?token=${token}`;
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Profil, sécurité et connexions Google
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
          {success}
        </div>
      )}

      {/* Profil */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-4">Profil</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {savingProfile ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-4">Changer le mot de passe</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {savingPassword ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>

      {/* Comptes Google */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900">Comptes Google</h2>
          <button
            onClick={handleConnectGoogle}
            className="text-sm border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50"
          >
            + Connecter Google
          </button>
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aucun compte Google connecté. Connectez-en un pour importer GSC / GA4.
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {acc.google_email || acc.id}
                  </p>
                  <p className="text-xs text-gray-400">Connecté</p>
                </div>
                <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                  Actif
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}