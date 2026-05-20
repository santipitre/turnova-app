/**
 * Landing pública de Turnova (powered by Pyralis Lumen).
 * URL: /landing
 *
 * Pública (no requiere auth). El middleware ya está configurado
 * para permitir esta ruta (los archivos en /landing son públicos).
 */
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Shield,
  Clock,
  MessageSquare,
  ArrowRight,
  Check,
  Stethoscope,
  TrendingUp,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientOrbs } from "@/components/lumen/gradient-orbs";
import { GlassCard } from "@/components/lumen/glass-card";
import { AnimatedCounter } from "@/components/lumen/animated-counter";
import { FireflyField } from "@/components/lumen/firefly-field";
import { TurnovaIcon } from "@/components/brand/turnova-icon";

export const metadata = {
  title: "Turnova — Asigná turnos médicos con IA · Pyralis",
  description:
    "La inteligencia que falta entre tu chatbot y tu agenda. Lee pedidos médicos con IA y asigna turnos automáticamente respetando obra social y SLA.",
};

export default function LandingPage() {
  return (
    <div className="bg-stone-950 text-white overflow-x-hidden">
      {/* ============ NAV (estilo Pyralis ecosistema) ============ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-stone-950/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <TurnovaIcon size={32} />
            <span className="text-base font-bold tracking-tight text-white">Turnova</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="#features" className="text-sm text-stone-300 hover:text-white transition-colors hidden md:block">
              Producto
            </Link>
            <Link href="#how" className="text-sm text-stone-300 hover:text-white transition-colors hidden md:block">
              Cómo funciona
            </Link>
            <Link href="#pricing" className="text-sm text-stone-300 hover:text-white transition-colors hidden md:block">
              Precios
            </Link>
            <Link href="#contacto" className="text-sm text-stone-300 hover:text-white transition-colors hidden md:block">
              FAQ
            </Link>
            <Button
              size="sm"
              asChild
              className="bg-lumen-glow text-stone-950 hover:bg-lumen-glowHover font-semibold shadow-lumen-glow"
            >
              <Link href="#contacto">Hablemos</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ============ HERO — Estilo Pyralis (Dictom, Lumen) ============ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden bg-stone-950">
        {/* Capa 1: Grid sutil */}
        <div className="absolute inset-0 pyralis-grid opacity-60" aria-hidden />

        {/* Capa 2: Amber glow central */}
        <div className="absolute inset-0 pyralis-amber-glow" aria-hidden />

        {/* Capa 3: Pocas luciérnagas, bien colocadas */}
        <FireflyField count={9} />

        {/* Capa 4: Viñeta superior e inferior */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-stone-950 to-transparent pointer-events-none" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950 to-transparent pointer-events-none" aria-hidden />

        <div className="relative max-w-4xl mx-auto text-center z-10">
          {/* Wordmark "Turnova" — la "O" es la luciérnaga iluminada (igual que Dictom/Lumen) */}
          <h1
            className="font-display font-bold tracking-tight text-white leading-none mb-10 animate-fade-in-up"
            style={{
              fontSize: "clamp(64px, 11vw, 144px)",
            }}
          >
            Turn
            <span
              style={{
                color: "#FBBF24",
                textShadow:
                  "0 0 18px rgba(251, 191, 36, 0.95), 0 0 42px rgba(251, 191, 36, 0.7), 0 0 80px rgba(251, 146, 60, 0.4)",
              }}
            >
              o
            </span>
            va
          </h1>

          {/* Headline */}
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.15] mb-8 animate-fade-in-up">
            Turnos médicos
            <br />
            asignados por IA.
          </h2>

          {/* Descripción */}
          <p className="text-base md:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed mb-12">
            Turnova lee pedidos médicos por WhatsApp, identifica obra social y
            práctica, y asigna el turno automáticamente respetando las reglas
            de tu centro. Hecho en Argentina, para LATAM.
          </p>

          {/* CTA solo uno, estilo Pyralis */}
          <div className="flex justify-center mb-20 animate-fade-in-up">
            <Button
              asChild
              size="lg"
              className="bg-lumen-glow text-stone-950 hover:bg-lumen-glowHover font-semibold text-base px-8 h-12 shadow-lumen-glow"
            >
              <Link href="#contacto">
                Probar Turnova
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Stats compactos */}
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { value: 95, suffix: "%", label: "Precisión IA" },
              { value: 32, suffix: "s", label: "Por pedido" },
              { value: 85, suffix: "%", label: "Menos tiempo" },
            ].map((stat, i) => (
              <div
                key={i}
                className="text-center py-4 px-3 rounded-lumen border border-white/[0.08] bg-stone-900/30 backdrop-blur-sm"
              >
                <div className="font-mono font-bold text-2xl md:text-3xl text-lumen-glow">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-stone-400 mt-1.5 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="text-xs uppercase tracking-widest text-lumen-glow mb-3">Producto</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Cuatro motores trabajando juntos
            </h2>
            <p className="text-stone-400 mt-4 max-w-2xl mx-auto">
              No es un chatbot más. Es la capa de inteligencia que conecta tu WhatsApp con tu sistema interno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lumen-lg border border-white/10 bg-stone-900/50 p-8 hover:border-white/20 transition-all duration-fast"
              >
                {/* Decorative gradient */}
                <div
                  className={`absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-2xl ${feature.glow}`}
                  aria-hidden
                />

                <div className={`inline-flex h-12 w-12 rounded-lumen items-center justify-center mb-5 ${feature.iconBg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>

                <h3 className="font-display text-2xl font-bold mb-2">{feature.title}</h3>
                <p className="text-stone-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="py-32 px-6 relative bg-stone-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <div className="text-xs uppercase tracking-widest text-lumen-glow mb-3">Flujo</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Del pedido al turno asignado<br />en menos de 1 minuto
            </h2>
          </div>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row gap-6 items-start p-6 rounded-lumen-lg border border-white/5 bg-stone-900/40 hover:bg-stone-900/60 transition-colors"
              >
                <div className="flex-shrink-0 h-12 w-12 rounded-lumen-sm bg-gradient-to-br from-lumen-glow to-lumen-ember flex items-center justify-center font-display font-bold text-xl text-stone-900">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold mb-1">{step.title}</h3>
                  <p className="text-stone-400">{step.description}</p>
                </div>
                <div className="text-xs font-mono text-stone-400 md:self-center">
                  {step.duration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="text-xs uppercase tracking-widest text-lumen-glow mb-3">Pricing</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Pagás por lo que procesás
            </h2>
            <p className="text-stone-400 mt-4 max-w-xl mx-auto">
              Setup único + suscripción mensual según volumen.
              ROI positivo desde el primer mes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-lumen-lg border p-8 transition-all duration-fast ${
                  plan.featured
                    ? "border-lumen-glow/40 bg-gradient-to-br from-lumen-glow/8 to-transparent shadow-lumen-glow"
                    : "border-white/10 bg-stone-900/50 hover:border-white/20"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-lumen-glow text-stone-900">
                    Más elegido
                  </div>
                )}

                <h3 className="font-display text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-stone-400 mb-6">{plan.tagline}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-mono font-bold text-4xl">${plan.price}</span>
                  <span className="text-stone-400">/mes</span>
                </div>
                <div className="text-xs text-stone-400 font-mono mb-6">
                  Setup ${plan.setup} (one-time)
                </div>

                <Button
                  variant={plan.featured ? "glow" : "secondary"}
                  className={`w-full mb-6 ${!plan.featured ? "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" : ""}`}
                  asChild
                >
                  <Link href="#contacto">Empezar</Link>
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-lumen-pulse flex-shrink-0 mt-0.5" />
                      <span className="text-stone-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section id="contacto" className="py-32 px-6 relative">
        <div className="max-w-3xl mx-auto text-center relative">
          <GradientOrbs variant="subtle" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <Sparkles className="h-3 w-3 text-lumen-glow" />
              <span className="text-xs font-mono text-stone-300">
                Plazas piloto limitadas
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Probá Turnova en tu centro,<br />
              <span className="lumen-text-glow">gratis por 30 días</span>
            </h2>

            <p className="text-stone-400 text-lg mb-8 max-w-xl mx-auto">
              Estamos eligiendo 10 centros para el piloto. Si te seleccionamos,
              te damos onboarding gratuito y precio Founder por 12 meses.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="glow" size="lg" className="text-base px-8" asChild>
                <a href="mailto:hola@pyralis.ar?subject=Quiero%20probar%20Turnova">
                  Solicitar demo
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="text-base px-8 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href="https://wa.me/5491155550000?text=Hola,%20quiero%20saber%20sobre%20Turnova">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp directo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold lowercase tracking-tight">pyralis</span>
            <span className="text-lumen-glow text-xl leading-none">·</span>
            <span className="text-stone-400 text-sm ml-2">© 2026</span>
          </div>

          <div className="flex gap-6 text-sm text-stone-400">
            <Link href="/landing" className="hover:text-white transition-colors">Turnova</Link>
            <a href="mailto:hola@pyralis.ar" className="hover:text-white transition-colors">Contacto</a>
            <Link href="#" className="hover:text-white transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-white transition-colors">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============ DATA ============

const features = [
  {
    icon: Sparkles,
    title: "Motor de extracción IA",
    description: "Claude Sonnet 4.5 lee fotos y PDFs de pedidos médicos argentinos. Identifica práctica, obra social, médico solicitante, urgencia y más. 95% precisión.",
    iconBg: "bg-lumen-aurora/15",
    iconColor: "text-lumen-aurora",
    glow: "bg-lumen-aurora",
  },
  {
    icon: Zap,
    title: "Motor de reglas configurable",
    description: "Obras sociales VIP reciben turno en 72hs. Las demás respetan cupos semanales. Vos definís las reglas. La IA las cumple.",
    iconBg: "bg-lumen-glow/15",
    iconColor: "text-lumen-glow",
    glow: "bg-lumen-glow",
  },
  {
    icon: MessageSquare,
    title: "Integración BOTMAKER nativa",
    description: "Tu paciente sigue hablando con tu BOT habitual. Turnova procesa el pedido por detrás y devuelve el turno al instante.",
    iconBg: "bg-lumen-tide/15",
    iconColor: "text-lumen-tide",
    glow: "bg-lumen-tide",
  },
  {
    icon: Shield,
    title: "Multi-tenant y compliance",
    description: "Cada centro médico es un tenant aislado. Row-Level Security en PostgreSQL. Cumple Ley 25.326 (Habeas Data) y BAA-ready.",
    iconBg: "bg-lumen-pulse/15",
    iconColor: "text-lumen-pulse",
    glow: "bg-lumen-pulse",
  },
];

const steps = [
  {
    title: "Llega el pedido por WhatsApp",
    description: "El paciente manda foto del pedido médico al BOT del centro. BOTMAKER reenvía a Turnova vía webhook.",
    duration: "instant",
  },
  {
    title: "IA lee y entiende el documento",
    description: "Claude Vision identifica práctica, obra social y datos clínicos. Matchea contra tu base de obras sociales y prácticas.",
    duration: "3s",
  },
  {
    title: "Motor de reglas asigna turno",
    description: "Si OS es VIP, busca cupo en menos de 72hs. Si no, asigna según matriz semanal. Crea hold de 10 min.",
    duration: "1s",
  },
  {
    title: "Paciente confirma por WhatsApp",
    description: "Recibe propuesta de turno con fecha, hora y sede. Confirma con un click. Listo.",
    duration: "depende del paciente",
  },
];

const pricing = [
  {
    name: "Starter",
    tagline: "Centros chicos. Hasta 500 turnos/mes.",
    price: 49,
    setup: 500,
    featured: false,
    features: [
      "1 sede",
      "Hasta 1.000 turnos/mes",
      "Hasta 5 usuarios admin",
      "Integración BOTMAKER",
      "Soporte por email",
    ],
  },
  {
    name: "Pro",
    tagline: "El plan más usado. Para centros medianos.",
    price: 149,
    setup: 1000,
    featured: true,
    features: [
      "Hasta 3 sedes",
      "Hasta 5.000 turnos/mes",
      "Usuarios ilimitados",
      "API + Webhooks",
      "Soporte prioritario",
      "Dashboard ejecutivo",
    ],
  },
  {
    name: "Business",
    tagline: "Centros grandes. Volumen alto.",
    price: 299,
    setup: 1500,
    featured: false,
    features: [
      "Sedes ilimitadas",
      "Hasta 15.000 turnos/mes",
      "SLA 99,9%",
      "Soporte 24/7",
      "Consultoría de optimización",
      "Custom integrations",
    ],
  },
];
