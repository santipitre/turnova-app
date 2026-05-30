"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Props {
  initial: {
    nombre_centro: string;
    cuit: string;
    timezone: string;
    plan: string;
  };
}

export function CentroMedicoForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const dirty =
    form.nombre_centro !== initial.nombre_centro ||
    form.cuit !== initial.cuit ||
    form.timezone !== initial.timezone;

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function guardar() {
    if (!form.nombre_centro.trim()) {
      toast.error("El nombre del centro no puede quedar vacío.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_centro: form.nombre_centro,
          cuit: form.cuit,
          timezone: form.timezone,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      toast.success("Datos del centro actualizados.");
      router.refresh();
    } catch (e) {
      toast.error("No se pudo guardar", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="centro">Nombre del centro</Label>
          <Input
            id="centro"
            value={form.nombre_centro}
            onChange={(e) => update("nombre_centro", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cuit">CUIT</Label>
          <Input
            id="cuit"
            value={form.cuit}
            onChange={(e) => update("cuit", e.target.value)}
            placeholder="30-12345678-9"
          />
        </div>
        <div className="space-y-1">
          <Label>Plan actual</Label>
          <div className="flex items-center gap-2">
            <Badge variant="vip">⭐ {form.plan || "starter"}</Badge>
            <Button variant="link" size="sm" type="button" disabled title="Próximamente">
              Actualizar plan
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tz">Zona horaria</Label>
          <Input
            id="tz"
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
          />
        </div>
      </div>
      <Button variant="glow" className="mt-2" onClick={guardar} disabled={saving || !dirty}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Guardar cambios
          </>
        )}
      </Button>
    </div>
  );
}
