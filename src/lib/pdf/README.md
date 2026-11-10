# Modulo de Generacion de Documentos PDF (src/lib/pdf)

## 1. Proposito y alcance
El modulo de generacion de documentos PDF es responsable de construir y renderizar comprobantes descargables vectoriales e imprimibles de alta precision para Nova ERP utilizando el motor `@react-pdf/renderer`. Genera facturas de venta oficiales, comprobantes de consumo y cuentas de cobro de mesa para el sector gastronomico (`restaurant_gastronomy`), recibos individuales de pago y estados de cuenta de cartera a credito. Mantiene paridad visual, jerarquica y de contenido con las representaciones HTML de mostrador (`dian-invoice-view.tsx`).

## 2. Contratos y API
### Funciones de Renderizado Principales
- `renderInvoicePdf(sale: InvoiceSale, settings?: PdfSettings): Promise<Uint8Array>`
  - Recibe el modelo de venta con sus items y el snapshot de configuracion `PdfSettings`.
  - Retorna un `Uint8Array` con los bytes binarios del documento PDF estructurado en hoja A4.
- `renderReceiptPdf(sale: ReceiptSale, paymentId: string, receiptNumber: string, settings?: PdfSettings): Promise<Uint8Array>`
  - Retorna el comprobante de abono de caja para un pago especifico.
- `renderCreditStatementPdf(sale: CreditSale, settings?: PdfSettings): Promise<Uint8Array>`
  - Retorna el extracto de cuenta corriente de cartera con plan de cuotas y amortizaciones.
- `loadPdfSettings(): Promise<PdfSettings | undefined>`
  - Carga la configuracion vigente desde `SystemSettings` combinada con el sector comercial de `StoreSetting` (`business_workflow`) via `getBusinessWorkflowConfig()`.

### Tipos e Interfaces
- `PdfSettings`:
  ```typescript
  export interface PdfSettings {
    companyName: string
    companyNit: string | null
    companyAddress: string | null
    companyCity: string | null
    companyPhone: string | null
    companyEmail: string | null
    invoicePrefix: string
    invoiceFooter: string | null
    currency: string
    sector?: BusinessSector
  }
  ```
- `InvoiceSale`: DTO que define la venta, items con descripcion y totales, desglose de impuestos, cliente y cajero.

## 3. Dependencias
- Consume:
  - `@react-pdf/renderer`: Motor nativo de construccion de arboles de renderizado PDF.
  - `@/lib/prisma`: Instancia de acceso a base de datos para carga de configuraciones en `load.ts`.
  - `@/modules/settings/settings.service`: `getBusinessWorkflowConfig()` para inyeccion del sector comercial.
  - `@/lib/format`: Funciones puras de moneda (`formatCurrency`, `money`), palabras (`formatCurrencyInWords`) y generacion de `CUFE`.
  - `@/lib/labels`: Etiquetas de metodos de pago y estado de credito.
- Proveedor de:
  - Consumido por rutas de API HTTP en `src/app/api/sales/[id]/pdf/route.ts`, `receipt/[paymentId]/pdf/route.ts` y `credit-statement/pdf/route.ts`.

## 4. Mapa de archivos
- `src/lib/pdf/theme.ts`: Paleta de colores slate/emerald/amber, tipografias Helvetica, constantes de logo y definicion de interfaces `PdfSettings`, `PdfCompany` y resolucion de empresas.
- `src/lib/pdf/load.ts`: Funcion asincrona `loadPdfSettings` para carga consolidada de parametros de emisor y sector comercial desde base de datos.
- `src/lib/pdf/invoice.tsx`: Componente `InvoiceDocument` y funcion `renderInvoicePdf` para facturas fiscales y comprobantes de consumo de gastronomia.
- `src/lib/pdf/receipt.tsx`: Componente de recibo de caja individual por abono de credito.
- `src/lib/pdf/credit-statement.tsx`: Componente de estado de cuenta de cuotas de cartera.
- `src/lib/pdf/index.ts`: Barrel de exportacion publica del modulo PDF.
- `src/lib/pdf/pdf.test.ts`: Pruebas de generacion y validacion de encabezado `%PDF-` para documentos emitidos.

## 5. Logica y flujo
1. La peticion HTTP arriba a `/api/sales/[id]/pdf`.
2. El endpoint consulta la venta en Prisma e invoca `loadPdfSettings()`.
3. `loadPdfSettings()` recupera en paralelo `SystemSettings` y `getBusinessWorkflowConfig()`, inyectando `sector: workflow.sector` en el objeto `PdfSettings`.
4. Se ejecuta `renderInvoicePdf(sale, settings)`.
5. Si `settings.sector === 'restaurant_gastronomy'`:
   - El encabezado adopta el titulo `'COMPROBANTE DE CONSUMO / FACTURA DE VENTA'`.
   - El destinatario se etiqueta como `'MESA / COMENSAL'` (con fallback a `'Mesa General / Consumidor Final'`).
   - El personal se etiqueta como `'Mesero / Atención: <nombre>'` (con fallback a `'Personal de Servicio'`).
   - La fecha se etiqueta como `'FECHA DE CONSUMO'`.
   - La columna de productos se titula `'PLATILLO / BEBIDA / CONSUMO'`.
   - En la seccion de totales se anexa el desglose de **Propina voluntaria sugerida (10%)** y **TOTAL CON PROPINA SUGERIDA**.
   - Se incorpora el bloque legal conforme a la Ley 1935 de 2018 sobre voluntariedad de la propina y soporte de consumo de mesa.
   - Se suprimen los campos de cartera a credito (vencimiento, saldos y abonos previos).
6. Si el sector es cualquiera de los otros 7 (e.g. `retail_general`), se renderiza la estructura clasica de factura fiscal mercantil con fecha de vencimiento y estado de credito si aplica.
7. `@react-pdf/renderer` serializa el arbol en buffer binario y el endpoint responde con encabezados `application/pdf` y `attachment`.

## 6. Decisiones de diseno y gotchas
- React-pdf en entorno Node: `@react-pdf/renderer` ejecuta renderizado nativo en servidor; no utiliza el DOM. Por tanto, las reglas de ESLint de accesibilidad DOM (como `jsx-a11y/alt-text`) se encuentran desactivadas para esta carpeta en `eslint.config.mjs`.
- Paridad con DianInvoiceView: Todo cambio de estructura o campos en `dian-invoice-view.tsx` debe reflejarse en `invoice.tsx` para asegurar que el usuario vea exactamente lo mismo en la pantalla de cobro, al imprimir por navegador y al descargar el PDF adjunto.
- Propina voluntaria sugerida: De acuerdo con la regulacion colombiana (Ley 1935 de 2018 y normatividad SIC), la propina no puede sumarse directamente al total fiscal obligatorio sin el consentimiento expreso del cliente. Por ende, se presenta el total legal obligatorio y, adicionalmente, la fila de propina sugerida y total con propina como referencia clara para el comensal.

## 7. Estado y ultimos cambios
- Adaptacion para sector Restaurantes y Gastronomia (Milestone 3):
  - Incorporacion de `sector?: BusinessSector` en `PdfSettings` (`theme.ts`).
  - Inyeccion de `sector` desde `getBusinessWorkflowConfig()` en `loadPdfSettings()` (`load.ts`).
  - Adaptacion tipografica y estructural en `invoice.tsx` para emitir comprobantes de consumo con mesa, mesero, platillos/bebidas, propina sugerida del 10% y leyenda de la Ley 1935 de 2018.

## 8. Como verificar
- Ejecutar pruebas unitarias de generacion PDF:
  ```bash
  npx vitest run src/lib/pdf/
  ```
- Ejecutar pruebas cruzadas de comprobantes HTML y PDF:
  ```bash
  npx vitest run src/components/sales/dian-invoice-gastronomy.test.ts
  ```
- Comprobar tipado estatico:
  ```bash
  npm run typecheck
  ```
- Comprobar reglas de linter:
  ```bash
  npm run lint
  ```
