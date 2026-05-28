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

  const { data: pedido } = await supabase
    .from("pedidos_medicos")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", user.tenant_id)
    .maybeSingle();

  if (!pedido) notFound();

  // Cargar catálogo del tenant para los selects
  const [{ data: obrasSociales }, { data: practicas }] = await Promise.all([
    supabase
      .from("obras_sociales")
      .select("id, nombre")
      .eq("tenant_id", user.tenant_id)
      .order("nombre"),
    supabase
      .from("practicas")
      .select("id, nombre, servicio")
      .eq("tenant_id", user.tenant_id)
      .order("nombre"),
  ]);

  // URL firmada del archivo (para preview en el form)
  let archivoUrl: string | null = pedido.archivo_url ?? null;
  if (pedido.archivo_storage_path) {
    const { data: signed } = await supabase.storage
      .from("pedidos-medicos")
      .createSignedUrl(pedido.archivo_storage_path, 60 * 60 * 24);
    if (signed?.signedUrl) archivoUrl = signed.signedUrl;
  }

  const datos = (pedido.extraccion_ia as Record<string, unknown>) || {};

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
              archivoUrl.toLowerCase().includes(".pdf") || pedido.archivo_storage_path?.endsWith(".pdf") ? (
                <iframe src={archivoUrl} className="w-full h-[600px]" title="PDF del pedido" />
              ) : (
                <a href={archivoUrl} target="_blank" rel="noopener noreferrer" className="block bg-stone-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={archivoUrl}
                    alt="Pedido médico"
                    className="w-full max-h-[600px] object-contain mx-auto"
                  />
                </a>
              )
            ) : (
              <div className="text-stone-500 p-8 text-center">Sin archivo</div>
            )}
          </CardContent>
        </Card>

        {/* Formulario a la derecha */}
        <EditPedidoForm
          pedidoId={params.id}
          initial={{
            practica_detectada: pedido.practica_detectada ?? "",
            obra_social_detectada: pedido.obra_social_detectada ?? "",
            medico_solicitante: (datos.medico_solicitante as string | null) ?? "",
            matricula_medico: (datos.matricula_medico as string | null) ?? "",
            diagnostico_presunto: (datos.diagnostico_presunto as string | null) ?? "",
            numero_afiliado: (datos.numero_afiliado as string | null) ?? "",
            fecha_pedido: (datos.fecha_pedido as string | null) ?? "",
            urgencia_indicada: (datos.urgencia_indicada as boolean | undefined) ?? false,
          }}
          obrasSociales={obrasSociales ?? []}
          practicas={practicas ?? []}
        />
      </div>
    </div>
  );
}
