# Modulo de Ventas y Cobranzas (Sales)

## 1. Proposito y alcance
El modulo de ventas gestiona el ciclo integral del punto de venta (POS) y la cartera de creditos en Nova ERP. Es responsable de la creacion transaccional de ventas, emision correlativa de facturas fiscales y tickets termicos, calculo de totales, descuentos, impuestos y margenes, validacion y reserva de existencias en tiempo real, registro de ingresos contables, y administracion de cobros a credito con cuotas programadas y abonos parciales concurrentes. Adicionalmente, aplica las restricciones comerciales dinamicas segun el sector configurado (`BusinessSector`), bloqueando ventas a credito en sectores de consumo inmediato como gastronomia (`restaurant_gastronomy`) o cuando la politica comercial deshabilita el credito.

## 2. Contratos y API
### Server Actions Principales
- `createSale(data: CreateSaleInput): Promise<ServerActionResult<{ success: string; sale: SaleWithItems }>>`
  - Input: `clientId`, `items: Array<{ productId: string; quantity: number; unitPrice?: number }>`, `discount`, `paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDITO'`, `initialPayment`, `initialPaymentMethod`, `dueDate`, `installments`, `stockReserved: boolean`.
  - Output: Registro de venta creado con items asociados y numero de factura generado.
  - Excepciones: `ValidationError` si `paymentMethod === 'CREDITO'` y las ventas a credito estan deshabilitadas para el sector o configuracion comercial (`!workflow.allowCreditSales || workflow.sector === 'restaurant_gastronomy'`), o si no hay existencias suficientes o el descuento supera el subtotal.
- `deleteSale(saleId: string): Promise<ServerActionResult<{ success: string }>>`
  - Elimina una venta revirtiendo stock si procede y cancelando transacciones asociadas.
- `registerPayment(data: RegisterPaymentInput): Promise<ServerActionResult<{ success: string }>>`
  - Input: `saleId: string`, `amount: number`, `paymentMethod: PaymentMethod`, `paymentDate?: string`, `notes?: string`.
  - Output: Abono asentado con actualizacion transaccional de cartera y creacion de asiento contable de ingreso.
- `getCreditSales(params: CreditQueryParams): Promise<CreditSalesResult>`
  - Consulta paginada y filtrada de cartera morosa y vigente.
- `getCreditSummary(params?: CreditSummaryParams): Promise<CreditSummaryResult>`
  - Metricas consolidadas de saldos pendientes y clientes en mora.

### DTOs y Tipos Internos
- `SaleWithItems`: Modelo `Sale` de Prisma con inclusion de relacion `items` (`SaleItem[]`).
- `CreateSaleSchema`: Validacion de esquema Zod en `@/lib/validations.ts`.
- `RegisterPaymentSchema`: Validacion de esquema Zod para abonos.

## 3. Dependencias
- Consume:
  - `@/lib/prisma`: Instancia singleton de Prisma Client para ejecucion transaccional.
  - `@/modules/auth/auth.actions`: `requireAuth()` para identificacion de usuario cajero y RBAC.
  - `@/modules/settings/settings.service`: `getBusinessWorkflowConfig()` para validar politicas de credito y sector comercial activo.
  - `@/lib/validations`: Esquemas Zod de entrada.
  - `@/lib/errors`: Mapeo estandarizado de excepciones (`ValidationError`, `NotFoundError`, `parseError`).
  - `@/lib/revalidation`: Invalidacion de rutas (`revalidateSalePaths`).
- Proveedor de:
  - Consumido por `web-orders.actions.ts` via `createSale` para conversion de pedidos web a ventas POS.
  - Consumido por rutas de impresion PDF (`/api/sales/[id]/pdf`, `/api/sales/[id]/credit-statement/pdf`, `/api/sales/[id]/receipt/...`).

## 4. Mapa de archivos
- `src/modules/sales/sales.actions.ts`: Server Actions para registro de ventas, validacion de precios de costo, restriccion de ventas a credito por sector, numeracion correlativa e integracion de stock.
- `src/modules/sales/payments.actions.ts`: Server Actions para abonos a credito, consultas de cartera y control de saldos con row locking.
- `src/modules/sales/sales.helpers.ts`: Funciones auxiliares puras para resolucion de categorias de ingreso contable y validacion de precios de venta.
- `src/modules/sales/sales.helpers.test.ts`: Pruebas unitarias de cobertura para calculos de ayuda y resolucion de precios.
- `src/modules/sales/sales-credit-restriction.test.ts`: Pruebas unitarias de blindaje para rechazo estricto de credito en gastronomia y configuraciones restrictivas.
- `src/modules/sales/sales-m3-adversarial-empirical.test.ts`: Pruebas adversariales empiricas del Milestone 3 verificando rechazo en todos los sectores, precision de propina, casos borde de totales, y paridad de comprobantes.
- `src/modules/sales/payments.actions.test.ts`: Pruebas unitarias de concurrencia y validaciones de abonos.
- `src/modules/sales/payments.concurrency.test.ts`: Pruebas de stress y serializacion concurrente de abonos.
- `src/modules/sales/system-settings.concurrency.test.ts`: Pruebas de generacion correlativa atomica de consecutivos de factura.

## 5. Logica y flujo
1. Validacion de sesion (`requireAuth`) y esquemas (`CreateSaleSchema`).
2. Consulta de configuracion de flujo de negocio mediante `getBusinessWorkflowConfig()`. Si `paymentMethod === 'CREDITO'` y `(!workflow.allowCreditSales || workflow.sector === 'restaurant_gastronomy')`, se arroja `ValidationError` de inmediato, evitando transacciones de base de datos no permitidas.
3. Adquisicion atomica de correlativo de factura mediante `UPDATE system_settings SET "nextInvoiceNumber" = "nextInvoiceNumber" + 1 ... RETURNING ("nextInvoiceNumber" - 1)::integer AS num`.
4. Verificacion de stock de cada producto. Si `stockReserved === false`, se ejecuta decremento atomico mediante `updateMany` condicional (`stock: { gte: quantity }`).
5. Insercion de registro `Sale`, snapshots `Invoice`, items `SaleItem` y movimiento `StockMovement` de tipo `SALE`.
6. Si la venta es a credito, insercion de cuotas en `CreditInstallment` y abono inicial (si aplica). En venta de contado, insercion directa de `Transaction` contable tipo `INCOME`.
7. En `registerPayment`, adquisicion de lock exclusivo `SELECT id FROM sales WHERE id = $1 FOR UPDATE` antes de verificar saldo adeudado, previniendo sobrepagos en concurrencia.

## 6. Decisiones de diseno y gotchas
- Blindaje de servidor para credito: Aunque el frontend en `/sales/new` oculta la opcion de credito cuando `allowCreditSales` es falso o el sector es gastronomia, la Server Action `createSale` valida la politica a nivel de servidor contra `getBusinessWorkflowConfig()`. Esto previene omisiones por peticiones manipuladas, scripts externos o componentes desincronizados.
- Numeracion sin bloqueo de tabla: Anteriormente se realizaba `SELECT id FROM system_settings WHERE id = ... FOR UPDATE` al inicio de la transaccion, reteniendo un bloqueo exclusivo sobre la unica fila de configuracion del ERP durante toda la duracion de la venta (incluyendo roundtrips de red con Neon). Se elimino dicho bloqueo global utilizando incremento atomico directo en PostgreSQL.
- Flag `stockReserved`: Los pedidos de la tienda online en estado `CONFIRMED` ya descuentan existencias bajo el movimiento `RESERVATION`. Al convertirse a venta POS, `createSale` recibe `stockReserved: true` para no descontar el inventario dos veces ni registrar doble salida.
- Precios minimos: No se permite registrar ningun item donde `unitPrice < product.costPrice`.

## 7. Estado y ultimos cambios
- Blindaje de credito en servidor (Milestone 3): Integracion de `getBusinessWorkflowConfig` en `createSale` para rechazar operaciones a credito en el sector `restaurant_gastronomy` y en perfiles con `allowCreditSales: false`.
- Pruebas unitarias y adversariales automatizadas: Creacion de `sales-credit-restriction.test.ts` y `sales-m3-adversarial-empirical.test.ts` cubriendo combinaciones de sectores, metodos de pago al contado, tarjeta, transferencia, conversion sin duplicacion de reserva de inventario, calculo de propinas y generacion de PDF.

## 8. Como verificar
- Ejecutar pruebas unitarias del modulo de ventas:
  ```bash
  npx vitest run src/modules/sales/
  ```
- Comprobar tipado estatico:
  ```bash
  npm run typecheck
  ```
- Comprobar reglas de linter:
  ```bash
  npm run lint
  ```
