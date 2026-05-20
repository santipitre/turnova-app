/**
 * Cliente de Claude Vision API para extraer datos de pedidos médicos argentinos.
 * Server-side only - NUNCA exponer al cliente porque usa ANTHROPIC_API_KEY.
 */

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929"; // Sonnet 4.5 (estable). Cambiar a "claude-sonnet-4-6" si está disponible.

const SYSTEM_PROMPT = `Sos un asistente especializado en leer pedidos médicos argentinos.

# TU TAREA
Analizar la imagen/PDF y devolver UN JSON ESTRICTO con los datos. Sin texto antes ni después,
sin markdown, sin code fences. SOLO el JSON.

# DÓNDE BUSCAR CADA DATO (CRÍTICO)
Un pedido médico argentino típico tiene esta estructura:
- **ENCABEZADO**: centro emisor / clínica / sanatorio (ej: "Hospital Italiano")
- **CAMPO PACIENTE**: nombre del paciente (suele estar tachado por privacidad)
- **CAMPO O.SOCIAL / OBRA SOCIAL**: la cobertura del paciente
- **CAMPO Nº AFILIADO / R/p**: número de afiliación a la obra social
- **CAMPO R/p (Receta) o "Solicito"**: la práctica/estudio que se pide
- **CAMPO DIAGNÓSTICO**: motivo clínico (a veces abajo, a veces al costado)
- **FECHA**: arriba a la derecha generalmente
- **AL PIE (CRÍTICO): SELLO DEL MÉDICO** — contiene:
  * Nombre del profesional (ej: "Dr. Gobbi Mauricio")
  * Especialidad (ej: "Esp. en Traumatología")
  * Matrícula (ej: "MP 11716" o "MN 12345" — MP=Matrícula Provincial, MN=Nacional)
  * Firma manuscrita

**MIRÁ SIEMPRE EL SELLO AL PIE.** Es donde está la matrícula y el nombre del médico.

# EXPANSIÓN DE ABREVIATURAS ARGENTINAS COMUNES
Los pedidos están escritos a mano con abreviaturas. Tenés que EXPANDIRLAS al nombre completo:

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
| Q-O | Química y Orina |
| ECG | Electrocardiograma |
| Dr / Dra | Doctor / Doctora |
| MP / MN | Matrícula Provincial / Nacional |
| Esp / Espec | Especialista |

Ejemplos de práctica_solicitada CORRECTAS:
- Si lee "Sto. RMN Alta Cpx Miembro Sup" → "Resonancia Magnética de Alta Complejidad de Miembro Superior"
- Si lee "TAC c/c columna lumbar" → "Tomografía Computada con Contraste de Columna Lumbar"
- Si lee "Eco abd c/ doppler" → "Ecografía Abdominal con Doppler"

# OBRAS SOCIALES Y PREPAGAS ARGENTINAS — CONOCIMIENTO BASE
Identificá CORRECTAMENTE distinguiendo entre:

**OSDE** (Organización de Servicios Directos Empresarios) — la prepaga privada. Si ves "OSDE 210", "OSDE 410", "OSDE BINARIO" etc., son planes de OSDE.

**OSPE** (Obra Social del Personal del Petróleo y Gas Privado) — sindicato petrolero, NO es OSDE. Si ves "OSPE-ASUL", "OSPE Petroleros" → es OSPE.

**OSDEPYM, OSPRERA, OSECAC, OSPLAD, OSPATCA**: otras obras sociales sindicales distintas, NO son OSDE.

Otras prepagas comunes: Swiss Medical, Galeno, Medicus, OMINT, Hospital Italiano (Plan de Salud), Hospital Británico, Sancor Salud, Premedic.

Obras sociales públicas/sindicales: PAMI (jubilados), IOMA (PBA), DOSPU, UTHGRA, etc.

Particular: si no hay cobertura indicada o dice "particular" / "privado" / "no afiliado".

# DEVOLUCIÓN DEL CAMPO obra_social
Devolver el NOMBRE BASE de la obra social, sin el sufijo del plan, en MAYÚSCULAS para identificarlo claro.
- "OSPE-ASUL" → "OSPE"
- "OSDE 210" → "OSDE"
- "Swiss Medical Group" → "Swiss Medical"
- "Galeno Life" → "Galeno"
- "Hospital Italiano Plan de Salud" → "Hospital Italiano"

# REGLAS DE EXTRACCIÓN
1. Si un campo NO es legible o NO está, devolvelo como null. NUNCA inventes.
2. Si extraés un campo, devolvélo EXPANDIDO y COMPLETO, no abreviado.
3. urgencia_indicada = true si el pedido tiene "URGENTE", "URGENCIA" o equivalente.
4. confianza = autoevaluación de 0.00 a 1.00 considerando:
   - Calidad y nitidez de la imagen
   - Legibilidad de la caligrafía manuscrita
   - Completitud de los campos requeridos
5. fecha_pedido en formato ISO YYYY-MM-DD. Si la fecha está en formato DD/MM/AA argentino,
   convertí: 13/05/26 → "2026-05-13".

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

export async function extraerDatosPedido(
  imagenBase64: string,
  mediaType: string,
): Promise<DatosExtraidos> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurada en .env.local. Andá a https://console.anthropic.com → API Keys.",
    );
  }

  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];
  if (!supportedTypes.includes(mediaType)) {
    throw new Error(`Tipo de archivo no soportado: ${mediaType}`);
  }

  const isPdf = mediaType === "application/pdf";

  const contentBlock = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: mediaType, data: imagenBase64 },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imagenBase64 },
      };

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Analizá este pedido médico y devolvé el JSON con los datos extraídos.",
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
  const textResponse = data.content?.[0]?.text;
  if (!textResponse) {
    throw new Error("Respuesta de Claude sin contenido válido");
  }

  let parsed: DatosExtraidos;
  try {
    parsed = JSON.parse(textResponse);
  } catch {
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`No se pudo parsear JSON: ${textResponse.slice(0, 200)}`);
    }
    parsed = JSON.parse(match[0]);
  }

  if (typeof parsed.confianza !== "number") parsed.confianza = 0.5;
  parsed.confianza = Math.max(0, Math.min(1, parsed.confianza));

  return parsed;
}
