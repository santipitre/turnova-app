/**
 * Roles y capacidades de Turnova (uso interno por centro).
 * rol_turnova viene de turnova.profiles.rol:
 *   superadmin | admin | operador | solo_lectura
 *
 * Capacidades:
 *   ver          -> todos (incluye solo_lectura)
 *   editar       -> operador, admin, superadmin (procesar/editar pedidos,
 *                   matriz, estudios, obras sociales)
 *   administrar  -> admin, superadmin (configuración, usuarios, integraciones)
 *
 * Default si el rol viene null: "operador" (puede trabajar, no administrar).
 */
export type RolTurnova =
  | "superadmin"
  | "admin"
  | "operador"
  | "solo_lectura"
  | null
  | undefined;

export interface Capacidades {
  rol: string;
  ver: boolean;
  editar: boolean;
  administrar: boolean;
}

export function capacidades(rol: RolTurnova): Capacidades {
  const r = (rol || "operador").toString().toLowerCase();
  const admin = r === "superadmin" || r === "admin";
  return {
    rol: r,
    ver: true,
    editar: admin || r === "operador",
    administrar: admin,
  };
}

export function puedeEditar(rol: RolTurnova): boolean {
  return capacidades(rol).editar;
}
export function esAdmin(rol: RolTurnova): boolean {
  return capacidades(rol).administrar;
}
