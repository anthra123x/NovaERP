# Modulo: Layout y Navegacion Global

## 1. Proposito y alcance
El modulo `src/components/layout/` encapsula la estructura visual contenedora de la aplicacion (Application Shell), proveyendo el marco de navegacion principal, la persistencia del estado de colapso de la barra lateral, la recepcion y atajo de comandos de teclado globales y la cabecera operativa del sistema.

Su responsabilidad abarca la adaptabilidad responsiva entre dispositivos moviles (cajon deslizable off-canvas con overlay), tabletas y estaciones de escritorio con acoplamiento flotante tipo capsule dock. Centraliza la busqueda rapida en catalogo y ventas, la campana de notificaciones y la sincronizacion de preferencias visuales de usuario (tema claro/oscuro y densidad de tablas).

## 2. Contratos y API

### DashboardLayout
- Firma: `DashboardLayout({ children, user }: DashboardLayoutProps): JSX.Element`
- Tipos de entrada:
  ```typescript
  interface DashboardLayoutProps {
    children: React.ReactNode
    user: {
      name: string
      email: string
    }
  }
  ```

### Header
- Firma: `Header({ user, onMenuClick }: HeaderProps): JSX.Element`
- Tipos de entrada:
  ```typescript
  interface HeaderProps {
    user: {
      name: string
      email: string
    }
    onMenuClick: () => void
  }
  ```

### Sidebar
- Firma: `Sidebar({ user, collapsed, onToggleCollapse, onMobileClose }: SidebarProps): JSX.Element`
- Tipos de entrada:
  ```typescript
  interface SidebarProps {
    user?: {
      name: string
      email: string
    }
    collapsed?: boolean
    onToggleCollapse?: () => void
    onMobileClose?: () => void
  }
  ```

### NotificationsDropdown
- Firma: `NotificationsDropdown(): JSX.Element`
- Tipos de entrada: Ninguno. Gestiona internamente el estado de notificaciones no leidas y lectura de alertas operativas.

## 3. Dependencias
- Modulos internos consumidos:
  - `@/lib/user-preferences`: Gestion de temas y densidad visual.
  - `@/lib/keyboard-shortcuts`: Registro global de atajos de teclado (`useKeyboardShortcuts`).
  - `@/lib/business-workflow`: Perfil y configuracion de marca de la empresa (`useBusinessWorkflow`).
  - `@/lib/utils`: Utilidad de composicion de clases `cn`.
  - `@/components/assistant/ai-floating-chat`: Lanzador flotante del asistente IA.
  - `@/components/ui/*`: Primitivas de interfaz (Button, Input, DropdownMenu, Badge).
- Paquetes externos:
  - `lucide-react`: Iconografia tecnica.
  - `next/navigation`: Hooks `usePathname`, `useRouter`.
  - `next/link`: Enrutamiento cliente.

## 4. Mapa de archivos
- `dashboard-layout.tsx` -> Componente contenedor principal. Maneja el estado del cajon movil, hidratacion diferida de `localStorage` para prevenir desajustes de SSR y orquestacion de layout shifts.
- `header.tsx` -> Cabecera superior persistente. Incluye el buscador global con debounce, desplegable flotante adaptativo sin desborde en viewports estrechos, selector de usuario y campana de notificaciones.
- `sidebar.tsx` -> Barra de navegacion lateral con variantes expandida y colapsada tipo capsula, selector de empresa y enlaces a rutas operativas.
- `notifications-dropdown.tsx` -> Componente flotante de lectura de alertas operativas, pedidos web entrantes y estado de sincronizacion.
- `sidebar.test.ts` -> Suite de pruebas unitarias y de contratos para el filtrado dinamico de navegacion por sector y validacion de exclusion de creditos (22 pruebas).
- `layout-responsive.test.ts` -> Suite unitaria de regresion responsiva (12 pruebas).
- `layout-responsive.adversarial.test.ts` -> Suite adversarial y analisis geometrico de viewports 300px-640px, calculo de limites y pruebas de contratos DOM (21 pruebas).

## 5. Logica y flujo
1. Al cargar la pagina, `DashboardLayout` se renderiza en servidor asumiendo estado colapsado inicial falso (`isCollapsed = false`) y clases CSS fijas (`w-72 lg:w-64`), garantizando paridad total entre el HTML generado por el servidor y el cliente.
2. Tras el montaje en el cliente (`useEffect`), se lee de forma segura la clave `nova_sidebar_collapsed` en `localStorage` y se sincronizan las preferencias de tema y densidad visual.
3. En pantallas moviles (`< 1024px`), el sidebar permanece oculto fuera de pantalla con `-translate-x-[calc(100%+1.5rem)]`. Al interactuar con el boton hamburguesa de `Header`, se conmuta `sidebarOpen`, mostrando el overlay de fondo y animando el menu hacia la vista.
4. En `Header`, la entrada de busqueda con debounce (300ms) invoca el endpoint de busqueda rapida. El desplegable de resultados calcula su posicion y anchura de manera contenida (`w-[calc(100vw-2.5rem)] sm:w-96 max-w-md`), evitando el desborde horizontal del viewport en dispositivos de 320px a 375px.
5. En `Sidebar`, la lista `visibleNavigation` se computa reactivamente evaluando `workflow.sector === 'restaurant_gastronomy' || workflow.allowCreditSales === false`. Cuando esta condicion se cumple, se omite el modulo `{ name: 'Créditos', href: '/credits' }`, manteniendo la navegacion coherente en modo expandido y colapsado.

## 6. Decisiones de diseno y gotchas
- Lectura de `localStorage` diferida: La evaluacion sincronica de `localStorage` durante la inicializacion de `useState` causaba advertencias de desajuste de hidratacion (Hydration Mismatch) cuando el servidor renderizaba `w-64` y el navegador leia `isCollapsed === true`. Se resolvio inicializando siempre en `false` y actualizando en `useEffect`.
- Prevencion de Layout Shift (CLS) en moviles: Anteriormente, el ancho cambiaba de `w-64` a `w-72` tras evaluar `isMobile` en un efecto. Se soluciono unificando en CSS `'w-72 lg:w-64'`, estableciendo 18rem nativos en movil desde el primer frame de renderizado.
- Posicionamiento negativo compensatorio en busqueda: En movil, el buscador se encuentra desplazado por el boton de menu (~64px). Usar `left-0` forzaba a la lista flotante a sobrepasar el borde derecho del viewport. El uso de `-left-10 sm:left-0` junto a `w-[calc(100vw-2.5rem)]` mantiene el contenedor simetrico respecto a la pantalla.
- Filtrado inmutable de navegacion: El arreglo `navigation` se mantiene inmutable a nivel de modulo, derivando `visibleNavigation` en tiempo de ejecucion en el cuerpo de `Sidebar`. Esto previene condiciones de carrera o mutaciones accidentales del menu entre cambios de sector.

## 7. Estado y ultimos cambios
- Rediseño visual exhaustivo basado en interfaz de referencia de alta fidelidad:
  - Marco de ventana de aplicación de escritorio redondeado (`rounded-[22px]`, `border-border/80`) sobre canvas neutro gris suave (`#eef0f3`).
  - `Sidebar`: Reestructuración en 4 secciones canónicas (`Main Menu`, `Customers`, `Management`, `Settings`), isotipo monocromático con contenedor cuadrado e inicial Spark "S", selector de equipo `Spark Pixel Team` y tarjeta inferior de operador `Salung Prastyo` / `Sales Operator` con atajo de teclado y selector.
  - `Header`: Migas de pan `Dashboard › Overview`, barra de búsqueda integrada con atajo `⌘ K`, campana de notificaciones, acceso a ajustes y avatar circular.
  - Tipografía y contrastes: Eliminación total de bordes gruesos y estilos antiguos; paleta clara con fondo blanco puro para tarjetas y superficies, bordes zinc sutiles y botones de acción en zinc grafito oscuro.
  - Preservación íntegra de invariantes de prueba (`sidebar.test.ts`, `layout-responsive.test.ts`, `m2-challenger-empirical.test.ts`).
- Incorporacion de Milestone 2: Filtrado dinamico de navegacion en `sidebar.tsx` para ocultar el modulo de creditos en el sector `restaurant_gastronomy` y cuando `allowCreditSales` es falso.
- Preservacion estricta del modulo de creditos para los 7 sectores comerciales preexistentes con ventas a credito activas.
- Creacion de `sidebar.test.ts` con 22 pruebas de contrato y validacion empirica de sectores.
- Remediacion de advertencia de hidratacion eliminando la lectura sincronica de `localStorage` en `dashboard-layout.tsx`.
- Erradicacion de CLS en dispositivos moviles fijando `w-72 lg:w-64` en el contenedor `aside`.
- Correccion de desborde del buscador en pantallas menores a 380px en `header.tsx` mediante `-left-10 sm:left-0` y ancho relativo acotado.

## 8. Como verificar
- Ejecutar chequeo estricto de tipos:
  ```bash
  npm run typecheck
  ```
- Ejecutar suite de navegacion de layout:
  ```bash
  npx vitest run src/components/layout/sidebar.test.ts src/components/layout/layout-responsive.test.ts src/components/layout/layout-responsive.adversarial.test.ts
  ```
- Ejecutar suite completa de pruebas:
  ```bash
  npm test
  ```
- Ejecutar analisis de linter:
  ```bash
  npm run lint
  ```
