"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ background: "#0a0a0b", color: "#fafaf9", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "440px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#F87171", marginBottom: "12px" }}>
            Error fatal
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
            Algo salió muy mal
          </h1>
          <p style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "24px", fontFamily: "monospace", wordBreak: "break-word" }}>
            {error?.message ?? "Error desconocido"}
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 22px", borderRadius: "6px", background: "#FBBF24", color: "#0a0a0b", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
