import { redirect } from "next/navigation";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/server-session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check via cookie (no Supabase Auth)
  const session = getServerSession();
  if (!session) {
    redirect("/login");
  }
  const { user } = session;

  if (!user.tenant_id) {
    // Usuario válido pero sin tenant Turnova asociado → flag
    redirect("/auth/error?reason=sin_tenant");
  }

  const supabase = createClient();

  // Cargar tenant (en schema turnova)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, nombre_centro")
    .eq("id", user.tenant_id)
    .single();

  const tenantName = tenant?.nombre_centro ?? "Centro Médico";

  // Contar pedidos pendientes para badge del sidebar
  const { count: pedidosPendientes } = await supabase
    .from("pedidos_medicos")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", user.tenant_id)
    .eq("estado", "procesado");

  return (
    <div className="flex h-screen overflow-hidden bg-stone-950">
      <Sidebar pedidosPendientes={pedidosPendientes ?? 0} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={user.nombre}
          userEmail={user.username}
          tenantName={tenantName}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
