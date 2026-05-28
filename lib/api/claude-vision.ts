/**
 * Cliente de Claude Vision API para extraer datos de pedidos médicos argentinos.
 * Server-side only - NUNCA exponer al cliente porque usa ANTHROPIC_API_KEY.
 *
 * v4 (2026-05-28): anti-hallucination + performance.
 * - Sacamos la tabla prescriptiva especialidad→prácticas que inducía a Claude
 *   a INVENTAR especialidades (caso real: leyó "Cirujano Maxilofacial" en un
 *   sello que decía "Ortopedia y Traumatología").
 * - Desactivamos extended thinking por default → de ~47s a ~5-8s por pedido.
 * - Reforzamos la regla: LEER textualmente lo que aparece, NUNCA completar
 *   con conocimiento médico general ni inferir desde otros campos.
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

/** Una práctica individual extraída del pedido. */
export interface PracticaExtraida {
  nombre: string;
  codigo_nomenclador?: string | null;
  confianza?: number;
}

export interface DatosExtraidos {
  /** Práctica principal (primera del array) — para compat con código viejo. */
  practica_solicitada: string | null;
  /** Lista completa de prácticas detectadas en el pedido (1+). */
  practicas_solicitadas?: PracticaExtraida[] | null;
  codigo_nomenclador: string | null;
  obra_social: string | null;
  numero_afiliado: string | null;
  medico_solicitante: string | null;
  matricula_medico: string | null;
  diagnostico_presunto: string | null;
  urgencia_indicada: boolean;
  fecha_pedido: string | null;
  confianza: number;
  confianza_por_campo?: ConfianzaPorCampo;
  especialidad_inferida?: string | null;
  razonamiento?: string | null;
}

export interface CatalogoCentro {
  obras_sociales: Array<{ nombre: string; aliases?: string[] }>;
  practicas: Array<{ nombre: string; codigo?: string | null; servicio?: string | null }>;
}

/**
 * Correcciones previas que el operador hizo en pedidos anteriores.
 * Se inyectan en el prompt como ejemplos few-shot para que la IA "aprenda"
 * patrones específicos del centro (caligrafías típicas, formatos de OS, etc.).
 */
export interface CorreccionPrevia {
  ia_practica?: string | null;
  ia_obra_social?: string | null;
  ia_medico?: string | null;
  ia_matricula?: string | null;
  ia_numero_afiliado?: string | null;
  ia_diagnostico?: string | null;
  ia_especialidad?: string | null;
  humano_practica?: string | null;
  humano_obra_social?: string | null;
  humano_medico?: string | null;
  humano_matricula?: string | null;
  humano_numero_afiliado?: string | null;
  humano_diagnostico?: string | null;
  campos_corregidos?: string[];
}

/** Médico conocido del centro (del diccionario medicos_solicitantes). */
export interface MedicoConocido {
  nombre: string;
  matricula?: string | null;
  especialidad?: string | null;
}

/** Patrón de N° afiliado por obra social. */
export interface PatronAfiliado {
  obra_social_nombre: string;
  formato_descripcion?: string | null;
  ejemplos?: string[] | null;
}

/**
 * Construye la sección de "lecciones aprendidas" del prompt.
 * Convierte correcciones humanas previas en hints accionables.
 */
function buildLeccionesAprendidas(correcciones: CorreccionPrevia[]): string {
  if (!correcciones || correcciones.length === 0) return "";

  const ejemplos = correcciones
    .map((c, i) => {
      const cambios: string[] = [];
      if (c.campos_corregidos?.includes("practica") && c.ia_practica !== c.humano_practica) {
        cambios.push(
          `  • Práctica: leíste "${c.ia_practica ?? "null"}" → correcto: "${c.humano_practica}"`,
        );
      }
      if (c.campos_corregidos?.includes("obra_social") && c.ia_obra_social !== c.humano_obra_social) {
        cambios.push(
          `  • Obra social: leíste "${c.ia_obra_social ?? "null"}" → correcto: "${c.humano_obra_social}"`,
        );
      }
      if (c.campos_corregidos?.includes("medico") && c.ia_medico !== c.humano_medico) {
        cambios.push(
          `  • Médico: leíste "${c.ia_medico ?? "null"}" → correcto: "${c.humano_medico}"`,
        );
      }
      if (c.campos_corregidos?.includes("matricula") && c.ia_matricula !== c.humano_matricula) {
        cambios.push(
          `  • Matrícula: leíste "${c.ia_matricula ?? "null"}" → correcto: "${c.humano_matricula}"`,
        );
      }
      if (
        c.campos_corregidos?.includes("numero_afiliado") &&
        c.ia_numero_afiliado !== c.humano_numero_afiliado
      ) {
        cambios.push(
          `  • Nº afiliado: leíste "${c.ia_numero_afiliado ?? "null"}" → correcto: "${c.humano_numero_afiliado}"`,
        );
      }
      if (cambios.length === 0) return null;
      return `Ejemplo ${i + 1}:\n${cambios.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (!ejemplos) return "";

  return `

# 📚 LECCIONES APRENDIDAS DE PEDIDOS PREVIOS (correcciones del operador)

Estos son errores REALES que cometiste en pedidos pasados de este mismo centro. El operador los corrigió a mano. Aprendé de estos patrones para no repetirlos:

${ejemplos}

**Patrones a aplicar:**
- Si una obra social aparece con un formato específico que ya corregimos, usá el formato correcto.
- Si reconoces caligrafías de médicos que ya vimos antes, usá el nombre/matrícula correctos.
- Si una práctica suele confundirse con otra similar, prestá MÁS atención esta vez.
`;
}

/**
 * Construye la sección de "médicos conocidos del centro" — diccionario.
 * Permite que Claude reconozca caligrafías típicas y corrija nombres mal leídos.
 */
function buildMedicosConocidosSection(medicos: MedicoConocido[]): string {
  if (!medicos || medicos.length === 0) return "";

  const lines = medicos
    .slice(0, 30)
    .map((m) => {
      const matStr = m.matricula ? ` · Mat: ${m.matricula}` : "";
      const espStr = m.especialidad ? ` · ${m.especialidad}` : "";
      return `  • ${m.nombre}${matStr}${espStr}`;
    })
    .join("\n");

  return `

# 👨‍⚕️ MÉDICOS CONOCIDOS DE ESTE CENTRO (${medicos.length})

Estos médicos firman pedidos en este centro frecuentemente. Si lo que leés en el sello/encabezado SE PARECE a alguno de estos, usá el nombre CANÓNICO listado acá (no la lectura aproximada):

${lines}

**Cómo aplicar:**
- Si la matrícula leída coincide con alguna de la lista → usá nombre + especialidad del catálogo.
- Si el nombre se parece pero está mal escrito ("Dr. SHVANO" ↔ "Dr. Silvano") → usá el del catálogo.
- Si NO encontrás match razonable → reportá lo que leíste sin forzar.
`;
}

/**
 * Construye la sección de patrones de N° afiliado por OS.
 * Ayuda a Claude a validar formato y rechazar lecturas incorrectas.
 */
function buildPatronesAfiliadoSection(patrones: PatronAfiliado[]): string {
  if (!patrones || patrones.length === 0) return "";

  const lines = patrones
    .map((p) => {
      const ejemplos = p.ejemplos && p.ejemplos.length > 0 ? ` (ej: ${p.ejemplos.slice(0, 2).join(", ")})` : "";
      return `  • **${p.obra_social_nombre}**: ${p.formato_descripcion || "formato no documentado"}${ejemplos}`;
    })
    .join("\n");

  return `

# 🔢 FORMATOS DE Nº AFILIADO POR OBRA SOCIAL

${lines}

Si leíste un n° afiliado pero NO CUMPLE el formato de la OS detectada → es probable que esté mal leído. Bajá la confianza por campo o devolvé null.
`;
}

function buildSystemPrompt(
  catalogo: CatalogoCentro | null,
  correcciones: CorreccionPrevia[] = [],
  medicosConocidos: MedicoConocido[] = [],
  patronesAfiliado: PatronAfiliado[] = [],
): string {
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

# CATÁLOGO REAL DE ESTE CENTRO MÉDICO

## OBRAS SOCIALES ACEPTADAS (${catalogo.obras_sociales.length})
${osLines}

**REGLA**: \`obra_social\` DEBE ser uno de los nombres exactos de arriba. Si ves "OSDE 210" → "OSDE". Si lo que ves NO está en la lista → null.

## PRÁCTICAS / ESTUDIOS QUE OFRECE EL CENTRO (${catalogo.practicas.length})
${practicasLines}

**REGLA**: \`practica_solicitada\` DEBE ser el nombre EXACTO de una práctica de arriba. Si el pedido tiene código nomenclador, devolvelo en \`codigo_nomenclador\`. Si NINGUNA del catálogo encaja con lo que leíste → null y baja la confianza.

**MÚLTIPLES PRÁCTICAS — MUY COMÚN**: muchos pedidos médicos solicitan VARIAS prácticas a la vez. Ejemplos:
- "TAC de tórax, abdomen y pelvis" → 3 prácticas (TAC tórax, TAC abdomen, TAC pelvis)
- "Lab. completo + ECG + Rx tórax" → 3 prácticas
- "RMN columna cervical y lumbar" → 2 prácticas

En estos casos devolvé en \`practicas_solicitadas\` el ARRAY completo (cada práctica del catálogo, una entrada por estudio). Y en \`practica_solicitada\` poné la PRIMERA del array (compat con UI).
`
      : "";

  const leccionesSection = buildLeccionesAprendidas(correcciones);
  const medicosSection = buildMedicosConocidosSection(medicosConocidos);
  const patronesSection = buildPatronesAfiliadoSection(patronesAfiliado);

  return `Sos un asistente que LEE pedidos médicos argentinos. Tu trabajo es transcribir lo que VE en la imagen, no interpretar ni completar con conocimiento médico general.

# REGLA #1 — NUNCA INVENTES (ANTI-HALLUCINATION)

Esta es la regla más importante. Violarla causa errores médicos graves.

✅ CORRECTO:
- Leés "Ortopedia y Traumatología" en el sello → especialidad_inferida = "Ortopedia y Traumatología"
- No podés leer el sello porque está borroso → especialidad_inferida = null
- Leés "Solicito RMN rodilla" en el manuscrito → práctica = lo que más se parezca en el catálogo

❌ INCORRECTO (esto es hallucination, te penaliza):
- "El médico parece traumatólogo entonces probablemente sea X" — NO. Solo si lo LEÍSTE.
- "La práctica es de cara entonces el médico debe ser maxilofacial" — NO. Solo si lo LEÍSTE.
- "Como dice 'Solicito TAC' debe ser de abdomen" — NO. Solo si lo LEÍSTE.
- Completar campos no visibles "porque tienen sentido juntos".

Si no podés leer un campo con 70%+ de certeza → devolvé null y bajá la confianza. Es mucho mejor un null honesto que un dato inventado.

# CÓMO PROCESÁS EL PEDIDO

**Paso 1 — Identificá las zonas del documento:**
- ENCABEZADO impreso (arriba): logo, nombre del médico/centro, especialidad, matrícula
- CUERPO manuscrito (medio): paciente, OS, n° afiliado, R/p o "Solicito" + práctica, diagnóstico, fecha
- SELLO (abajo): refuerza nombre + especialidad + matrícula del médico

**Paso 2 — Leé TEXTUALMENTE cada zona.** Para cada campo del JSON, hacé:
1. ¿Lo veo escrito en la imagen? Si sí, transcribilo tal cual.
2. ¿Lo veo borroso o ambiguo? null + baja confianza por campo.
3. NO uses otros campos para "deducir" éste.

**Paso 3 — Match contra el catálogo (si aplica):**
- Para \`obra_social\` y \`practica_solicitada\`, buscá el match más cercano EN EL CATÁLOGO listado abajo. Si tu interpretación no está en el catálogo, devolvé null (NUNCA inventes una práctica/OS que no esté listada).

**Paso 4 — Verificación de coherencia (SUAVE, opcional):**
- Si la especialidad que LEÍSTE y la práctica que LEÍSTE NO son coherentes (ej: maxilofacial pero pide rodilla), **bajá la confianza por campo** pero NO modifiques los datos. Anotalo en \`razonamiento\`.
- Si SON coherentes → confirma confianza alta.
- NUNCA descartes una práctica clara del manuscrito porque "no le pega" a una especialidad que vos inferiste.

# EXPANSIÓN DE ABREVIATURAS ARGENTINAS

| Abreviatura | Expansión |
|---|---|
| TAC / TC | Tomografía Computada |
| RMN / RM | Resonancia Magnética |
| Eco | Ecografía |
| Rx | Radiografía |
| s/c / c/c | sin contraste / con contraste |
| AP / LAT | Anteroposterior / Lateral |
| Bilat | Bilateral |
| Sup / Inf | Superior / Inferior |
| Izq / Der | Izquierdo / Derecho |
| Mat. / M.P. / M.N. | Matrícula (Provincial / Nacional) |
| Dr. / Dra. | Doctor / Doctora |
| R/p / Rp | Receta (lo que viene después es la práctica solicitada) |
| Dx | Diagnóstico |

# DÓNDE BUSCAR CADA DATO

| Campo JSON | Dónde buscarlo en la imagen |
|---|---|
| medico_solicitante | Sello (al pie) y/o encabezado impreso |
| matricula_medico | Sello — busca "Mat:", "M.P.", "M.N." seguido de números |
| especialidad_inferida | Sello y/o encabezado — leé el texto LITERAL, no infieras |
| paciente | Línea manuscrita después de "Paciente:" |
| obra_social | Línea con "O.Social:" / "Obra Social:" / "Cobertura:" |
| numero_afiliado | Línea con "N° Afiliado", suele tener formato "XXX-XX-XXXX-XX-X" |
| practica_solicitada | Línea después de "R/p" o "Solicito" — lo más importante |
| diagnostico_presunto | Línea con "Dx:", "Diagnóstico:", "Motivo:" |
| fecha_pedido | Arriba a la derecha, formato DD/MM/AA |
| urgencia_indicada | Buscá "URGENTE", "URGENCIA" |
${catalogoSection}
${medicosSection}
${patronesSection}
${leccionesSection}

# REGLAS FIRMES (resumen)

1. **NUNCA INVENTES**. Si no lo leíste claramente → null.
2. \`obra_social\` y \`practica_solicitada\` deben ser nombres EXACTOS del catálogo (si hay catálogo).
3. \`especialidad_inferida\` es el texto LITERAL del sello/encabezado, no una inferencia.
4. urgencia_indicada = true SOLO si ves "URGENTE" explícito.
5. fecha_pedido formato ISO YYYY-MM-DD (13/05/26 → "2026-05-13").
6. confianza_por_campo: 0.95+ legible perfecto, 0.80–0.94 legible bueno, 0.60–0.79 ambiguo, <0.60 ilegible.
7. confianza global = promedio ponderado (práctica y OS pesan más).

# FORMATO DE SALIDA OBLIGATORIO

Devolvé ÚNICAMENTE este JSON, sin markdown, sin texto antes/después:

{
  "practica_solicitada": string|null,
  "practicas_solicitadas": [
    { "nombre": string, "codigo_nomenclador": string|null, "confianza": number }
  ],
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

**REGLA IMPORTANTE sobre el array \`practicas_solicitadas\`:**
- Si hay UNA práctica: array de 1 elemento. \`practica_solicitada\` = ese mismo nombre.
- Si hay VARIAS prácticas: array con TODAS, una por elemento. \`practica_solicitada\` = la primera del array.
- Cada práctica debe ser un nombre EXACTO del catálogo (sin variantes inventadas).
- Si NO podés identificar ninguna práctica del catálogo: array vacío [] y \`practica_solicitada\`: null.

\`razonamiento\` es UN renglón corto (max 200 chars). Mencioná:
- Qué campos quedaron en null y por qué (ilegible / no está en catálogo / etc.)
- Si hay incoherencia entre especialidad y práctica (sin modificar datos).

Ejemplo bueno: "Sello: 'Ortopedia y Traumatología'. R/p claramente 'RMN rodilla derecha'. Match catálogo exacto. OS ilegible (borrosa)."
Ejemplo MALO: "Probablemente sea ortopedista porque pidió rodilla" (esto es inferencia, no lectura).`;
}

export async function extraerDatosPedido(
  imagenBase64: string,
  mediaType: string,
  catalogo: CatalogoCentro | null = null,
  correcciones: CorreccionPrevia[] = [],
  medicosConocidos: MedicoConocido[] = [],
  patronesAfiliado: PatronAfiliado[] = [],
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

  // v4: sin extended thinking por default. Mucho más rápido (~5-8s vs ~47s)
  // y el prompt re-escrito ya es lo bastante explícito sin necesidad de
  // razonamiento interno extenso. Para casos difíciles, el operador corrige
  // manualmente con la pantalla /pedidos/[id]/editar.
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 2500,
    system: buildSystemPrompt(catalogo, correcciones, medicosConocidos, patronesAfiliado),
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Leé el pedido médico siguiendo las reglas. Recordá: NUNCA inventes datos que no podés leer claramente en la imagen. Devolvé sólo el JSON.",
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

  // Sin thinking, content tiene un solo bloque de tipo "text"
  const blocks = (data.content as Array<{ type: string; text?: string }>) || [];
  const textBlock = blocks.find((b) => b.type === "text");
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

  // Normalizar array de prácticas (backwards-compat)
  if (!Array.isArray(parsed.practicas_solicitadas)) {
    // Fallback: armar array desde practica_solicitada single
    if (parsed.practica_solicitada) {
      parsed.practicas_solicitadas = [
        {
          nombre: parsed.practica_solicitada,
          codigo_nomenclador: parsed.codigo_nomenclador ?? null,
          confianza:
            parsed.confianza_por_campo?.practica_solicitada ?? parsed.confianza ?? 0.8,
        },
      ];
    } else {
      parsed.practicas_solicitadas = [];
    }
  } else {
    // Validar cada elemento del array
    parsed.practicas_solicitadas = parsed.practicas_solicitadas
      .filter((p): p is PracticaExtraida => !!p && typeof p.nombre === "string" && p.nombre.trim().length > 0)
      .map((p) => ({
        nombre: p.nombre.trim(),
        codigo_nomenclador: p.codigo_nomenclador ?? null,
        confianza: typeof p.confianza === "number" ? Math.max(0, Math.min(1, p.confianza)) : 0.8,
      }));
    // Asegurar que practica_solicitada single sea la primera del array
    if (parsed.practicas_solicitadas.length > 0 && !parsed.practica_solicitada) {
      parsed.practica_solicitada = parsed.practicas_solicitadas[0].nombre;
      parsed.codigo_nomenclador = parsed.practicas_solicitadas[0].codigo_nomenclador ?? null;
    }
  }

  // Normalizar confianza global (clamp 0-1, fallback 0.5)
  if (typeof parsed.confianza !== "number") parsed.confianza = 0.5;
  parsed.confianza = Math.max(0, Math.min(1, parsed.confianza));

  // Normalizar confianza por campo
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
