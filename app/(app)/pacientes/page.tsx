import Link from "next/link";
import { Users, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatFecha, getIniciales } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pacientes" };

export default async function PacientesPage() {
  const supabase = createClient();

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select(`
      id, nombre, apellido, dni, telefono, email, canal_origen, created_at,
      obra_social:obras_sociales(nombre, es_vip)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-lg">Pacientes</h1>
          <p className="text-stone-400 mt-1">{pacientes?.length ?? 0} pacientes registrados</p>
        </div>
        <Button variant="glow">
          <Users className="h-4 w-4" />
          Agregar paciente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input placeholder="Buscar por nombre, DNI o teléfono..." className="pl-9" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Obra Social</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pacientes ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-stone-400 py-12">
                  Todavía no hay pacientes cargados.
                </TableCell>
              </TableRow>
            )}
            {(pacientes ?? []).map((p) => {
              const os = Array.isArray(p.obra_social) ? p.obra_social[0] : p.obra_social;
              const nombreCompleto = `${p.nombre} ${p.apellido}`;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getIniciales(nombreCompleto)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{nombreCompleto}</div>
                        {p.email && (
                          <div className="text-caption text-stone-400">{p.email}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.dni ?? "—"}</TableCell>
                  <TableCell>
                    {os?.es_vip ? (
                      <Badge variant="vip">⭐ {os.nombre}</Badge>
                    ) : os ? (
                      <Badge variant="default">{os.nombre}</Badge>
                    ) : (
                      <span className="text-stone-400 text-xs">Sin obra social</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="default">{p.canal_origen ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-caption text-stone-400">
                    {formatFecha(p.created_at, "dd/MM/yy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/pacientes/${p.id}`}>Ver historial</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
