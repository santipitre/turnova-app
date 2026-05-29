"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Users,
  Shield,
  LayoutGrid,
  Settings,
  Sparkles,
} from "lucide-react";

import { TurnovaLockup } from "@/components/brand/turnova-lockup";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navMain: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pedidos Médicos", href: "/pedidos", icon: Inbox },
  { label: "Turnos", href: "/turnos", icon: Calendar },
  { label: "Pacientes", href: "/pacientes", icon: Users },
];

const navConfig: NavItem[] = [
  { label: "Obras Sociales", href: "/obras-sociales", icon: Shield },
  { label: "Cupos Semanales", href: "/cupos", icon: LayoutGrid },
  { label: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar({ pedidosPendientes = 0 }: { pedidosPendientes?: number }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 flex flex-col flex-shrink-0 relative bg-stone-950 overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 400px 600px at 0% 30%, rgba(251, 191, 36, 0.06), transparent 70%), radial-gradient(ellipse 300px 400px at 100% 100%, rgba(167, 139, 250, 0.04), transparent 70%)",
        boxShadow: "inset -1px 0 0 rgba(251, 191, 36, 0.12), 1px 0 24px rgba(251, 191, 36, 0.04)",
      }}
    >
      {/* Grid sutil de fondo */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(251, 191, 36, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      {/* Brand + amber underline glow */}
      <div className="relative px-5 py-6 z-10">
        <Link href="/dashboard" className="inline-block group">
          <TurnovaLockup iconSize={36} size="md" />
        </Link>
        <div
          className="mt-4 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.4) 30%, rgba(251, 191, 36, 0.4) 70%, transparent)",
            boxShadow: "0 0 8px rgba(251, 191, 36, 0.3)",
          }}
          aria-hidden
        />
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 space-y-1 z-10">
        <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-400/70 uppercase px-3 py-2 mt-2">
          Principal
        </div>
        {navMain.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/pedidos" && pedidosPendientes > 0;

          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={Icon}
              label={item.label}
              isActive={isActive}
              badge={showBadge ? pedidosPendientes : undefined}
            />
          );
        })}

        <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-400/70 uppercase px-3 py-2 mt-6">
          Configuración
        </div>
        {navConfig.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={Icon}
              label={item.label}
              isActive={isActive}
            />
          );
        })}
      </nav>

      {/* IA status card con neón amber */}
      <div className="relative z-10 mx-3 mb-4 p-3 rounded-lg text-xs overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(251, 146, 60, 0.04))",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          boxShadow: "0 0 20px rgba(251, 191, 36, 0.08), inset 0 0 12px rgba(251, 191, 36, 0.04)",
        }}
      >
        <div className="flex items-center gap-2 mb-1 text-amber-300 font-semibold">
          <Sparkles className="h-3.5 w-3.5" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))" }} />
          <span style={{ textShadow: "0 0 8px rgba(251, 191, 36, 0.4)" }}>IA operativa</span>
        </div>
        <div className="text-stone-300">Procesando pedidos · Claude Opus 4.7</div>
      </div>
    </aside>
  );
}

/** Item de navegación con efecto neón amber en active state. */
function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "text-amber-300"
          : "text-stone-400 hover:text-amber-200"
      )}
      style={
        isActive
          ? {
              background:
                "linear-gradient(90deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.04) 100%)",
              boxShadow: "inset 2px 0 0 #fbbf24, 0 0 16px rgba(251, 191, 36, 0.12)",
              textShadow: "0 0 8px rgba(251, 191, 36, 0.45)",
            }
          : undefined
      }
    >
      {/* Glow hover sutil — solo aparece on hover, no permanente */}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(251, 191, 36, 0.08) 0%, transparent 100%)",
            boxShadow: "inset 2px 0 0 rgba(251, 191, 36, 0.4)",
          }}
          aria-hidden
        />
      )}
      <Icon
        className="h-4 w-4 relative z-10"
        style={
          isActive
            ? { filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))" }
            : undefined
        }
      />
      <span className="relative z-10">{label}</span>
      {badge !== undefined && (
        <span
          className="relative z-10 ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            color: "white",
            boxShadow: "0 0 12px rgba(239, 68, 68, 0.5), inset 0 0 6px rgba(255, 255, 255, 0.2)",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
