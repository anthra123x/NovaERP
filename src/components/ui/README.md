# Modulo: Primitivas y Componentes de Interfaz de Usuario (UI)

## 1. Proposito y alcance
El modulo `src/components/ui/` constituye el sistema base de diseno y componentes reutilizables de la aplicacion, implementado sobre Tailwind CSS v4, shadcn/ui y primitivas accesibles de Base UI / Radix.

Su responsabilidad consiste en garantizar consistencia visual, accesibilidad (WAI-ARIA), gestion de foco, adaptabilidad a pantallas tactiles y comportamiento predecible en componentes modales, tablas de datos, botones de accion, campos de formulario y controles de paginacion en todos los modulos del ERP.

## 2. Contratos y API

### Dialog (DialogPrimitive, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription)
- Firma principal:
  ```typescript
  function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
  }: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }): JSX.Element
  ```
- Comportamiento de ventana: Delimitacion de altura maxima a `max-h-[calc(100dvh-2rem)]` con `overflow-y-auto` para garantizar desplazamiento seguro en dispositivos moviles cuando el teclado virtual esta desplegado.

### Pagination
- Firma:
  ```typescript
  interface PaginationProps {
    page: number
    totalPages: number
    total: number
    entity: string
    onPageChange: (page: number) => void
  }
  function Pagination(props: PaginationProps): JSX.Element | null
  ```
- Disposicion: Disposicion adaptativa con orientacion vertical en dispositivos moviles (`flex-col`) y horizontal en pantallas de escritorio (`sm:flex-row`), con espaciado de 12px (`gap-3`).

### Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption
- Componentes de marcado tabular semantico con soporte de bordes sutiles y estilos de interaccion hovered.

### Button, Input, Textarea, Select, Switch, Checkbox, Tabs, Card, Badge
- Primitivas de formulario y estructura con estilos unificados y compatibilidad con modo claro y oscuro.

## 3. Dependencias
- Modulos internos consumidos:
  - `@/lib/utils`: Utilidad `cn` para fusion condicional de clases de Tailwind.
- Paquetes externos:
  - `@base-ui-components/react`: Primitivas headless no estilizadas accesibles.
  - `lucide-react`: Iconos vectoriales para botones, selectores y dialogos.
  - `sonner`: Motor de notificaciones emergentes (toasts).

## 4. Mapa de archivos
- `badge.tsx` -> Etiqueta visual para estados breves, contadores o identificadores de categorias.
- `button.tsx` -> Boton de interaccion con soporte para variantes (default, destructive, outline, secondary, ghost, link) y tamanos responsivos.
- `card.tsx` -> Contenedor con borde, sombra y division en Header, Title, Description, Content y Footer.
- `checkbox.tsx` -> Control booleano accesible para formularios y seleccion multiple en tablas.
- `dialog.tsx` -> Ventana modal accesible centrada con proteccion de altura de viewport (`max-h-[calc(100dvh-2rem)]`) y scrollbar interno automatico.
- `dropdown-menu.tsx` -> Menu contextual flotante accionado por boton o selector.
- `empty-state.tsx` -> Indicador grafico y textual para estados vacios de datos con accion de recuperacion.
- `error-fallback.tsx` -> Componente de contingencia para captura de errores en boundaries de rutas.
- `input.tsx` -> Campo de entrada textual con soporte para estados hovered, focus-visible y disabled.
- `label.tsx` -> Etiqueta vinculable a controles de formulario accesible con WAI-ARIA.
- `nova-logo.tsx` -> Emblema vectorial oficial de Nova ERP con variantes de escala.
- `page-header.tsx` -> Encabezado de seccion de pagina con titulo principal, descripcion y botones de accion.
- `pagination.tsx` -> Barra de paginacion responsiva con calculo de paginas visibles y distribucion flexible adaptable a pantallas estrechas.
- `search-input.tsx` -> Campo de busqueda rapida con icono y boton de limpieza.
- `select.tsx` -> Selector desplegable nativo o personalizado con items tipados.
- `skeleton.tsx` -> Bloque animado para estados de carga tipo shimmer/pulse.
- `sonner.tsx` -> Contenedor de notificaciones toast accesible con soporte de temas.
- `stat-card.tsx` -> Tarjeta de metrica para tableros de control con indicador de tendencia.
- `status-badge.tsx` -> Badge especializado con soporte para codigos de colores de ordenes y pagos.
- `switch.tsx` -> Interruptor basculante accesible para alternancia de opciones booleanas.
- `table.tsx` -> Tabla HTML semantica estilizada para datos tabulares de inventario, ventas y clientes.
- `tabs.tsx` -> Selector de pestanas horizontales con soporte de teclado y accesibilidad.
- `textarea.tsx` -> Area de texto multilínea para observaciones y notas de pedidos.
- `toast-provider.tsx` -> Proveedor global de contexto para visualizacion de notificaciones.

## 5. Logica y flujo
1. Los componentes UI reciben propiedades estandar de React combinadas con la propiedad opcional `className`.
2. Las clases de Tailwind son fusionadas mediante `cn()` (que combina `clsx` y `tailwind-merge`), asegurando que las clases externas sobrescriban los estilos base predeterminados sin colisiones de especificidad.
3. En dialogos modales (`DialogContent`), el contenedor se posiciona de forma fija en el centro de la pantalla. Al activarse un teclado virtual o en pantallas de baja altura, la regla `max-h-[calc(100dvh-2rem)] overflow-y-auto` garantiza que la ventana nunca desborde el viewport y que los botones de confirmacion situados al pie permanezcan siempre accesibles.
4. En controles de paginacion (`Pagination`), la disposicion conmuta dinamicamente entre columna en movil (`flex-col`) y fila en escritorio (`sm:flex-row`), impidiendo que el texto descriptivo de la pagina colisione con los botones de avance y retroceso.

## 6. Decisiones de diseno y gotchas
- Altura dinamica del viewport (`dvh`): Se empleo `100dvh` en lugar de `100vh` en `DialogContent` debido a que en navegadores moviles (Safari iOS, Chrome Android) la barra de direcciones dinamica y el teclado virtual reducen el area util; `100vh` provoca que el pie del dialogo quede oculto tras las barras de la interfaz del sistema.
- Envoltura flexible de paginacion: El componente disponia el texto y botones en una linea horizontal rigida sin wrap. En pantallas de 320px se producian colisiones entre la numeracion y los botones. Se configuro una transicion fluida a `flex-col sm:flex-row gap-3`.

## 7. Estado y ultimos cambios
- Incorporacion de `max-h-[calc(100dvh-2rem)] overflow-y-auto` en `DialogContent` dentro de `dialog.tsx` para accesibilidad en pantallas compactas y teclados virtuales.
- Reestructuracion responsiva de `Pagination` en `pagination.tsx` para evitar colisiones en viewports menores a 360px.

## 8. Como verificar
- Ejecutar chequeo de tipos estaticos:
  ```bash
  npm run typecheck
  ```
- Ejecutar suite de pruebas:
  ```bash
  npm test
  ```
- Ejecutar revision de linter:
  ```bash
  npm run lint
  ```
- Verificacion manual: Abrir un dialogo modal en un emulador movil con teclado virtual desplegado y verificar que el contenido desplace con barra de scroll interna. Inspeccionar una tabla paginada en viewport de 320px y confirmar distribucion vertical balanceada de los controles de pagina.
