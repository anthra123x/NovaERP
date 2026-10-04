# Nova ERP — Asistente Inteligente Multi-Agente (`/assistant`)

## 1. Visión del Asistente

El módulo de Inteligencia Artificial (`src/modules/ai/`) provee un copiloto operativo capaz de responder consultas directas del administrador del negocio (ventas, pedidos, stock, cartera y flujo de caja) analizando en tiempo real la situación operativa del negocio.

---

## 2. Inyección de Contexto Dinámico (Snapshot)

Al iniciar cada turno conversacional, el sistema calcula un snapshot ligero y en memoria:
- **Ventas del día**: Total cobrado, número de tickets y ticket promedio.
- **Inventario crítico**: Cantidad de referencias en o por debajo de su umbral mínimo (`lowStockThreshold`).
- **Pedidos web pendientes**: Nuevas órdenes por confirmar.
- **Cartera por cobrar**: Saldo pendiente total de créditos otorgados.
- **Balance financiero**: Ingresos vs. gastos del mes en curso.

Este snapshot se inyecta en el `system prompt` para que el asistente pueda responder de inmediato preguntas frecuentes como: *"¿Cómo van las ventas de hoy?"* o *"¿Qué productos necesito reponer?"* sin necesidad de consultar herramientas en la primera interacción.

---

## 3. Rotación Multi-Proveedor y Alta Disponibilidad

El sistema soporta múltiples proveedores configurados en la variable `AI_PROVIDER_KEYS`:

```json
[
  { "provider": "openai", "key": "sk-...", "model": "gpt-4o-mini" },
  { "provider": "anthropic", "key": "sk-ant-...", "model": "claude-3-5-haiku-20241022" },
  { "provider": "google", "key": "AIza...", "model": "gemini-1.5-flash" }
]
```

### Algoritmo de Rotación (`ai.rotation.ts`)
1. El sistema intenta procesar el mensaje con el primer agente activo.
2. Si un proveedor devuelve `429 Too Many Requests`, `insufficient_quota` o timeout, entra en un periodo de enfriamiento (`cooldown`) en memoria y se conmuta automáticamente al siguiente proveedor disponible.
3. Si todos los proveedores externos fallan o la variable `AI_PROVIDER_KEYS` no está configurada, el sistema cae de manera transparente al **Modo Mock Inteligente**.

---

## 4. Modo Mock Inteligente (Offline/Demostración)

En ausencia de credenciales de API externas, el asistente continúa operativo procesando directamente las consultas mediante herramientas SQL en memoria, devolviendo métricas reales de la base de datos con una nota de cortesía.

---

## 5. Herramientas Read-Only (`ai.tools.ts`)

Por diseño de seguridad defensiva, las herramientas del asistente son estrictamente de **solo lectura**:
- `sales_summary`: Resumen de ventas por período.
- `inventory_status`: Detección de agotados y bajo stock.
- `web_orders_status`: Consulta de pedidos pendientes y confirmados.
- `recent_sales`: Últimas facturas emitidas.
- `client_summary`: Estado de cuenta de clientes.
- `pending_credit`: Saldo de cartera acumulado.
- `finance_summary`: Balance neto de caja.

> **Regla de oro**: El asistente nunca ejecuta escrituras, inserciones ni eliminaciones en la base de datos.
