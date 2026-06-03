import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import {
  EstudiosManager,
  type PracticaLite,
} from "@/components/estudios/estudios-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estudios / Grupos" };

export default async function EstudiosPage() {
  const user = getServerUser();
  const tenantId = user?.tenant_id ?? null;

  const supabase = createClient();
  const { data: practicas } = await supabase
    .from("practicas")
    .select("id, nombre, servicio, codigo_nomenclador, grupo")
    .eq("tenant_id", tenantId)
    .order("servicio", { ascending: true })
    .order("nombre", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Estudios / Grupos</h1>
        <p className="text-stone-400 mt-1">
          Cada práctica del nomenclador pertenece a un grupo. El bot usa el grupo para aplicar la
          regla de autorización de la matriz. Reasigná el grupo si alguno quedó mal. Se guarda al instante.
        </p>
      </div>

      <EstudiosManager
        tenantId={tenantId}
        practicas={(practicas ?? []) as PracticaLite[]}
      />
    </div>
  );
}
