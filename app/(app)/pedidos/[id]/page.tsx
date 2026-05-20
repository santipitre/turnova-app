import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  User,
  Sparkles,
  Shield,
  AlertTriangle,
  Clock,
  Stethoscope,
  IdCard,
  Calendar,
  Building2,
} from "lucide-react";

import { createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceBar } from "@/components/lumen/confidence-bar";
import { StatusDot } from "@/components/lumen/status-dot";
import { PedidoDetailActions } from "@/components/pedidos/pedido-detail-actions";
import { formatFecha, formatTiempoRelativo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  const user = getServerUser();
  if (!user) redirect("/login");
  if (!user.tenant_id) redirect("/dashboard");

  const supabase = createServiceClient();

  const { data: pedidoBase, error: pedidoError } = await supabase
    .from("pedidos_medicos")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", user.tenant_id)
    .maybeSingle();

  if (pedidoError) {
    console.error("[pedido detail] error:", pedidoError);
  }
  if (!pedidoBase) notFound();

  let paciente: any = null;
  if (pedidoBase.paciente_id) {
    try {
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", pedidoBase.paciente_id)
        .maybeSingle();
      paciente = data ?? null;
    } catch (err) {
      console.warn("[pedido detail] paciente lookup failed:", err);
    }
  }

  // Generar URL firmada fresca por si la original expiró
  let archivoUrl: string | null = pedidoBase.archivo_url ?? null;
  if (pedidoBase.archivo_storage_path) {
    try {
      const { data: signed } = await supabase.storage
        .from("pedidos-medicos")
        .createSignedUrl(pedidoBase.archivo_storage_path, 60 * 60 * 24);
      if (signed?.signedUrl) archivoUrl = signed.signedUrl;
    } catch (err) {
      console.warn("[pedido detail] no se pudo firmar url:", err);
    }
  }

  const pedido = { ...pedidoBase, paciente, archivo_url: archivoUrl } as any;
  const turnoAsociado: any = null;
  const datos = (pedido.extraccion_ia as Record<string, unknown>) || {};
  const conf = pedido.confianza_ia ?? 0;
  const requiereRevisionManual =
    (datos.requiere_revision_manual as boolean | undefined) ?? false;
  const archivoTipo = pedido.archivo_storage_path?.endsWith(".pdf") ? "pdf" : "imagen";

  const confStatus =
    conf >= 0.85
      ? { variant: "pulse" as const, label: "Alta confianza" }
      : conf >= 0.6
        ? { variant: "ember" as const, label: "Confianza media" }
        : { variant: "flag" as const, label: "Baja confianza" };

  return (
    <div className="space-y-6">
      {/* Volver */}
      <Link
        href="/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a pedidos
      </Link>

      {/* ============ HEADER del pedido ============ */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400">
            <FileText className="h-3 w-3" />
            <span className="font-mono">Pedido #{pedido.id.slice(0, 8)}</span>
            <span>·</span>
            <span>{formatTiempoRelativo(pedido.created_at)}</span>
          </div>

          <h1 className="text-3xl font-bold text-stone-100">
            {paciente ? `${paciente.nombre} ${paciente.apellido}` : "Paciente sin asignar"}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <StatusDot variant={confStatus.variant} label={confStatus.label} />
            <span className="text-stone-600">·</span>
            <Badge variant="default" className="font-medium">
              {pedido.canal_origen === "botmaker"
                ? "Vía BOTMAKER"
                : `Canal: ${pedido.canal_origen ?? "—"}`}
            </Badge>
            {requiereRevisionManual && (
              <>
                <span className="text-stone-600">·</span>
                <Badge variant="warning" className="font-medium">
                  ⚠ Requiere revisión manual
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Métricas IA */}
        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-4 min-w-[260px]">
          <div className="text-[11px] uppercase tracking-widest text-stone-400 mb-2">
            Procesado por IA
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-mono font-semibold text-2xl text-stone-100">
              {(conf * 100).toFixed(1)}
            </span>
            <span className="text-stone-400 text-sm">% de confianza</span>
          </div>
          <ConfidenceBar value={conf} showLabel={false} size="md" />
          <div className="text-xs text-stone-400 mt-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span className="font-mono">Claude Sonnet 4.5</span>
            {typeof datos.tiempo_procesamiento_ms === "number" && (
              <>
                <span>·</span>
                <span className="font-mono">
                  {(datos.tiempo_procesamiento_ms / 1000).toFixed(1)}s
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============ ARCHIVO ORIGINAL ============ */}
        <Card className="rounded-lg border-stone-800 overflow-hidden bg-stone-900/40">
          <CardHeader className="bg-stone-900/60 border-b border-stone-800">
            <CardTitle className="flex items-center justify-between text-stone-100 text-base">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400" />
                Documento original
              </span>
              <span className="text-xs font-mono text-stone-400 uppercase">
                {archivoTipo}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pedido.archivo_url ? (
              <div className="relative bg-stone-950 flex items-center justify-center min-h-[400px]">
                {archivoTipo === "imagen" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <a
                    href={pedido.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                    title="Abrir en pestaña nueva"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pedido.archivo_url}
                      alt="Pedido médico"
                      className="w-full max-h-[600px] object-contain mx-auto"
                    />
                  </a>
                ) : (
                  <iframe
                    src={pedido.archivo_url}
                    className="w-full h-[600px]"
                    title="PDF del pedido"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-stone-500 bg-stone-950">
                <FileText className="h-16 w-16" />
                <p className="text-sm">Sin archivo adjunto</p>
              </div>
            )}
            {pedido.archivo_url && (
              <div className="px-4 py-2 text-xs text-stone-400 border-t border-stone-800 bg-stone-900/40">
                <a
                  href={pedido.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pyralis-glow underline-offset-2 hover:underline"
                >
                  Abrir archivo en nueva pestaña →
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============ DATOS EXTRAÍDOS + ACCIONES ============ */}
        <div className="space-y-4">
          <Card className="rounded-lg border-stone-800 overflow-hidden bg-stone-900/40">
            <CardHeader className="bg-gradient-to-br from-pyralis-glow/10 to-transparent border-b border-stone-800">
              <CardTitle className="flex items-center gap-2 text-stone-100 text-base">
                <Sparkles className="h-4 w-4 text-pyralis-glow" />
                Datos extraídos por IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              <DataField
                icon={Stethoscope}
                label="Práctica solicitada"
                value={pedido.practica_detectada}
                emphasized
              />
              <DataField
                icon={Shield}
                label="Obra social"
                value={pedido.obra_social_detectada}
                emphasized
              />

              <div className="border-t border-stone-800" />

              <DataField
                icon={User}
                label="Médico solicitante"
                value={datos.medico_solicitante as string | null}
              />
              <DataField
                icon={IdCard}
                label="Matrícula"
                value={datos.matricula_medico as string | null}
                mono
              />
              <DataField
                icon={FileText}
                label="Diagnóstico presunto"
                value={datos.diagnostico_presunto as string | null}
              />
              <DataField
                icon={IdCard}
                label="N° afiliado"
                value={datos.numero_afiliado as string | null}
                mono
              />
              {datos.fecha_pedido && (
                <DataField
                  icon={Calendar}
                  label="Fecha del pedido"
                  value={datos.fecha_pedido as string}
                  mono
                />
              )}

              {datos.urgencia_indicada === true && (
                <div className="m-4 flex items-start gap-3 rounded-lg border border-lumen-flag/40 bg-lumen-flag/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-lumen-flag flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-stone-100">
                      Urgencia indicada por el médico
                    </div>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Ventana de asignación reducida a 48hs.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {pedido.estado === "procesado" && !turnoAsociado && (
            <PedidoDetailActions
              pedidoId={pedido.id}
              matchingOk={
                !!(datos.obra_social_id_matched && datos.practica_id_matched)
              }
            />
          )}

          {turnoAsociado && (
            <Card className="rounded-lg border-pyralis-glow/30 bg-gradient-to-br from-pyralis-glow/10 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pyralis-glow text-base">
                  <Shield className="h-4 w-4" />
                  Turno asignado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold text-3xl text-stone-100 tracking-tight">
                  {formatFecha(turnoAsociado.fecha_hora, "EEEE d 'de' MMMM")}
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-medium">
                    {formatFecha(turnoAsociado.fecha_hora, "HH:mm")} hs
                  </span>
                  {(turnoAsociado.sede as { nombre: string } | null)?.nombre && (
                    <>
                      <span className="text-stone-600">·</span>
                      <Building2 className="h-4 w-4" />
                      <span>{(turnoAsociado.sede as { nombre: string }).nombre}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {paciente && (
            <Card className="rounded-lg border-stone-800 bg-stone-900/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-stone-100 text-base">
                  <User className="h-4 w-4 text-stone-400" />
                  Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-stone-400">Nombre</span>
                  <span className="font-medium text-stone-100">
                    {paciente.nombre} {paciente.apellido}
                  </span>
                </div>
                {paciente.dni && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-400">DNI</span>
                    <span className="font-mono text-stone-200">{paciente.dni}</span>
                  </div>
                )}
                {paciente.telefono && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-400">Teléfono</span>
                    <span className="font-mono text-stone-200">{paciente.telefono}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ DataField — componente interno ============

function DataField({
  icon: Icon,
  label,
  value,
  emphasized = false,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  emphasized?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-stone-900/40 transition-colors">
      <div className="flex-shrink-0 h-8 w-8 rounded bg-stone-800 flex items-center justify-center mt-0.5">
        <Icon className="h-4 w-4 text-stone-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-stone-400">{label}</div>
        <div
          className={
            value
              ? emphasized
                ? "text-stone-100 font-semibold text-base mt-0.5"
                : mono
                  ? "text-stone-200 font-mono text-sm mt-0.5"
                  : "text-stone-200 text-sm mt-0.5"
              : "text-stone-500 italic text-sm mt-0.5"
          }
        >
          {value || "No legible"}
        </div>
      </div>
    </div>
  );
}
