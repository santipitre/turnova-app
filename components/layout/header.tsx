"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Search, User } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getIniciales } from "@/lib/utils";

interface HeaderProps {
  userName: string;
  userEmail: string;
  tenantName: string;
}

export function Header({ userName, userEmail, tenantName }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* noop */ }
    toast.success("Sesión cerrada");
    // Reload completo para que el middleware pierda la cookie
    window.location.href = "/login";
  }

  return (
    <header className="h-16 bg-stone-950 border-b border-stone-800/60 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar pacientes, turnos, pedidos..."
            className="pl-9 bg-stone-900/60 border-stone-800 text-stone-100 placeholder:text-stone-400 focus:bg-stone-900 focus:border-stone-700"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-stone-400 hover:text-stone-100 hover:bg-white/5">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 bg-lumen-flag text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 hover:bg-white/5 px-2 py-1 rounded transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold leading-tight text-stone-100">{userName}</div>
              <div className="text-caption text-stone-400">{tenantName}</div>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-stone-800 text-stone-200">{getIniciales(userName)}</AvatarFallback>
            </Avatar>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-stone-900 rounded-md border border-stone-800 shadow-lumen-3 z-20 overflow-hidden">
                <div className="p-3 border-b border-stone-800">
                  <div className="font-semibold text-sm text-stone-100">{userName}</div>
                  <div className="text-xs text-stone-400 truncate">{userEmail}</div>
                </div>
                <div className="p-1">
                  <a
                    href="/configuracion?tab=perfil"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:bg-white/5 hover:text-stone-100 rounded"
                  >
                    <User className="h-4 w-4" />
                    Mi perfil
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-lumen-flag hover:bg-lumen-flag/10 rounded"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
