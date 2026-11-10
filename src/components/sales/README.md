# Modulo: Componentes de Ventas y Facturacion

## 1. Proposito y alcance
El modulo `src/components/sales/` reune los componentes visuales especializados del punto de venta (POS), la gestion de inspeccion lateral de facturas, la representacion grafica de documentos tributarios segun directrices DIAN y los dialogos para transacciones de cartera y abonos a credito.

Su alcance abarca la presentacion interactiva de ventas registradas, la busqueda rapida de clientes y ordenes en cartera, la impresion o visualizacion de comprobantes con desglose de IVA y retenciones, y la adaptabilidad de paneles de inspeccion sin generar espacios residuales ni fugas de altura en dispositivos moviles y tabletas.

## 2. Contratos y API

### SalesInspectorLayout
- Firma: `SalesInspectorLayout({ children, isOpen, selectedSaleId, onClose }: SalesInspectorLayoutProps): JSX.Element`
- Tipos de entrada:
  ```typescript
  interface SalesInspectorLayoutProps {
    children: React.ReactNode
    isOpen: boolean
    selectedSaleId: string | null
    onClose: () => void
  }
  ```

### DianInvoiceView
- Firma: `DianInvoiceView({ sale, company, readOnly }: DianInvoiceViewProps): JSX.Element`
- Tipos de entrada: Recibe la entidad `sale` con relaciones (`items`, `client`, `user`), datos fiscales de `company` (nombre comercial, NIT, direccion, regimen tributario) y bandera booleana `readOnly`.

### InvoiceSidePanel
- Firma: `InvoiceSidePanel({ saleId, onClose }: { saleId: string | null; onClose: () => void }): JSX.Element`
- Tipos de entrada: Identificador de la venta o `null`.

### RegistrarAbonoDialog
- Firma: `RegistrarAbonoDialog({ open, onOpenChange, saleId, pendingBalance, onSuccess }: RegistrarAbonoDialogProps): JSX.Element`
- Tipos de entrada: Control de estado del modal, saldo adeudado y callback de confirmacion.

### InvoiceDrawer
- Firma: `InvoiceDrawer({ saleId, open, onOpenChange }: InvoiceDrawerProps): JSX.Element`
- Tipos de entrada: Cajon de vista de comprobante para dispositivos moviles.

### SaleCreditPanel
- Firma: `SaleCreditPanel({ sale, onAbonoRegistered }: SaleCreditPanelProps): JSX.Element`
- Tipos de entrada: Panel con desglose de cuotas, abonos y estado de vencimiento del credito.

### CreditSearch
- Firma: `CreditSearch({ value, onChange, placeholder }: CreditSearchProps): JSX.Element`
- Tipos de entrada: Campo de busqueda con filtrado de deudores.

## 3. Dependencias
- Modulos internos consumidos:
  - `@/lib/format`: Funciones `formatCurrency` y formateo de fechas en pesos colombianos (COP).
  - `@/lib/finance`: Constantes tributarias (`IVA_RATE`) y calculos contables.
  - `@/lib/labels`: Etiquetas unificadas de formas de pago y estado de cartera.
  - `@/lib/utils`: Composicion condicional de estilos `cn`.
  - `@/components/ui/*`: Dialog, Button, Badge, Table, Input, Card.
- Paquetes externos:
  - `lucide-react`: Iconos tecnicos de acciones de facturacion.

## 4. Mapa de archivos
- `sales-inspector-layout.tsx` -> Contenedor flex con animacion de transicion de ancho para inspeccion lateral de facturas en pantallas grandes y colapso completo en pantallas medianas y pequenas.
- `dian-invoice-view.tsx` -> Renderizador de factura electronica bajo estandares DIAN con formato responsivo de grillas y envoltura de desplazamiento en tabla de partidas.
- `invoice-side-panel.tsx` -> Panel lateral acoplable con detalles de venta, cliente, partidas y acciones rapidas (reimprimir, ver DIAN, anular).
- `invoice-drawer.tsx` -> Componente de cajon modal para consulta de facturas en pantallas tactiles.
- `registrar-abono-dialog.tsx` -> Modal de registro y liquidacion de abonos parciales o totales a creditos pendientes.
- `sale-credit-panel.tsx` -> Tarjeta de balance de credito, porcentaje cubierto y lista cronologica de pagos.
- `credit-search.tsx` -> Barra de filtrado de clientes y ventas con saldos pendientes.

## 5. Logica y flujo
1. En la lista principal de ventas (`/sales`), la seleccion de una fila activa `selectedSaleId` y transiciona `isOpen = true` en `SalesInspectorLayout`.
2. En pantallas de escritorio (`xl: >= 1280px`), el contenedor principal de la tabla cede espacio mediante transicion fluida y el panel lateral se expande a 336px/368px.
3. En pantallas moviles y tabletas (`< 1280px`), cuando `isOpen = false`, la clase `hidden xl:block` oculta completamente el panel del DOM visual, impidiendo que el contenido inactivo ocupe altura vertical vacia al final de la pagina.
4. En `DianInvoiceView`, los datos fiscales se distribuyen en grillas responsivas (`grid-cols-2 sm:grid-cols-4`, `grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3`) y la tabla de 7 columnas se aloja dentro de un contenedor `overflow-x-auto min-w-[560px]`, permitiendo el desplazamiento horizontal sin alterar el ancho del documento.

## 6. Decisiones de diseno y gotchas
- Altura fantasma en pantallas menores a 1280px: Originalmente el contenedor del inspector empleaba `w-full xl:w-0` cuando `isOpen === false`. Aunque los estilos internos aplicaban opacidad cero, el elemento conservaba dimensiones en el flujo vertical ocupando cientos de pixeles en moviles. Se resolvio aplicando `hidden xl:block xl:w-0` cuando no esta abierto.
- Legibilidad en facturas DIAN: La estructura fiscal requiere al menos 7 columnas tecnicas (numero, descripcion, cantidad, valor unitario, descuento, IVA, total). Forzarlas en pantallas de 320px causaba truncamiento severo. Se opto por mantener una anchura minima de tabla (`min-w-[560px]`) dentro de un contenedor con scroll horizontal visible.

## 7. Estado y ultimos cambios
- Eliminacion de altura fantasma en `sales-inspector-layout.tsx` mediante `hidden xl:block` en estado cerrado.
- Transformacion de grillas rigidas a breakpoints fluidos (`grid-cols-2 sm:grid-cols-4`, `grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3`) en `dian-invoice-view.tsx`.
- Envoltura de scroll horizontal en la tabla de partidas de `dian-invoice-view.tsx` para compatibilidad completa con navegadores moviles.

## 8. Como verificar
- Ejecutar chequeo de tipos estaticos:
  ```bash
  npm run typecheck
  ```
- Ejecutar suite de pruebas:
  ```bash
  npm test
  ```
- Ejecutar linter:
  ```bash
  npm run lint
  ```
- Verificacion manual en navegador: Acceder a `/sales` con viewport de 375px; verificar que no exista scroll vacio al fondo cuando el inspector esta inactivo. Abrir la vista de factura DIAN en un dispositivo movil y confirmar que las cifras monetarias y la tabla de productos no se desborden.
