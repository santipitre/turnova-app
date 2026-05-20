# Empezando con Turnova — Guía paso a paso

Esta guía te lleva desde "tengo los archivos" hasta "la app está corriendo en mi centro médico". Pensada para Santiago, sin asumir experiencia previa en Next.js.

## Paso 1 — Instalar Node.js (si no lo tenés)

1. Ir a https://nodejs.org → descargar **versión LTS**
2. Instalar con todas las opciones default
3. Verificar:
   ```
   node --version    # debería decir v20.x.x o similar
   npm --version
   ```

## Paso 2 — Abrir una terminal en la carpeta del proyecto

**Windows**:
1. Abrir el Explorador de Archivos
2. Navegar a `C:\Users\pitre\OneDrive\Documentos\Claude\Projects\Turnos\pyralis-app`
3. En la barra de direcciones, escribir `cmd` y Enter (abre terminal en esa carpeta)

**Mac/Linux**:
```bash
cd ~/Documents/Claude/Projects/Turnos/pyralis-app
```

## Paso 3 — Instalar dependencias

```bash
npm install
```

Va a tardar 1-3 minutos. Si ves warnings está bien, lo importante es que NO veas "ERR!".

## Paso 4 — Configurar variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto. Podés copiar el ejemplo:

**Windows**:
```
copy .env.local.example .env.local
```

**Mac/Linux**:
```bash
cp .env.local.example .env.local
```

Abrir `.env.local` con cualquier editor de texto (Notepad, VS Code, etc.) y reemplazar los valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_APP_NAME=Turnova
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**De dónde sacar estos valores**:
1. Entrá a https://supabase.com/dashboard
2. Click en tu proyecto Turnova
3. Settings (engranaje) → API
4. **Project URL** → copialo a `NEXT_PUBLIC_SUPABASE_URL`
5. **anon public** → copialo a `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. **service_role** (click "Reveal") → copialo a `SUPABASE_SERVICE_ROLE_KEY`

⚠️ El `service_role` es secreto. Nunca lo subas a GitHub.

## Paso 5 — Levantar el servidor de desarrollo

```bash
npm run dev
```

Vas a ver algo como:

```
▲ Next.js 14.2.13
- Local:        http://localhost:3000
- Ready in 2.1s
```

Abrí http://localhost:3000 en tu navegador.

## Paso 6 — Hacer login

Te va a redirigir a `/login`. Usá el email/password del usuario que creaste en Supabase Authentication.

Si todo funciona, vas a ver:
- Panel izquierdo con el logo Pyralis y el branding
- Panel derecho con formulario "Entrar a Turnova"
- Después de loguearte: dashboard con KPIs reales

## Paso 7 — Probar el flujo end-to-end

1. Click en **Pedidos Médicos** en el sidebar
2. Click en **+ Cargar pedido manual** (botón glow arriba a la derecha)
3. Subí una foto de un pedido médico real (anonimizada)
4. Click en **Procesar con IA**
5. Esperá 3-5 segundos — Claude Vision va a extraer los datos
6. Te lleva al detalle del pedido con los datos extraídos
7. Click en **Asignar turno automáticamente**
8. El motor de reglas busca el mejor cupo
9. Confirmá el turno
10. Listo: aparece en `/turnos`

## Paso 8 — Deploy a producción (Vercel)

Cuando esté listo para usar en tu centro:

```bash
npm install -g vercel
vercel
```

Seguir el wizard interactivo:
- Login con tu cuenta GitHub o email
- ¿Project name? `turnova`
- ¿Directory? `.` (la carpeta actual)
- Deploy?: Y

Después de unos minutos te da una URL tipo `turnova-xyz.vercel.app`. Eso ya es accesible desde cualquier navegador, no necesita más nada.

**Para conectar el dominio `turnova.pyralis.ar`**:
1. Comprar `pyralis.ar` en Nic.ar (~USD 20/año)
2. En Vercel Project → Settings → Domains → Add → `turnova.pyralis.ar`
3. Vercel te muestra qué DNS records configurar
4. En Nic.ar agregás el CNAME que te dijo Vercel
5. En 5-30 min está propagado

## Troubleshooting

### "Error: NEXT_PUBLIC_SUPABASE_URL no está definido"
Olvidaste crear el `.env.local` o el archivo está en otra carpeta. Tiene que estar en `pyralis-app/.env.local`.

### "Module not found: Can't resolve '@supabase/ssr'"
Faltó el `npm install`. Ejecutalo de nuevo.

### "Error 401 Unauthorized" al cargar dashboard
Tu usuario en Supabase Auth no tiene un perfil asociado en la tabla `profiles`. Ejecutar este SQL en Supabase:

```sql
INSERT INTO profiles (id, tenant_id, nombre, email, rol)
VALUES (
  'TU_USER_UUID',
  (SELECT id FROM tenants LIMIT 1),
  'Tu Nombre',
  'tu@email.com',
  'superadmin'
);
```

### El procesamiento de pedidos da error
Verificá que la Edge Function `procesar-pedido` esté desplegada y que el secret `ANTHROPIC_API_KEY` esté configurado:

```bash
supabase secrets list
supabase functions deploy procesar-pedido
```

### El dashboard no muestra datos
Probablemente no cargaste los datos demo. Ver `../backend/DEPLOY.md` paso 1.

---

## ¿Querés que te ayude con algún paso específico?

Avísame en cuál estás trabado y armamos la solución juntos.
