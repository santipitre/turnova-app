/**
 * Cliente de Claude Vision API para extraer datos de pedidos médicos argentinos.
 * Server-side only - NUNCA exponer al cliente porque usa ANTHROPIC_API_KEY.
 *
 * v3 (2026-05-28): razonamiento paso a paso + extended thinking + confianza por campo.
 * - Forzamos a Claude a inferir especialidad del médico ANTES de elegir práctica.
 * - Habilitamos extended thinking (4000 tokens de razonamiento interno).
 * - Devolvemos confianza global + por campo para UI de revisión humana.
 */

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

export interface ConfianzaPorCampo {
  practica_solicitada?: number;
  obra_social?: number;
  matricula_medico?: number;
  medico_solicitante?: number;
  numero_afiliado?: number;
  diagnostico_presunto?: number;
  fecha_pedido?: number;
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
  // v3:
  confianza_por_campo?: ConfianzaPorCampo;
  especialidad_inferida?: string | null;
  razonamiento?: string | null;
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

  const serviciosDisponibles = Object.keys(porServicio).join(", ") || "(catálogo vacío)";

  const catalogoSection =
    catalogo && (catalogo.obras_sociales.length > 0 || catalogo.practicas.length > 0)
      ? `

# CATÁLOGO REAL DE ESTE CENTRO MÉDICO

## OBRAS SOCIALES ACEPTADAS (${catalogo.obras_sociales.length})
${osLines}

**REGLA CRÍTICA**: \`obra_social\` DEBE ser uno de los nombres exactos de arriba (sin las variantes). Si ves "OSDE 210" → devolvé "OSDE". Si lo que ves NO está en la lista → null.

## PRÁCTICAS / ESTUDIOS QUE OFRECE EL CENTRO (${catalogo.practicas.length})
Servicios disponibles: ${serviciosDisponibles}

${practicasLines}

**REGLA CRÍTICA**: \`practica_solicitada\` DEBE ser el nombre EXACTO de una práctica de arriba. Si el pedido menciona código nomenclador, devolvé también \`codigo_nomenclador\`.
`
      : "";

  return `Sos un asistente especializado en leer pedidos médicos argentinos. Tu output se usa para asignar turnos automáticamente, así que la precisión es crítica. Una práctica mal identificada = paciente con turno equivocado.

# CÓMO PENSAR ESTE PEDIDO (CRÍTICO — SEGUÍ ESTE ORDEN)

Antes de extraer datos, razoná en este orden dentro del thinking. Solo después armás el JSON.

**Paso 1 — Mirá el sello del médico (al pie del documento)**
El sello suele tener:
- Nombre del médico (ej. "Dr. Iervolino Nicolás")
- **ESPECIALIDAD** (ej. "Cirugía Maxilofacial", "Bucomaxilofacial", "Radiología", "Cardiología")
- **MATRÍCULA** (ej. "Mat: 3121", "M.P. 12345", "MN 67890") — casi siempre en el sello, NO en el manuscrito

Si la especialidad NO está clara, mirá la cabecera impresa (también suele decir "Cirugía Maxilofacial" etc.).

**Paso 2 — Inferí qué prácticas son razonables dado la especialidad**

Tabla de mapeo especialidad → prácticas probables:
| Especialidad médico | Prácticas razonables |
|---|---|
| Maxilofacial / Bucomaxilofacial / Odontología | TC/TAC de macizo facial, ATM, mandíbula, Rx panorámica, cefalometría, NO abdomen/pelvis/columna |
| Traumatología | Rx/RMN de hueso, articulaciones, columna, NO abdomen |
| Gastroenterología | Eco abdominal, TC abdomen-pelvis, endoscopía |
| Urología | Eco renal/vesical, TC renal, urograma |
| Ginecología | Eco ginecológica, mamografía, pap |
| Neurología | RMN cerebro, TC cerebro, EEG |
| Cardiología | ECG, ecocardiograma, holter |
| Neumonología | Rx tórax, TC tórax, espirometría |
| Traumatología deportiva | RMN rodilla, hombro, columna |
| Pediatría | Eco infantil, Rx general |

**Si la especialidad sugiere una región anatómica → buscá prácticas de ESA región en el catálogo. NO uses prácticas de otra región aunque parezcan compatibles textualmente.**

Ejemplo real: si el sello dice "Cirugía Maxilofacial" y el manuscrito dice "TAC con reconstrucción 3D" → la práctica correcta es de macizo facial / ATM, NUNCA "TC ABDOMEN Y PELVIS" (eso es de gastro/uro/etc).

**Paso 3 — Decodificá el manuscrito**

Buscá estos campos. El R/p (Receta) o "Solicito" suele ser una línea larga:
- "Solicito TC ATM con reconstrucción 3D" → práctica = TC macizo facial / ATM
- "Solicito RMN columna lumbosacra" → práctica = RMN lumbosacra
- "Solicito Eco abdominal completa" → práctica = Ecografía abdominal

Expandí abreviaturas:
| Abreviatura | Expansión |
|---|---|
| TAC / TC | Tomografía Computada |
| RMN / RM | Resonancia Magnética |
| Eco | Ecografía |
| Rx | Radiografía |
| s/c / c/c | sin/con contraste |
| ATM | Articulación Temporomandibular |
| AP / LAT | Anteroposterior / Lateral |
| col / colum | Columna |
| lumbosacra | Lumbosacra |
| 3D | Reconstrucción tridimensional |

**Paso 4 — Matchéa contra el catálogo**

Tomá la práctica que entendiste y buscá el match más cercano EN EL CATÁLOGO de este centro:
- Si encontrás un match exacto o casi exacto (90%+ certeza) → usalo
- Si tu interpretación NO está en el catálogo → \`practica_solicitada: null\` y bajá la confianza
- NUNCA inventes una práctica que no esté en el catálogo

**Paso 5 — Auto-evaluate confianza POR CAMPO**

Para cada campo, dame un número 0.00–1.00 según qué tan seguro estás:
- 0.95+ = perfectamente legible, match exacto al catálogo
- 0.80–0.94 = legible con buena certeza
- 0.60–0.79 = legible parcial o catálogo no exacto
- < 0.60 = poco legible o ambiguo → un humano debería revisar

# DÓNDE BUSCAR CADA DATO

- **ENCABEZADO** (impreso, arriba): centro emisor, especialidad del médico
- **CAMPO PACIENTE**: nombre del paciente (a veces tachado por privacidad)
- **CAMPO O.SOCIAL / OBRA SOCIAL**: cobertura del paciente
- **CAMPO Nº AFILIADO**: número de afiliación
- **R/p (Receta) o "Solicito"**: la práctica/estudio pedido — LO MÁS IMPORTANTE
- **DIAGNÓSTICO / Dx**: motivo clínico
- **FECHA**: arriba a la derecha
- **SELLO DEL MÉDICO** (al pie): nombre + especialidad + matrícula
${catalogoSection}

# REGLAS FIRMES
1. Si un campo NO es legible o NO está → null. NUNCA inventes.
2. \`obra_social\` y \`practica_solicitada\` DEBEN ser nombres exactos del catálogo (si hay).
3. urgencia_indicada = true si hay "URGENTE", "URGENCIA" o equivalente.
4. fecha_pedido en formato ISO YYYY-MM-DD (13/05/26 → "2026-05-13").
5. La matrícula casi siempre está en el SELLO, no en el manuscrito.

# FORMATO DE SALIDA OBLIGATORIO

Después de razonar en el thinking, devolvé ÚNICAMENTE este JSON (sin markdown, sin texto antes/después):

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
  "confianza": number,
  "confianza_por_campo": {
    "practica_solicitada": number,
    "obra_social": number,
    "matricula_medico": number,
    "medico_solicitante": number,
    "numero_afiliado": number,
    "diagnostico_presunto": number,
    "fecha_pedido": number
  },
  "especialidad_inferida": string|null,
  "razonamiento": string|null
}

\`razonamiento\` es UN RENGLÓN corto (max 200 chars) explicando la lógica clave. Ejemplo: "Sello dice Cirugía Maxilofacial → 'TAC con reconstrucción 3D' = TC macizo facial / ATM en el catálogo."`;
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
    // max_tokens debe contener thinking budget + respuesta final.
    // 4000 thinking + 2500 para JSON = 6500. Dejamos buffer.
    max_tokens: 8000,
    thinking: {
      type: "enabled",
      budget_tokens: 4000,
    },
    system: buildSystemPrompt(catalogo),
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Razoná paso a paso siguiendo las 5 etapas del system prompt (sello → especialidad → prácticas razonables → match catálogo → confianza por campo). Después devolvé el JSON.",
          },
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

  // Con extended thinking, content puede tener varios bloques:
  // - blocks de tipo "thinking" (el razonamiento interno)
  // - bloques de tipo "text" (la respuesta final con el JSON)
  // Buscamos el último bloque "text" (el JSON).
  const blocks = (data.content as Array<{ type: string; text?: string }>) || [];
  const textBlock = [...blocks].reverse().find((b) => b.type === "text");
  const textResponse = textBlock?.text;
  if (!textResponse) throw new Error("Respuesta de Claude sin contenido válido");

  let parsed: DatosExtraidos;
  try {
    parsed = JSON.parse(textResponse);
  } catch {
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No se pudo parsear JSON: ${textResponse.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  // Normalizar confianza global
  if (typeof parsed.confianza !== "number") parsed.confianza = 0.5;
  parsed.confianza = Math.max(0, Math.min(1, parsed.confianza));

  // Normalizar confianza por campo (clamp 0-1, fallback al global)
  if (parsed.confianza_por_campo && typeof parsed.confianza_por_campo === "object") {
    for (const k of Object.keys(parsed.confianza_por_campo) as Array<keyof ConfianzaPorCampo>) {
      const v = parsed.confianza_por_campo[k];
      if (typeof v === "number") {
        parsed.confianza_por_campo[k] = Math.max(0, Math.min(1, v));
      } else {
        parsed.confianza_por_campo[k] = parsed.confianza;
      }
    }
  }

  return parsed;
}
