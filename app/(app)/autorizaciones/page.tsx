import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import {
  MatrizAutorizacionesManager,
  type ObraSocialLite,
  type CeldaMatriz,
  type PracticaMini,
  type OverridePractica,
} from "@/components/autorizaciones/matriz-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Autorizaciones" };

// Definido acá (server) — NO importar valores desde un módulo "use client".
const GRUPOS_DEFAULT = [
  "PET",
  "Medicina Nuclear / SPECT",
  "Resonancia Magnética",
  "Tomografía",
  "Mamografía",
  "Densitometría",
  "Ecografía / Doppler",
  "Radiología",
  "Cardiología",
  "Radioterapia",
  "Consultas / Otros",
];

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

  // Grupos existentes en el nomenclador del centro
  const { data: gruposRows } = await supabase
    .from("practicas")
    .select("grupo")
    .eq("tenant_id", tenantId)
    .not("grupo", "is", null);

  const dbGrupos = new Set<string>(
    (gruposRows ?? []).map((r: { grupo: string | null }) => r.grupo).filter(Boolean) as string[],
  );
  // Siempre mostramos todos los grupos canónicos (en orden), más cualquier extra de la BD.
  const extra = Array.from(dbGrupos).filter((g) => !GRUPOS_DEFAULT.includes(g));
  const grupos = [...GRUPOS_DEFAULT, ...extra];

  // Celdas ya cargadas en la matriz (regla por grupo)
  const { data: celdas } = await supabase
    .from("matriz_autorizaciones")
    .select("obra_social_id, grupo, requiere_autorizacion, estado_dato")
    .eq("tenant_id", tenantId);

  // Prácticas (para expandir un grupo y ver/editar sus estudios)
  const { data: practicas } = await supabase
    .from("practicas")
    .select("id, nombre, grupo, codigo_nomenclador")
    .eq("tenant_id", tenantId)
    .order("nombre", { ascending: true });

  // Excepciones por estudio ya cargadas
  const { data: overrides } = await supabase
    .from("autorizaciones_practica")
    .select("obra_social_id, practica_id, requiere_autorizacion")
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
        practicas={(practicas ?? []) as PracticaMini[]}
        overrides={(overrides ?? []) as OverridePractica[]}
      />
    </div>
  );
}
