# Modulo: Libreria y Utilidades Compartidas (lib)

## 1. Proposito y alcance
El modulo `src/lib/` concentra los helpers, utilidades compartidas, tipos de preferencias de usuario y configuraciones fundamentales consumidas transversalmente por la aplicacion, las Server Actions y los componentes de interfaz.

Su alcance incluye la gestion del almacenamiento local de preferencias (`user-preferences.ts`), motor adaptativo de flujos y sectores comerciales (`business-workflow.ts`), calculos y formateo monetario en COP (`finance.ts`, `format.ts`), validaciones comunes con Zod (`validations.ts`), generacion y estilos para facturacion PDF (`pdf/`), etiquetado de enums del negocio (`labels.ts`) y clientes singleton de persistencia e identidad (`prisma.ts`, `supabase.ts`, `supabase-server.ts`).

## 2. Contratos y API

### business-workflow.ts
- `BusinessSector`: Tipo union con los 8 sectores soportados:
  `'retail_general' | 'technology_repair' | 'fashion_apparel' | 'grocery_supermarket' | 'hardware_construction' | 'pharmacy_health' | 'services_workshop' | 'restaurant_gastronomy'`.
- `SECTOR_INFO: Record<BusinessSector, SectorProfile>`: Perfiles semanticos, etiquetas, iconos, margenes sugeridos y pie legal por sector.
- `SECTOR_WORKFLOW_DEFAULTS: Record<BusinessSector, Partial<BusinessWorkflowConfig>>`: Valores de configuracion predeterminados por sector (`allowCreditSales: false` para `restaurant_gastronomy` y `grocery_supermarket`).
- `getSectorProfile(sector?: BusinessSector | null): SectorProfile`: Retorna el perfil del sector o fallback a `retail_general`.
- `getBusinessWorkflow(): BusinessWorkflowConfig`: Lee la configuracion de negocio desde `localStorage` con fallback a defaults.
- `saveBusinessWorkflow(partial: Partial<BusinessWorkflowConfig>): BusinessWorkflowConfig`: Persiste y emite `WORKFLOW_CHANGED_EVENT`.

### validations.ts
- `BusinessSectorSchema`: Validador Zod `z.enum([...])` con los 8 sectores comerciales reconocidos.

### user-preferences.ts
- `DEFAULT_PREFERENCES`: Constante con los valores iniciales predefinidos. El tema por defecto es `'dark'`.
- `getUserPreferences(): UserPreferences`: Obtiene las preferencias almacenadas en el cliente (`nova_erp_user_preferences`) con fallback a `DEFAULT_PREFERENCES`.
- `saveUserPreferences(partial: Partial<UserPreferences>): UserPreferences`: Persiste cambios parciales, aplica el tema visual y emite `PREFERENCES_CHANGED_EVENT`.
- `applyTheme(theme: ThemeMode): void`: Aplica o remueve la clase `dark` en `document.documentElement`.
- `getThemeSnapshot(): ThemeMode`: Selector sincronico para `useSyncExternalStore`.
- `getThemeServerSnapshot(): ThemeMode`: Devuelve `'dark'` como snapshot inicial en SSR.
- `subscribePreferences(callback: () => void): () => void`: Suscripcion al evento `PREFERENCES_CHANGED_EVENT`.

### Tipos exportados
```typescript
export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'emerald' | 'indigo' | 'violet' | 'amber' | 'slate'
export type TableDensity = 'normal' | 'compact'
export type DefaultModule = '/dashboard' | '/sales' | '/inventory' | '/web/orders'

export interface UserPreferences {
  theme: ThemeMode
  accentColor: AccentColor
  tableDensity: TableDensity
  defaultModule: DefaultModule
  posSound: boolean
  showAiAssistant: boolean
  stockAlerts: boolean
  webOrderAlerts: boolean
  phone?: string
  roleTitle?: string
}
```

## 3. Dependencias
- Externas: `react` (`useSyncExternalStore`), `zod`, `@prisma/client`, `@supabase/supabase-js`, `@supabase/ssr`.
- Internas: Consumido por `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/layout/dashboard-layout.tsx` y `src/app/profile/page.tsx`.

## 4. Mapa de archivos
- `business-workflow.ts`: Definicion de sectores comerciales (`BusinessSector`), perfiles semanticos (`SECTOR_INFO`), defaults de flujo (`SECTOR_WORKFLOW_DEFAULTS`) y persistencia/sincronizacion reactiva de cliente.
- `business-workflow.test.ts`: Pruebas unitarias que validan la definicion completa de los 8 sectores, perfil gastronomico y esquemas.
- `m1-challenger.test.ts`: Bateria de pruebas adversariales del Challenger 2 para Milestone 1 (34 tests de validacion Zod, comportamiento client/SSR de workflow y no-regresion de 7 sectores).
- `user-preferences.ts`: Almacenamiento y suscripcion reactiva de tema visual, acento y densidad de tablas.
- `user-preferences.test.ts`: Pruebas unitarias de valores por defecto de tema y persistencia tras cierre de sesion.
- `finance.ts`: Calculos financieros de margen, ganancia y subtotales.
- `format.ts`: Formateo de moneda colombiana (COP) y fechas legibles.
- `labels.ts`: Diccionario y etiquetado amigable para estados de ordenes, metodos de pago y categorias.
- `prisma.ts`: Cliente singleton de Prisma ORM.
- `supabase.ts`: Cliente de Supabase para navegadores.
- `supabase-server.ts`: Factorias de cliente de Supabase para Server Components y Server Actions con cookies SSR.
- `validations.ts`: Esquemas de validacion centralizados con Zod (incluye `BusinessSectorSchema`).

## 5. Logica y flujo
1. **Inicializacion y Cero Destello (Zero Flash)**: En `layout.tsx`, el tag `<html>` incluye la clase `dark` por defecto. En `<head>`, un script bloqueante evalua `localStorage`. Si el usuario no ha definido preferencias o ha elegido `'dark'`, la clase `dark` se mantiene. Si explícitamente se guardó `'light'`, se remueve `dark` antes del primer pintado del cuerpo.
2. **Sincronizacion Reactiva**: Vistas cliente como `login/page.tsx` y `register/page.tsx` usan `useSyncExternalStore` conectado a `subscribePreferences`. Al invocar `saveUserPreferences`, se notifica a la ventana y todas las pestañas/componentes sincronizan su estado visual inmediatamente.
3. **Flujo y Perfiles Adaptativos por Sector**: `business-workflow.ts` expone `SECTOR_INFO` con etiquetas dinamicas de rol de cliente, productos, busqueda y accion principal, adaptando las vistas POS y tablas segun el sector activo. Ademas, `SECTOR_WORKFLOW_DEFAULTS` desactiva ventas a credito en sectores como `restaurant_gastronomy` y `grocery_supermarket`.
4. **Persistencia tras Cierre de Sesion**: Al hacer logout en `/auth/logout`, las cookies de sesion de Supabase se invalidan en el servidor, pero el item `nova_erp_user_preferences` en el almacenamiento local del navegador se conserva. Por tanto, si el usuario habia configurado modo claro, la pantalla de login permanece en modo claro respetando su seleccion previa. Si nunca lo habia cambiado, permanece en modo oscuro.

## 6. Decisiones de diseno y gotchas
- **Modo Oscuro como Predefinido Global**: Se establecio `DEFAULT_PREFERENCES.theme = 'dark'` para garantizar que cualquier visitante anonimo, nuevo usuario o dispositivo sin preferencias previas experimente la interfaz oscura de grado SaaS.
- **Evitar Cascading Renders**: Se descarto el patron `useEffect` con `setState` en favor de `useSyncExternalStore`, previniendo rerenders en cascada y advertencias de linter (`react-hooks/set-state-in-effect`).
- **Respeto a Preferencia de Usuario**: Si el usuario define `'light'`, el sistema no debe sobreescribirlo arbitrariamente a `'dark'` al cerrar sesion; la configuracion de cliente local se respeta.
- **Inclusion de Gastronomia**: El sector `restaurant_gastronomy` requiere `allowCreditSales: false` por diseño de negocio y marco normativo (Ley 1935 de 2018 para propina sugerida).

## 7. Estado y ultimos cambios
- Incorporacion del sector `restaurant_gastronomy` en el tipo `BusinessSector` y diccionario `SECTOR_INFO`.
- Exportacion de `SECTOR_WORKFLOW_DEFAULTS` con bloqueo de ventas a credito y escaneo continuo para gastronomia.
- Exportacion de `BusinessSectorSchema` en `validations.ts` con cobertura de los 8 sectores.
- Actualizacion de la suite `src/lib/business-workflow.test.ts` cubriendo perfiles semanticos, defaults y validacion Zod.
- Establecimiento definitivo de `'dark'` como tema predeterminado del sistema.
- Insercion de la clase `dark` en el `<html>` de `layout.tsx` y script inline de hidratacion segura.
- Creacion de `subscribePreferences`, `getThemeSnapshot` y `getThemeServerSnapshot`.
- Incorporacion del selector interactivo de tema en las vistas de acceso (`login/page.tsx` y `register/page.tsx`).
- Creacion de la suite de pruebas `src/lib/user-preferences.test.ts` con cobertura del 100% en flujos de tema y logout.

## 8. Como verificar
- Ejecutar pruebas unitarias de workflow y preferencias:
  ```bash
  npx vitest run src/lib/business-workflow.test.ts src/lib/user-preferences.test.ts
  ```
- Ejecutar chequeo de tipos:
  ```bash
  npm run typecheck
  ```
- Ejecutar analisis de linter:
  ```bash
  npm run lint
  ```

