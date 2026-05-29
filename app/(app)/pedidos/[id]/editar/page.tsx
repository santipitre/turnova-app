import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditPedidoForm } from "@/components/pedidos/edit-pedido-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar pedido" };

export default async function EditarPedidoPage({ params }: { params: { id: string } }) {
  const user = getServerUser();
  if (!user) redirect("/login");
  if (!user.tenant_id) redirect("/dashboard");

  const supabase = createServiceClient();

  // 1. Cargar el pedido (si falla, 404)
  let pedido: any = null;
  try {
    const { data, error } = await supabase
      .from("pedidos_medicos")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", user.tenant_id)
      .maybeSingle();
    if (error) {
      console.error("[editar] error pedido:", error.message);
    }
    pedido = data;
  } catch (err) {
    console.error("[editar] excepción pedido:", err);
  }
  if (!pedido) notFound();

  // 2. Cargar catálogo del tenant — con try/catch INDIVIDUAL para no
  // romper el render si una de las dos tablas falla.
  let obrasSociales: Array<{ id: string; nombre: string }> = [];
  try {
    const { data, error } = await supabase
      .from("obras_sociales")
      .select("id, nombre")
      .eq("tenant_id", user.tenant_id)
      .eq("activa", true)
      .order("nombre");
    if (error) {
      console.error("[editar] error obras_sociales:", error.message);
    } else if (data) {
      obrasSociales = data;
    }
  } catch (err) {
    console.error("[editar] excepción obras_sociales:", err);
  }

  let practicas: Array<{ id: string; nombre: string; servicio: string | null }> = [];
  try {
    const { data, error } = await supabase
      .from("practicas")
      .select("id, nombre, servicio")
      .eq("tenant_id", user.tenant_id)
      .eq("activa", true)
      .order("nombre");
    if (error) {
      console.error("[editar] error practicas:", error.message);
    } else if (data) {
      practicas = data;
    }
  } catch (err) {
    console.error("[editar] excepción practicas:", err);
  }

  // 3. URL firmada del archivo (no bloqueante)
  let archivoUrl: string | null = pedido.archivo_url ?? null;
  if (pedido.archivo_storage_path) {
    try {
      const { data: signed } = await supabase.storage
        .from("pedidos-medicos")
        .createSignedUrl(pedido.archivo_storage_path, 60 * 60 * 24);
      if (signed?.signedUrl) archivoUrl = signed.signedUrl;
    } catch (err) {
      console.warn("[editar] no se pudo firmar url:", err);
    }
  }

  const datos = (pedido.extraccion_ia as Record<string, unknown>) || {};
  const archivoTipo = pedido.archivo_storage_path?.endsWith(".pdf") ? "pdf" : "imagen";

  return (
    <div className="space-y-6">
      <Link
        href={`/pedidos/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al detalle
      </Link>

      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 mb-2">
          <FileText className="h-3 w-3" />
          <span className="font-mono">Pedido #{params.id.slice(0, 8)}</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-100">Editar datos manualmente</h1>
        <p className="text-stone-400 mt-1">
          Corregí los campos que la IA detectó mal. Los cambios sobreescriben la extracción.
        </p>
        {(obrasSociales.length === 0 || practicas.length === 0) && (
          <p className="text-amber-300/80 text-sm mt-2">
            ⚠ No pude cargar el catálogo completo
            {obrasSociales.length === 0 ? " (obras sociales)" : ""}
            {practicas.length === 0 ? " (prácticas)" : ""}
            . Podés tipear el valor a mano igual.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Archivo original a la izquierda */}
        <Card className="rounded-lg border-stone-800 overflow-hidden bg-stone-900/40 h-fit lg:sticky lg:top-6">
          <CardHeader className="bg-stone-900/60 border-b border-stone-800">
            <CardTitle className="text-stone-100 text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-stone-400" />
              Documento original
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {archivoUrl ? (
              archivoTipo === "pdf" ? (
                <iframe src={archivoUrl} className="w-full h-[600px]" title="PDF del pedido" />
              ) : (
                <a
                  href={archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-stone-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={archivoUrl}
                    alt="Pedido médico"
                    className="w-full max-h-[600px] object-contain mx-auto"
                  />
                </a>
              )
            ) : (
              <div className="text-stone-500 p-8 text-center">Sin archivo adjunto</div>
            )}
          </CardContent>
        </Card>

        {/* Formulario a la derecha — armar array de prácticas */}
        <EditPedidoForm
          pedidoId={params.id}
          initial={{
            practicas_array: extraerPracticasArray(datos, pedido.practica_detectada),
            cantidades_array: extraerCantidadesArray(datos, pedido.practica_detectada),
            obra_social_detectada: pedido.obra_social_detectada ?? "",
            medico_solicitante: (datos.medico_solicitante as string | null) ?? "",
            matricula_medico: (datos.matricula_medico as string | null) ?? "",
            diagnostico_presunto: (datos.diagnostico_presunto as string | null) ?? "",
            numero_afiliado: (datos.numero_afiliado as string | null) ?? "",
            fecha_pedido: (datos.fecha_pedido as string | null) ?? "",
            urgencia_indicada: (datos.urgencia_indicada as boolean | undefined) ?? false,
          }}
          obrasSociales={obrasSociales}
          practicas={practicas}
        />
      </div>
    </div>
  );
}

/**
 * Extrae el array de prácticas del JSON extraccion_ia, con fallback al campo
 * legacy practica_detectada (para pedidos viejos sin array).
 */
function extraerPracticasArray(
  datos: Record<string, unknown>,
  practicaDetectada: string | null,
): string[] {
  const arr = datos.practicas_array;
  if (Array.isArray(arr) && arr.length > 0) {
    const nombres = arr
      .map((p: any) => (typeof p === "string" ? p : p?.nombre))
      .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
    if (nombres.length > 0) return nombres;
  }
  // Fallback: solo la práctica principal
  return [practicaDetectada ?? ""];
}

/**
 * Extrae las cantidades por práctica, alineadas al array de prácticas.
 * Si no hay dato guardado, devuelve 1 por práctica.
 */
function extraerCantidadesArray(
  datos: Record<string, unknown>,
  practicaDetectada: string | null,
): number[] {
  const arr = datos.practicas_array;
  if (Array.isArray(arr) && arr.length > 0) {
    const items = arr.filter(
      (p: any) =>
        typeof p === "string"
          ? p.trim().length > 0
          : typeof p?.nombre === "string" && p.nombre.trim().length > 0,
    );
    if (items.length > 0) {
      return items.map((p: any) => {
        const c = typeof p === "string" ? 1 : Number(p?.cantidad);
        return Number.isFinite(c) && c > 0 ? Math.round(c) : 1;
      });
    }
  }
  return [practicaDetectada ? 1 : 1];
}
