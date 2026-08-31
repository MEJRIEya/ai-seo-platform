"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingUrl = searchParams.get("url") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startAuditAndGo = async (token: string) => {
    if (!pendingUrl) {
      // Pas d'URL → page billing / upgrade, PAS le dashboard complet
      router.replace("/billing");
      return;
    }

    const res = await fetch(`${API_URL}/audit/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: pendingUrl }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail =
        typeof data.detail === "string"
          ? data.detail
          : data.detail?.message || "Impossible de démarrer l'audit";
      throw new Error(detail);
    }

    const data = await res.json();
    if (!data.audit_id) {
      throw new Error("Réponse API invalide : audit_id manquant");
    }

    // Page rapport HORS dashboard
    router.replace(`/audit/${data.audit_id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: email.split("@")[0],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail = data.detail;
        throw new Error(
          typeof detail === "string" ? detail : "Erreur lors de l'inscription"
        );
      }

      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!loginRes.ok) {
        router.push(
          pendingUrl
            ? `/auth/login?url=${encodeURIComponent(pendingUrl)}`
            : "/auth/login"
        );
        return;
      }

      const loginData = await loginRes.json();
      localStorage.setItem("token", loginData.access_token);
      await startAuditAndGo(loginData.access_token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // next = page start audit hors dashboard
    const next = pendingUrl
      ? `?next=${encodeURIComponent(`/audit/start?url=${pendingUrl}`)}`
      : `?next=${encodeURIComponent("/billing")}`;
    window.location.href = `${API_URL}/auth/google/login${next}`;
  };

  const loginHref = pendingUrl
    ? `/auth/login?url=${encodeURIComponent(pendingUrl)}`
    : "/auth/login";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <Link
          href="/"
          className="text-2xl font-bold text-gray-900 tracking-tight"
        >
          AI SEO Platform
        </Link>
      </div>

      <div className="w-full max-w-[420px]">
        <h2 className="text-3xl font-semibold text-gray-900 mb-2 text-center">
          Create your account
        </h2>

        {pendingUrl && (
          <p className="mb-6 text-center text-sm text-gray-500">
            Audit gratuit prévu pour{" "}
            <span className="font-medium text-gray-800">{pendingUrl}</span>
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition mb-6 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Continue with Google
          </span>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              ✉
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setShowPasswordField(true)}
              required
              className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition bg-white"
              placeholder="Email"
            />
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showPasswordField
                ? "max-h-20 opacity-100 translate-y-0"
                : "max-h-0 opacity-0 -translate-y-2"
            }`}
          >
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={showPasswordField}
                minLength={8}
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition bg-white"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition disabled:opacity-50 mt-2"
          >
            {loading
              ? "Creating account..."
              : pendingUrl
                ? "Create account & start audit"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500 text-center">
          By creating your account, you agree to the{" "}
          <span className="text-violet-600">Terms of Service</span> and{" "}
          <span className="text-violet-600">Privacy Policy</span>
        </p>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="text-violet-600 hover:text-violet-700 font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}