/**
 * Cliente de Claude Vision API para extraer datos de pedidos médicos argentinos.
 * Server-side only - NUNCA exponer al cliente porque usa ANTHROPIC_API_KEY.
 *
 * v2: usa el catalogo REAL del tenant para mejorar precision de matching de OS y practicas.
 */

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

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
}

export interface CatalogoCentro {
  obras_sociales: Array<{ nombre: string; aliases?: string[] }>;
  practicas: Array<{ nombre: string; codigo?: string | null; servicio?: string | null }>;
}

function buildSystemPrompt(catalogo: CatalogoCentro | null): string {
  // Construir las listas para el prompt
  const osLines = (catalogo?.obras_sociales || [])
    .map((o) => {
      const aliases = (o.aliases || []).filter((a) => a !== o.nombre.toUpperCase());
      const aliasStr = aliases.length ? ` (variantes: ${aliases.slice(0, 5).join(", ")})` : "";
      return `  • ${o.nombre}${aliasStr}`;
    })
    .join("\n");

  // Agrupar prácticas por servicio
  const porServicio: Record<string, string[]> = {};
  for (const p of catalogo?.practicas || []) {
    const s = p.servicio || "Otros";
    if (!porServicio[s]) porServicio[s] = [];
    const cod = p.codigo ? ` [${p.codigo}]` : "";
    porServicio[s].push(`${p.nombre}${cod}`);
  }
  const practicasLines = Object.entries(porServicio)
    .map(([s, list]) => `  ━ ${s}:\n${list.map((l) => `    • ${l}`).join("\n")}`)
    .join("\n");

  const catalogoSection =
    catalogo && (catalogo.obras_sociales.length > 0 || catalogo.practicas.length > 0)
      ? `

# CATÁLOGO REAL DE ESTE CENTRO MÉDICO (USAR ESTOS NOMBRES EXACTOS)

## OBRAS SOCIALES ACEPTADAS POR EL CENTRO (${catalogo.obras_sociales.length})
${osLines}

**REGLA CRÍTICA**: Tu output \`obra_social\` DEBE ser uno de los nombres exactos de arriba (la columna principal, sin las variantes). Si el pedido menciona una variante (ej: "OSDE 210" para "OSDE"), devolvé el nombre canónico. Si lo que ves en el pedido NO está en esta lista o no estás 90%+ seguro del match, devolvé null y bajá la confianza.

## PRÁCTICAS / ESTUDIOS QUE OFRECE EL CENTRO (${catalogo.practicas.length})
${practicasLines}

**REGLA CRÍTICA**: Tu output \`practica_solicitada\` DEBE ser el nombre exacto de una práctica de la lista de arriba (la parte antes del [código]). Si lo que ves no encaja con ninguna o no estás 90%+ seguro, devolvé null y bajá la confianza. Si ves un código nomenclador en el pedido (ej: "420101", "160101"), devolvé también \`codigo_nomenclador\`.
`
      : "";

  return `Sos un asistente especializado en leer pedidos médicos argentinos.

# TU TAREA
Analizar la imagen/PDF y devolver UN JSON ESTRICTO con los datos. Sin texto antes ni después,
sin markdown, sin code fences. SOLO el JSON.

# DÓNDE BUSCAR CADA DATO (CRÍTICO)
Un pedido médico argentino típico tiene esta estructura:
- **ENCABEZADO**: centro emisor / clínica / sanatorio
- **CAMPO PACIENTE**: nombre del paciente (suele estar tachado por privacidad)
- **CAMPO O.SOCIAL / OBRA SOCIAL**: la cobertura del paciente
- **CAMPO Nº AFILIADO / R/p**: número de afiliación a la obra social
- **CAMPO R/p (Receta) o "Solicito"**: la práctica/estudio que se pide
- **CAMPO DIAGNÓSTICO**: motivo clínico
- **FECHA**: arriba a la derecha generalmente
- **AL PIE (CRÍTICO): SELLO DEL MÉDICO** — nombre, especialidad, matrícula (MP/MN), firma

# EXPANSIÓN DE ABREVIATURAS ARGENTINAS COMUNES
| Abreviatura | Expansión |
|---|---|
| Sto. / Solic. | Solicito |
| RMN / RM | Resonancia Magnética |
| TAC / TC | Tomografía Computada |
| Eco / Ecograf | Ecografía |
| Mamograf | Mamografía |
| Rx | Radiografía |
| Cpx / Complej | (Alta) Complejidad |
| s/c / s/cte | sin contraste |
| c/c | con contraste |
| Sup / Sup. | Superior |
| Inf / Inf. | Inferior |
| Izq / Der | Izquierdo / Derecho |
| Bilat | Bilateral |
| Abd | Abdominal |
| Lab | Laboratorio |
| Hemo | Hemograma |
| ECG | Electrocardiograma |
| Dr / Dra | Doctor / Doctora |
| MP / MN | Matrícula Provincial / Nacional |
${catalogoSection}

# REGLAS DE EXTRACCIÓN
1. Si un campo NO es legible o NO está, devolvelo como null. NUNCA inventes.
2. \`obra_social\` y \`practica_solicitada\` DEBEN ser nombres exactos del catálogo de arriba (si hay catálogo). Si no hay match 90%+ seguro → null.
3. urgencia_indicada = true si el pedido tiene "URGENTE", "URGENCIA" o equivalente.
4. confianza = autoevaluación de 0.00 a 1.00 considerando: nitidez, legibilidad, completitud, certeza del match.
5. fecha_pedido en formato ISO YYYY-MM-DD (13/05/26 → "2026-05-13").

# FORMATO DE SALIDA OBLIGATORIO
Devolvé ÚNICAMENTE este JSON, sin nada más:
{
  "practica_solicitada": string|null,
  "codigo_nomenclador": string|null,
  "obra_social": string|null,
  "numero_afiliado": string|null,
  "medico_solicitante": string|null,
  "matricula_medico": string|null,
  "diagnostico_presunto": string|null,
  "urgencia_indicada": boolean,
  "fecha_pedido": string|null,
  "confianza": number
}`;
}

export async function extraerDatosPedido(
  imagenBase64: string,
  mediaType: string,
  catalogo: CatalogoCentro | null = null,
): Promise<DatosExtraidos> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no configurada");
  }

  const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!supportedTypes.includes(mediaType)) {
    throw new Error(`Tipo de archivo no soportado: ${mediaType}`);
  }

  const isPdf = mediaType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: mediaType, data: imagenBase64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: imagenBase64 } };

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: buildSystemPrompt(catalogo),
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Analizá este pedido médico y devolvé el JSON con los datos extraídos." },
        ],
      },
    ],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const textResponse = data.content?.[0]?.text;
  if (!textResponse) throw new Error("Respuesta de Claude sin contenido válido");

  let parsed: DatosExtraidos;
  try {
    parsed = JSON.parse(textResponse);
  } catch {
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No se pudo parsear JSON: ${textResponse.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  if (typeof parsed.confianza !== "number") parsed.confianza = 0.5;
  parsed.confianza = Math.max(0, Math.min(1, parsed.confianza));

  return parsed;
}
