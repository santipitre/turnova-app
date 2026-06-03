"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Paperclip, Stethoscope, User, Send } from "lucide-react";
import { toast } from "sonner";

import { fileToBase64 } from "@/lib/utils";
import { procesarPedido } from "@/lib/api/edge-functions";

export const dynamic = "force-dynamic";

type Rol = "paciente" | "fuesmen";
interface Msg { id: number; from: Rol; text: string; doc?: string; auto?: boolean }

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

  // Identificación consolidada — ORDEN: obra social → estudio → médico
  const medico = ex.medico_match?.nombre || medicoNombre;
  const mat = ex.medico_match?.matricula || matricula;
  let ident = "Recibí tu pedido ✅";
  ident += `\n🏥 Obra social: *${obra}*`;
  ident += `\n📄 Estudio: *${estudio}*`;
  if (medico) ident += `\n👨‍⚕️ Médico: *${medico}*${mat ? ` (Mat. ${mat})` : ""}`;
  out.push(ident);

  // Autorización — directo a la acción
  if (aut && matching.obra_social_id && matching.practica_id) {
    const reglaTxt = REGLA_TXT[aut.regla] || REGLA_TXT.A_CONFIRMAR;
    if (aut.requiere) {
      let m = `🔐 *${estudio}* con *${obra}* ${reglaTxt}.`;
      if (aut.vigencia_dias) m += `\n🗓️ Validez de la orden: *${aut.vigencia_dias} días*.`;
      if (aut.tope_anual && aut.tope_anual !== "-") m += `\n📌 Tope: ${aut.tope_anual}.`;
      m += `\n📎 Llevá: *orden médica original* + la *autorización de la obra social*.`;
      if (aut.requisitos) m += `\nℹ️ ${aut.requisitos}`;
      out.push(m);
      out.push("Apenas tengas la autorización, escribime y coordinamos el turno. 🙌");
    } else if (aut.regla === "NO_DIRECTO") {
      out.push("✅ Es *atención particular*: no se gestiona autorización. Coordinamos el turno directamente. 🗓️");
    } else {
      let m = `✅ *${estudio}* con *${obra}* *no requiere autorización*.`;
      if (aut.requisitos) m += `\nℹ️ ${aut.requisitos}`;
      m += "\nCoordinamos el turno directamente. 🗓️";
      out.push(m);
    }
  } else if (matching.obra_social_id) {
    // Estudio leído pero aún sin regla resuelta: acción, no duda
    out.push(`Estoy verificando la cobertura de *${estudio}* con *${obra}* y te confirmo la autorización en instantes. 🗓️`);
  } else {
    out.push(`Estoy validando tu cobertura de *${obra}* para darte la info de autorización. 🗓️`);
  }

  return out;
}

let _id = 0;
const nid = () => ++_id;

export default function ChatPruebaPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [inPac, setInPac] = useState("");
  const [inFue, setInFue] = useState("");
  const greeted = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const push = (m: Omit<Msg, "id">) => setMsgs((s) => [...s, { id: nid(), ...m }]);

  const botGreetIfNeeded = useCallback(() => {
    if (greeted.current) return;
    greeted.current = true;
    setTimeout(() => push({ from: "fuesmen", auto: true, text: "¡Hola! 👋 Soy el asistente de *FUESMEN*. Envíame una *foto o PDF del pedido médico* y te digo si necesitás autorización. 📸" }), 400);
  }, []);

  async function procesar(file: File) {
    push({ from: "paciente", text: "", doc: file.name });
    botGreetIfNeeded();
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await procesarPedido({ archivo_base64: base64, media_type: file.type, canal_origen: "web" });
      const respuestas = buildRespuestas(result);
      for (let i = 0; i < respuestas.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 300 : 600));
        push({ from: "fuesmen", auto: true, text: respuestas[i] });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      push({ from: "fuesmen", auto: true, text: `❌ No pude procesar el pedido: ${msg}` });
      toast.error("Error procesando", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  function enviarPaciente() {
    const t = inPac.trim();
    if (!t) return;
    push({ from: "paciente", text: t });
    setInPac("");
    botGreetIfNeeded();
  }
  function enviarFuesmen() {
    const t = inFue.trim();
    if (!t) return;
    push({ from: "fuesmen", text: t });
    setInFue("");
  }

  // pegar imagen con Ctrl+V => como paciente
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.kind === "file") { const b = it.getAsFile(); if (b) { e.preventDefault(); procesar(b); return; } }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmt(t: string) {
    const html = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*([^*]+)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
    return { __html: html };
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display-lg">Chat (prueba)</h1>
        <p className="text-stone-400 mt-1">
          Simulación de los dos lados. Escribí como *Paciente* o como *FUESMEN*. Cuando el paciente adjunta
          un pedido, el bot responde con las reglas REALES de la matriz. No reserva turno.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChatPane
          perspective="paciente"
          title="Paciente"
          subtitle="vos sos el paciente"
          accent="#005c4b"
          icon={<User className="h-5 w-5" />}
          msgs={msgs}
          fmt={fmt}
          value={inPac}
          onChange={setInPac}
          onSend={enviarPaciente}
          onAttach={() => fileRef.current?.click()}
          loading={loading}
        />
        <ChatPane
          perspective="fuesmen"
          title="FUESMEN · Turnos"
          subtitle="vos sos el centro / agente"
          accent="#075e54"
          icon={<Stethoscope className="h-5 w-5" />}
          msgs={msgs}
          fmt={fmt}
          value={inFue}
          onChange={setInFue}
          onSend={enviarFuesmen}
          loading={loading}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); if (e.target) e.target.value = ""; }}
      />

      <p className="text-center text-xs text-stone-500">
        El bot saluda y analiza automáticamente cuando el paciente adjunta un pedido. Desde el lado FUESMEN
        podés intervenir a mano en cualquier momento.
      </p>
    </div>
  );
}

function ChatPane({
  perspective, title, subtitle, accent, icon, msgs, fmt, value, onChange, onSend, onAttach, loading,
}: {
  perspective: Rol; title: string; subtitle: string; accent: string;
  icon: React.ReactNode; msgs: Msg[]; fmt: (t: string) => { __html: string };
  value: string; onChange: (v: string) => void; onSend: () => void; onAttach?: () => void; loading: boolean;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, loading]);

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-800 shadow-xl flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: accent }}>
        <div className="h-9 w-9 rounded-full bg-white/15 grid place-items-center text-white">{icon}</div>
        <div className="text-white">
          <div className="font-semibold leading-tight">{title}</div>
          <div className="text-[11px] opacity-80">{subtitle}</div>
        </div>
      </div>

      <div ref={bodyRef} className="p-3 space-y-2 overflow-y-auto" style={{ background: "#0b141a", minHeight: "44vh", maxHeight: "56vh" }}>
        {msgs.length === 0 && (
          <div className="text-center text-stone-600 text-xs pt-10">
            {perspective === "paciente" ? "Escribí o adjuntá un pedido para iniciar." : "Esperando que el paciente inicie..."}
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.from === perspective;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed text-stone-100"
                style={{ background: mine ? (perspective === "paciente" ? "#005c4b" : "#075e54") : "#202c33" }}>
                {!mine && (
                  <div className="text-[10px] mb-0.5 opacity-70">
                    {m.from === "fuesmen" ? (m.auto ? "FUESMEN · bot" : "FUESMEN") : "Paciente"}
                  </div>
                )}
                {m.doc ? (
                  <div className="flex items-center gap-2"><Paperclip className="h-4 w-4" /><span className="text-xs">{m.doc}</span></div>
                ) : (
                  <span dangerouslySetInnerHTML={fmt(m.text)} />
                )}
              </div>
            </div>
          );
        })}
        {loading && perspective === "fuesmen" && (
          <div className="flex justify-end">
            <div className="rounded-lg px-3 py-2 text-xs text-stone-300 flex items-center gap-2" style={{ background: "#075e54" }}>
              <Loader2 className="h-3 w-3 animate-spin" /> leyendo el pedido...
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-2.5 py-2.5 bg-stone-900 border-t border-stone-800">
        {onAttach && (
          <button onClick={onAttach} disabled={loading} title="Adjuntar pedido"
            className="shrink-0 h-9 w-9 grid place-items-center rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-50">
            <Paperclip className="h-4 w-4" />
          </button>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
          placeholder={perspective === "paciente" ? "Escribí como paciente..." : "Escribí como FUESMEN..."}
          className="flex-1 rounded-full bg-stone-800 text-stone-100 text-sm px-4 py-2 outline-none placeholder:text-stone-500"
        />
        <button onClick={onSend} className="shrink-0 h-9 w-9 grid place-items-center rounded-full text-white" style={{ background: accent }}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
