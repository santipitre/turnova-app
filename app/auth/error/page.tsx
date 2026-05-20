import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-lumen-flag/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-lumen-flag" />
        </div>
        <h1 className="text-display-md">Algo salió mal con tu sesión</h1>
        <p className="text-slate-500">
          El enlace puede haber expirado o ya fue usado. Intentá iniciar sesión nuevamente.
        </p>
        <Button asChild>
          <Link href="/login">Volver a entrar</Link>
        </Button>
      </div>
    </div>
  );
}
