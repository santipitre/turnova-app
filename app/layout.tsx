import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Turnova — Cada turno, una nueva era",
    template: "%s · Turnova",
  },
  description:
    "Turnova automatiza la asignación de turnos médicos leyendo pedidos con IA. Producto de Pyralis.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-stone-950 text-stone-100 font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          toastOptions={{
            className: "font-sans",
          }}
        />
      </body>
    </html>
  );
}
