"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";

interface Usuario {
  id: string;
  username: string;
  nombre: string;
  rol_turnova: string;
  activo: boolean;
}

const ROLES = [
  { value: "admin", label: "Admin (todo)" },
  { value: "operador", label: "Operador (trabaja)" },
  { value: "solo_lectura", label: "Solo lectura" },
];

export function UsuariosManager() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [pinNuevo, setPinNuevo] = useState<{ username: string; pin: string } | null>(null);
  const [form, setForm] = useState({ username: "", nombre: "", email: "", rol_turnova: "operador" });

  async function cargar() {
    setCargando(true);
    try {
      const r = await fetch("/api/usuarios");
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Error");
      setLista(d.usuarios || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar los usuarios");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.nombre.trim()) { toast.error("Completá usuario y nombre"); return; }
    setCreando(true);
    try {
      const r = await fetch("/api/usuarios", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Error");
      toast.success(`Usuario ${d.username} creado`);
      if (d.pin_temporal) setPinNuevo({ username: d.username, pin: d.pin_temporal });
      setForm({ username: "", nombre: "", email: "", rol_turnova: "operador" });
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear");
    } finally {
      setCreando(false);
    }
  }

  async function cambiarRol(id: string, rol: string) {
    const prev = lista;
    setLista((l) => l.map((u) => (u.id === id ? { ...u, rol_turnova: rol } : u)));
    const r = await fetch(`/api/usuarios/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ rol_turnova: rol }) });
    if (!r.ok) { setLista(prev); toast.error("No se pudo cambiar el rol"); } else toast.success("Rol actualizado");
  }
  async function toggleActivo(id: string, activo: boolean) {
    const prev = lista;
    setLista((l) => l.map((u) => (u.id === id ? { ...u, activo } : u)));
    const r = await fetch(`/api/usuarios/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ activo }) });
    if (!r.ok) { setLista(prev); toast.error("No se pudo actualizar"); }
  }
  async function resetPin(id: string, username: string) {
    const r = await fetch(`/api/usuarios/${id}?action=reset-pin`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) { toast.error(d?.error || "No se pudo resetear"); return; }
    if (d.pin_temporal) setPinNuevo({ username, pin: d.pin_temporal });
    toast.success("PIN reseteado");
  }

  return (
    <div className="space-y-6">
      {pinNuevo && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <div className="text-amber-200 font-semibold mb-1">PIN temporal de {pinNuevo.username}</div>
          <div className="text-2xl font-mono tracking-widest text-amber-100">{pinNuevo.pin}</div>
          <div className="text-stone-400 mt-1">Anotalo y pasáselo al usuario. No se vuelve a mostrar. Al entrar, deberá cambiarlo.</div>
          <button onClick={() => setPinNuevo(null)} className="mt-2 text-xs text-stone-400 hover:text-stone-200">Cerrar</button>
        </div>
      )}

      {/* Alta */}
      <form onSubmit={crear} className="rounded-xl border border-stone-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-stone-200 font-medium"><UserPlus className="h-4 w-4 text-amber-400" /> Nuevo usuario</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Usuario (ej. JPEREZ)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase() })} />
          <Input placeholder="Nombre y apellido" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input placeholder="Email (opcional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select value={form.rol_turnova} onChange={(e) => setForm({ ...form, rol_turnova: e.target.value })}
            className="rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-sm px-3 py-2 outline-none">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={creando} className="rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-50">
          {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Crear usuario
        </button>
      </form>

      {/* Lista */}
      <div className="rounded-xl border border-stone-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800">
          <span className="text-sm text-stone-300">{lista.length} usuario(s)</span>
          <button onClick={cargar} className="text-xs text-stone-400 hover:text-stone-200 inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refrescar</button>
        </div>
        {cargando ? (
          <div className="p-8 text-center text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-stone-400 text-xs uppercase">
              <th className="text-left px-4 py-2">Usuario</th><th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Rol</th><th className="text-left px-4 py-2">Activo</th><th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className="border-t border-stone-800/60">
                  <td className="px-4 py-2 text-stone-200">{u.username}</td>
                  <td className="px-4 py-2 text-stone-300">{u.nombre}</td>
                  <td className="px-4 py-2">
                    <select value={u.rol_turnova} onChange={(e) => cambiarRol(u.id, e.target.value)}
                      className="rounded border border-stone-700 bg-stone-900 text-stone-200 text-xs px-2 py-1 outline-none">
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={u.activo} onChange={(e) => toggleActivo(u.id, e.target.checked)} className="accent-emerald-500" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => resetPin(u.id, u.username)} className="text-xs text-stone-400 hover:text-amber-300 inline-flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> Reset PIN
                    </button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={5} className="text-center text-stone-500 py-6">Sin usuarios.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
