"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Une erreur est survenue, réessayez.");
      }

      // Le backend répond toujours pareil, que l'email existe ou non
      // (protection contre l'énumération) — donc on affiche toujours ce message.
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight">
          AI SEO Platform
        </Link>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Vérifiez votre boîte mail
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Si un compte existe pour <span className="font-medium">{email}</span>,
              un lien de réinitialisation vient d&rsquo;être envoyé. Le lien expire
              dans 30 minutes.
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
              Mot de passe oublié
            </h2>
            <p className="text-sm text-gray-500 mb-8 text-center">
              Entrez votre email et nous vous enverrons un lien pour réinitialiser
              votre mot de passe.
            </p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  placeholder="name@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link
                href="/auth/login"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}