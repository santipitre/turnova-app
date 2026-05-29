import { createServiceClient } from "@/lib/supabase/server";
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
  const supabase = createServiceClient();
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

  // Normalizador (insensible a tildes/mayúsculas) para matchear servicios
  const norm = (x: string) =>
    x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Catálogo de servicios: normalizado -> nombre canónico (columna de la matriz)
  const servicioCanon = new Map<string, string>();
  servicios.forEach((sv) => servicioCanon.set(norm(sv.nombre), sv.nombre));
  const resolverServicio = (raw?: string | null): string | null =>
    raw ? servicioCanon.get(norm(raw)) ?? null : null;

  // Mapas práctica -> servicio (por id y por nombre) para resolver cada ítem del pedido
  const { data: practicasData } = await supabase
    .from("practicas")
    .select("id, nombre, servicio");

  const servicioPorPracticaId = new Map<string, string>();
  const servicioPorNombre = new Map<string, string>();
  (practicasData ?? []).forEach((p: any) => {
    if (!p.servicio) return;
    if (p.id) servicioPorPracticaId.set(p.id, p.servicio);
    if (p.nombre) servicioPorNombre.set(norm(p.nombre), p.servicio);
  });

  // OS no-VIP: nombre normalizado -> id (para pedidos sin obra_social_id)
  const osIdPorNombre = new Map<string, string>();
  obrasNoVip.forEach((o) => osIdPorNombre.set(norm(o.nombre), o.id));

  // 4) Ocupación de la semana: SUMA de cantidades pedidas por OS × servicio
  const { data: pedidosData } = await supabase
    .from("pedidos_medicos")
    .select("obra_social_id, obra_social_detectada, estado, extraccion_ia, created_at")
    .gte("created_at", lunes.toISOString())
    .lt("created_at", proxLunes.toISOString());

  const usadosMap: Record<string, Record<string, number>> = {};
  (pedidosData ?? []).forEach((ped: any) => {
    if (ped.estado === "cancelado" || ped.estado === "error") return;
    const osId: string | null =
      ped.obra_social_id ??
      (ped.obra_social_detectada
        ? osIdPorNombre.get(norm(ped.obra_social_detectada)) ?? null
        : null);
    if (!osId) return;
    const arr = ped.extraccion_ia?.practicas_array;
    if (!Array.isArray(arr)) return;
    arr.forEach((it: any) => {
      const nombre = typeof it === "string" ? it : it?.nombre;
      const cantidad =
        typeof it === "string"
          ? 1
          : Math.max(1, Math.round(Number(it?.cantidad) || 1));
      const practicaId = typeof it === "string" ? null : it?.practica_id;
      const rawServicio =
        (practicaId && servicioPorPracticaId.get(practicaId)) ||
        (nombre && servicioPorNombre.get(norm(nombre))) ||
        null;
      const servicio = resolverServicio(rawServicio);
      if (!servicio) return;
      (usadosMap[osId] ??= {})[servicio] =
        ((usadosMap[osId] ??= {})[servicio] ?? 0) + cantidad;
    });
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
