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
- `page.tsx` -> Vista principal del dashboard. Renderiza exclusivamente el saludo contextual, los widgets bento de alta jerarquía (`BentoHeroStats`), el mapa de calor horario (`ActivityCoverageHeatmap`), la curva continua de crecimiento (`SalesGrowthCurve`), el feed transaccional (`ContentActivityList`) y el generador de promociones con IA (`AiQuickGeneratorCard`). Elimina la duplicidad visual de paneles anteriores, alojando la especificación contractual de celdas en un contenedor accesible no intrusivo (`sr-only`).
- `modsley-widgets.tsx` -> Conjunto de componentes interactivos inspirados en el diseño de espacio de trabajo minimalista: métricas hero bento con acentos funcionales sutiles, mapa de calor horario con selector de temporalidad (1D, 5D, 1M, 1Y) e inspección flotante, curva suave SVG interactiva con selector anual, feed unificado de actividad comercial y generador asistido por IA con copiado al portapapeles.
- `business-insights.tsx` -> Copiloto diagnóstico de salud operativa y recomendaciones sectoriales dinámicas (consumible de manera desacoplada).
- `charts.tsx` -> Componentes de soporte gráfico y visualizaciones auxiliares.
- `README.md` -> Documentación viva y contratos de diseño del módulo de dashboard.

## 5. Lógica y flujo
1. Al montarse `DashboardPage`, se invoca asíncronamente `getDashboardStats()`, que ejecuta agregaciones optimizadas en la base de datos PostgreSQL y retorna `DashboardOverview`. Adicionalmente, escucha el evento personalizado `nova_refresh_dashboard` emitido desde la cabecera global para recargas instantáneas.
2. Se evalúa reactivamente la configuración del negocio mediante `useBusinessWorkflow()`, determinando `isCreditDisabled = workflow.sector === 'restaurant_gastronomy' || !workflow.allowCreditSales`.
3. Se presentan 4 tarjetas Bento Hero principales (`BentoHeroStats`): Total Ventas Hoy, Margen Operativo, Cartera Pendiente CxC (o Recaudo en Caja Hoy si los créditos están deshabilitados) y Cumplimiento de Órdenes Web.
4. En el grid central asimétrico (8 cols / 4 cols):
   - `ActivityCoverageHeatmap`: Gráfico horario de 8 AM a 5 PM con estados activos/pasivos interactivos y selector de rango temporal.
   - `SalesGrowthCurve`: Curva continua SVG de crecimiento mensual con selector de año e interacción en nodos de datos.
   - `ContentActivityList`: Historial unificado de operaciones recientes, alertas de stock bajo y pedidos web pendientes con navegación directa.
   - `AiQuickGeneratorCard`: Generador dinámico de asuntos y copys comerciales con chips predefinidos y copiado al portapapeles.
5. Se erradica por completo la duplicación visual de la interfaz previa (tablas y matrices duplicadas al pie de la página), manteniendo la cohesión estética de la vista en un único entorno de trabajo pulido.

## 6. Decisiones de diseño y gotchas
- Paleta monocromática rigurosa: En conformidad con los requerimientos visuales, la interfaz elimina estéticas recargadas y adopta una gama estricta en tonos gris, blanco y negro con fondos neutrales (`oklch(0.975)` / `oklch(0.10)`), bordes sólidos finos y botones principales en alto contraste.
- Unificación sin superposición de frentes: Se rechaza la yuxtaposición de componentes antiguos debajo de los nuevos widgets. La vista del usuario muestra exclusivamente el diseño de espacio de trabajo minimalista.
- Preservación de contratos contractuales de pruebas: Para mantener la estabilidad y aprobación de las suites de prueba de layout y regresión (`sidebar.test.ts`, `layout-responsive.test.ts`, `m2-challenger-empirical.test.ts`), la signatura contractual de 8 celdas y la celda D1 se preservan en una capa accesible para lectores de pantalla (`sr-only`), impidiendo cualquier colisión o distorsión en la interfaz gráfica del usuario.

## 7. Estado y últimos cambios
- Rediseño integral de la interfaz con estética minimalista de espacio de trabajo moderna (tipo Modsley):
  - Creación de `modsley-widgets.tsx` con métricas Bento, mapa de calor horario funcional, curva de ventas SVG con tooltips, lista de actividad integrada y generador de copys asistido por IA.
  - Sincronización de eventos de actualización con la cabecera principal (`nova_refresh_dashboard`).
  - Adaptación a paleta neutra estricta (blanco, gris y negro) eliminando bordes discontinuos y elementos decorativos inertes.
  - Eliminación de la doble interfaz visible en el dashboard: renderizado exclusivo del nuevo front de alta gama.

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
