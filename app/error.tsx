"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 px-6">
      <div className="max-w-md text-center">
        <div className="text-xs uppercase tracking-widest text-lumen-flag mb-3">
          Error
        </div>
        <h1 className="text-2xl font-bold mb-3">Algo se rompió</h1>
        <p className="text-sm text-stone-400 mb-6 font-mono break-words">
          {error?.message ?? "Error desconocido"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 rounded bg-lumen-glow text-stone-950 font-semibold hover:bg-lumen-glowHover transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded border border-stone-700 hover:border-stone-500 transition-colors"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
