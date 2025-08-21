# Sistema de Reportes - Frontend

## 📋 Descripción

El sistema de reportes proporciona una interfaz completa para generar, visualizar y descargar reportes del negocio inmobiliario.

## 🚀 Características Principales

### 📊 Tipos de Reportes Disponibles

1. **Clientes con Deuda** (`customers_debt`)
   - Lista clientes con saldos pendientes
   - Muestra días hasta próximo vencimiento
   - Detalle por lote y cuotas pendientes

2. **Historial de Pagos** (`payments_history`)
   - Registro completo de pagos realizados
   - Filtros por fecha, método y cliente
   - Análisis de tendencias de cobranza

3. **Lotes Disponibles** (`available_lots`)
   - Inventario completo de lotes para venta
   - Valoración total del inventario
   - Filtros por manzana, precio y área

4. **Resumen de Ventas** (`sales_summary`)
   - Métricas de ventas por período
   - Análisis de performance comercial

5. **Resumen Financiero** (`financial_overview`)
   - Vista integral del estado financiero
   - KPIs principales del negocio

6. **Cuotas Pendientes** (`pending_installments`)
   - Seguimiento de cuotas por vencer
   - Proyecciones de cobranza

7. **Cobranzas Mensuales** (`monthly_collections`)
   - Análisis temporal de ingresos
   - Desglose por método de pago

## 🏗️ Arquitectura de Componentes

```
src/
├── components/Reports/
│   ├── ReportsHeader.tsx      # Header con filtros y acciones
│   ├── ReportCard.tsx         # Tarjeta individual de reporte
│   ├── CreateReportModal.tsx  # Modal para crear reportes
│   ├── ReportViewer.tsx       # Visor principal de reportes
│   └── views/                 # Vistas específicas por tipo
│       ├── CustomerDebtView.tsx
│       ├── PaymentHistoryView.tsx
│       ├── AvailableLotsView.tsx
│       └── GenericReportView.tsx
├── pages/
│   └── Reports.tsx            # Página principal de reportes
├── services/
│   ├── reportsService.ts      # API de comunicación con backend
│   └── pdfService.ts          # Generación de PDFs
└── types/
    └── index.ts               # Tipos TypeScript para reportes
```

## 🎨 Características de UI/UX

### Diseño Profesional
- **Cards interactivas** con estados visuales claros
- **Filtros avanzados** para búsqueda y organización
- **Iconografía consistente** para cada tipo de reporte
- **Estados de carga** y feedback visual

### Experiencia de Usuario
- **Búsqueda en tiempo real** en todos los reportes
- **Ordenamiento múltiple** (fecha, monto, cliente, etc.)
- **Vista responsive** adaptable a diferentes pantallas
- **Navegación intuitiva** con breadcrumbs y estados

### Visualización de Datos
- **Tablas interactivas** con ordenamiento
- **Cards expandibles** para detalles adicionales
- **Indicadores visuales** de urgencia y estado
- **Métricas destacadas** con diseño de dashboard

## 📄 Funcionalidad PDF

### Generación Automática
- **PDFs nativos** generados con jsPDF
- **Formato profesional** con headers y footers
- **Datos estructurados** con tablas y resúmenes
- **Responsive** para diferentes tamaños de página

### Tipos de PDF Específicos
- **Reporte de Deudas**: Lista detallada por cliente con vencimientos
- **Historial de Pagos**: Tabla cronológica con detalles completos
- **Lotes Disponibles**: Inventario con especificaciones técnicas
- **Reportes Genéricos**: JSON estructurado para datos complejos

## 🔧 Servicios y APIs

### ReportsService
```typescript
// Obtener todos los reportes
const reports = await reportsService.getReports();

// Crear nuevo reporte
const newReport = await reportsService.createReport({
  name: "Reporte Mensual",
  report_type: "customers_debt",
  start_date: "2024-01-01",
  end_date: "2024-01-31"
});

// Generar datos del reporte
await reportsService.generateReport(reportId);

// Descargar reporte
const blob = await reportsService.downloadReport(reportId);
```

### PDFService
```typescript
// Generar PDF específico por tipo
pdfService.generateReportPDF(report);

// Generar PDF desde elemento HTML
await pdfService.generateFromElement(element, "reporte.pdf");
```

## 🎯 Estados y Flujo de Trabajo

### Estados de Reporte
1. **Pendiente** - Recién creado, listo para generar
2. **Procesando** - Generando datos del reporte
3. **Completado** - Datos listos, disponible para descarga
4. **Fallido** - Error en generación, necesita reintento

### Flujo Típico de Usuario
1. **Crear Reporte** → Seleccionar tipo y parámetros
2. **Generar Datos** → Procesar información del backend
3. **Visualizar** → Explorar datos en interfaz interactiva
4. **Descargar PDF** → Obtener documento para archivo/impresión

## 🔍 Características Avanzadas

### Filtrado Inteligente
- **Búsqueda semántica** en nombres y descripciones
- **Filtros combinados** por tipo, estado, fecha
- **Persistencia de filtros** durante la sesión

### Gestión de Estado
- **Cache local** para reportes frecuentes
- **Actualización automática** de estados
- **Sincronización** con backend en tiempo real

### Responsive Design
- **Mobile-first** approach
- **Breakpoints optimizados** para tablets y desktop
- **Touch-friendly** controles para dispositivos móviles

## 🛠️ Tecnologías Utilizadas

- **React 19** con TypeScript
- **Tailwind CSS** para estilos
- **React Hook Form** para formularios
- **jsPDF + html2canvas** para generación de PDFs
- **Lucide React** para iconografía
- **React Hot Toast** para notificaciones
- **Axios** para comunicación con APIs

## 📱 Compatibilidad

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🔮 Funcionalidades Futuras

- **Reportes programados** con envío automático
- **Dashboard de métricas** en tiempo real
- **Exportación a Excel** y otros formatos
- **Reportes comparativos** entre períodos
- **Gráficos interactivos** con Chart.js/Recharts
- **Plantillas personalizables** de reportes
