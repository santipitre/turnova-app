import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import {
  MatrizAutorizacionesManager,
  GRUPOS_DEFAULT,
  type ObraSocialLite,
  type CeldaMatriz,
} from "@/components/autorizaciones/matriz-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Autorizaciones" };

export default async function AutorizacionesPage() {
  const user = getServerUser();
  const tenantId = user?.tenant_id ?? null;

  const supabase = createClient();

  // Obras sociales del centro
  const { data: obras } = await supabase
    .from("obras_sociales")
    .select("id, nombre, codigo, activa")
    .eq("tenant_id", tenantId)
    .order("nombre", { ascending: true });

  // Grupos existentes en el nomenclador del centro (fallback a la lista default)
  const { data: gruposRows } = await supabase
    .from("practicas")
    .select("grupo")
    .eq("tenant_id", tenantId)
    .not("grupo", "is", null);

  const gruposSet = new Set<string>(
    (gruposRows ?? []).map((r: { grupo: string | null }) => r.grupo).filter(Boolean) as string[],
  );
  const grupos = gruposSet.size > 0 ? Array.from(gruposSet) : GRUPOS_DEFAULT;
  // Ordenar según el orden canónico cuando coincida
  grupos.sort(
    (a, b) =>
      (GRUPOS_DEFAULT.indexOf(a) === -1 ? 99 : GRUPOS_DEFAULT.indexOf(a)) -
      (GRUPOS_DEFAULT.indexOf(b) === -1 ? 99 : GRUPOS_DEFAULT.indexOf(b)),
  );

  // Celdas ya cargadas en la matriz
  const { data: celdas } = await supabase
    .from("matriz_autorizaciones")
    .select("obra_social_id, grupo, requiere_autorizacion, estado_dato")
    .eq("tenant_id", tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Matriz de Autorizaciones</h1>
        <p className="text-stone-400 mt-1">
          Por cada obra social y grupo de estudio, definí si requiere autorización previa. El bot
          aplica estas reglas al leer cada pedido. Los cambios se guardan al instante.
        </p>
      </div>

      <MatrizAutorizacionesManager
        tenantId={tenantId}
        obras={(obras ?? []) as ObraSocialLite[]}
        grupos={grupos}
        celdas={(celdas ?? []) as CeldaMatriz[]}
      />
    </div>
  );
}
