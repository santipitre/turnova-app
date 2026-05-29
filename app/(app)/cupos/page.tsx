import { createClient } from "@/lib/supabase/server";
import {
  CuposManager,
  type Servicio,
  type ObraRef,
} from "@/components/cupos/cupos-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cupos Semanales" };

// Número de semana ISO para mostrar
function semanaISO(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = date.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

export default async function CuposPage() {
  const supabase = createClient();
  const ahora = new Date();
  const año = ahora.getFullYear();
  const semana = semanaISO(ahora);

  // Lunes 00:00 → próximo lunes (semana actual)
  const diaLunes = (ahora.getDay() + 6) % 7;
  const lunes = new Date(ahora);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(ahora.getDate() - diaLunes);
  const proxLunes = new Date(lunes);
  proxLunes.setDate(lunes.getDate() + 7);

  // 1) Servicios activos
  const { data: serviciosData } = await supabase
    .from("servicios")
    .select("id, nombre, orden, activo")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  const servicios: Servicio[] = (serviciosData ?? []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
  }));

  // 2) Obras sociales NO-VIP
  const { data: osData } = await supabase
    .from("obras_sociales")
    .select("id, nombre, es_vip")
    .eq("es_vip", false)
    .order("nombre", { ascending: true });

  const obrasNoVip: ObraRef[] = (osData ?? []).map((o) => ({
    id: o.id,
    nombre: o.nombre,
  }));

  // 3) Cupos fijos por OS × servicio
  const { data: cuposData } = await supabase
    .from("cupos_servicio")
    .select("obra_social_id, servicio, cantidad_semanal");

  const cuposMap: Record<string, Record<string, number>> = {};
  (cuposData ?? []).forEach((c) => {
    if (!c.obra_social_id) return;
    (cuposMap[c.obra_social_id] ??= {})[c.servicio] = c.cantidad_semanal ?? 0;
  });

  // 4) Ocupación de la semana: turnos activos por OS × servicio
  const { data: turnosData } = await supabase
    .from("turnos")
    .select("obra_social_id, estado, fecha_hora, practica:practicas(servicio)")
    .gte("fecha_hora", lunes.toISOString())
    .lt("fecha_hora", proxLunes.toISOString());

  const usadosMap: Record<string, Record<string, number>> = {};
  (turnosData ?? []).forEach((t) => {
    if (!t.obra_social_id) return;
    if (t.estado === "cancelado" || t.estado === "no_asistio") return;
    const pr = Array.isArray(t.practica) ? t.practica[0] : t.practica;
    const servicio = pr?.servicio;
    if (!servicio) return;
    (usadosMap[t.obra_social_id] ??= {})[servicio] =
      ((usadosMap[t.obra_social_id] ??= {})[servicio] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Cupos Semanales</h1>
        <p className="text-stone-400 mt-1">
          Semana {semana} de {año} · Obras sociales NO-VIP × Servicios · cupo
          semanal fijo
        </p>
      </div>

      <CuposManager
        servicios={servicios}
        obrasNoVip={obrasNoVip}
        cuposMap={cuposMap}
        usadosMap={usadosMap}
      />
    </div>
  );
}
