"use client";

import { useEffect, useRef, useState } from "react";
import { User, IdCard, Loader2, Check } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MedicoSugerido {
  id: string;
  nombre_completo: string;
  matricula: string | null;
  apellido: string | null;
  nombres: string | null;
}

interface Props {
  nombre: string;
  matricula: string;
  onNombre: (v: string) => void;
  onMatricula: (v: string) => void;
  /** Completa ambos campos al elegir/encontrar un médico del catálogo. */
  onPick: (nombre: string, matricula: string) => void;
}

export function MedicoAutocomplete({
  nombre,
  matricula,
  onNombre,
  onMatricula,
  onPick,
}: Props) {
  const [active, setActive] = useState<"nombre" | "matricula" | null>(null);
  const [sugs, setSugs] = useState<MedicoSugerido[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchOk, setMatchOk] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = active === "matricula" ? matricula : nombre;

  useEffect(() => {
    if (!active) return;
    const q = query.trim();
    if (q.length < 2) {
      setSugs([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/medicos/buscar?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        const list: MedicoSugerido[] = json.medicos ?? [];
        setSugs(list);
        // Si se tipeó una matrícula exacta, autocompletar el nombre
        if (active === "matricula") {
          const exacta = list.find((m) => m.matricula === q);
          if (exacta) {
            onPick(exacta.nombre_completo, exacta.matricula ?? "");
            setMatchOk(true);
            setSugs([]);
            setActive(null);
          } else {
            setMatchOk(false);
          }
        }
      } catch {
        setSugs([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, active]);

  // Cerrar al click afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(m: MedicoSugerido) {
    onPick(m.nombre_completo, m.matricula ?? "");
    setMatchOk(true);
    setSugs([]);
    setActive(null);
  }

  const showDropdown = active && sugs.length > 0;

  return (
    <div ref={boxRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Médico solicitante */}
      <div className="space-y-1.5 relative">
        <Label htmlFor="medico" className="flex items-center gap-2 text-stone-200">
          <User className="h-3.5 w-3.5 text-stone-400" />
          Médico solicitante
          {matchOk && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <Check className="h-3 w-3" /> en catálogo
            </span>
          )}
        </Label>
        <Input
          id="medico"
          value={nombre}
          onChange={(e) => {
            onNombre(e.target.value);
            setMatchOk(false);
            setActive("nombre");
          }}
          onFocus={() => setActive("nombre")}
          placeholder="Apellido, Nombre…"
          autoComplete="off"
        />
        {showDropdown && active === "nombre" && (
          <SugList sugs={sugs} loading={loading} onPick={pick} />
        )}
      </div>

      {/* Matrícula */}
      <div className="space-y-1.5 relative">
        <Label htmlFor="matricula" className="flex items-center gap-2 text-stone-200">
          <IdCard className="h-3.5 w-3.5 text-stone-400" />
          Matrícula
          {loading && active === "matricula" && (
            <Loader2 className="h-3 w-3 animate-spin text-stone-500" />
          )}
        </Label>
        <Input
          id="matricula"
          value={matricula}
          onChange={(e) => {
            onMatricula(e.target.value);
            setMatchOk(false);
            setActive("matricula");
          }}
          onFocus={() => setActive("matricula")}
          placeholder="Mat: 12345"
          className="font-mono"
          autoComplete="off"
        />
        {showDropdown && active === "matricula" && (
          <SugList sugs={sugs} loading={loading} onPick={pick} />
        )}
      </div>
    </div>
  );
}

function SugList({
  sugs,
  loading,
  onPick,
}: {
  sugs: MedicoSugerido[];
  loading: boolean;
  onPick: (m: MedicoSugerido) => void;
}) {
  return (
    <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-64 overflow-auto rounded-md border border-stone-700 bg-stone-900 shadow-xl shadow-black/40">
      {loading && (
        <div className="px-3 py-2 text-xs text-stone-500 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
        </div>
      )}
      {sugs.map((m) => (
        <button
          key={m.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(m);
          }}
          className="w-full text-left px-3 py-2 hover:bg-amber-400/10 transition-colors flex items-center justify-between gap-3 border-b border-stone-800 last:border-0"
        >
          <span className="text-sm text-stone-100 truncate">{m.nombre_completo}</span>
          {m.matricula && (
            <span className="text-xs font-mono text-amber-300/90 shrink-0">
              MAT {m.matricula}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
