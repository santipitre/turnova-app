import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance, formatRelative, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Combina clases de Tailwind con resolución de conflictos.
 * Uso: cn("p-2 bg-red-500", condicional && "p-4")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha ISO a "lun 20 may, 14:30".
 */
export function formatFecha(iso: string | Date, formato = "EEE d MMM, HH:mm"): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return format(date, formato, { locale: es });
}

/**
 * "hace 5 minutos", "en 2 horas".
 */
export function formatTiempoRelativo(iso: string | Date): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return formatDistance(date, new Date(), { locale: es, addSuffix: true });
}

/**
 * "Mañana a las 10:00", "El viernes a las 14:30".
 */
export function formatFechaAmigable(iso: string | Date): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return formatRelative(date, new Date(), { locale: es });
}

/**
 * Formatea un número con separadores argentinos: 12.345
 */
export function formatNumero(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

/**
 * Formatea porcentaje: 0.823 → "82.3%"
 */
export function formatPorcentaje(n: number, decimales = 1): string {
  return `${(n * 100).toFixed(decimales)}%`;
}

/**
 * Devuelve las iniciales de un nombre. "María Laura González" → "MG"
 */
export function getIniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(" ");
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Trunca un texto agregando ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Devuelve el color de badge según confianza IA.
 */
export function colorPorConfianza(confianza: number): "success" | "warning" | "danger" {
  if (confianza >= 0.9) return "success";
  if (confianza >= 0.75) return "warning";
  return "danger";
}

/**
 * Devuelve el color de cupo según % de ocupación.
 */
export function colorPorOcupacion(porcentaje: number): "success" | "warning" | "danger" {
  if (porcentaje < 70) return "success";
  if (porcentaje < 90) return "warning";
  return "danger";
}

/**
 * Convierte un File del navegador a base64 (sin el prefijo data:...).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover prefijo "data:image/jpeg;base64," si existe
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Detecta el media type de un archivo según su extensión.
 */
export function getMediaType(file: File): string {
  return file.type || "application/octet-stream";
}
