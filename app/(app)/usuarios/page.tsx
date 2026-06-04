import { getServerUser } from "@/lib/auth/server-session";
import { esAdmin } from "@/lib/auth/roles";
import { UsuariosManager } from "@/components/usuarios/usuarios-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const user = getServerUser();
  if (!user) return null;
  if (!esAdmin(user.rol_turnova)) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-2">
        <h1 className="text-display-md">Sin permisos</h1>
        <p className="text-stone-400">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg">Usuarios</h1>
        <p className="text-stone-400 mt-1">
          Gestioná quién accede a Turnova en FUESMEN y con qué rol. El PIN temporal se muestra una sola vez al crear o resetear.
        </p>
      </div>
      <UsuariosManager currentUserId={user.id} />
    </div>
  );
}
