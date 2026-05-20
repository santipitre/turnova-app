"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="text-xs uppercase tracking-widest text-lumen-flag mb-3">
        Error en esta pantalla
      </div>
      <h2 className="text-xl font-bold text-stone-100 mb-3">
        No pudimos cargar los datos
      </h2>
      <p className="text-sm text-stone-400 mb-6 font-mono max-w-md break-words">
        {error?.message ?? "Error desconocido"}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2 rounded bg-lumen-glow text-stone-950 font-semibold hover:bg-lumen-glowHover transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
