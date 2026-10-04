# Nova ERP — Arquitectura de Base de Datos y Modelado

## 1. Conexión a Neon PostgreSQL

La base de datos reside en Neon PostgreSQL utilizando dos URLs en `.env.local`:

- `DATABASE_URL`: Endpoint con conexión pooler (`pgcat` / `pgbouncer`) con parámetro `sslmode=require`. Se utiliza para las consultas regulares en runtime de Next.js.
- `DIRECT_URL`: Endpoint de conexión directa para ejecutar migraciones DDL (`prisma migrate`).

El cliente Prisma está centralizado como un singleton en `src/lib/prisma.ts` para evitar la saturación de conexiones en entornos serverless y en recargas en caliente de desarrollo.

---

## 2. Modelos Clave del Sistema

### Catálogo e Inventario
- `Product`: Entidad central de mercancía.
  - `stock`: **Única fuente de verdad de inventario**.
  - `unitPrice` / `purchasePrice`: Regla inquebrantable `unitPrice >= purchasePrice`.
  - `slug`: Identificador único para el storefront web.
  - `webVisible`, `webFeatured`, `webSortOrder`: Control omnicanal.
  - `deletedAt`: Borrado lógico (Soft delete).
- `StockMovement`: Kardex inmutable de inventario.
  - Tipos: `IN`, `OUT`, `ADJUSTMENT`, `RESERVATION` (por pedido web confirmado), `RELEASE` (liberación de reserva).

### Ventas y Cartera
- `Sale`: Registro de venta POS.
  - Métodos de pago: `CASH`, `NEQUI`, `DAVIPLATA`, `CARD`, `TRANSFER`, `CREDIT`.
  - Estados: `PAID`, `PENDING_CREDIT`, `CANCELLED`.
  - Conexión con `Client` e ítems vendidos (`SaleItem`).
- `CreditPayment`: Registro de abonos parciales a cartera con cálculo de saldo pendiente.

### Omnicanalidad y Storefront Web
- `WebOrder` / `WebOrderItem`: Pedidos originados en la tienda online.
  - Referencia amigable: `reference` (ej: `ORD-0042`).
  - Estados: `PENDING` ➔ `CONFIRMED` ➔ `CONVERTED` o `CANCELLED`.
- `ProductMedia`: Galería multimedia (imágenes públicas del producto).
- `ProductReview`: Reseñas de clientes con moderación (`isApproved`).
- `ContactMessage`: Mensajes recibidos del formulario de contacto.

### Configuración del Sistema
- `SystemSettings`: Configuración global (nombre de empresa, logo, moneda, consecutivos, resolución DIAN).
- `WorkflowConfig` (o `business-workflow.ts`): Ajustes por sector comercial (márgenes sugeridos, políticas de cambio, prefijos).

---

## 3. Comandos de Base de Datos

```bash
npm run db:migrate         # Crea una nueva migración a partir de schema.prisma
npm run db:migrate:deploy  # Aplica migraciones pendientes en producción
npm run db:push            # Sincroniza esquema directamente (solo dev)
npm run db:studio          # Abre Prisma Studio visual en navegador
npm run db:seed            # Carga datos iniciales de prueba
```
