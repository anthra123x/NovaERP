# Nova ERP — Ciclo de Vida de Pedidos Web y Efectos en Stock

## 1. Principio Fundamental de Existencias

> **`Product.stock` es la única fuente de verdad.**
> El storefront web **NUNCA** descuenta stock directamente ni escribe existencias en la base de datos.

---

## 2. Flujo de Estados del Pedido Web

```
  [ Cliente en Storefront ]
             │
             ▼ POST /api/web/orders
        ┌─────────┐
        │ PENDING │  --> El pedido se crea con referencia ORD-XXXX.
        └────┬────┘      NO reserva stock en este paso.
             │
             │ Admin confirma el pedido en /web/orders
             ▼
       ┌───────────┐
       │ CONFIRMED │ --> Reserva stock de forma atómica:
       └─────┬─────┘     - Descuenta `Product.stock`
             │           - Registra movimiento `RESERVATION`
             │
       ┌─────┴────────────────┐
       ▼                      ▼
┌───────────┐          ┌───────────┐
│ CONVERTED │          │ CANCELLED │
└───────────┘          └───────────┘
   │                      │
   │ Se convierte a       │ Se cancela el pedido:
   │ Venta POS sin        │ - Restaura `Product.stock`
   │ doble descuento      │ - Registra movimiento `RELEASE`
   │ (`stockReserved`)    │
```

---

## 3. Matriz de Transiciones Permitidas

Las transiciones válidas están controladas por `ALLOWED_TRANSITIONS`:

| Estado Actual | Estados Siguientes Permitidos | Efecto en Inventario |
|---------------|-------------------------------|----------------------|
| `PENDING`     | `CONFIRMED`, `CANCELLED`      | Si pasa a `CONFIRMED`: Descuenta stock con movimiento `RESERVATION`. Si se cancela: Sin efecto. |
| `CONFIRMED`   | `CONVERTED`, `CANCELLED`      | Si pasa a `CONVERTED`: Se crea la venta POS con bandera `stockReserved: true` para evitar doble cobro de stock. Si pasa a `CANCELLED`: Se devuelve el stock con movimiento `RELEASE`. |
| `CONVERTED`   | Ninguno (Estado final)       | Venta POS completada con factura generada. |
| `CANCELLED`   | Ninguno (Estado final)       | El pedido queda cerrado de forma permanente. |

---

## 4. Referencias Legibles (`ORD-XXXX`)

Cada pedido recibe un código correlativo legible para clientes y personal de caja:
- Se genera automáticamente desde `SystemSettings.nextWebOrderNumber`.
- Formato: `ORD-` seguido de 4 dígitos secuenciales (`ORD-0001`, `ORD-0002`).
- Viaja en la respuesta del endpoint público `POST /api/web/orders` para seguimiento directo por WhatsApp o confirmación en pantalla.
