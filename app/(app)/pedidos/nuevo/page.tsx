"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { fileToBase64 } from "@/lib/utils";
import { procesarPedido } from "@/lib/api/edge-functions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
  // Fallback por extensión (algunos sistemas devuelven type vacío)
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic|heif|pdf)$/.test(name);
}

export default function NuevoPedidoPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);

  // Limpiar object URL al desmontar
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const setSelectedFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    console.log("[upload] archivo recibido:", f.name, f.type, f.size);
    if (!isAllowed(f)) {
      toast.error("Tipo de archivo no soportado", {
        description: `Archivo: ${f.name} (${f.type || "tipo desconocido"}). Solo JPG, PNG, WEBP, GIF, HEIC o PDF.`,
      });
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error("Archivo muy grande", {
        description: `${(f.size / 1024 / 1024).toFixed(1)} MB · Máximo ${MAX_SIZE_MB} MB.`,
      });
      return;
    }
    setFile(f);
    // Mini preview solo para imágenes
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
    // Reset para permitir re-seleccionar el mismo archivo
    if (e.target) e.target.value = "";
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  // ----- Drag & drop handlers -----
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

  function clearFile() {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Subí un archivo del pedido médico");
      return;
    }

    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await procesarPedido({
        archivo_base64: base64,
        media_type: file.type,
        canal_origen: "web",
      });

      toast.success("Pedido procesado", {
        description: `Confianza IA: ${(result.metrica.confianza * 100).toFixed(0)}%`,
      });

      router.push(`/pedidos/${result.pedido_medico.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error("No se pudo procesar el pedido", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/pedidos"
        className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-100"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div>
        <h1 className="text-display-lg">Cargar pedido médico</h1>
        <p className="text-stone-400 mt-1">
          Subí la foto o PDF del pedido. La IA va a extraer los datos automáticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Archivo del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              ref={inputRef}
              id="file"
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
              className={cn(
                "block border-2 border-dashed rounded-md p-8 transition-colors cursor-pointer text-center select-none",
                isDragging
                  ? "border-pyralis-glow bg-pyralis-glowSoft/60"
                  : file
                    ? "border-pyralis-success bg-lumen-pulseSoft/30"
                    : "border-stone-700 hover:border-pyralis-glow hover:bg-pyralis-glowSoft/30",
              )}
            >
              {file ? (
                <div className="space-y-3">
                  {preview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded shadow-pyralis"
                    />
                  ) : (
                    <FileText className="h-12 w-12 mx-auto text-lumen-pulse" />
                  )}
                  <div className="text-sm font-semibold">{file.name}</div>
                  <div className="text-xs text-stone-400">
                    {(file.size / 1024).toFixed(0)} KB · {file.type}
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      clearFile();
                    }}
                    className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-lumen-flag"
                  >
                    <X className="h-3 w-3" />
                    Sacar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pointer-events-none">
                  <Upload
                    className={cn(
                      "h-10 w-10 mx-auto transition-colors",
                      isDragging ? "text-pyralis-glow" : "text-stone-400",
                    )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nombre">Paciente (opcional)</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="María González"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dni">DNI (opcional)</Label>
                <Input
                  id="dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="28456789"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="telefono">Teléfono / WhatsApp (opcional)</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+54 11 5555 0000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" asChild>
                <Link href="/pedidos">Cancelar</Link>
              </Button>
              <Button type="submit" variant="glow" disabled={loading || !file}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando con IA...
                  </>
                ) : (
                  "Procesar con IA"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
