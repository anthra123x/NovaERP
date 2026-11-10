# Modulo: Dashboard Principal y Diagnosticos Operativos

## 1. Proposito y alcance
El modulo `src/app/dashboard/` conforma la consola central de inteligencia y control operativo de Nova ERP. Su proposito es consolidar y presentar en tiempo real los principales indicadores de rendimiento (KPIs), el flujo de caja, el estado de inventario, el libro diario de operaciones recientes y las recomendaciones estrategicas contextualizadas por sector comercial.

El alcance del modulo abarca la matriz de celdas metricas de alto impacto (A1 a H1), graficos de distribucion de medios de pago y acumulado mensual, el listado de alertas de desabastecimiento, la busqueda rapida en el historial diario de ventas y el copiloto de diagnosticos proactivos (`BusinessInsights`).

## 2. Contratos y API

### DashboardPage
- Firma: `DashboardPage(): JSX.Element`
- Componente cliente (`'use client'`) que consume las Server Actions de resumen estadistico y el estado de flujo de trabajo del negocio.

### BusinessInsights
- Firma: `BusinessInsights({ data, profile, workflow }: BusinessInsightsProps): JSX.Element`
- Tipos de entrada:
  ```typescript
  interface BusinessInsightsProps {
    data: DashboardOverview
    profile: SectorProfile
    workflow?: BusinessWorkflowConfig
  }
  ```
- Genera tres tarjetas de diagnostico:
  1. Abastecimiento y alertas de inventario (critico, preventivo u optimo).
  2. Tesoreria y flujo de caja (cobro de cartera o recaudacion de contado segun el sector).
  3. Recomendacion operativa adaptativa segun el sector comercial activo.

### DTOs Consumidos
- `DashboardOverview` (de `@/modules/dashboard/dashboard.service`):
  - `salesToday`: `{ count: number; total: number; profit: number; profitMarginPercent: number; averageTicket: number }`
  - `salesThisMonth`: `{ count: number; total: number }`
  - `incomeToday`: `number`
  - `pendingCreditTotal`: `number`
  - `pendingCreditClientsCount`: `number`
  - `inventorySummary`: `{ totalProducts: number; lowStockCount: number; outOfStockCount: number; ... }`
  - `clientStats`: `{ totalClients: number; newClientsThisMonth: number }`
  - `recentSales`: `Array<RecentSale>`
  - `salesByMonth`: `Array<{ month: string; total: number; count: number }>`
  - `salesByPayment`: `Array<{ method: string; total: number; count: number }>`
  - `topProducts`: `Array<{ id: string; name: string; quantity: number; total: number }>`

## 3. Dependencias
- Modulos internos consumidos:
  - `@/modules/dashboard/dashboard.actions`: `getDashboardStats()`
  - `@/modules/dashboard/dashboard.service`: DTO `DashboardOverview`
  - `@/lib/use-business-workflow`: Hook reactivo `useBusinessWorkflow`
  - `@/lib/business-workflow`: Perfil semantico de sectores y configuracion de flujo de trabajo
  - `@/lib/format`: Funciones utilitarias `formatCurrency` y `formatNumber`
  - `@/lib/labels`: `getPaymentMethodLabel`
  - `@/components/ui/*`: Card, Button, Input, EmptyState, Table, Badge
- Paquetes externos:
  - `lucide-react`: Iconografia tecnica (TrendingUp, Wallet, Package, HandCoins, Sparkles, etc.)
  - `next/link`: Enrutamiento cliente
  - `react`: Hooks de estado y ciclo de vida (`useState`, `useEffect`)

## 4. Mapa de archivos
- `page.tsx` -> Vista principal del dashboard. Renderiza la matriz de 8 celdas A1..H1, graficos visuales, tabla de ventas recientes y controles de actualizacion.
- `business-insights.tsx` -> Copiloto diagnostico de salud operativa, cartera y recomendaciones sectoriales dinamicas.
- `charts.tsx` -> Componentes de visualizacion grafica server-rendered/SVG (PaymentDonut, SalesMonthlyBar, TopProductsBar, LowStockList).
- `README.md` -> Documentacion viva y contratos de diseno del modulo de dashboard.

## 5. Logica y flujo
1. Al montarse `DashboardPage`, se invoca asincronamente `getDashboardStats()`, que ejecuta agregaciones optimizadas en la base de datos PostgreSQL y retorna `DashboardOverview`.
2. Se evalua reactivamente la configuracion del negocio mediante `useBusinessWorkflow()`, determinando `isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales`.
3. En la matriz de celdas metricas:
   - Si `isCreditDisabled` es verdadero: Celda D1 renderiza `[D1] COBRO CONTADO` con el valor de `incomeToday` (recaudo en caja hoy) y enlace a `/sales` ("Ventas ->"), suprimiendo accesos a cartera de creditos.
   - Si `isCreditDisabled` es falso: Celda D1 renderiza `[D1] CARTERA CXC` con `pendingCreditTotal`, conteo de deudores y enlace a `/credits` ("Cobrar ->").
   - Las 7 celdas restantes (A1, B1, C1, E1, F1, G1, H1) conservan sus metricas correspondientes.
4. En `BusinessInsights`:
   - Tarjeta 2 evalua `isCreditDisabled`: si esta deshabilitado, presenta el estado `OPERACIÓN DE CONTADO` con titulo "Sin creditos habilitados", mensaje "Las ventas operan 100% de contado o comanda inmediata" y accion hacia `/sales` ("Historial de ventas ->").
   - Tarjeta 3 selecciona la recomendacion operativa correspondiente al sector activo desde `sectorTips`, incorporando la directiva de gastronomia orientada a rotacion de mesas, mermas y comandas.

## 6. Decisiones de diseno y gotchas
- Preservacion estricta de la cuadricula de 8 celdas: La prueba de regresion responsiva `layout-responsive.test.ts` exige la presencia exacta de las clases `grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8`. En lugar de eliminar la celda D1 en sectores de contado (lo que dejaria un espacio vacio en la cuadricula), se conmuta dinamicamente a `[D1] COBRO CONTADO`, manteniendo la simetria visual y el contrato estructural intactos.
- Redundancia defensiva en `BusinessInsights`: El componente acepta opcionalmente `workflow` via props para permitir ejecucion determinista en pruebas o inyeccion directa desde `page.tsx`, recurriendo al hook `useBusinessWorkflow` como fallback seguro.

## 7. Estado y ultimos cambios
- Implementacion de Milestone 2: Adaptacion dinamica de Celda D1 para alternar entre `[D1] COBRO CONTADO` y `[D1] CARTERA CXC` segun el sector y configuracion de creditos.
- Actualizacion de `BusinessInsights` con estado de operacion de contado y tip sectorial especializado para `restaurant_gastronomy`.
- Preservacion de contratos responsivos y compatibilidad con todos los sectores comerciales existentes.

## 8. Como verificar
- Ejecutar chequeo estricto de tipos:
  ```bash
  npm run typecheck
  ```
- Ejecutar pruebas de regresion responsiva y navegacion:
  ```bash
  npx vitest run src/components/layout/sidebar.test.ts src/components/layout/layout-responsive.test.ts src/components/layout/layout-responsive.adversarial.test.ts
  ```
- Ejecutar analisis de linter:
  ```bash
  npm run lint
  ```
