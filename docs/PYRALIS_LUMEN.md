# Pyralis Lumen v2 — Design System

> *A measured system of light for software that illuminates.*
>
> **Lumen** /ˈluːmən/ — unidad SI de flujo luminoso. Para Pyralis, el sistema técnico que da forma a la luz de la marca.

Lumen reemplaza al brand system v1 (`PYRALIS_BRAND.md`). Mantiene el ADN — midnight + glow + ember — pero lo refina con dark mode como ciudadano de primera clase, gradientes técnicos, glassmorphism funcional y tokens más sistemáticos.

---

## 1. Filosofía

| Principio | Cómo se manifiesta |
|---|---|
| **Progressive disclosure** | Solo se muestra lo esencial. Detalle on-demand. Inspiración: Linear. |
| **Calmness over density** | Whitespace > data soup. Las cards respiran. |
| **Data first, chrome last** | Lo importante es el dato; el cromo (bordes, sombras) lo enmarca sin distraer. |
| **Light when you read, dark when you act** | Light mode para lectura larga (documentos, formularios); dark mode para "trabajar" (dashboard, monitoreo). |
| **Motion is meaning** | Las animaciones señalan estado o cambio. Nada decorativo. |

---

## 2. Paleta — refinada

### Superficies

| Token | Light | Dark | Uso |
|---|---|---|---|
| `lumen-canvas` | `#FAFAF9` (stone-50) | `#0A0A0B` | Background absoluto |
| `lumen-surface` | `#FFFFFF` | `#16161A` | Cards, modales |
| `lumen-surface-raised` | `#F5F5F4` | `#1C1C22` | Elementos elevados sobre surface |
| `lumen-border` | `#E7E5E4` | `#27272E` | Bordes sutiles |
| `lumen-border-strong` | `#D6D3D1` | `#3A3A45` | Bordes para divisiones |

### Tinta (texto)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `lumen-ink` | `#0C0A09` | `#FAFAF9` | Texto principal |
| `lumen-ink-muted` | `#57534E` | `#A8A29E` | Texto secundario |
| `lumen-ink-subtle` | `#A8A29E` | `#57534E` | Texto terciario, placeholders |

### Acentos (mantenemos identidad)

| Token | Hex | Uso |
|---|---|---|
| `lumen-glow` | `#FBBF24` | Acción primaria. VIP. Highlight. La "luz" Pyralis. |
| `lumen-glow-soft` | `#FEF3C7` (light) / `#3B2E0C` (dark) | Fondos suaves de glow |
| `lumen-ember` | `#F97316` | Procesando, estados intermedios, atención sin alarma |
| `lumen-ember-soft` | `#FFEDD5` (light) / `#3B1F0C` (dark) | Fondos suaves de ember |

### Nuevos en v2 — gradientes y semánticos refinados

| Token | Hex | Uso |
|---|---|---|
| `lumen-aurora` | `#A78BFA` (violet-400) | Gradiente para estados IA / inteligencia. "Pensando" |
| `lumen-tide` | `#5EEAD4` (teal-300) | Gradiente para conexiones, integraciones, flujo |
| `lumen-pulse` | `#34D399` (emerald-400) | Success más sofisticado que green puro |
| `lumen-flag` | `#F87171` (red-400) | Danger refinado, menos agresivo que rojo puro |
| `lumen-tag` | `#60A5FA` (blue-400) | Info, links destacados |

### Gradientes signature

```css
.gradient-lumen-glow {
  background: linear-gradient(135deg, #FBBF24 0%, #F97316 100%);
  /* Pyralis brand gradient: glow → ember */
}

.gradient-lumen-aurora {
  background: linear-gradient(135deg, #A78BFA 0%, #60A5FA 50%, #5EEAD4 100%);
  /* IA / pensamiento / procesamiento */
}

.gradient-lumen-night {
  background: linear-gradient(180deg, #16161A 0%, #0A0A0B 100%);
  /* Background dark mode hero */
}

.gradient-lumen-ember-fade {
  background: radial-gradient(circle at top right, rgba(249,115,22,0.15) 0%, transparent 60%);
  /* Glow ambiente para hero sections */
}
```

---

## 3. Tipografía

**Stack actualizado:**

- **Sans (UI)**: `Inter Variable` (sin cambios — funciona perfecto)
- **Display (hero, números grandes)**: `Geist Sans` (nuevo — Vercel-style, sofisticado)
- **Mono (datos, código, métricas)**: `JetBrains Mono Variable` (sin cambios)

**Escala:**

| Token | Tamaño | Weight | Tracking | Familia | Uso |
|---|---|---|---|---|---|
| `lumen-hero` | 64px / 72px | 700 | -0.05em | Geist Sans | Hero landings |
| `lumen-display-xl` | 48px / 56px | 700 | -0.04em | Geist Sans | Page titles importantes |
| `lumen-display-lg` | 36px / 44px | 700 | -0.03em | Geist Sans / Inter | Section titles |
| `lumen-display-md` | 28px / 36px | 600 | -0.02em | Inter | Card titles grandes |
| `lumen-display-sm` | 20px / 28px | 600 | -0.01em | Inter | Card titles |
| `lumen-body-lg` | 18px / 28px | 400 | 0 | Inter | Leads |
| `lumen-body` | 15px / 24px | 400 | 0 | Inter | Body default |
| `lumen-body-sm` | 13px / 20px | 400 | 0 | Inter | Helpers |
| `lumen-caption` | 12px / 16px | 500 | 0.02em | Inter | Labels |
| `lumen-overline` | 11px / 14px | 600 | 0.1em | Inter (uppercase) | Section labels |
| `lumen-mono` | 13px / 20px | 500 | 0 | JetBrains Mono | KPIs numéricos, IDs |
| `lumen-mono-display` | 32px / 40px | 600 | -0.01em | JetBrains Mono | KPIs grandes |

**Regla técnica:**
Todo número que comunica datos cuantitativos usa `JetBrains Mono` (tabular figures por default). Eso le da al producto un signal tech-precise sin sacrificar legibilidad.

---

## 4. Sombras y elevación

**Sutiles, multi-layer.** Inspiración: Vercel.

| Token | Light | Dark |
|---|---|---|
| `lumen-elevation-0` | `none` | `none` |
| `lumen-elevation-1` | `0 1px 2px rgba(12,10,9,0.04)` | `0 1px 2px rgba(0,0,0,0.4)` |
| `lumen-elevation-2` | `0 4px 12px rgba(12,10,9,0.06), 0 1px 2px rgba(12,10,9,0.04)` | `0 4px 12px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)` |
| `lumen-elevation-3` | `0 16px 32px rgba(12,10,9,0.08)` | `0 16px 32px rgba(0,0,0,0.6)` |
| `lumen-elevation-glow` | `0 0 0 1px rgba(251,191,36,0.3), 0 0 32px rgba(251,191,36,0.15)` | igual |
| `lumen-elevation-aurora` | `0 0 0 1px rgba(167,139,250,0.3), 0 0 40px rgba(167,139,250,0.2)` | igual |

**Glassmorphism (nuevo):**

```css
.lumen-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.lumen-glass-dark {
  background: rgba(22, 22, 26, 0.7);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

---

## 5. Border radius

Más matemático que v1:

| Token | Valor | Uso |
|---|---|---|
| `lumen-radius-xs` | 4px | Chips, dots, indicadores |
| `lumen-radius-sm` | 8px | Inputs, badges, small buttons |
| `lumen-radius` | 12px | Buttons default, cards |
| `lumen-radius-lg` | 16px | Cards grandes, modales |
| `lumen-radius-xl` | 24px | Hero containers |
| `lumen-radius-full` | 9999px | Pills, avatars |

---

## 6. Animaciones — meaning, not decoration

**Easing tokens:**

```css
--ease-lumen-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-lumen-in-out: cubic-bezier(0.83, 0, 0.17, 1);
--ease-lumen-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Duraciones:**

| Token | Duración | Uso |
|---|---|---|
| `--duration-instant` | 100ms | Hover states |
| `--duration-fast` | 200ms | Open/close de menus, dropdowns |
| `--duration-normal` | 300ms | Page transitions |
| `--duration-slow` | 500ms | Hero animations |
| `--duration-deliberate` | 700ms | Cuando queremos que el usuario VEA el cambio |

**Animaciones signature:**

| Nombre | Para qué |
|---|---|
| `shimmer` | Skeleton loaders. Sutil barrido diagonal. |
| `pulse-glow` | El botón principal "respira" cuando es la acción esperada. |
| `gradient-shift` | El hero de Pyralis tiene un gradiente que se mueve lento (60s loop). |
| `fade-in-up` | Cards aparecen desde abajo con leve fade. |
| `count-up` | Los KPIs numéricos cuentan de 0 a su valor en 800ms. |
| `aurora-flow` | Para estados de IA procesando: gradient violet→teal moviéndose. |

---

## 7. Componentes — nuevos tokens

### KPI Card v2

- Fondo: `lumen-surface` con `lumen-elevation-2`
- Número: `lumen-mono-display` en `lumen-ink`, con `count-up` al cargar
- Label: `lumen-overline` en `lumen-ink-muted`
- Icon: en burbuja 36×36 con fondo soft del color semántico
- Indicador de cambio: chip pequeño con flecha + monto, color según up/down
- **Nuevo:** `hover` produce sutil `translateY(-2px)` + `lumen-elevation-3`

### Glass Card (para hero stats sobre imagen/gradient)

- `lumen-glass` o `lumen-glass-dark`
- Border radius `lumen-radius-lg`
- Padding generoso (24-32px)
- Texto sobre fondo: usa `lumen-ink` con fallback a blanco si está sobre dark

### IA Processing Indicator

- Gradient `aurora-flow` animado en loop
- Texto "Procesando con Claude Sonnet" en `lumen-mono`
- Spinner sustituido por puntos que pulsan

### Confidence Badge (para IA)

- Visual: barra horizontal segmentada (10 segmentos)
- Color: gradient glow→ember según %
- Tooltip: muestra el valor numérico al hover
- 0-60%: `lumen-flag` (rojo refinado)
- 60-85%: `lumen-ember`
- 85-100%: `lumen-pulse` (verde refinado)

---

## 8. Logo Pyralis — refinado

Mantenemos el wordmark `pyralis·` pero ahora con tratamientos específicos:

### Wordmark estándar (header app)
```
pyralis·
```
- "pyralis" en Inter 600, `lumen-ink`
- Punto en `lumen-glow`, 1.2× el tamaño del texto
- En dark mode: invertido (texto blanco, punto glow)

### Wordmark grande (landing hero)
```
pyralis·
```
- "pyralis" en Geist Sans 800, gradient `lumen-glow → lumen-ember`
- Punto: animación `pulse-glow` lenta

### Logomark (favicon, app icon)
- Solo el punto, sobre fondo `lumen-canvas-dark`
- Glow halo expandido alrededor (gradient radial)

### Combined (powered by)
```
[Product Name]
powered by pyralis·
```
- Product name en peso fuerte
- "powered by pyralis·" en `lumen-overline` muted

---

## 9. Reglas de aplicación a Turnova

**Light mode (default):** páginas de formularios largos, configuración, lectura de detalle.

**Dark mode (recomendado):** dashboard principal, vista calendario, monitoreo en tiempo real.

**Hero gradient:**
- Login page: `gradient-lumen-night` + `gradient-lumen-ember-fade` overlay
- Landing page: full screen `gradient-lumen-night` con orbes animados de aurora

**Acentos:**
- VIP: badges con `gradient-lumen-glow`
- Procesando IA: `aurora-flow` animado
- Confirmado: dot `lumen-pulse`
- Cancelado: dot `lumen-flag`

---

## 10. Naming convention reservado para futuros productos del ecosistema

Cada producto Pyralis hereda Lumen y customiza solo el **producto-accent**:

| Producto | Producto-accent | Vibe |
|---|---|---|
| **Turnova** (salud) | `lumen-glow` (ámbar) | Confianza médica + tech |
| **OrderSmart** (gastronomía) | `lumen-ember` (naranja) | Calidez + velocidad |
| **LeadSense** (sales) | `lumen-aurora` (violet) | Inteligencia + descubrimiento |
| **CareLift** (educación) | `lumen-tide` (teal) | Crecimiento + claridad |

Todos comparten el mismo sistema. Cambian solo: producto-accent + nombre del producto.

---

**Versión 2.0 · Mayo 2026 · Pyralis**
