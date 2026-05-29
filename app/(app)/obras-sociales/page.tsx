import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  ObrasSocialesManager,
  type ObraSocial,
} from "@/components/obras-sociales/obras-sociales-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Obras Sociales" };

export default async function ObrasSocialesPage() {
  const supabase = createClient();

  const { data: obrasSociales } = await supabase
    .from("obras_sociales")
    .select("*")
    .order("prioridad", { ascending: true })
    .order("nombre", { ascending: true });

  const all = (obrasSociales ?? []) as ObraSocial[];

  // VIP ordenadas de menor a mayor prioridad (1 → 20)
  const vips = all
    .filter((os) => os.es_vip)
    .sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999));

  // No-VIP ordenadas alfabéticamente
  const noVips = all
    .filter((os) => !os.es_vip)
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));

  // Contar pacientes por OS
  const { data: pacientesPorOS } = await supabase
    .from("pacientes")
    .select("obra_social_id");

  const conteoPacientes = (pacientesPorOS ?? []).reduce<Record<string, number>>(
    (acc, p) => {
      if (p.obra_social_id)
        acc[p.obra_social_id] = (acc[p.obra_social_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-lg">Obras Sociales</h1>
          <p className="text-stone-400 mt-1">
            Las VIP reciben turno máximo en 72 horas. Las no-VIP usan cupos semanales.
          </p>
        </div>
        <Button variant="glow">
          <Plus className="h-4 w-4" />
          Agregar obra social
        </Button>
      </div>

      <ObrasSocialesManager
        vips={vips}
        noVips={noVips}
        conteoPacientes={conteoPacientes}
      />
    </div>
  );
}
