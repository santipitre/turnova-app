"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  /** Auto-refresh interval en ms. 0 desactiva. Default 30s. */
  intervalMs?: number;
}

/**
 * Botón de refresh para la lista de pedidos.
 * - Click manual → router.refresh() instantáneo
 * - Auto-refresh cada N segundos en segundo plano
 * - Indicador visual de cuándo se actualizó por última vez
 *
 * Como router.refresh() es de Next.js, vuelve a fetchear los Server Components
 * sin recargar la página entera (preserva scroll y estado de cliente).
 */
export function RefreshPedidosButton({ intervalMs = 30000 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [justRefreshed, setJustRefreshed] = useState(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function doRefresh(silent = false) {
    startTransition(() => {
      router.refresh();
      setLastRefresh(Date.now());
      if (!silent) {
        setJustRefreshed(true);
        if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = setTimeout(() => setJustRefreshed(false), 1500);
      }
    });
  }

  // Auto-refresh
  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = setInterval(() => doRefresh(true), intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  // Cleanup timeout al desmontar
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, []);

  // Formato "hace X seg/min"
  const [tickNow, setTickNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const segundos = Math.floor((tickNow - lastRefresh) / 1000);
  const hace =
    segundos < 5
      ? "ahora"
      : segundos < 60
        ? `hace ${segundos}s`
        : `hace ${Math.floor(segundos / 60)}m`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 font-mono hidden sm:inline">
        Actualizado {hace}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => doRefresh(false)}
        disabled={isPending}
        className="border-stone-700 hover:border-amber-400/50 hover:text-amber-200 transition-colors"
        title={`Refrescar lista${intervalMs > 0 ? ` (auto cada ${Math.floor(intervalMs / 1000)}s)` : ""}`}
      >
        {justRefreshed ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <RefreshCw
            className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-amber-300" : ""}`}
          />
        )}
        <span className="hidden sm:inline">
          {isPending ? "Actualizando…" : "Refrescar"}
        </span>
      </Button>
    </div>
  );
}
