import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server-session";

/**
 * Página raíz: redirige a /dashboard si hay sesión Pyralis válida, a /landing si no.
 * El landing es público y vende el SaaS a visitantes nuevos.
 */
export default function RootPage() {
  const session = getServerSession();
  if (session) redirect("/dashboard");
  redirect("/landing");
}
