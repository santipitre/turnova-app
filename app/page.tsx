import LandingPage from "./landing/page";

export const dynamic = "force-dynamic";

/**
 * Página raíz: muestra la landing pública de Turnova.
 *
 * Si hay sesión Pyralis activa, el componente Landing muestra un banner
 * arriba del nav: "Hola [nombre] → Ir a mi panel" (apuntando a /dashboard).
 *
 * Decisión: NO redirigimos al dashboard si hay sesión, para que cualquier
 * link compartido siempre muestre la landing primero. Esto evita que el
 * usuario logueado comparta `turnova-app.vercel.app` y al receptor lo manden
 * a /login porque no tiene cookie.
 */
export default function RootPage() {
  return <LandingPage />;
}
