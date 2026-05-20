# Pyralis — Brand System

> **Pyralis** /ˈpaɪɹəlɪs/ — luciérnaga del fuego en mitología griega; insecto que emite luz propia.
> Como marca: tecnología que ilumina procesos invisibles en industrias tradicionales.

Este documento es la fuente de verdad para todo lo que diseñamos bajo Pyralis. Aplicable a Turnova y cualquier producto futuro del ecosistema.

---

## 1. Posicionamiento

**Pyralis construye herramientas de IA aplicada que iluminan procesos invisibles en industrias tradicionales.**

Empezamos por salud (Turnova) y vamos a expandir a otras verticales donde el flujo administrativo manual desperdicia recursos: educación, contabilidad, logística regional.

**Promesa:** lo que antes tomaba horas y errores, ahora ocurre solo y bien.

**Personalidad de marca:**

- **Confiable** — manejamos datos sensibles, no podemos sonar a startup informal
- **Inteligente** — la IA es protagonista pero no es show-off
- **Cercano** — somos founders que estuvimos en la trinchera del problema
- **Optimista pragmático** — proponemos soluciones, no nos quedamos en el problema

**Tono:** profesional pero conversacional. "Vos" en Argentina, "tú" en mercados que lo prefieran. Frases cortas. Datos concretos siempre que se pueda. Cero corporate-speak.

---

## 2. Paleta de Colores

### Colores primarios

| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| `pyralis-midnight` | `#0F172A` | 15, 23, 42 | Color primario. Headers, sidebar, texto principal. |
| `pyralis-glow` | `#FBBF24` | 251, 191, 36 | Color de acento. Highlights, CTA, badges VIP. |
| `pyralis-ember` | `#F97316` | 249, 115, 22 | Acento secundario. Alertas suaves, hover de glow. |

### Colores semánticos

| Token | Hex | Uso |
|-------|-----|-----|
| `pyralis-success` | `#10B981` | Éxito, confirmaciones, estados positivos |
| `pyralis-warning` | `#F59E0B` | Advertencias, cupos al límite |
| `pyralis-danger` | `#EF4444` | Errores, cancelaciones, saturación |
| `pyralis-info` | `#3B82F6` | Información, banners neutrales |

### Escala de grises (slate, basado en Tailwind)

| Token | Hex | Uso |
|-------|-----|-----|
| `slate-50` | `#F8FAFC` | Background principal |
| `slate-100` | `#F1F5F9` | Background alternativo, bordes suaves |
| `slate-200` | `#E2E8F0` | Borders |
| `slate-400` | `#94A3B8` | Texto secundario |
| `slate-600` | `#475569` | Texto principal en light |
| `slate-900` | `#0F172A` | Texto enfatizado, sidebar dark |

### Reglas de uso

- **Nunca** combines `pyralis-glow` con `pyralis-ember` en la misma vista (chocan, son de la misma familia)
- **Glow** es premium: para VIP, KPIs destacados, primary CTA
- **Midnight** es siempre el ancla visual: si tenés que elegir un solo color, ese
- **Ember** es para llamados a la acción secundarios o estados de "en proceso"
- Mantené ratio 70/20/10: 70% neutrales, 20% midnight, 10% acentos

### Modo oscuro (dark mode)

Cuando se implemente, invertir:
- Background: `slate-950` (#020617)
- Surface: `slate-900` (#0F172A)
- Texto: `slate-100` (#F1F5F9)
- Acento (glow): se mantiene, solo se ajusta opacidad si es necesario

---

## 3. Tipografía

**Familia principal:** **Inter** (Google Fonts, variable)
**Familia mono (código, datos):** **JetBrains Mono** (Google Fonts)

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
```

### Escala tipográfica

| Token | Tamaño | Weight | Letter-spacing | Uso |
|-------|--------|--------|----------------|-----|
| `display-xl` | 56px / 64px | 800 | -0.04em | Hero headlines, landing |
| `display-lg` | 40px / 48px | 800 | -0.03em | Page headers |
| `display-md` | 32px / 40px | 700 | -0.02em | Section titles |
| `display-sm` | 24px / 32px | 700 | -0.01em | Subsection titles |
| `body-lg` | 18px / 28px | 400 | 0 | Body grande, leads |
| `body` | 16px / 24px | 400 | 0 | Body estándar |
| `body-sm` | 14px / 20px | 400 | 0 | Body chico, helpers |
| `caption` | 12px / 16px | 500 | 0.02em | Labels, captions |
| `overline` | 11px / 14px | 600 | 0.08em | UPPERCASE labels |

### Reglas tipográficas

- Headers siempre con `tracking-tight` (`-0.02em` o más negativo)
- Body con tracking neutro (0)
- Labels uppercase con `letter-spacing 0.08em` para legibilidad
- Datos numéricos importantes (KPIs) usan font-weight 700 mínimo
- Números tabulares: usar `font-variant-numeric: tabular-nums` para tablas

---

## 4. Espaciado y Layout

**Sistema base: 4px** (todo es múltiplo de 4)

| Token | Valor | Uso típico |
|-------|-------|------------|
| `space-1` | 4px | Padding interno chico |
| `space-2` | 8px | Gap entre elementos chicos |
| `space-3` | 12px | Padding de inputs, badges |
| `space-4` | 16px | Padding de cards, gap entre cards |
| `space-6` | 24px | Padding de secciones |
| `space-8` | 32px | Padding de páginas |
| `space-12` | 48px | Separación entre secciones grandes |
| `space-16` | 64px | Margins hero |

**Border radius:**

| Token | Valor | Uso |
|-------|-------|-----|
| `radius-sm` | 6px | Badges, chips |
| `radius` | 10px | Inputs, buttons |
| `radius-md` | 12px | Cards, modals |
| `radius-lg` | 16px | Cards grandes, contenedores hero |

**Sombras (elevación):**

| Token | Valor | Uso |
|-------|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.06)` | Estados pasivos |
| `shadow` | `0 4px 12px rgba(15, 23, 42, 0.08)` | Cards, dropdowns |
| `shadow-lg` | `0 12px 32px rgba(15, 23, 42, 0.12)` | Modals, popovers |
| `shadow-glow` | `0 0 24px rgba(251, 191, 36, 0.25)` | Estados destacados (VIP) |

---

## 5. Iconografía

**Sistema: lucide-react** — moderno, consistente, open source.

- Stroke width: 1.75 (default 2 es muy pesado, 1.5 es muy fino)
- Tamaños estándar: 16, 20, 24, 32
- Color: hereda del texto (`currentColor`)

Para conceptos específicos de salud usar combinación:
- Calendar → turnos
- FileText → pedido médico
- Activity → métricas / KPIs
- Stethoscope → consultas médicas (instalar lucide-react latest)
- Shield → obras sociales / cobertura
- Sparkles → IA / automatización
- Users → pacientes
- Building2 → sedes / centros

---

## 6. Componentes Pyralis

### Logo

El logo es minimalista: la palabra "pyralis" en lowercase con un punto de acento glow después.

```
pyralis·
```

Variantes:
- **Logomark**: solo el punto glow (favicon, app icon)
- **Logotype**: palabra + punto (header, footer)
- **Combined**: palabra + tagline ("ai for invisible processes")

Cuando esté embedded en otro producto (Turnova, etc.), usar siempre el formato:

```
[Logo del producto]    powered by pyralis·
```

### Product naming

Convención: nombres descriptivos en CamelCase. Sufijos sugeridos:
- `Smart` (Turnova, OrderSmart)
- `Flow` (BillingFlow, IntakeFlow)
- `Sense` (LeadSense, PriceSense)
- `Lift` (CareLift, OpsLift)

Cada producto vive en un subdominio: `turnova.pyralis.ar`, `billingflow.pyralis.ar`, etc.

---

## 7. Voz y tono escrito

### Reglas generales

- **Frases cortas** (máximo 20 palabras por oración como guía)
- **Verbos activos**: "asignamos" en lugar de "es asignado"
- **Datos concretos**: "85% menos tiempo" en lugar de "mucho más rápido"
- **Sin jerga técnica al usuario final**: "procesando" en lugar de "ejecutando inferencia"
- **Cercano sin perder seriedad**: "vamos a", "te avisamos" — pero nunca emojis salvo en confirmaciones de éxito

### Ejemplos

| Mal | Bien |
|-----|------|
| "El sistema procesará su pedido en el menor tiempo posible" | "Procesamos tu pedido en segundos" |
| "Error: la operación no pudo ser completada" | "Algo falló. Intentá de nuevo en 1 minuto." |
| "Cargar archivo de pedido médico (formatos aceptados: JPG, PNG, PDF)" | "Subí tu pedido médico — foto o PDF" |
| "Su turno ha sido confirmado satisfactoriamente" | "Listo. Te esperamos el martes 20 a las 14:30." |

### Microcopy crítico (para Turnova)

| Contexto | Texto |
|----------|-------|
| Login button | "Entrar" (no "Iniciar sesión") |
| Logout | "Cerrar sesión" |
| Empty state pedidos | "Nada en cola por ahora. Cuando llegue un pedido por BOTMAKER, lo vas a ver acá." |
| Error de IA | "No pude leer el pedido. ¿Querés cargarlo manualmente?" |
| Confirmación de turno | "Turno confirmado para [paciente]. Le avisamos al WhatsApp." |
| Cancelación | "Turno cancelado. El cupo queda disponible." |
| Hold expirando | "Tenés [N] segundos para confirmar este turno." |

---

## 8. Tokens listos para Tailwind (referencia)

```javascript
// tailwind.config.ts — extracto
theme: {
  extend: {
    colors: {
      pyralis: {
        midnight: "#0F172A",
        glow: "#FBBF24",
        glowHover: "#F59E0B",
        ember: "#F97316",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    boxShadow: {
      "pyralis-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "pyralis": "0 4px 12px rgba(15, 23, 42, 0.08)",
      "pyralis-lg": "0 12px 32px rgba(15, 23, 42, 0.12)",
      "pyralis-glow": "0 0 24px rgba(251, 191, 36, 0.25)",
    },
    borderRadius: {
      DEFAULT: "10px",
    },
  },
},
```

---

## 9. Aplicación a Turnova

Turnova es la **primera implementación** del sistema Pyralis. Decisiones específicas:

- **Color dominante**: Midnight (sidebar, headers de tablas, texto)
- **Glow**: usado solo para VIP badges, KPIs destacados, botón principal del flujo (asignar turno)
- **Ember**: estados de "procesando IA" y alertas suaves de cupos al límite
- **Iconografía health**: calendar, file-text, shield (obras sociales), stethoscope (consultas)
- **Tono**: cercano para staff médico (administradores), formal para pacientes (WhatsApp)
- **Logo de producto**: `Turnova` en Inter Bold seguido del punto glow

---

## 10. Mantenimiento del brand system

Este documento vive en `pyralis-app/docs/PYRALIS_BRAND.md` y es la fuente de verdad. Si una decisión visual no está acá, se documenta acá antes de aplicarla. La consistencia entre productos del ecosistema Pyralis depende de que TODOS sigan estas reglas.

**Versión 1.0 · Mayo 2026 · Santiago Pitrella**
