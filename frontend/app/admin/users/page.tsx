"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  sites_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const data: AdminUser[] = await apiFetch("/admin/users");
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (user: AdminUser) => {
    setUpdatingId(user.id);
    setError("");
    const newStatus = !user.is_active;

    // mise à jour optimiste
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
    );

    try {
      await apiFetch(`/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: newStatus }),
      });
    } catch (err: any) {
      setError(err.message);
      // rollback
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {users.length} utilisateur{users.length > 1 ? "s" : ""} enregistré
          {users.length > 1 ? "s" : ""}.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
              <th className="text-left px-5 py-3">Utilisateur</th>
              <th className="text-left px-5 py-3">Rôle</th>
              <th className="text-left px-5 py-3">Sites</th>
              <th className="text-left px-5 py-3">Inscrit le</th>
              <th className="text-left px-5 py-3">Statut</th>
              <th className="text-right px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">
                    {user.full_name || "—"}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </td>
                <td className="px-5 py-3">
                  {user.is_admin ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      Utilisateur
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-700">{user.sites_count}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(user.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {user.is_active ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {user.is_admin ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={updatingId === user.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-md transition disabled:opacity-40 ${
                        user.is_active
                          ? "text-red-600 hover:bg-red-50"
                          : "text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {user.is_active ? "Désactiver" : "Activer"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}