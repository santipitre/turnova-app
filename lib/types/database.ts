// =====================================================================
// Tipos de la base de datos Turnova
// =====================================================================
// Estos tipos reflejan el schema de Supabase. En producción, generarlos
// automáticamente con:
//   npx supabase gen types typescript --project-id <PROJECT_REF> > lib/types/database.ts
// =====================================================================

export type Plan = "starter" | "pro" | "business" | "enterprise";
export type EstadoTenant = "activo" | "trial" | "suspendido" | "cancelado";
export type RolUsuario = "superadmin" | "admin" | "operador" | "auditor";
export type TipoEspecialidad = "imagenes" | "laboratorio" | "consulta" | "otros";
export type CanalOrigen = "botmaker" | "presencial" | "web" | "telefono" | "app" | "admin";
export type EstadoPedido = "pendiente" | "procesando" | "procesado" | "asignado" | "rechazado" | "error";
export type EstadoTurno = "reservado" | "confirmado" | "realizado" | "cancelado" | "no_asistio";
export type ArchivoTipo = "imagen" | "pdf";

export interface Tenant {
  id: string;
  nombre_centro: string;
  cuit: string | null;
  plan: Plan;
  estado: EstadoTenant;
  configuracion: Record<string, unknown>;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Sede {
  id: string;
  tenant_id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activa: boolean;
  horario_apertura: string; // "08:00:00"
  horario_cierre: string;
  dias_atencion: string[];
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  sedes_permitidas: string[];
  avatar_url: string | null;
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObraSocial {
  id: string;
  tenant_id: string;
  nombre: string;
  codigo: string | null;
  es_vip: boolean;
  tiempo_maximo_horas: number;
  prioridad: number;
  aliases: string[];
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Especialidad {
  id: string;
  tenant_id: string;
  nombre: string;
  tipo: TipoEspecialidad | null;
  icono: string | null;
  color: string;
  activa: boolean;
  created_at: string;
}

export interface Practica {
  id: string;
  tenant_id: string;
  especialidad_id: string | null;
  nombre: string;
  codigo_nomenclador: string | null;
  aliases: string[];
  duracion_minutos: number;
  preparacion: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface CupoSemanal {
  id: string;
  tenant_id: string;
  sede_id: string | null;
  obra_social_id: string;
  practica_id: string;
  año: number;
  semana: number;
  cupos_totales: number;
  cupos_asignados: number;
  cupos_reservados: number;
  created_at: string;
  updated_at: string;
}

export interface Paciente {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  telefono: string | null;
  email: string | null;
  obra_social_id: string | null;
  numero_afiliado: string | null;
  canal_origen: CanalOrigen | null;
  botmaker_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatosExtraidos {
  practica_solicitada: string | null;
  codigo_nomenclador: string | null;
  obra_social: string | null;
  numero_afiliado: string | null;
  medico_solicitante: string | null;
  matricula_medico: string | null;
  diagnostico_presunto: string | null;
  urgencia_indicada: boolean;
  fecha_pedido: string | null;
  confianza: number;
  practica_id_matched?: string | null;
  obra_social_id_matched?: string | null;
  tiempo_procesamiento_ms?: number;
}

export interface PedidoMedico {
  id: string;
  tenant_id: string;
  paciente_id: string | null;
  archivo_url: string | null;
  archivo_tipo: ArchivoTipo | null;
  canal_origen: CanalOrigen | null;
  datos_extraidos: DatosExtraidos;
  practica_detectada: string | null;
  obra_social_detectada: string | null;
  confianza_ia: number | null;
  requiere_revision_manual: boolean;
  estado: EstadoPedido;
  error_mensaje: string | null;
  procesado_por: string | null;
  procesado_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface Turno {
  id: string;
  tenant_id: string;
  paciente_id: string;
  practica_id: string;
  obra_social_id: string;
  sede_id: string | null;
  pedido_medico_id: string | null;
  fecha_hora: string;
  duracion_minutos: number;
  estado: EstadoTurno;
  fue_vip: boolean;
  horas_hasta_turno: number | null;
  canal_origen: CanalOrigen | null;
  notas: string | null;
  asignado_por: string | null;
  hold_expira_en: string | null;
  año: number | null;
  semana: number | null;
  created_at: string;
  updated_at: string;
}

// ============ Tipos enriquecidos (con joins) ============

export interface PedidoConRelaciones extends PedidoMedico {
  paciente?: Paciente | null;
}

export interface TurnoConRelaciones extends Turno {
  paciente?: Paciente;
  practica?: Practica;
  obra_social?: ObraSocial;
  sede?: Sede;
}

// ============ Respuestas de Edge Functions ============

export interface AsignarTurnoResponse {
  ok: true;
  hold: {
    turno_id: string;
    hold_expira_en: string;
    duracion_hold_minutos: number;
  };
  propuesta: {
    fecha_hora: string;
    duracion_minutos: number;
    sede_id: string;
    sede_nombre: string;
    año: number;
    semana: number;
    horas_hasta_turno: number;
    fue_vip: boolean;
    motivo_asignacion: string;
  };
  paciente: { id: string; nombre_completo: string } | null;
  practica: { id: string; nombre: string; preparacion: string | null };
  obra_social: { id: string; nombre: string; es_vip: boolean };
}

export interface ProcesarPedidoResponse {
  ok: true;
  pedido_medico: PedidoMedico;
  matching: {
    obra_social_id: string | null;
    practica_id: string | null;
    requiere_revision_manual: boolean;
  };
  metrica: {
    confianza: number;
    tiempo_ms: number;
  };
}
