# Modulo de Panel de Control y Analitica (Dashboard)

## 1. Proposito y alcance
El modulo de dashboard consolida las metricas clave de rendimiento financiero, comercial, operativo y de inventario de Nova ERP. Es responsable de proporcionar al personal administrativo una vision sintetica e inmediata del estado del negocio en tiempo real al ingresar al sistema, incluyendo ventas del dia, ingresos reales en caja, proyeccion del mes, margen bruto de ganancia, cartera pendiente a credito, pedidos web por atender, alertas de productos agotados o criticos, y tendencias comparativas semestrales.

## 2. Contratos y API
### Interfaz DTO Principal (`DashboardOverview`)
```ts
export interface DashboardOverview {
  salesToday: {
    count: number
    total: number
    profit: number
    averageTicket: number
    profitMarginPercent: number
  }
  salesThisMonth: {
    count: number
    total: number
  }
  incomeToday: number
  pendingCreditTotal: number
  pendingCreditClientsCount: number
  webOrdersSummary: {
    pendingCount: number
    pendingOrdersTotal: number
    pendingOrders: Array<{
      id: string
      reference: string | null
      customerName: string
      customerPhone: string
      total: number
      createdAt: Date
    }>
  }
  inventorySummary: {
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    lowStockProducts: Array<{
      id: string
      name: string
      stock: number
      lowStockThreshold: number
      salePrice: number
    }>
  }
  clientStats: {
    totalClients: number
    newClientsThisMonth: number
  }
  recentSales: Array<{
    id: string
    invoiceNumber: string
    total: number
    paymentMethod: string
    saleDate: Date
    client: { id: string; name: string } | null
  }>
  salesByPayment: Array<{
    paymentMethod: string
    _count: { id: number }
    _sum: { total: number | null }
  }>
  salesByMonth: Array<{
    month: string
    total: number
    count: number
  }>
  topProducts: Array<{
    productId: string
    quantity: number
    total: number
    name: string
  }>
}
```

### Funciones Publicas
- `getDashboardOverview(): Promise<DashboardOverview>` (`dashboard.actions.ts`): Server Action protegida con `requireAuth()`.
- `getDashboardOverviewService(): Promise<DashboardOverview>` (`dashboard.service.ts`): Servicio de negocio que ejecuta las consultas consolidadas contra PostgreSQL.

## 3. Dependencias
- Consume:
  - `@/lib/prisma`: Instancia de Prisma Client para consultas agregadas y sentencias `$queryRaw`.
  - `@/modules/auth/auth.actions`: `requireAuth()` para verificar la sesion del usuario antes de retornar metricas financieras.
- Proveedor de:
  - Consumido por el Server Component principal `/dashboard/page.tsx` para renderizar tarjetas de estadisticas, graficos y tablas resumen.

## 4. Mapa de archivos
- `src/modules/dashboard/dashboard.actions.ts`: Capa de Server Action con directiva `'use server'` que delega al servicio y valida autenticacion.
- `src/modules/dashboard/dashboard.service.ts`: Capa de logica de negocio y agregacion SQL optimizada.

## 5. Logica y flujo
1. La Server Action `getDashboardOverview` valida la sesion mediante `requireAuth()`.
2. Se invocan en paralelo dentro de un `Promise.all` 18 consultas relacionales optimizadas:
   - Ventas e ingresos de caja de hoy y del mes mediante `prisma.sale.aggregate` y `prisma.payment.aggregate`.
   - Ganancia real y margen de hoy mediante agregacion SQL (`SUM(si.total - cost * qty)` sobre items vendidos).
   - Cartera a credito pendiente mediante `LEFT JOIN` agrupado entre `sales` y `payments` directamente en PostgreSQL.
   - Conteo de productos criticos y agotados mediante subconsultas SQL indexadas.
   - Tendencia semestral agrupada por mes en PostgreSQL via `date_trunc('month', "saleDate")`.
   - Top productos mas vendidos de los ultimos 30 dias con `JOIN` a catalogo en una sola consulta.
3. Se normaliza la respuesta mapeando exactamente los tipos del DTO `DashboardOverview`.

## 6. Decisiones de diseno y gotchas
- Erradicacion de agregaciones en memoria: La version inicial del servicio descargaba todas las ventas a credito historicas de la empresa y todos sus abonos hacia el heap de Node.js para calcular la cartera pendiente con bucles `reduce()`. De igual forma, descargaba 6 meses completos de ventas para agruparlas por mes en JavaScript, e invocaba `getClientStats()` cargando listas completas de clientes. Esto provocaba picos de memoria, saturacion del pooler de Neon y lentitud en el dashboard. Se migraron todos los calculos pesados al motor de base de datos relacional via SQL nativo (`SUM`, `date_trunc`, `COUNT`).
- Mantenimiento estricto del contrato DTO: El frontend consume la estructura `DashboardOverview` sin saber si los datos fueron calculados en JavaScript o en PostgreSQL. La optimizacion preserva la forma exacta del objeto, nombres de claves y tipos.

## 7. Estado y ultimos cambios
- Optimizacion de consultas SQL: Reemplazo de descargas masivas de ventas y clientes por agregaciones en motor relacional.
- Eliminacion de llamada secuencial externa a `getClientStats()` y resolucion integrada de nombres de top productos.
- Verificacion de aprobacion completa en pruebas unitarias y comprobacion estricta de tipos.

## 8. Como verificar
- Comprobar compilacion y tipos estaticos:
  ```bash
  npm run typecheck
  ```
- Validar analisis estatico de codigo:
  ```bash
  npm run lint
  ```
- Ejecutar la suite completa de pruebas:
  ```bash
  npm test
  ```
