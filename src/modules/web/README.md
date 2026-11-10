# Modulo Web y Storefront (Web)

## 1. Proposito y alcance
El modulo web administra la capa de comercio electronico y storefront headless de Nova ERP. Se encarga de la exposicion publica del catalogo de productos para clientes finales, gestion de precios y disponibilidad web, administracion de pedidos online (`WebOrder`), moderacion de resenas (`ProductReview`), recepcion de mensajes de contacto (`ContactMessage`), configuracion de marca y canales de comunicacion (WhatsApp, correo), y conversion transaccional de pedidos web a ventas definitivas en el punto de venta.

## 2. Contratos y API
### Servicios Publicos y de Negocio (`web.service.ts`)
- `getCatalogProducts(params: CatalogQueryParams): Promise<CatalogProductsResult>`
  - Catalogo paginado con rating promedio y fotos para el storefront.
- `getCatalogProductByHandle(handle: string): Promise<WebProductDetail | null>`
  - Detalle de producto por slug web con galeria multimedia.
- `createWebOrder(input: CreateWebOrderInput): Promise<WebOrder>`
  - Creacion publica de pedido web con verificacion de stock, recalculado seguro de precios en servidor y asignacion de referencia correlativa `ORD-XXXX`.
- `getProductReviews(productId: string): Promise<ProductReview[]>`
  - Lectura publica de calificaciones aprobadas.
- `createProductReview(data: CreateProductReviewInput): Promise<ProductReview>`
  - Registro de nueva calificacion con soporte de honeypot anti-spam.
- `cancelExpiredWebOrders(): Promise<{ count: number }>`
  - Limpieza de pedidos en estado `PENDING` que exceden la ventana de caducidad configurada.

### Server Actions Administrativas
- `confirmWebOrder(id: string): Promise<ServerActionResult>`
  - Transicion de `PENDING` a `CONFIRMED`: reserva fisica de existencias con movimiento `RESERVATION`.
- `convertWebOrderToSale(id: string): Promise<ServerActionResult<{ saleId: string }>>`
  - Transicion atomica a `CONVERTED`: lock exclusivo `FOR UPDATE` sobre `web_orders`, creacion de venta POS mediante `createSale` y marcado final del pedido.
- `cancelWebOrder(id: string): Promise<ServerActionResult>`
  - Transicion a `CANCELLED`: liberacion de stock con movimiento `RELEASE` si el pedido estaba `CONFIRMED`.

## 3. Dependencias
- Consume:
  - `@/lib/prisma`: Conexion a PostgreSQL para consultas y transacciones.
  - `@/modules/auth/auth.actions`: `requireAuth()` para acciones administrativas.
  - `@/modules/sales/sales.actions`: `createSale` para conversion de pedidos a ventas.
  - `@/lib/validations`: Esquemas Zod de entrada publica y administrativa.
  - `@/lib/revalidation`: Invalidacion de tags y rutas en Next.js.
- Proveedor de:
  - Rutas de API publicas en `src/app/api/web/*` (`products`, `categories`, `search`, `orders`, `reviews`, `settings`, `contact`).
  - Panel administrativo en `src/app/web/*`.

## 4. Mapa de archivos
- `src/modules/web/web.service.ts`: Logica de negocio central para storefront, calculo de pedidos, ajustes y expiracion.
- `src/modules/web/web.service.test.ts`: Pruebas de integracion del servicio web (catalogo, ordenes, expiracion).
- `src/modules/web/web.actions.ts`: Barrel de exportacion de Server Actions administrativas.
- `src/modules/web/web.actions.test.ts`: Pruebas de transiciones de pedidos (`confirm`, `cancel`, `convert`).
- `src/modules/web/web-orders.actions.ts`: Server Actions para administracion de pedidos y ciclo de vida de conversion.
- `src/modules/web/web-products.actions.ts`: CRUD administrativo de productos web, visibilidad y orden de presentacion.
- `src/modules/web/web-content.actions.ts`: Moderacion de resenas y gestion de mensajes de contacto.
- `src/modules/web/web-overview.service.ts` y `web-overview.actions.ts`: Metricas de resumen del modulo web.
- `src/modules/web/web.helpers.ts`: Transformaciones y normalizaciones de DTOs web.
- `src/modules/web/web.types.ts`: Tipos TypeScript y contratos del storefront.

## 5. Logica y flujo
1. Storefront consulta catalogo via `GET /api/web/products` (con cache CDN `s-maxage=60`).
2. Cliente emite pedido via `POST /api/web/orders`. El servicio recalcula precios desde la base de datos (previene manipulacion de precios en cliente), valida stock disponible sin descontar, adquiere correlativo `ORD-XXXX` mediante incremento atomico en `system_settings` e inserta el pedido en estado `PENDING`.
3. Administrador revisa el pedido en `/web/orders` y ejecuta `confirmWebOrder`: el pedido pasa a `CONFIRMED` y descuenta `Product.stock` con registro de movimiento `RESERVATION`.
4. Al entregar o cobrar en caja, el operador ejecuta `convertWebOrderToSale`: dentro de una transaccion interactiva se adquiere lock `FOR UPDATE` sobre la fila del pedido en `web_orders` para validar que su estado sea apto, se invoca `createSale` con `stockReserved: true`, y se actualiza el estado a `CONVERTED` vinculando `convertedSaleId`.
5. Si un pedido `CONFIRMED` es cancelado, `cancelWebOrder` incrementa el inventario y asienta movimientos `RELEASE`.

## 6. Decisiones de diseno y gotchas
- Atomicidad en conversion: La conversion de pedidos web a ventas ejecutaba consultas de lectura fuera de transaccion antes de invocar `createSale`. Dos peticiones concurrentes podian leer el pedido en estado pendiente y emitir dos facturas independientes. Se implemento bloqueo pesimista `SELECT id, status FROM web_orders WHERE id = $1 FOR UPDATE` dentro de `prisma.$transaction`.
- Numeracion no bloqueante: La generacion de la referencia `ORD-XXXX` en `createWebOrder` ejecutaba un bloqueo `FOR UPDATE` sobre la tabla `system_settings`, serializando compras en el storefront con la operacion del punto de venta fisico. Se reemplazo por `UPDATE system_settings SET "nextWebOrderNumber" = "nextWebOrderNumber" + 1 ... RETURNING ("nextWebOrderNumber" - 1)::integer AS num`.
- Invariante de existencias: El storefront jamas modifica directamente existencias de productos. El stock solo se modifica en transiciones explicitas del ERP (`confirm`, `cancel`, `convert`).

## 7. Estado y ultimos cambios
- Eliminacion del row lock exclusivo en `system_settings` durante la creacion de pedidos web.
- Envoltura transaccional estricta con verificacion de estado y row lock en `convertWebOrderToSale` para impedir duplicacion de ventas POS en concurrencia.
- Actualizacion de pruebas unitarias en `web.service.test.ts` y `web.actions.test.ts` adaptandolas al nuevo comportamiento concurrente.

## 8. Como verificar
- Ejecutar pruebas unitarias de acciones y servicios:
  ```bash
  npx vitest run src/modules/web/web.service.test.ts src/modules/web/web.actions.test.ts
  ```
- Comprobar tipado estatico:
  ```bash
  npm run typecheck
  ```
- Comprobar reglas de linter:
  ```bash
  npm run lint
  ```
