import Link from "next/link";
import {
  MessageSquare,
  Hospital,
  Plus,
  Inbox,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  Edit3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/lumen/status-dot";
import { ConfidenceBar } from "@/components/lumen/confidence-bar";
import { RefreshPedidosButton } from "@/components/pedidos/refresh-button";
import { VipBadge, VipCountdown } from "@/components/pedidos/vip-countdown";
import { formatFecha } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pedidos Médicos" };

interface Props {
  searchParams: { estado?: string };
}

export default async function PedidosPage({ searchParams }: Props) {
  const supabase = createClient();
  const estadoFiltro = searchParams.estado ?? "todos";

  let query = supabase
    .from("pedidos_medicos")
    .select(`
      id, created_at, practica_detectada, obra_social_detectada,
      confianza_ia, estado, canal_origen, extraccion_ia,
      paciente:pacientes(nombre, apellido)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (estadoFiltro !== "todos") {
    query = query.eq("estado", estadoFiltro);
  }

  const { data: pedidos } = await query;

  // Cargar OS VIP del tenant (para badge ⭐ + SLA countdown)
  // Mapa lookup case-insensitive: nombre normalizado → { es_vip, prioridad, sla_h }
  const vipMap = new Map<
    string,
    { prioridad: number | null; tiempo_max_respuesta_horas: number | null }
  >();
  try {
    const { data: osVip } = await supabase
      .from("obras_sociales")
      .select("nombre, prioridad, tiempo_max_respuesta_horas")
      .eq("es_vip", true);
    for (const os of osVip ?? []) {
      vipMap.set(os.nombre.toUpperCase().trim(), {
        prioridad: os.prioridad,
        tiempo_max_respuesta_horas: os.tiempo_max_respuesta_horas,
      });
    }
  } catch (err) {
    console.warn("[pedidos] no se pudo cargar OS VIP:", err);
  }

  // Conteos por estado
  const { data: estadosConteo } = await supabase.from("pedidos_medicos").select("estado");
  const conteos = (estadosConteo ?? []).reduce<Record<string, number>>((acc, { estado }) => {
    acc[estado] = (acc[estado] ?? 0) + 1;
    return acc;
  }, {});
  const totalPedidos = estadosConteo?.length ?? 0;

  const chips = [
    { key: "todos", label: "Todos", count: totalPedidos, dot: "muted" as const },
    { key: "procesado", label: "Para asignar", count: conteos["procesado"] ?? 0, dot: "ember" as const },
    { key: "asignado", label: "Asignados", count: conteos["asignado"] ?? 0, dot: "pulse" as const },
    { key: "error", label: "Con errores", count: conteos["error"] ?? 0, dot: "flag" as const },
  ];

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 mb-2">
            <Inbox className="h-3 w-3" />
            <span>Bandeja de entrada IA</span>
          </div>
          <h1 className="text-lumen-display-lg">Pedidos Médicos</h1>
          <p className="text-stone-400 mt-1">
            {(conteos["procesado"] ?? 0) > 0 ? (
              <span className="flex items-center gap-2">
                <span className="lumen-dot-pulse !bg-lumen-ember" style={{ boxShadow: "0 0 0 0 rgba(249,115,22,0.5)" }} />
                <span>
                  <span className="font-mono font-semibold text-lumen-ember">
                    {conteos["procesado"]}
                  </span>{" "}
                  pedidos esperando asignación
                </span>
              </span>
            ) : (
              "Todos los pedidos al día"
            )}
          </p>
        </div>
        <Button variant="glow" asChild>
          <Link href="/pedidos/nuevo">
            <Plus className="h-4 w-4" />
            Cargar pedido manual
          </Link>
        </Button>
      </div>

      {/* ============ FILTROS + REFRESH ============ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {chips.map((chip) => {
          const isActive = estadoFiltro === chip.key || (chip.key === "todos" && estadoFiltro === "todos");
          return (
            <Link
              key={chip.key}
              href={chip.key === "todos" ? "/pedidos" : `/pedidos?estado=${chip.key}`}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lumen-sm text-sm font-medium transition-all duration-fast border ${
                isActive
                  ? "bg-amber-400/10 text-amber-200 border-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.15)]"
                  : "bg-stone-900/60 text-stone-300 border-stone-700 hover:border-amber-400/30 hover:text-amber-200/80"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                chip.dot === "ember" ? "bg-lumen-ember"
                : chip.dot === "pulse" ? "bg-lumen-pulse"
                : chip.dot === "flag" ? "bg-lumen-flag"
                : "bg-stone-400"
              }`} />
              <span>{chip.label}</span>
              <span className={`font-mono text-xs tabular-nums ${
                isActive ? "text-amber-300" : "text-stone-400"
              }`}>
                {chip.count}
              </span>
            </Link>
          );
        })}
        </div>

        {/* Botón refresh + auto-refresh cada 30s */}
        <RefreshPedidosButton intervalMs={30000} />
      </div>

      {/* ============ TABLA DE PEDIDOS (dark theme) ============ */}
      <Card className="rounded-lumen-lg border-stone-800 bg-stone-900/40 shadow-lumen-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-900/80 border-stone-800 hover:bg-stone-900/80">
              <TableHead className="w-[100px] text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Fecha</TableHead>
              <TableHead className="w-[130px] text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Canal</TableHead>
              <TableHead className="text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Paciente</TableHead>
              <TableHead className="text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Práctica detectada</TableHead>
              <TableHead className="text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Obra Social</TableHead>
              <TableHead className="w-[160px] text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Confianza</TableHead>
              <TableHead className="w-[140px] text-stone-300 font-semibold uppercase text-[11px] tracking-wider">Estado</TableHead>
              <TableHead className="text-right w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pedidos ?? []).length === 0 && (
              <TableRow className="border-stone-800 hover:bg-transparent">
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="space-y-3">
                    <Sparkles
                      className="h-12 w-12 mx-auto text-amber-400/60"
                      style={{ filter: "drop-shadow(0 0 12px rgba(251, 191, 36, 0.35))" }}
                    />
                    <div>
                      <p className="font-medium text-stone-200">No hay pedidos con este filtro</p>
                      <p className="text-xs mt-1 text-stone-400">
                        Probá otro estado o cargá un pedido manual desde el botón superior.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {(pedidos ?? []).map((pedido) => {
              const paciente = Array.isArray(pedido.paciente) ? pedido.paciente[0] : pedido.paciente;

              const canalUI =
                pedido.canal_origen === "botmaker" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-200">
                    <MessageSquare className="h-3 w-3" /> BOTMAKER
                  </span>
                ) : pedido.canal_origen === "presencial" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-200">
                    <Hospital className="h-3 w-3" /> Presencial
                  </span>
                ) : (
                  <span className="text-xs text-stone-400">{pedido.canal_origen ?? "—"}</span>
                );

              // El flag requiere_revision_manual vive dentro del JSONB extraccion_ia
              const extraccion =
                (pedido.extraccion_ia as Record<string, unknown> | null) ?? {};
              const requiereRevision = extraccion.requiere_revision_manual === true;

              // Múltiples prácticas: array dentro de extraccion_ia
              const practicasArray = extraccion.practicas_array as
                | Array<{ nombre: string }>
                | null
                | undefined;
              const cantidadPracticas =
                Array.isArray(practicasArray) && practicasArray.length > 0
                  ? practicasArray.length
                  : pedido.practica_detectada
                    ? 1
                    : 0;

              // Match VIP: buscar la OS del pedido en el mapa de VIPs
              const osDetectada = (pedido.obra_social_detectada ?? "").toUpperCase().trim();
              const vipInfo = osDetectada ? vipMap.get(osDetectada) : undefined;

              // Badge "Revisar" ahora es un link directo al editor
              const estadoBadge = requiereRevision ? (
                <Link
                  href={`/pedidos/${pedido.id}/editar`}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/60 transition-colors text-xs font-semibold"
                  title="Editar datos del pedido"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Revisar
                </Link>
              ) : pedido.estado === "asignado" ? (
                <StatusDot variant="pulse" label="Asignado" size="md" />
              ) : pedido.estado === "procesado" ? (
                <StatusDot variant="ember" label="Listo" size="md" animated={false} />
              ) : pedido.estado === "error" ? (
                <StatusDot variant="flag" label="Error" size="md" />
              ) : (
                <StatusDot variant="muted" label={pedido.estado} size="md" animated={false} />
              );

              return (
                <TableRow
                  key={pedido.id}
                  className="group hover:bg-amber-400/[0.04] border-stone-800/60 transition-colors cursor-pointer"
                >
                  <TableCell className="font-mono text-xs text-stone-400">
                    {formatFecha(pedido.created_at, "dd/MM HH:mm")}
                  </TableCell>
                  <TableCell>{canalUI}</TableCell>
                  <TableCell className="font-medium text-stone-100">
                    {paciente ? `${paciente.nombre} ${paciente.apellido}` : "—"}
                  </TableCell>
                  <TableCell className="text-stone-300 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{pedido.practica_detectada ?? "—"}</span>
                      {cantidadPracticas > 1 && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-400/40 bg-amber-400/10 text-amber-300"
                          title={`Este pedido tiene ${cantidadPracticas} prácticas`}
                        >
                          +{cantidadPracticas - 1} más
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="default" className="font-medium">
                          {pedido.obra_social_detectada ?? "—"}
                        </Badge>
                        {vipInfo && <VipBadge prioridad={vipInfo.prioridad} />}
                      </div>
                      {vipInfo && pedido.estado !== "asignado" && (
                        <VipCountdown
                          creadoEn={pedido.created_at}
                          slaHoras={vipInfo.tiempo_max_respuesta_horas ?? 12}
                          prioridad={vipInfo.prioridad}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ConfidenceBar value={pedido.confianza_ia ?? 0} size="sm" />
                  </TableCell>
                  <TableCell>{estadoBadge}</TableCell>
                  <TableCell className="text-right">
                    {requiereRevision ? (
                      // Pedido necesita revisión humana → botón Editar SIEMPRE visible
                      <Button
                        size="sm"
                        asChild
                        className="bg-amber-400 text-stone-950 hover:bg-amber-300 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                      >
                        <Link href={`/pedidos/${pedido.id}/editar`}>
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </Link>
                      </Button>
                    ) : pedido.estado === "procesado" ? (
                      // Listo para asignar turno → botón Asignar SIEMPRE visible
                      <Button
                        size="sm"
                        asChild
                        variant="outline"
                        className="border-lumen-glow/40 text-lumen-glow hover:bg-lumen-glow/10 hover:text-lumen-glow hover:border-lumen-glow font-semibold"
                      >
                        <Link href={`/pedidos/${pedido.id}`}>
                          Asignar
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      // Asignado / error / otros → botón Ver en hover
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Link href={`/pedidos/${pedido.id}`}>
                          Ver
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="text-xs text-stone-400 text-center font-mono">
        Mostrando {pedidos?.length ?? 0} de {totalPedidos} pedidos
      </div>
    </div>
  );
}
