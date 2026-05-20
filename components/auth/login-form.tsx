"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loginWithPin } from "@/lib/auth/pyralis-auth";
import { setClientSession } from "@/lib/auth/client-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await loginWithPin(username, pin);
      setClientSession(user);
      toast.success(`Bienvenido, ${user.nombre}`);
      // Forzar reload completo para que el middleware vea la cookie nueva
      window.location.href = redirectTo;
    } catch (err: any) {
      toast.error("No pudimos iniciar sesión", {
        description: err?.message ?? "Verificá usuario y PIN",
      });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.toUpperCase())}
          placeholder="SPITRELLA"
          style={{ textTransform: "uppercase" }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="pin">PIN</Label>
          <a
            href="mailto:hola@pyralis.ar?subject=Reset%20PIN%20Turnova"
            className="text-caption text-stone-500 hover:text-stone-300"
          >
            Olvidé mi PIN
          </a>
        </div>
        <Input
          id="pin"
          type="password"
          autoComplete="current-password"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          inputMode="numeric"
        />
      </div>

      <Button type="submit" variant="glow" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar a Turnova"}
      </Button>

      <p className="text-caption text-center text-stone-500 pt-2">
        ¿No tenés cuenta?{" "}
        <a
          href="mailto:hola@pyralis.ar?subject=Quiero%20probar%20Turnova"
          className="text-lumen-glow font-medium hover:underline"
        >
          Solicitar acceso
        </a>
      </p>
    </form>
  );
}
