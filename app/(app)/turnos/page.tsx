import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { formatFecha } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Turnos" };

interface Props {
  searchParams: { estado?: string; rango?: string };
}

export default async function TurnosPage({ searchParams }: Props) {
  const supabase = createClient();
  const estadoFiltro = searchParams.estado ?? "todos";
  const rangoFiltro = searchParams.rango ?? "proximos";

  let query = supabase
    .from("turnos")
    .select(`
      id, fecha_hora, estado, fue_vip, canal_origen, duracion_minutos, hold_expira_en,
      paciente:pacientes(nombre, apellido),
      practica:practicas(nombre),
      obra_social:obras_sociales(nombre, es_vip),
      sede:sedes(nombre)
    `);

  if (estadoFiltro !== "todos") {
    query = query.eq("estado", estadoFiltro);
  }

  if (rangoFiltro === "proximos") {
    query = query.gte("fecha_hora", new Date().toISOString()).order("fecha_hora", { ascending: true });
  } else if (rangoFiltro === "pasados") {
    query = query.lt("fecha_hora", new Date().toISOString()).order("fecha_hora", { ascending: false });
  } else {
    query = query.order("fecha_hora", { ascending: false });
  }

  const { data: turnos } = await query.limit(100);

  // Stats laterales
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1);
  inicioSemana.setHours(0, 0, 0, 0);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 7);

  const { count: turnosSemana } = await supabase
    .from("turnos")
    .select("*", { count: "exact", head: true })
    .gte("fecha_hora", inicioSemana.toISOString())
    .lt("fecha_hora", finSemana.toISOString());

  const { count: turnosVipSemana } = await supabase
    .from("turnos")
    .select("*", { count: "exact", head: true })
    .gte("fecha_hora", inicioSemana.toISOString())
    .lt("fecha_hora", finSemana.toISOString())
    .eq("fue_vip", true);

  const proximas72hs = new Date(Date.now() + 72 * 3600 * 1000);
  const { count: prox72 } = await supabase
    .from("turnos")
    .select("*", { count: "exact", head: true })
    .gte("fecha_hora", new Date().toISOString())
    .lt("fecha_hora", proximas72hs.toISOString())
    .eq("estado", "confirmado");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Turnos</h1>
        <p className="text-stone-400 mt-1">Gestión de turnos asignados, confirmados y realizados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Esta semana" value={turnosSemana ?? 0} />
        <StatChip label="VIP esta semana" value={turnosVipSemana ?? 0} highlight />
        <StatChip label="Próximas 72hs" value={prox72 ?? 0} />
        <StatChip
          label="Total cargados"
          value={(turnos?.length ?? 0).toString() + (turnos && turnos.length === 100 ? "+" : "")}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "todos", label: "Todos" },
          { key: "reservado", label: "Hold" },
          { key: "confirmado", label: "Confirmados" },
          { key: "realizado", label: "Realizados" },
          { key: "cancelado", label: "Cancelados" },
        ].map((c) => (
          <Link
            key={c.key}
            href={`/turnos?estado=${c.key}&rango=${rangoFiltro}`}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all border ${
              estadoFiltro === c.key
                ? "bg-pyralis-midnight text-white border-pyralis-midnight"
                : "bg-stone-900/40 text-stone-300 border-stone-800/60 hover:border-pyralis-midnight"
            }`}
          >
            {c.label}
          </Link>
        ))}
        <div className="ml-auto flex gap-2">
          {[
            { key: "proximos", label: "Próximos" },
            { key: "pasados", label: "Pasados" },
            { key: "todos", label: "Todos" },
          ].map((r) => (
            <Link
              key={r.key}
              href={`/turnos?estado=${estadoFiltro}&rango=${r.key}`}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all border ${
                rangoFiltro === r.key
                  ? "bg-pyralis-glow text-lumen-glow border-pyralis-glow"
                  : "bg-stone-900/40 text-stone-300 border-stone-800/60 hover:border-pyralis-glow"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Práctica</TableHead>
              <TableHead>Obra Social</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(turnos ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-stone-400 py-12">
                  No hay turnos con estos filtros.
                </TableCell>
              </TableRow>
            )}
            {(turnos ?? []).map((turno) => {
              const paciente = Array.isArray(turno.paciente) ? turno.paciente[0] : turno.paciente;
              const practica = Array.isArray(turno.practica) ? turno.practica[0] : turno.practica;
              const os = Array.isArray(turno.obra_social) ? turno.obra_social[0] : turno.obra_social;
              const sede = Array.isArray(turno.sede) ? turno.sede[0] : turno.sede;

              return (
                <TableRow key={turno.id}>
                  <TableCell>
                    <div className="font-medium">{formatFecha(turno.fecha_hora, "EEE d MMM")}</div>
                    <div className="text-caption text-stone-400">
                      {formatFecha(turno.fecha_hora, "HH:mm 'hs'")} ·{" "}
                      {turno.duracion_minutos} min
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {paciente ? `${paciente.nombre} ${paciente.apellido}` : "—"}
                  </TableCell>
                  <TableCell className="text-stone-300">{practica?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    {turno.fue_vip ? (
                      <Badge variant="vip">⭐ {os?.nombre}</Badge>
                    ) : (
                      <Badge variant="default">{os?.nombre ?? "—"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-300">{sede?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    <BadgeEstado estado={turno.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Ver</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatChip({ label, value, highlight = false }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "bg-pyralis-glowSoft/40" : ""}`}>
      <div className="text-overline text-stone-400 uppercase">{label}</div>
      <div className={`text-display-sm tracking-tight ${highlight ? "text-pyralis-glowHover" : ""}`}>{value}</div>
    </Card>
  );
}

function BadgeEstado({ estado }: { estado: string }) {
  const map: Record<string, { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }> = {
    reservado: { variant: "warning", label: "Hold" },
    confirmado: { variant: "success", label: "Confirmado" },
    realizado: { variant: "info", label: "Realizado" },
    cancelado: { variant: "danger", label: "Cancelado" },
    no_asistio: { variant: "danger", label: "No asistió" },
  };
  const config = map[estado] ?? { variant: "default" as const, label: estado };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
