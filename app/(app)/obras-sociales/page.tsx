import { Plus, Shield, Star } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Obras Sociales" };

export default async function ObrasSocialesPage() {
  const supabase = createClient();

  const { data: obrasSociales } = await supabase
    .from("obras_sociales")
    .select("*")
    .order("es_vip", { ascending: false })
    .order("prioridad", { ascending: false });

  const vips = (obrasSociales ?? []).filter((os) => os.es_vip);
  const noVips = (obrasSociales ?? []).filter((os) => !os.es_vip);

  // Contar pacientes por OS
  const { data: pacientesPorOS } = await supabase
    .from("pacientes")
    .select("obra_social_id");

  const conteoPacientes = (pacientesPorOS ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.obra_social_id) acc[p.obra_social_id] = (acc[p.obra_social_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-lg">Obras Sociales</h1>
          <p className="text-stone-400 mt-1">
            Las VIP reciben turno máximo en 72 horas. Las no-VIP usan cupos semanales.
          </p>
        </div>
        <Button variant="glow">
          <Plus className="h-4 w-4" />
          Agregar obra social
        </Button>
      </div>

      {/* VIP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-pyralis-glowHover fill-pyralis-glow" />
            Obras sociales VIP ({vips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vips.map((os) => (
              <div
                key={os.id}
                className="group relative overflow-hidden p-4 rounded-lg bg-gradient-to-br from-pyralis-glow/[0.08] to-stone-900/40 border border-pyralis-glow/25 transition-all hover:border-pyralis-glow/50 hover:shadow-pyralis-glow"
              >
                <span className="absolute left-0 top-0 h-full w-1 bg-pyralis-glow/70" />
                <div className="flex justify-between items-start gap-2 mb-2 pl-1.5">
                  <h3 className="font-semibold text-stone-100 leading-snug">{os.nombre}</h3>
                  <Badge variant="vip" className="shrink-0">P{os.prioridad}</Badge>
                </div>
                <p className="text-caption font-medium uppercase tracking-wide text-pyralis-glow/90 pl-1.5">
                  SLA {os.tiempo_maximo_horas}hs
                </p>
                <p className="text-caption text-stone-400 mt-1 pl-1.5">
                  {conteoPacientes[os.id] ?? 0} pacientes activos
                </p>
              </div>
            ))}
            {vips.length === 0 && (
              <div className="col-span-full text-center text-stone-400 py-8">
                Ninguna obra social está marcada como VIP.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No-VIP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-stone-400" />
            Obras sociales con cupos semanales ({noVips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tiempo máximo</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Pacientes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noVips.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">{os.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">{os.codigo ?? "—"}</TableCell>
                  <TableCell>{Math.round(os.tiempo_maximo_horas / 24)} días</TableCell>
                  <TableCell>
                    <Badge variant="default">P{os.prioridad}</Badge>
                  </TableCell>
                  <TableCell>{conteoPacientes[os.id] ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Promover a VIP</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
