import { LoginForm } from "@/components/auth/login-form";
import { PyralisLogo } from "@/components/brand/pyralis-logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-pyralis-midnight">
        <div className="absolute inset-0 bg-gradient-to-br from-pyralis-midnight via-slate-900 to-pyralis-midnightSoft" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, #FBBF24 0%, transparent 40%),
                              radial-gradient(circle at 80% 20%, #F97316 0%, transparent 40%)`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <PyralisLogo variant="white" />
          </div>

          <div className="space-y-6">
            <h1 className="text-display-lg leading-tight">
              La inteligencia que falta<br />
              entre tu chatbot y tu agenda.
            </h1>
            <p className="text-body-lg text-slate-300 max-w-md">
              Turnova lee pedidos médicos con IA y asigna turnos automáticamente respetando las reglas de cada obra social.
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              <Stat valor="95%" label="Precisión IA" />
              <Stat valor="32s" label="Por pedido" />
              <Stat valor="85%" label="Menos tiempo" />
            </div>
          </div>

          <div className="text-overline text-slate-400">
            powered by pyralis<span className="text-pyralis-glow">·</span>
          </div>
        </div>
      </div>

      {/* Panel derecho — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-8">
            <PyralisLogo />
          </div>

          <div>
            <h2 className="text-display-md">Entrar a Turnova</h2>
            <p className="mt-2 text-slate-500 text-body-sm">
              Usá las credenciales que te dimos para acceder al panel.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div>
      <div className="text-display-sm text-pyralis-glow">{valor}</div>
      <div className="text-caption text-slate-400 uppercase">{label}</div>
    </div>
  );
}
