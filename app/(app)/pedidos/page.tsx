import Link from "next/link";
import {
  MessageSquare,
  Hospital,
  Plus,
  Inbox,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/lumen/status-dot";
import { ConfidenceBar } from "@/components/lumen/confidence-bar";
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
      confianza_ia, estado, canal_origen, requiere_revision_manual,
      paciente:pacientes(nombre, apellido)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (estadoFiltro !== "todos") {
    query = query.eq("estado", estadoFiltro);
  }

  const { data: pedidos } = await query;

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

      {/* ============ FILTROS — Chips Lumen ============ */}
      <div className="flex gap-2 flex-wrap">
        {chips.map((chip) => {
          const isActive = estadoFiltro === chip.key || (chip.key === "todos" && estadoFiltro === "todos");
          return (
            <Link
              key={chip.key}
              href={chip.key === "todos" ? "/pedidos" : `/pedidos?estado=${chip.key}`}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lumen-sm text-sm font-medium transition-all duration-fast border ${
                isActive
                  ? "bg-stone-900 text-white border-stone-900 shadow-lumen-2"
                  : "bg-stone-900/40 text-stone-700 border-stone-200 hover:border-stone-400"
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
                isActive ? "text-stone-400" : "text-stone-400"
              }`}>
                {chip.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ============ TABLA DE PEDIDOS ============ */}
      <Card className="rounded-lumen-lg border-stone-200 shadow-lumen-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50/50">
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead className="w-[130px]">Canal</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Práctica detectada</TableHead>
              <TableHead>Obra Social</TableHead>
              <TableHead className="w-[160px]">Confianza</TableHead>
              <TableHead className="w-[140px]">Estado</TableHead>
              <TableHead className="text-right w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pedidos ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-stone-400 py-16">
                  <div className="space-y-3">
                    <Sparkles className="h-12 w-12 mx-auto text-stone-300" />
                    <div>
                      <p className="font-medium text-stone-700">No hay pedidos con este filtro</p>
                      <p className="text-xs mt-1">
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
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700">
                    <MessageSquare className="h-3 w-3" /> BOTMAKER
                  </span>
                ) : pedido.canal_origen === "presencial" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700">
                    <Hospital className="h-3 w-3" /> Presencial
                  </span>
                ) : (
                  <span className="text-xs text-stone-400">{pedido.canal_origen ?? "—"}</span>
                );

              const estadoBadge = pedido.requiere_revision_manual ? (
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-lumen-ember" />
                  <span className="text-xs font-medium text-lumen-ember">Revisar</span>
                </span>
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
                  className="group hover:bg-stone-50/60 transition-colors cursor-pointer"
                >
                  <TableCell className="font-mono text-xs text-stone-400">
                    {formatFecha(pedido.created_at, "dd/MM HH:mm")}
                  </TableCell>
                  <TableCell>{canalUI}</TableCell>
                  <TableCell className="font-medium text-stone-900">
                    {paciente ? `${paciente.nombre} ${paciente.apellido}` : "—"}
                  </TableCell>
                  <TableCell className="text-stone-700 text-sm">
                    {pedido.practica_detectada ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="font-medium">
                      {pedido.obra_social_detectada ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ConfidenceBar value={pedido.confianza_ia ?? 0} size="sm" />
                  </TableCell>
                  <TableCell>{estadoBadge}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/pedidos/${pedido.id}`}>
                        {pedido.estado === "procesado" ? (
                          <>
                            Asignar
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </Link>
                    </Button>
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
