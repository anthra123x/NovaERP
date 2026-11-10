# Modulo de Asistente Inteligente de Negocio (AI)

## 1. Proposito y alcance
El modulo de inteligencia artificial provee un asistente conversacional avanzado integrado a Nova ERP. Es responsable de capturar un snapshot en vivo del estado del negocio (ventas, existencias, pedidos web, cartera morosa), inyectarlo en el contexto del sistema mediante un prompt dinamico y sectorial, coordinar peticiones multi-agente con rotacion automatica ante fallos de cuota (OpenAI, Anthropic, Google Gemini), ejecutar herramientas seguras de consulta de datos de negocio exclusivamente en modo lectura (`read-only`), y ofrecer un modo de contingencia local (`ai.mock.ts`) cuando no hay proveedores externos configurados o disponibles.

## 2. Contratos y API
### Server Actions Principales (`ai.actions.ts`)
- `askAssistant(input: AskAssistantInput): Promise<ServerActionResult<AssistantTurnResult>>`
  - Ejecuta un turno conversacional del asistente, verificando autenticacion y retornando respuesta textual, herramientas ejecutadas y proveedor utilizado.
- `getBusinessSnapshot(): Promise<ServerActionResult<BusinessSnapshot>>`
  - Genera y devuelve el snapshot estructurado del negocio para diagnósticos o integraciones.

### Tipos y Estructuras de Contexto (`ai.context.ts`, `ai.types.ts`)
- `BusinessSnapshot`: Informacion viva de ventas de hoy/mes, cartera a credito, inventario critico, resumen de pedidos web y clientes.
- `AssistantAgent`: Configuracion del proveedor (`openai`, `anthropic`, `google`), modelo y credenciales.
- `AssistantTurnResult`: Resultado del turno conversacional con modo (`ai` o `mock`), texto de respuesta y herramientas invocadas.

## 3. Dependencias
- Consume:
  - `@/lib/prisma`: Consultas relacionales agregadas para snapshot y herramientas.
  - `@/modules/auth/auth.actions`: `requireAuth()` para proteger el acceso al asistente.
  - `@/lib/business-workflow`: Perfiles y etiquetas por sector comercial.
  - `@/lib/finance`, `@/lib/format`: Normalizacion de moneda y fechas.
- Proveedor de:
  - Consumido por la interfaz de usuario del asistente en `src/app/assistant/page.tsx` y `src/components/assistant/assistant-chat.tsx`.

## 4. Mapa de archivos
- `src/modules/ai/ai.actions.ts`: Server Actions expuestas con directiva `'use server'`.
- `src/modules/ai/ai.service.ts`: Orquestacion del turno conversacional, resolucion de proveedores y llamadas a herramientas.
- `src/modules/ai/ai.service.test.ts`: Pruebas de integracion del servicio conversacional.
- `src/modules/ai/ai.context.ts`: Construccion del snapshot de negocio y renderizado del system prompt contextualizado.
- `src/modules/ai/ai.tools.ts`: Herramientas de consulta de base de datos de solo lectura (`sales_summary`, `inventory_status`, `web_orders_status`, etc.).
- `src/modules/ai/ai.tools.test.ts`: Pruebas de ejecucion y formateo de herramientas de analitica.
- `src/modules/ai/ai.rotation.ts`: Gestion de enfriamiento (cooldown) y rotacion automatica de agentes ante respuestas HTTP 429.
- `src/modules/ai/ai.rotation.test.ts`: Pruebas del algoritmo de rotacion de cuota.
- `src/modules/ai/ai.providers.ts`: Clientes HTTP directos para las APIs de OpenAI, Anthropic y Google Gemini.
- `src/modules/ai/ai.mock.ts`: Generador determinista de respuestas simuladas con datos reales de herramientas para desarrollo y contingencia.
- `src/modules/ai/ai.mock.test.ts`: Pruebas del motor de contingencia mock.
- `src/modules/ai/ai.config.ts`: Parseo de la variable de entorno `AI_PROVIDER_KEYS`.
- `src/modules/ai/ai.config.test.ts`: Pruebas de validacion de configuracion de proveedores.
- `src/modules/ai/ai.types.ts`: Definicion de tipos TypeScript para turnos, mensajes y herramientas.

## 5. Logica y flujo
1. El usuario envia un mensaje en `/assistant`.
2. Se ejecuta `collectBusinessData()`: Se recopilan de forma concurrente mediante agregaciones SQL compactas las ventas del dia/mes, cartera pendiente, stock critico (top 10), distribucion de pedidos web y nuevos clientes.
3. Se ensambla el `systemPrompt` combinando el perfil de sector economico y el snapshot de negocio.
4. Si `AI_PROVIDER_KEYS` esta configurado y hay agentes disponibles fuera de cooldown, se invoca al modelo LLM.
5. Si el modelo devuelve una invocacion a herramienta (`{"tool": "...", "args": {...}}`), se ejecuta la herramienta en `ai.tools.ts` y se envia el resultado en un segundo turno para respuesta sintetizada.
6. Si todos los agentes fallan por cuota (429) o no hay claves, se conmuta al modo `ai.mock.ts`, respondiendo con precision numerica basada en datos reales de la base de datos.

## 6. Decisiones de diseno y gotchas
- Optimizacion del Snapshot: Anteriormente `collectBusinessData()` se ejecutaba en cada mensaje descargando el catalogo completo de productos a memoria (`findMany`), todas las ventas a credito historicas y todos los pedidos web para contarlos en un bucle JavaScript. Se reemplazo por consultas `COUNT`, `SUM` y subconsultas SQL con limites explicitos (`LIMIT 10`), reduciendo drásticamente la latencia y el consumo de RAM.
- Aislamiento Read-Only: Las herramientas del asistente jamas alteran el estado de la base de datos (`INSERT`, `UPDATE`, `DELETE`). Solo realizan consultas analiticas de lectura.
- Tolerancia a fallos: La arquitectura de rotacion en memoria garantiza que ningun error 429 interrumpa la experiencia del cajero o administrador.

## 7. Estado y ultimos cambios
- Optimizacion de `collectBusinessData`: Reemplazo de consultas masivas por agregaciones en motor SQL (`SUM`, `groupBy`, `$queryRaw`).
- Actualizacion de pruebas unitarias en `ai.tools.test.ts` y `ai.service.test.ts` asegurando compatibilidad total con los metodos agregados de Prisma y sentencias nativas.

## 8. Como verificar
- Ejecutar suite de pruebas del modulo IA:
  ```bash
  npx vitest run src/modules/ai/
  ```
- Comprobar tipos estaticos:
  ```bash
  npm run typecheck
  ```
- Comprobar linter:
  ```bash
  npm run lint
  ```
