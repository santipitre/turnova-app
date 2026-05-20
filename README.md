# Turnova — Aplicación Web

**Aplicación Next.js 14 production-ready** del primer producto del ecosistema **Pyralis**.

Turnova automatiza la asignación de turnos médicos leyendo pedidos con IA. Esta carpeta contiene la app web completa que se conecta al backend (Edge Functions + Supabase).

---

## 🚀 Setup rápido (10 minutos)

### 1. Pre-requisitos

- Node.js 18.17+ y npm
- Cuenta Supabase con schema + backend ya desplegado (ver `../backend/DEPLOY.md`)
- Anthropic Claude API key activa

### 2. Instalar dependencias

```bash
cd pyralis-app
npm install
```

### 3. Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_NAME=Turnova
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Levantar en desarrollo

```bash
npm run dev
```

Abrir `http://localhost:3000`. Deberías ver el login. Entrá con el usuario que creaste en Supabase Auth.

---

## 📁 Estructura

```
pyralis-app/
├── README.md
├── docs/
│   └── PYRALIS_BRAND.md          ← Sistema de diseño Pyralis (usar para todos los productos)
├── app/                          ← App Router de Next.js 14
│   ├── layout.tsx                ← Layout raíz: fonts, toaster
│   ├── page.tsx                  ← Redirect a /dashboard o /login
│   ├── globals.css               ← Tailwind base + tokens Pyralis
│   ├── login/page.tsx            ← Página de login pública
│   ├── auth/
│   │   ├── callback/route.ts     ← OAuth/magic link callback
│   │   └── error/page.tsx
│   └── (app)/                    ← Rutas protegidas (middleware)
│       ├── layout.tsx            ← Layout con sidebar + header
│       ├── dashboard/page.tsx    ← KPIs, gráficos, alertas
│       ├── pedidos/
│       │   ├── page.tsx          ← Lista de pedidos con filtros
│       │   ├── [id]/page.tsx     ← Detalle de pedido + asignar turno
│       │   └── nuevo/page.tsx    ← Carga manual de pedido
│       ├── turnos/page.tsx       ← Lista de turnos
│       ├── pacientes/page.tsx    ← Lista de pacientes
│       ├── obras-sociales/page.tsx
│       ├── cupos/page.tsx        ← Matriz de cupos semanales
│       └── configuracion/page.tsx
├── components/
│   ├── ui/                       ← Componentes UI base (Button, Card, etc.)
│   ├── layout/                   ← Sidebar, Header
│   ├── brand/                    ← Logo Pyralis
│   ├── dashboard/                ← KPI card, charts
│   ├── pedidos/                  ← Acciones de pedido
│   └── auth/                     ← Login form
├── lib/
│   ├── supabase/                 ← Clientes server/client/middleware
│   ├── api/                      ← Helpers para Edge Functions
│   ├── types/                    ← Tipos TypeScript de la BD
│   └── utils.ts                  ← Helpers de formato, fechas, etc.
├── middleware.ts                 ← Protección de rutas
├── tailwind.config.ts            ← Tokens Pyralis (colores, tipografía, sombras)
└── tsconfig.json
```

---

## 🎨 Sistema de diseño Pyralis

Este proyecto usa el **brand system Pyralis**, documentado en `docs/PYRALIS_BRAND.md`.

**Decisiones clave:**
- **Paleta**: `midnight` (#0F172A) primario, `glow` (#FBBF24) acento, slate como base neutral
- **Tipografía**: Inter para UI, JetBrains Mono para datos
- **Componentes**: shadcn-style sobre Radix UI, con tokens Pyralis personalizados
- **Logo**: "pyralis·" minimalista; cada producto tiene su nombre + "powered by pyralis·"

**Reusable para futuros productos:** copiar `tailwind.config.ts`, `app/globals.css`, `components/ui/`, `components/brand/` y arrancar.

---

## 🔌 Conexión con el backend

La app habla con **3 capas** de Supabase:

### 1. PostgreSQL (queries directas)
Las páginas usan Server Components que llaman a `supabase.from(...).select(...)` con RLS activo. El usuario solo ve datos de su tenant.

### 2. Edge Functions
Operaciones críticas (procesar pedido con IA, asignar turno, confirmar/cancelar) se invocan vía `lib/api/edge-functions.ts`:

```typescript
import { procesarPedido, asignarTurno } from "@/lib/api/edge-functions";

const result = await procesarPedido({
  archivo_base64: "...",
  media_type: "image/jpeg",
  canal_origen: "web",
});
```

### 3. Auth
`middleware.ts` protege todas las rutas excepto `/login` y `/auth/*`. Si no hay sesión válida, redirige a login con el redirect-back original.

---

## 🏗️ Build y deploy a Vercel

### Build local

```bash
npm run build
npm start
```

### Deploy a Vercel (recomendado)

```bash
# Si no tenés Vercel CLI:
npm install -g vercel

# Desde la carpeta pyralis-app/:
vercel
```

Vercel detecta Next.js automáticamente. Al desplegar, completar las variables de entorno en el dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app`

### Dominio custom (turnova.pyralis.ar)

1. Comprar dominio `pyralis.ar` (recomendado: Nic.ar)
2. En Vercel: Project → Settings → Domains → Add → `turnova.pyralis.ar`
3. En Nic.ar: agregar CNAME `turnova` → `cname.vercel-dns.com`
4. Esperar 5-30 min a que propague DNS

---

## 🧪 Verificación post-instalación

Después de `npm run dev`, validá:

- [ ] `/login` se ve con el branding Pyralis (panel izquierdo midnight con glow)
- [ ] Login con email/password funciona
- [ ] Después de login redirige a `/dashboard`
- [ ] Dashboard muestra KPIs reales (no placeholders)
- [ ] Sidebar muestra badge con cantidad de pedidos pendientes
- [ ] Click en "Pedidos Médicos" muestra la lista
- [ ] Click en un pedido en estado "procesado" muestra el detalle
- [ ] Botón "Asignar turno automáticamente" llama la Edge Function `asignar-turno`
- [ ] Después de confirmar, el pedido pasa a "asignado" y aparece en /turnos
- [ ] Cerrar sesión funciona y redirige a /login

Si algo falla, revisá los logs de Supabase Edge Functions y la consola del navegador.

---

## 🔧 Comandos útiles

```bash
npm run dev          # Desarrollo (puerto 3000)
npm run build        # Build de producción
npm run start        # Servir el build
npm run lint         # ESLint
npm run typecheck    # TypeScript check sin build
npm run format       # Prettier sobre todo el código
```

---

## 🎯 Próximos pasos sugeridos

Después de tener la app andando en tu centro:

1. **Conectar BOTMAKER** real → integración bidireccional con WhatsApp
2. **Sistema de notificaciones** → recordatorios 24hs antes, encuestas post-atención
3. **Vista calendario** de turnos (drag & drop para reagendar)
4. **App móvil PWA** para el paciente
5. **Marketplace de obras sociales** con sincronización automática de cupos
6. **Segundo producto Pyralis** reusando el design system

---

## 🤝 Soporte

- **Documentación brand**: `docs/PYRALIS_BRAND.md`
- **Backend**: `../backend/README.md`
- **Plan estratégico**: `../Plan_Estrategico_Turnova.docx`

---

**Turnova** · powered by **pyralis·** · Mayo 2026
