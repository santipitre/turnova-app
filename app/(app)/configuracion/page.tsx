import { createClient, createPublicClient, createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import { esAdmin } from "@/lib/auth/roles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CentroMedicoForm } from "@/components/configuracion/centro-medico-form";
import { IntegracionClaude } from "@/components/configuracion/integracion-claude";
import { IntegracionBotmaker } from "@/components/configuracion/integracion-botmaker";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, Settings, Plug, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const supabase = createClient();
  const user = getServerUser();
  if (!user) return null;
  if (!esAdmin(user.rol_turnova)) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-2">
        <h1 className="text-display-md">Sin permisos</h1>
        <p className="text-stone-400">
          Esta sección es solo para administradores. Pedile a un admin de FUESMEN que te dé acceso si lo necesitás.
        </p>
      </div>
    );
  }

  // Cargar tenant Turnova
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", user.tenant_id)
    .single();

  // Sedes del tenant
  const { data: sedes } = await supabase
    .from("sedes")
    .select("*")
    .eq("tenant_id", user.tenant_id)
    .eq("activa", true);

  // Usuarios con perfil Turnova en este tenant (vienen de public.usuarios + turnova.profiles)
  const supabasePublic = createPublicClient();
  const { data: usuarios } = await supabasePublic
    .from("usuarios")
    .select("id, username, nombre, rol, activo")
    .eq("activo", true);

  const profile = { tenants: tenant, tenant_id: user.tenant_id };

  // BOTMAKER: URL del webhook (incluye el secreto) y estado de conexion.
  const webhookSecret = process.env.BOTMAKER_WEBHOOK_SECRET ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://turnova-app.vercel.app";
  const botmakerWebhookUrl = webhookSecret
    ? `${baseUrl}/api/webhooks/botmaker/${webhookSecret}`
    : "";
  // "Conectado" = ya entro al menos un pedido. Usamos service client (bypassa RLS).
  // Si la tabla todavia no existe, count queda undefined y connected = false (no rompe).
  const { count: botmakerCount } = await createServiceClient()
    .from("pedidos_entrantes")
    .select("*", { count: "exact", head: true });
  const botmakerConnected = (botmakerCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Configuración</h1>
        <p className="text-stone-400 mt-1">Personalizá Turnova para tu centro</p>
      </div>

      {/* Centro Médico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Centro Médico
          </CardTitle>
          <CardDescription>Datos generales del centro y plan contratado.</CardDescription>
        </CardHeader>
        <CardContent>
          <CentroMedicoForm
            initial={{
              nombre_centro: tenant?.nombre_centro ?? "",
              cuit: tenant?.cuit ?? "",
              timezone: tenant?.timezone ?? "America/Argentina/Buenos_Aires",
              plan: tenant?.plan ?? "starter",
            }}
          />
        </CardContent>
      </Card>

      {/* Sedes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sedes ({sedes?.length ?? 0})
            </CardTitle>
            <CardDescription>Sucursales donde se atienden turnos.</CardDescription>
          </div>
          <Button variant="secondary" size="sm">Agregar sede</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(sedes ?? []).map((s) => (
              <div key={s.id} className="p-4 border border-stone-800/60 rounded-md">
                <h3 className="font-semibold">{s.nombre}</h3>
                <p className="text-caption text-stone-400 mt-1">{s.direccion}</p>
                <p className="text-caption text-stone-400">{s.telefono}</p>
                <div className="mt-2 text-xs text-stone-400">
                  Atención: {s.horario_apertura?.slice(0, 5)} - {s.horario_cierre?.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usuarios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios del sistema ({usuarios?.length ?? 0})
            </CardTitle>
            <CardDescription>Quién puede entrar a Turnova.</CardDescription>
          </div>
          <Button variant="secondary" size="sm">Invitar usuario</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(usuarios ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 border border-stone-800/40 rounded-sm hover:bg-stone-900/30"
              >
                <div>
                  <div className="font-medium">{u.nombre}</div>
                  <div className="text-caption text-stone-400">{u.username}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.rol === "superadmin" ? "vip" : "default"}>
                    {u.rol}
                  </Badge>
                  <Badge variant={u.activo ? "success" : "danger"}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integraciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integraciones
          </CardTitle>
          <CardDescription>
            Conectá BOTMAKER, sistemas médicos y APIs de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntegracionBotmaker webhookUrl={botmakerWebhookUrl} connected={botmakerConnected} />
          <Separator />
          <IntegracionClaude model="claude-opus-4-7" connected={!!process.env.ANTHROPIC_API_KEY} />
          <Separator />
          <IntegracionRow
            nombre="Visual Medica"
            descripcion="Sistema interno de gestión (próximamente)"
            estado="proximamente"
          />
          <Separator />
          <IntegracionRow
            nombre="Mercado Pago"
            descripcion="Cobro de señas y suscripciones"
            estado="proximamente"
          />
        </CardContent>
      </Card>

      {/* Facturación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-400 text-sm">
            Gestión de facturación próximamente. Por ahora, contactanos a{" "}
            <a href="mailto:facturacion@pyralis.ar" className="text-lumen-glow font-medium hover:underline">
              facturacion@pyralis.ar
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegracionRow({
  nombre,
  descripcion,
  estado,
}: {
  nombre: string;
  descripcion: string;
  estado: "conectado" | "conectar" | "proximamente";
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{nombre}</div>
        <div className="text-caption text-stone-400 mt-0.5">{descripcion}</div>
      </div>
      {estado === "conectado" && (
        <div className="flex items-center gap-2">
          <Badge variant="success">Conectado</Badge>
          <Button variant="ghost" size="sm">Configurar</Button>
        </div>
      )}
      {estado === "conectar" && <Button variant="glow" size="sm">Conectar</Button>}
      {estado === "proximamente" && (
        <Badge variant="default" className="text-stone-400">Próximamente</Badge>
      )}
    </div>
  );
}
