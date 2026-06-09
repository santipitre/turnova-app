// ============================================================
// Reemplaza el boton MUERTO de BOTMAKER por uno funcional.
// Client component: el boton abre un panel con la URL del webhook
// para pegar en BOTMAKER. La URL (con el secreto) se calcula en el
// servidor y llega por prop, solo visible para el admin logueado.
// ============================================================
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function IntegracionBotmaker({
  webhookUrl,
  connected,
}: {
  webhookUrl: string;
  connected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">BOTMAKER</div>
          <div className="text-caption text-stone-400 mt-0.5">
            Lectura de pedidos médicos desde las conversaciones · API v2.0
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && <Badge variant="success">Conectado</Badge>}
          <Button variant="glow" size="sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Cerrar" : connected ? "Configurar" : "Conectar"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-md border border-stone-800/60 bg-stone-900/40 p-4 text-sm">
          <p className="text-stone-300">
            Para que Turnova lea los pedidos que llegan al chatbot, configurá este
            webhook en BOTMAKER:
          </p>
          <ol className="list-inside list-decimal space-y-1 text-stone-400">
            <li>
              Entrá a BOTMAKER → <b>Configuración → Integraciones → Webhooks</b>.
            </li>
            <li>
              Creá un webhook de tipo <b>"mensajes enviados/recibidos"</b>.
            </li>
            <li>Pegá esta URL como destino:</li>
          </ol>

          {webhookUrl ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-stone-950 px-2 py-1 text-xs text-lumen-glow">
                {webhookUrl}
              </code>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={copiar}
              >
                {copied ? "Copiado ✓" : "Copiar"}
              </Button>
            </div>
          ) : (
            <p className="rounded bg-red-950/40 px-2 py-1 text-xs text-red-300">
              Falta definir <code>BOTMAKER_WEBHOOK_SECRET</code> en Vercel. Sin eso
              la URL no se genera.
            </p>
          )}

          <p className="text-caption text-stone-500">
            Esta URL incluye un token secreto. No la compartas. Si se filtra, rotá{" "}
            <code>BOTMAKER_WEBHOOK_SECRET</code> en Vercel y volvé a configurar el
            webhook.
          </p>
        </div>
      )}
    </div>
  );
}
