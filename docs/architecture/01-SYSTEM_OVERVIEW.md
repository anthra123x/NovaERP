# Nova ERP — Arquitectura y Visión General del Sistema

## 1. Propósito y Visión

**Nova ERP** es una plataforma moderna de gestión comercial diseñada para operar cualquier tipo de negocio (comercio general, tecnología y servicio técnico, moda y calzado, supermercados y abarrotes, ferreterías, farmacias y talleres de servicios).

El sistema unifica en una sola solución:
- **Punto de Venta POS de alta velocidad** con múltiples medios de pago y facturación PDF.
- **Inventario omnicanal en tiempo real** con reserva y liberación atómica de stock.
- **Tienda online y catálogo web desacoplado (Headless)** con pedidos referenciados (`ORD-XXXX`).
- **Gestión de cartera, créditos y control de clientes**.
- **Flujo de caja, finanzas y metas de rentabilidad**.
- **Asistente conversacional con Inteligencia Artificial multi-proveedor** (OpenAI, Anthropic, Gemini y fallback Mock) con contexto en vivo del negocio.

---

## 2. Entornos y Despliegue

| Entorno | URL / Host | Descripción |
|---------|------------|-------------|
| **Producción (Cloud)** | [erpcilmax.vercel.app](https://erpcilmax.vercel.app) | Despliegue serverless edge en Vercel con integración continua en rama `main`. |
| **Desarrollo Local** | `http://localhost:3000` | Entorno de desarrollo local con Webpack + WASM SWC bindings. |
| **Base de Datos** | PostgreSQL en Neon | Servidor Serverless con endpoint pooler (`pgcat`) y TLS obligatorio. |
| **Autenticación** | Supabase Auth (SSR) | Sesiones seguras mediante `@supabase/ssr` con cookies HttpOnly y middleware proxy. |

---

## 3. Stack Tecnológico

- **Frontend & Backend**: Next.js 16 (App Router) con React 19 y TypeScript 5 (`strict: true`).
- **Base de Datos & ORM**: PostgreSQL (Neon) + Prisma 5.22 con historial de migraciones SQL.
- **Estilos & Diseño**: Tailwind CSS v4 + tokens OKLCH + shadcn/ui + Base UI v1 + Lucide Icons.
- **Generación Documental**: `@react-pdf/renderer` para facturas POS, recibos térmicos y estados de cuenta.
- **Exportación de Datos**: `xlsx` (SheetJS) para reportes financieros y de inventario.
- **Validación Runtime**: Zod 4 (`@/lib/validations.ts`).
- **Testing**: Vitest con 234 pruebas unitarias y de integración pasando.
- **Calidad de Código**: ESLint 9 con `unused-imports` y Prettier.

---

## 4. Estructura Modular del Proyecto

El código está organizado bajo el patrón de **monolito modular por capas** en `src/modules/`:

```
src/
├── app/                  # Rutas App Router (UI pública, admin y API REST)
│   ├── (auth)            # /login, /register, /auth
│   ├── sales/            # POS ventas de mostrador
│   ├── inventory/        # Catálogo, kardex y movimientos
│   ├── web/              # Administración de tienda online y pedidos
│   ├── finances/         # Tesorería, ingresos, gastos y metas
│   ├── credits/          # Cartera, abonos y estados de cuenta
│   ├── clients/          # Directorio de clientes
│   ├── assistant/        # Chat con Asistente IA
│   ├── reports/          # Reportes consolidados y exportación Excel
│   └── api/              # Endpoints públicos (/api/web/* y PDFs)
├── components/           # Componentes UI reutilizables
│   ├── ui/               # Primitivas shadcn/ui y Base UI
│   ├── forms/            # Formularios complejos (POS, productos)
│   └── layout/           # Sidebar responsivo, Header, Brand Logo
├── lib/                  # Utilidades transversales
│   ├── business-workflow.ts # Motor de configuración por sector comercial
│   ├── finance.ts        # Fórmulas de márgenes, utilidades y redondeos
│   ├── format.ts         # Formateo monetario y fechas
│   ├── prisma.ts         # Cliente singleton de base de datos
│   └── validations.ts    # Esquemas Zod de todo el sistema
└── modules/              # Capas de dominio por módulo
    ├── <modulo>/<modulo>.actions.ts # Frontera HTTP (Server Actions)
    ├── <modulo>/<modulo>.service.ts # Lógica de negocio y transacciones Prisma
    └── <modulo>/index.ts            # Barrel público del módulo
```
