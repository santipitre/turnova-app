import {
  Calendar,
  Zap,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KpiCard } from "@/components/lumen/kpi-card";
import { StatusDot } from "@/components/lumen/status-dot";
import { ConfidenceBar } from "@/components/lumen/confidence-bar";
import { BarChartTurnos, DonutChartCanales } from "@/components/dashboard/charts";
import { formatFecha } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = createClient();
  const user = getServerUser();

  // ============ KPIs ============
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const inicioAyer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1).toISOString();

  const [
    { count: turnosHoy },
    { count: turnosAyer },
    { data: avgTiempo },
    { data: kpisIa },
    { count: pedidosEnCola },
  ] = await Promise.all([
    supabase.from("turnos").select("*", { count: "exact", head: true }).gte("created_at", inicioHoy),
    supabase.from("turnos").select("*", { count: "exact", head: true })
      .gte("created_at", inicioAyer).lt("created_at", inicioHoy),
    supabase.from("turnos")
      .select("horas_hasta_turno")
      .gte("created_at", inicioHoy)
      .not("horas_hasta_turno", "is", null),
    supabase.from("pedidos_medicos")
      .select("confianza_ia")
      .not("confianza_ia", "is", null)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
    supabase.from("pedidos_medicos").select("*", { count: "exact", head: true })
      .eq("estado", "procesado"),
  ]);

  const tiempoPromedioHs = avgTiempo && avgTiempo.length > 0
    ? avgTiempo.reduce((s, t) => s + (t.horas_hasta_turno ?? 0), 0) / avgTiempo.length
    : 0;

  const confianzaPromedio = kpisIa && kpisIa.length > 0
    ? kpisIa.reduce((s, p) => s + (p.confianza_ia ?? 0), 0) / kpisIa.length
    : 0;

  const cambioTurnos = (turnosAyer ?? 0) > 0
    ? `+${Math.round((((turnosHoy ?? 0) - (turnosAyer ?? 0)) / (turnosAyer ?? 1)) * 100)}% vs ayer`
    : "Día sin referencia";

  // ============ Datos para gráficos ============
  const hace14dias = new Date(hoy.getTime() - 14 * 24 * 3600 * 1000).toISOString();
  const { data: turnos14d } = await supabase
    .from("turnos")
    .select("fecha_hora, fue_vip, created_at")
    .gte("created_at", hace14dias)
    .order("created_at", { ascending: true });

  const datosBarras = construirSerieDiaria(turnos14d ?? [], 14);

  const { data: canalesRaw } = await supabase
    .from("turnos")
    .select("canal_origen")
    .gte("created_at", hace14dias);

  const datosDonut = construirDistribucionCanales(canalesRaw ?? []);

  // ============ Últimos pedidos ============
  const { data: ultimosPedidos } = await supabase
    .from("pedidos_medicos")
    .select(`
      id, created_at, practica_detectada, obra_social_detectada, confianza_ia, estado, canal_origen,
      paciente:pacientes(nombre, apellido)
    `)
    .order("created_at", { ascending: false })
    .limit(6);

  // ============ Cupos críticos ============
  const añoActual = hoy.getFullYear();
  const semanaActual = Math.ceil((hoy.getDate() + new Date(añoActual, 0, 1).getDay()) / 7);
  const { data: cuposCriticos } = await supabase
    .from("cupos_semanales")
    .select(`
      cupos_totales, cupos_asignados,
      obras_sociales(nombre),
      practicas(nombre)
    `)
    .eq("año", añoActual)
    .eq("semana", semanaActual)
    .gt("cupos_totales", 0)
    .limit(1)
    .order("cupos_asignados", { ascending: false });

  const cupoCritico = cuposCriticos?.[0];
  const pickNombre = (v: unknown): string | null => {
    const o = Array.isArray(v) ? v[0] : v;
    return (o as { nombre?: string } | null)?.nombre ?? null;
  };
  const porcentajeCupoCritico = cupoCritico
    ? (cupoCritico.cupos_asignados / cupoCritico.cupos_totales) * 100
    : 0;

  // Saludo dinámico
  const hora = hoy.getHours();
  const saludo = hora < 12 ? "Buen día" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const nombre = user?.nombre?.split(" ")[0] ?? user?.username ?? "";

  return (
    <div className="space-y-8">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden rounded-lumen-xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 px-8 py-10">
        {/* Decorative gradient mesh */}
        <div
          className="absolute inset-0 opacity-30 lumen-mesh-bg"
          aria-hidden
        />
        {/* Orb */}
        <div
          className="absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #FBBF24 0%, transparent 70%)" }}
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 mb-2">
            <span className="lumen-dot-pulse" />
            <span>IA operativa · Claude Opus 4.7</span>
          </div>

          <h1 className="text-display-lg text-white mb-1">
            {saludo}, <span className="lumen-text-glow">Santiago</span>
          </h1>
          <p className="text-stone-300">
            {formatFecha(hoy, "EEEE d 'de' MMMM, yyyy")} · {pedidosEnCola ?? 0} pedidos
            esperando asignación
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild variant="glow">
              <Link href="/pedidos?estado=procesado">
                Ver pedidos pendientes
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="bg-white/10 border-white/10 text-white hover:bg-white/15 hover:text-white">
              <Link href="/pedidos/nuevo">+ Cargar pedido manual</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ============ KPIs v2 ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Turnos hoy"
          value={turnosHoy ?? 0}
          format="number"
          change={{
            value: cambioTurnos,
            trend: (turnosHoy ?? 0) >= (turnosAyer ?? 0) ? "up" : "down",
            isPositive: (turnosHoy ?? 0) >= (turnosAyer ?? 0),
          }}
          icon={<Calendar className="h-4 w-4" />}
          accent="glow"
        />
        <KpiCard
          label="Tiempo promedio"
          value={Math.round(tiempoPromedioHs)}
          format="duration"
          change={{ value: "Asignación automática", trend: "up", isPositive: true }}
          icon={<Zap className="h-4 w-4" />}
          accent="pulse"
        />
        <KpiCard
          label="Precisión IA"
          value={confianzaPromedio * 100}
          format="percent"
          change={{ value: "Últimos 30 días", trend: "up", isPositive: confianzaPromedio >= 0.85 }}
          icon={<Sparkles className="h-4 w-4" />}
          accent="aurora"
        />
        <KpiCard
          label="Pedidos en cola"
          value={pedidosEnCola ?? 0}
          format="number"
          change={{ value: "Esperando asignación", trend: "up", isPositive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="ember"
        />
      </div>

      {/* ============ GRÁFICOS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-lumen-lg border-stone-200 shadow-lumen-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lumen-display-sm">Turnos últimos 14 días</CardTitle>
              <p className="text-xs text-stone-400 mt-1">Distribución diaria VIP vs regular</p>
            </div>
            <div className="flex gap-4 text-xs text-stone-400">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-lumen-glow" />
                VIP
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-stone-900" />
                Regular
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BarChartTurnos data={datosBarras} />
          </CardContent>
        </Card>

        <Card className="rounded-lumen-lg border-stone-200 shadow-lumen-1">
          <CardHeader>
            <CardTitle className="text-lumen-display-sm">Canal de origen</CardTitle>
            <p className="text-xs text-stone-400 mt-1">Distribución últimos 14 días</p>
          </CardHeader>
          <CardContent>
            <DonutChartCanales data={datosDonut} />
          </CardContent>
        </Card>
      </div>

      {/* ============ ÚLTIMOS PEDIDOS ============ */}
      <Card className="rounded-lumen-lg border-stone-200 shadow-lumen-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lumen-display-sm">Últimos pedidos procesados</CardTitle>
            <p className="text-xs text-stone-400 mt-1">Vista en tiempo real del motor IA</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pedidos">
              Ver todos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Obra Social</TableHead>
                <TableHead>Práctica</TableHead>
                <TableHead className="w-[180px]">Confianza IA</TableHead>
                <TableHead className="w-[140px]">Estado</TableHead>
                <TableHead className="text-right w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ultimosPedidos ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-stone-400 py-12">
                    <div className="space-y-2">
                      <Sparkles className="h-8 w-8 mx-auto text-stone-300" />
                      <p>No hay pedidos procesados todavía.</p>
                      <p className="text-xs">Cuando llegue uno por BOTMAKER, vas a verlo acá en vivo.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {(ultimosPedidos ?? []).map((pedido) => {
                const paciente = Array.isArray(pedido.paciente) ? pedido.paciente[0] : pedido.paciente;
                const estadoDot = pedido.estado === "asignado" ? "pulse" : pedido.estado === "procesado" ? "ember" : "muted";

                return (
                  <TableRow key={pedido.id} className="hover:bg-stone-50/50 transition-colors">
                    <TableCell className="font-mono text-xs text-stone-400">
                      {formatFecha(pedido.created_at, "HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {paciente ? `${paciente.nombre} ${paciente.apellido}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="font-medium">
                        {pedido.obra_social_detectada ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-stone-700 text-sm">
                      {pedido.practica_detectada ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ConfidenceBar value={pedido.confianza_ia ?? 0} size="sm" />
                    </TableCell>
                    <TableCell>
                      <StatusDot
                        variant={estadoDot}
                        label={pedido.estado}
                        size="md"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/pedidos/${pedido.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ============ ALERTA DE CUPOS (si aplica) ============ */}
      {cupoCritico && porcentajeCupoCritico > 80 && (
        <div className="relative overflow-hidden rounded-lumen-lg border border-lumen-ember/20 bg-gradient-to-r from-lumen-ember/5 to-transparent p-5 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lumen bg-lumen-ember/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-lumen-ember" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">Cupo crítico esta semana</h3>
              <p className="text-sm text-stone-600 mt-0.5">
                {pickNombre(cupoCritico.obras_sociales)} ·{" "}
                {pickNombre(cupoCritico.practicas)}{" "}
                está al{" "}
                <span className="font-mono font-semibold text-lumen-ember">
                  {porcentajeCupoCritico.toFixed(0)}%
                </span>
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/cupos">Gestionar →</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Helpers ============

function construirSerieDiaria(
  turnos: { fecha_hora: string; fue_vip: boolean | null; created_at: string }[],
  cantDias: number,
): Array<{ dia: string; vip: number; regular: number }> {
  const hoy = new Date();
  const dias: Array<{ dia: string; vip: number; regular: number }> = [];

  for (let i = cantDias - 1; i >= 0; i--) {
    const fecha = new Date(hoy.getTime() - i * 24 * 3600 * 1000);
    const diaStr = fecha.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });
    dias.push({ dia: diaStr, vip: 0, regular: 0 });
  }

  for (const turno of turnos) {
    const fecha = new Date(turno.created_at);
    const diff = Math.floor((hoy.getTime() - fecha.getTime()) / (24 * 3600 * 1000));
    const idx = cantDias - 1 - diff;
    if (idx >= 0 && idx < cantDias) {
      if (turno.fue_vip) dias[idx].vip += 1;
      else dias[idx].regular += 1;
    }
  }

  return dias;
}

function construirDistribucionCanales(
  turnos: { canal_origen: string | null }[],
): Array<{ name: string; value: number; color: string }> {
  const contador: Record<string, number> = {};
  for (const t of turnos) {
    const canal = t.canal_origen ?? "otro";
    contador[canal] = (contador[canal] ?? 0) + 1;
  }
  const total = Object.values(contador).reduce((s, v) => s + v, 0) || 1;

  const colores: Record<string, string> = {
    botmaker: "#0C0A09",     // ink
    presencial: "#A78BFA",   // aurora
    web: "#FBBF24",          // glow
    app: "#34D399",          // pulse
    admin: "#A8A29E",
    otro: "#D6D3D1",
  };

  const etiquetas: Record<string, string> = {
    botmaker: "BOTMAKER",
    presencial: "Presencial",
    web: "Web",
    app: "App",
    admin: "Admin",
    otro: "Otro",
  };

  return Object.entries(contador).map(([canal, count]) => ({
    name: etiquetas[canal] ?? canal,
    value: Math.round((count / total) * 100),
    color: colores[canal] ?? "#CBD5E1",
  }));
}
