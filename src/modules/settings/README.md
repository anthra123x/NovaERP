# Modulo: Configuracion del Negocio y Ajustes del Sistema (settings)

## 1. Proposito y alcance
El modulo `src/modules/settings/` centraliza la gestion de la identidad corporativa, parametros fiscales (DIAN), prefijos de facturacion y el motor de configuracion adaptativa del negocio (`business_workflow`) para Nova ERP.

Su alcance abarca la lectura y persistencia de `SystemSettings` (tabla relacional) y `StoreSetting` (tabla clave-valor en JSON), el clasificador semantico por procesamiento de lenguaje natural (`classifyBusinessSector`) para identificar el sector comercial a partir de descripciones libres, la inicializacion automatica asistida por IA de categorias y parametros de flujo (`autoConfigureBusinessWithAi`), y la exposicion de Server Actions protegidas con control de acceso administrativo.

## 2. Contratos y API

### Funciones de Servicio (`settings.service.ts`)
- `getOrCreateSettings(): Promise<SystemSettings>`: Obtiene el registro unico de configuracion o crea uno con valores por defecto.
- `updateSettings(data: UpdateSettingsInput): Promise<SystemSettings>`: Actualiza parametros fiscales, contacto y umbrales de stock.
- `getBusinessWorkflowConfig(): Promise<BusinessWorkflowConfig>`: Recupera la configuracion de flujo de trabajo almacenada en `StoreSetting` bajo la clave `'business_workflow'` con combinacion de `DEFAULT_BUSINESS_WORKFLOW`.
- `updateBusinessWorkflowConfig(partial: Partial<BusinessWorkflowConfig>): Promise<BusinessWorkflowConfig>`: Realiza upsert en `StoreSetting` serializando el objeto en formato JSON.
- `classifyBusinessSector(text: string): { sector: BusinessSector; confidence: number; matches: string[] }`: Clasificador heuristico NLP que analiza terminos clave y asigna el sector con mayor ponderacion entre los 8 sectores soportados.
- `autoConfigureBusinessWithAi(description: string): Promise<AutoConfigResult>`: Clasifica el negocio mediante LLM rotativo o motor heuristico, actualiza el perfil de la empresa, persiste el workflow correspondiente y genera categorias iniciales sugeridas en la base de datos.
- `SECTOR_STARTER_CATEGORIES: Record<BusinessSector, Array<{ name: string; slug: string; color: string }>>`: Categorias iniciales predefinidas para cada sector comercial.
- `SECTOR_DEFAULT_SLOGANS: Record<BusinessSector, string>`: Eslóganes por defecto sugeridos para cada sector.

### Server Actions (`settings.actions.ts`)
- `getSettingsAction(): Promise<{ success: boolean; data?: SystemSettings; error?: string }>`: Obtiene la configuracion fiscal general; requiere sesion autenticada.
- `updateSettingsAction(data: unknown): Promise<{ success: boolean; data?: SystemSettings; error?: string }>`: Valida con `UpdateSettingsSchema` y persiste; requiere rol administrador (`requireAdmin`).
- `getBusinessWorkflowAction(): Promise<{ success: boolean; data?: BusinessWorkflowConfig; error?: string }>`: Obtiene el workflow activo; requiere autenticacion.
- `saveBusinessWorkflowAction(workflow: Partial<BusinessWorkflowConfig>): Promise<{ success: boolean; data?: BusinessWorkflowConfig; error?: string }>`: Persiste el workflow en base de datos y revalida rutas de caja y administracion; requiere rol administrador.
- `autoConfigureBusinessWithAiAction(description: string): Promise<{ success: boolean; data?: AutoConfigResult; error?: string }>`: Ejecuta la adaptacion global asistida por IA; requiere rol administrador.

## 3. Dependencias
- Externas: `@prisma/client`, `zod`.
- Internas: `@/lib/prisma`, `@/lib/business-workflow`, `@/lib/validations`, `@/modules/auth/auth.actions` (`requireAuth`, `requireAdmin`), `@/modules/ai/ai.rotation` (`completeWithRotation`, `loadAiConfig`).
- Consumidores: `src/app/admin/page.tsx`, `src/app/register/page.tsx`, `src/modules/auth/auth.actions.ts`, `src/components/layout/sidebar.tsx`, `src/app/sales/new/page.tsx`.

## 4. Mapa de archivos
- `settings.service.ts`: Logica de negocio, queries a Prisma, persistencia JSON en `StoreSetting`, clasificador NLP heuristico y aprovisionamiento automatico de categorias.
- `settings.actions.ts`: Capa de Server Actions, validacion de permisos administrativos (`requireAdmin`), sanitizacion con Zod y revalidacion de cache de Next.js (`revalidatePath`).
- `settings.service.test.ts`: Suite de pruebas unitarias que valida lectura/escritura de configuracion, integracion de JSON de workflow, clasificacion NLP y auto-configuracion de restaurantes y sectores tradicionales.
- `index.ts`: Barrel export que expone la API publica del modulo.

## 5. Logica y flujo
1. **Doble Capa de Configuracion**:
   - Parametros fiscales y de facturacion legal residen en la tabla relacional `SystemSettings` (`companyName`, `companyNit`, `invoicePrefix`, `invoiceFooter`, etc.).
   - Parametros operativos y dinamicos residen en `StoreSetting` bajo la clave `'business_workflow'` como documento JSON. Esto permite evolucionar los flujos de trabajo sin requerir migraciones estructurales de base de datos.
2. **Clasificacion de Negocio (Heuristica + IA)**:
   - Al registrar la empresa o pulsar "Configurar con IA", la descripcion textual se normaliza (remocion de acentos y conversion a minusculas).
   - Se evaluan las palabras clave del diccionario para cada uno de los 8 sectores.
   - Si las claves de IA estan activas, se solicita estructuracion JSON a traves de proveedores rotativos. Si no, o si falla la cuota, opera el algoritmo heuristico de ponderacion.
3. **Aprovisionamiento de Categorias Iniciales**:
   - Tras identificar el sector, el sistema itera sobre `SECTOR_STARTER_CATEGORIES[sector]` y crea las categorias faltantes en la tabla `ProductCategory` evitando duplicados por nombre o slug.
4. **Reglas Operativas Segun Sector**:
   - `allowCreditSales`: Se desactiva automaticamente (`false`) para `grocery_supermarket` y `restaurant_gastronomy`.
   - `barcodeContinuousScan`: Se desactiva (`false`) para `services_workshop` y `restaurant_gastronomy`.

## 6. Decisiones de diseno y gotchas
- **Persistencia en StoreSetting JSON**: Se eligio `StoreSetting` para `business_workflow` con el fin de evitar modificaciones frecuentes al esquema SQL de Prisma y permitir parametros especificos por sector (ej. resolucion DIAN, politicas de credito, modo de escaneo).
- **Separacion de Capas**: `settings.actions.ts` valida autorizacion y esquemas Zod antes de invocar `settings.service.ts`, preservando la regla de arquitectura donde las acciones no acceden a Prisma directamente.
- **Venta a Credito en Gastronomia**: Los restaurantes operan con cobro inmediato o consumo en mesa; habilitar ventas a credito genera inconsistencias operativas con comandas y no cumple con la naturaleza del servicio.
- **Sincronizacion Bidireccional**: La configuracion guardada en base de datos debe reflejarse en el `localStorage` del cliente para permitir que componentes cliente como `sidebar.tsx` o `sales/new/page.tsx` reaccionen inmediatamente mediante `saveBusinessWorkflow`.

## 7. Estado y ultimos cambios
- Incorporacion completa del sector `restaurant_gastronomy` en `SECTOR_STARTER_CATEGORIES` (Entradas, Platos Fuertes, Bebidas, Postres, Guarniciones).
- Definicion de eslogan institucional en `SECTOR_DEFAULT_SLOGANS` para gastronomia.
- Extension del diccionario de vocabulario culinario en `classifyBusinessSector` para restaurantes, cafeteria, platos, bebidas y comandas.
- Ajuste de `autoConfigureBusinessWithAi` para desactivar ventas a credito (`allowCreditSales: false`) y escaneo continuo de barras en gastronomia.
- Adicion de casos de prueba unitaria en `settings.service.test.ts` para clasificacion y auto-configuracion de restaurantes.

## 8. Como verificar
- Ejecutar pruebas unitarias del modulo de settings:
  ```bash
  npx vitest run src/modules/settings/settings.service.test.ts
  ```
- Ejecutar verificacion de tipos TypeScript:
  ```bash
  npm run typecheck
  ```
- Ejecutar validacion de linter:
  ```bash
  npm run lint
  ```
