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
    <aside className="w-60 bg-stone-950 border-r border-stone-800/60 flex flex-col flex-shrink-0">
      <div className="px-5 py-6">
        <Link href="/dashboard" className="inline-block">
          <TurnovaLockup iconSize={36} size="md" />
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <div className="text-overline text-stone-400 uppercase px-3 py-2 mt-2">Principal</div>
        {navMain.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/pedidos" && pedidosPendientes > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-item", isActive && "nav-item-active")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto bg-lumen-flag text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pedidosPendientes}
                </span>
              )}
            </Link>
          );
        })}

        <div className="text-overline text-stone-400 uppercase px-3 py-2 mt-6">Configuración</div>
        {navConfig.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-item", isActive && "nav-item-active")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 p-3 rounded text-xs border border-lumen-glow/20 bg-gradient-to-br from-lumen-glow/10 to-lumen-ember/5">
        <div className="flex items-center gap-2 mb-1 text-lumen-glow font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>IA operativa</span>
        </div>
        <div className="text-stone-400">Procesando pedidos · Claude Sonnet 4.6</div>
      </div>
    </aside>
  );
}
