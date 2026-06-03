"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Paperclip, Stethoscope, Bot } from "lucide-react";
import { toast } from "sonner";

import { fileToBase64 } from "@/lib/utils";
import { procesarPedido } from "@/lib/api/edge-functions";

export const dynamic = "force-dynamic";

interface Msg { from: "bot" | "user"; text: string; doc?: string }

const REGLA_TXT: Record<string, string> = {
  SI_AUDITORIA: "requiere autorización previa CON auditoría médica de la obra social",
  SI: "requiere autorización previa de la obra social",
  SIMPLE: "requiere autorización simple de la obra social",
  NO: "no requiere autorización previa",
  NO_DIRECTO: "no requiere autorización (atención particular / pago directo)",
  A_CONFIRMAR: "tiene una regla a confirmar con la obra social",
};

function buildRespuestas(result: any): string[] {
  const ped = result?.pedido_medico ?? {};
  const ex = ped.extraccion_ia ?? {};
  const matching = result?.matching ?? {};
  const conf = result?.metrica?.confianza ?? ex.confianza ?? 0;

  const estudio = ped.practica_detectada || ex.practica_solicitada || "el estudio";
  const obra = ped.obra_social_detectada || ex.obra_social || "tu obra social";
  const medicoNombre = ped.medico_solicitante || ex.medico_solicitante;
  const matricula = ped.matricula || ex.matricula_medico;
  const aut = matching.autorizacion ?? ex.autorizacion ?? null;

  const out: string[] = [];

  // 1) Médico
  if (ex.medico_no_catalogado) {
    out.push(`👨‍⚕️ Leí al Dr./Dra. *${medicoNombre || "—"}*${matricula ? ` (Mat. ${matricula})` : ""}, pero no figura en nuestra base. Un agente lo va a verificar.`);
  } else if (ex.medico_match?.nombre) {
    out.push(`👨‍⚕️ Médico solicitante: *${ex.medico_match.nombre}*${ex.medico_match.matricula ? ` (Mat. ${ex.medico_match.matricula})` : ""}.`);
  } else if (medicoNombre) {
    out.push(`👨‍⚕️ Médico solicitante: *${medicoNombre}*${matricula ? ` (Mat. ${matricula})` : ""}.`);
  }

  // 2) Estudio + obra social
  out.push(`📄 Estudio: *${estudio}*\n🏥 Obra social: *${obra}*`);
  if (!matching.obra_social_id) {
    out.push("⚠️ No pude identificar con certeza tu *obra social*. Un agente lo confirma para darte la información exacta de autorización.");
  }
  if (!matching.practica_id) {
    out.push("⚠️ No pude identificar con certeza el *estudio* pedido. Un agente lo confirma.");
  }

  // 3) Autorización (núcleo, según la matriz)
  if (aut && matching.obra_social_id && matching.practica_id) {
    const reglaTxt = REGLA_TXT[aut.regla] || REGLA_TXT.A_CONFIRMAR;
    if (aut.requiere) {
      let m = `🔐 Este estudio *${reglaTxt}*.`;
      if (aut.vigencia_dias) m += `\n🗓️ La orden tiene una validez de *${aut.vigencia_dias} días*.`;
      if (aut.tope_anual && aut.tope_anual !== "-") m += `\n📌 Tope: ${aut.tope_anual}.`;
      m += `\n📎 Presentá: *orden médica original* + la *autorización de la obra social*.`;
      if (aut.requisitos) m += `\nℹ️ ${aut.requisitos}`;
      out.push(m);
      out.push("Cuando tengas la autorización, escribime y coordinamos el turno. 🙌");
    } else if (aut.regla === "NO_DIRECTO") {
      out.push(`✅ Al ser *atención particular*, no se gestiona autorización. Podemos coordinar el turno directamente. 🗓️`);
    } else {
      let m = `✅ Buenas noticias: este estudio *no requiere autorización previa*.`;
      if (aut.requisitos) m += `\nℹ️ ${aut.requisitos}`;
      m += `\nPodemos coordinar el turno directamente. 🗓️`;
      out.push(m);
    }
  } else {
    out.push("Para decirte si necesitás autorización, primero un agente confirma la obra social y el estudio. Te escribimos a la brevedad. 🙏");
  }

  // 4) Revisión manual / baja confianza
  if (ex.requiere_revision_manual || conf < 0.85) {
    out.push("📝 Un agente de FUESMEN va a revisar tu pedido para confirmar todos los datos antes de avanzar.");
  }

  return out;
}

export default function ChatPruebaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "¡Hola! 👋 Soy el asistente de turnos de *FUESMEN*. Enviame una *foto o PDF del pedido médico* y te digo si necesitás autorización. 📸" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const procesar = useCallback(async (file: File) => {
    setMsgs((m) => [...m, { from: "user", text: "", doc: file.name }, { from: "user", text: "Hola, necesito turno para este estudio 🙏" }]);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await procesarPedido({ archivo_base64: base64, media_type: file.type, canal_origen: "web" });
      const respuestas = buildRespuestas(result);
      // mostrar respuestas escalonadas
      for (let i = 0; i < respuestas.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 200 : 550));
        setMsgs((m) => [...m, { from: "bot", text: respuestas[i] }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setMsgs((m) => [...m, { from: "bot", text: `❌ No pude procesar el pedido: ${msg}` }]);
      toast.error("Error procesando", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  // pegar con Ctrl+V
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.kind === "file") {
          const blob = it.getAsFile();
          if (blob) { e.preventDefault(); procesar(blob); return; }
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [procesar]);

  function fmt(t: string) {
    // *negrita* -> <strong>, saltos de línea
    const html = t
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
    return { __html: html };
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display-lg">Chat (prueba)</h1>
        <p className="text-stone-400 mt-1">
          Simulá el chat del paciente. Subí un pedido y el bot responde con las reglas REALES de la
          matriz (autorización por grupo + excepciones por estudio). No reserva turno.
        </p>
      </div>

      <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-stone-800 shadow-xl">
        {/* header tipo WhatsApp */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#075e54" }}>
          <div className="h-9 w-9 rounded-full bg-white/15 grid place-items-center text-white"><Stethoscope className="h-5 w-5" /></div>
          <div className="text-white">
            <div className="font-semibold leading-tight">FUESMEN · Turnos</div>
            <div className="text-[11px] opacity-80">responde al instante</div>
          </div>
        </div>

        {/* cuerpo */}
        <div ref={bodyRef} className="p-3 space-y-2 overflow-y-auto" style={{ background: "#0b141a", minHeight: "46vh", maxHeight: "60vh" }}>
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed ${m.from === "user" ? "text-stone-100" : "text-stone-100"}`}
                style={{ background: m.from === "user" ? "#005c4b" : "#202c33" }}
              >
                {m.doc ? (
                  <div className="flex items-center gap-2 text-stone-200">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-xs">{m.doc}</span>
                  </div>
                ) : (
                  <span dangerouslySetInnerHTML={fmt(m.text)} />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 text-sm text-stone-300 flex items-center gap-2" style={{ background: "#202c33" }}>
                <Bot className="h-4 w-4" /> <Loader2 className="h-3 w-3 animate-spin" /> leyendo el pedido con IA...
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-2 px-3 py-3 bg-stone-900 border-t border-stone-800">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); if (e.target) e.target.value = ""; }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm py-2.5 px-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" /> Adjuntar pedido médico (o pegá con Ctrl+V)
          </button>
        </div>
      </div>

      <p className="max-w-2xl mx-auto text-center text-xs text-stone-500">
        Probá editando una regla en <b>Autorizaciones</b> o una excepción por estudio, y reenviá el mismo pedido: la respuesta del bot cambia al instante.
      </p>
    </div>
  );
}
