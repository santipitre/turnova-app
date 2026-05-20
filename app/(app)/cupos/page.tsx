import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colorPorOcupacion } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cupos Semanales" };

export default async function CuposPage() {
  const supabase = createClient();

  const año = new Date().getFullYear();
  const ahora = new Date();
  const semana = Math.ceil((ahora.getDate() + new Date(año, 0, 1).getDay()) / 7);

  const { data: cupos } = await supabase
    .from("cupos_semanales")
    .select(`
      id, cupos_totales, cupos_asignados, cupos_reservados,
      obra_social:obras_sociales(id, nombre, es_vip),
      practica:practicas(id, nombre)
    `)
    .eq("año", año)
    .eq("semana", semana);

  // Agrupar en matriz: filas = obras sociales no-VIP, columnas = prácticas
  const obrasSociales = new Map<string, { id: string; nombre: string }>();
  const practicas = new Map<string, { id: string; nombre: string }>();
  const matriz = new Map<string, { totales: number; asignados: number; reservados: number }>();

  (cupos ?? []).forEach((c) => {
    const os = Array.isArray(c.obra_social) ? c.obra_social[0] : c.obra_social;
    const pr = Array.isArray(c.practica) ? c.practica[0] : c.practica;
    if (!os || !pr || os.es_vip) return;

    obrasSociales.set(os.id, { id: os.id, nombre: os.nombre });
    practicas.set(pr.id, { id: pr.id, nombre: pr.nombre });
    matriz.set(`${os.id}_${pr.id}`, {
      totales: c.cupos_totales,
      asignados: c.cupos_asignados,
      reservados: c.cupos_reservados,
    });
  });

  const obrasArr = Array.from(obrasSociales.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const practicasArr = Array.from(practicas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Cupos Semanales</h1>
        <p className="text-stone-400 mt-1">
          Semana {semana} de {año} · Obras sociales NO-VIP × Prácticas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de ocupación</CardTitle>
          <div className="flex gap-4 mt-2 text-caption text-stone-400">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-lumen-pulse" /> Saludable (&lt;70%)
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-pyralis-warning" /> Cuidado (70-90%)
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-pyralis-danger" /> Saturado (&gt;90%)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-800/60">
                  <th className="text-left p-3 text-overline text-stone-400 uppercase sticky left-0 bg-stone-900/40">
                    Obra Social
                  </th>
                  {practicasArr.map((p) => (
                    <th key={p.id} className="text-left p-3 text-overline text-stone-400 uppercase whitespace-nowrap">
                      {p.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obrasArr.map((os) => (
                  <tr key={os.id} className="border-b border-stone-800/40">
                    <td className="p-3 font-semibold sticky left-0 bg-stone-900/40">{os.nombre}</td>
                    {practicasArr.map((pr) => {
                      const cupo = matriz.get(`${os.id}_${pr.id}`);
                      if (!cupo || cupo.totales === 0) {
                        return (
                          <td key={pr.id} className="p-3 text-slate-300 text-xs">
                            Sin cupos
                          </td>
                        );
                      }
                      const porcentaje = (cupo.asignados / cupo.totales) * 100;
                      const color = colorPorOcupacion(porcentaje);
                      const colorClass = {
                        success: "bg-lumen-pulse",
                        warning: "bg-pyralis-warning",
                        danger: "bg-pyralis-danger",
                      }[color];
                      return (
                        <td key={pr.id} className="p-3 min-w-[110px]">
                          <div className="text-sm font-semibold">
                            {cupo.asignados}<span className="text-stone-400">/{cupo.totales}</span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-800/50 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full ${colorClass} transition-all`}
                              style={{ width: `${Math.min(100, porcentaje)}%` }}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {obrasArr.length === 0 && (
                  <tr>
                    <td colSpan={practicasArr.length + 1} className="text-center p-8 text-stone-400">
                      No hay cupos sembrados para esta semana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
