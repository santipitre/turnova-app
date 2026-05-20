"use client";

/**
 * Lector público de pedido médico (modo demo).
 * Sin login. No guarda en DB. Solo extrae datos con Claude Vision y los muestra.
 * URL: /lector-publico
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Loader2, FileText, X, CheckCircle2, Sparkles } from "lucide-react";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
];
const MAX_SIZE_MB = 10;

function isAllowed(file: File): boolean {
  if (ALLOWED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic|heif|pdf)$/.test(name);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface DatosExtraidos {
  paciente?: string | null;
  obra_social?: string | null;
  numero_afiliado?: string | null;
  practica_solicitada?: string | null;
  diagnostico?: string | null;
  medico_solicitante?: string | null;
  matricula_medico?: string | null;
  fecha?: string | null;
  urgencia_indicada?: boolean | null;
  confianza?: number | null;
  [key: string]: unknown;
}

export default function LectorPublicoPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datos, setDatos] = useState<DatosExtraidos | null>(null);
  const [tiempoMs, setTiempoMs] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const setSelectedFile = useCallback((f: File | null) => {
    setError(null);
    setDatos(null);
    setTiempoMs(null);
    if (!f) {
      setFile(null);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (!isAllowed(f)) {
      setError(
        `Tipo de archivo no soportado: ${f.name} (${f.type || "desconocido"}). Solo JPG, PNG, WEBP, GIF, HEIC o PDF.`,
      );
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(
        `Archivo muy grande: ${(f.size / 1024 / 1024).toFixed(1)} MB · Máximo ${MAX_SIZE_MB} MB.`,
      );
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } else {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    if (e.target) e.target.value = "";
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function clearFile() {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setSelectedFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Subí un archivo del pedido médico");
      return;
    }
    setLoading(true);
    setError(null);
    setDatos(null);
    setTiempoMs(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/procesar-pedido-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archivo_base64: base64,
          media_type: file.type || "image/jpeg",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Error desconocido");
      }
      setDatos(json.datos);
      setTiempoMs(json.metrica?.tiempo_ms ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-300/10 border border-amber-300/30 rounded-full px-3 py-1">
            <Sparkles className="h-3 w-3" />
            MODO DEMO · SIN LOGIN · NO SE GUARDAN DATOS
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            Lector de Pedido Médico · Turnova IA
          </h1>
          <p className="text-stone-400">
            Subí la foto o PDF del pedido médico. La IA extrae automáticamente paciente, obra social, práctica solicitada, médico, matrícula y diagnóstico.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-6">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFilePicker();
                }
              }}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={[
                "block border-2 border-dashed rounded-md p-8 transition-colors cursor-pointer text-center select-none",
                isDragging
                  ? "border-amber-300 bg-amber-300/5"
                  : file
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-stone-700 hover:border-amber-300 hover:bg-amber-300/5",
              ].join(" ")}
            >
              {file ? (
                <div className="space-y-3">
                  {preview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded shadow-lg"
                    />
                  ) : (
                    <FileText className="h-12 w-12 mx-auto text-amber-300" />
                  )}
                  <div className="text-sm font-semibold">{file.name}</div>
                  <div className="text-xs text-stone-400">
                    {(file.size / 1024).toFixed(0)} KB · {file.type || "?"}
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      clearFile();
                    }}
                    className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                    Sacar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pointer-events-none">
                  <Upload
                    className={[
                      "h-10 w-10 mx-auto transition-colors",
                      isDragging ? "text-amber-300" : "text-stone-400",
                    ].join(" ")}
                  />
                  <div className="font-medium">
                    {isDragging
                      ? "Soltá el archivo acá"
                      : "Hacé click o arrastrá el archivo"}
                  </div>
                  <div className="text-xs text-stone-400">
                    JPG, PNG, WEBP o PDF · máximo {MAX_SIZE_MB} MB
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !file}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-300 text-stone-900 font-semibold hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Procesar con IA
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-md p-4 text-sm text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {datos && (
          <div className="bg-stone-900 border border-emerald-500/40 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Datos extraídos</h2>
              {tiempoMs !== null && (
                <span className="text-xs text-stone-400 ml-auto">
                  {(tiempoMs / 1000).toFixed(1)}s
                  {typeof datos.confianza === "number" && (
                    <> · Confianza IA {Math.round(datos.confianza * 100)}%</>
                  )}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Campo label="Paciente" value={datos.paciente} />
              <Campo label="Obra Social" value={datos.obra_social} />
              <Campo label="Nº Afiliado" value={datos.numero_afiliado} />
              <Campo label="Práctica solicitada" value={datos.practica_solicitada} />
              <Campo label="Diagnóstico" value={datos.diagnostico} />
              <Campo label="Médico solicitante" value={datos.medico_solicitante} />
              <Campo label="Matrícula" value={datos.matricula_medico} />
              <Campo label="Fecha" value={datos.fecha} />
              <Campo
                label="Urgencia"
                value={datos.urgencia_indicada ? "Sí" : "No"}
              />
            </dl>

            <details className="text-xs text-stone-400">
              <summary className="cursor-pointer hover:text-stone-200">
                Ver JSON completo
              </summary>
              <pre className="mt-2 p-3 bg-stone-950 rounded overflow-x-auto">
                {JSON.stringify(datos, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="text-center text-xs text-stone-500 pt-4">
          Turnova · Pyralis · Modo demo público
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="text-stone-100 font-medium">{display}</dd>
    </div>
  );
}
