"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("access_token");
    const err = searchParams.get("error");

    if (err) {
      setError(err);
      return;
    }

    if (token) {
      localStorage.setItem("token", token);
      router.replace("/dashboard");
    } else {
      setError("Token manquant. Réessayez la connexion Google.");
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Retour au login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Connexion en cours...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Connexion en cours...</p>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}