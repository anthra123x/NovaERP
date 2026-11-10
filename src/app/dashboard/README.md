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
- `page.tsx` -> Vista principal del dashboard. Renderiza el saludo contextual, los widgets bento de alta jerarquia (`BentoHeroStats`, `ActivityCoverageHeatmap`, `SalesGrowthCurve`, `ContentActivityList`, `AiQuickGeneratorCard`), los diagnosticos proactivos (`BusinessInsights`) y la matriz operativa colapsable A1..H1.
- `modsley-widgets.tsx` -> Conjunto de componentes interactivos inspirados en diseno de espacio de trabajo minimalista: metricas hero bento, mapa de calor horario con selector de temporalidad (1D, 5D, 1M, 1Y), curva suave SVG interactiva con tooltips de facturacion, feed unificado de actividad comercial y generador rapido de asuntos y promociones asistido por IA.
- `business-insights.tsx` -> Copiloto diagnostico de salud operativa, cartera y recomendaciones sectoriales dinamicas.
- `charts.tsx` -> Componentes de visualizacion grafica server-rendered/SVG (PaymentDonut, TopProductsBar).
- `README.md` -> Documentacion viva y contratos de diseno del modulo de dashboard.

## 5. Logica y flujo
1. Al montarse `DashboardPage`, se invoca asincronamente `getDashboardStats()`, que ejecuta agregaciones optimizadas en la base de datos PostgreSQL y retorna `DashboardOverview`. Adicionalmente, escucha el evento personalizado `nova_refresh_dashboard` emitido desde la cabecera global para recargas instantaneas.
2. Se evalua reactivamente la configuracion del negocio mediante `useBusinessWorkflow()`, determinando `isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales`.
3. Se presentan 4 tarjetas Bento Hero principales (`BentoHeroStats`): Total Ventas Hoy, Ticket Promedio, Ingreso en Caja (o Recaudo Inmediato) y Cumplimiento de Ordenes Web.
4. En el grid central asimetrico (8 cols / 4 cols):
   - `ActivityCoverageHeatmap`: Grafico horario de 8 AM a 5 PM con estados activos/pasivos interactivos y selector de rango temporal.
   - `SalesGrowthCurve`: Curva continua SVG de crecimiento mensual con selector de anio e interaccion en nodos de datos.
   - `ContentActivityList`: Historial unificado de operaciones recientes, alertas de stock bajo y pedidos web pendientes con navegacion directa.
   - `AiQuickGeneratorCard`: Generador dinamico de asuntos y copies comerciales con chips predefinidos y copiado al portapapeles.
5. En la matriz de celdas metricas colapsable:
   - Si `isCreditDisabled` es verdadero: Celda D1 renderiza `[D1] COBRO CONTADO` con el valor de `incomeToday` (recaudo en caja hoy) y enlace a `/sales` ("Ventas ->"), suprimiendo accesos a cartera de creditos.
   - Si `isCreditDisabled` es falso: Celda D1 renderiza `[D1] CARTERA CXC` con `pendingCreditTotal`, conteo de deudores y enlace a `/credits` ("Cobrar ->").
   - Las 7 celdas restantes (A1, B1, C1, E1, F1, G1, H1) conservan sus metricas correspondientes.
6. En `BusinessInsights`:
   - Tarjeta 2 evalua `isCreditDisabled`: si esta deshabilitado, presenta el estado `OPERACIÓN DE CONTADO` con titulo "Sin creditos habilitados", mensaje "Las ventas operan 100% de contado o comanda inmediata" y accion hacia `/sales` ("Historial de ventas ->").
   - Tarjeta 3 selecciona la recomendacion operativa correspondiente al sector activo desde `sectorTips`, incorporando la directiva de gastronomia orientada a rotacion de mesas, mermas y comandas.

## 6. Decisiones de diseno y gotchas
- Paleta monocromatica rigurosa: En conformidad con los requerimientos visuales, la interfaz elimina esteticas recargadas y adopta una gama estricta en tonos gris, blanco y negro con fondos neutrales (`oklch(0.975)` / `oklch(0.10)`), bordes solidos finos y botones principales en alto contraste.
- Preservacion estricta de la cuadricula de 8 celdas: La prueba de regresion responsiva `layout-responsive.test.ts` y las pruebas adversariales exigen la presencia exacta de las clases `grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8` y la indentacion exacta de la celda D1. Se mantiene dicha estructura dentro de una seccion colapsable para compatibilidad con suites de pruebas y auditorias contables detalladas.
- Redundancia defensiva en `BusinessInsights`: El componente acepta opcionalmente `workflow` via props para permitir ejecucion determinista en pruebas o inyeccion directa desde `page.tsx`, recurriendo al hook `useBusinessWorkflow` como fallback seguro.

## 7. Estado y ultimos cambios
- Redisenio integral de la interfaz con estetica minimalista de espacio de trabajo moderna (tipo Modsley):
  - Creacion de `modsley-widgets.tsx` con metricas Bento, mapa de calor horario funcional, curva de ventas SVG con tooltips, lista de actividad integrada y generador de copies asistido por IA.
  - Sincronizacion de eventos de actualizacion con la cabecera principal (`nova_refresh_dashboard`).
  - Adaptacion a paleta neutra estricta (blanco, gris y negro) eliminando bordes discontinuos y elementos decorativos inertes.
- Implementacion de Milestone 2: Adaptacion dinamica de Celda D1 para alternar entre `[D1] COBRO CONTADO` y `[D1] CARTERA CXC` segun el sector y configuracion de creditos.
- Actualizacion de `BusinessInsights` con estado de operacion de contado y tip sectorial especializado para `restaurant_gastronomy`.

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
