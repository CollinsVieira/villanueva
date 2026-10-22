# 📋 Registro de Cambios y Mejoras del Sistema

Este documento recopila de manera detallada todos los cambios, nuevas funcionalidades, refactors y optimizaciones aplicadas recientemente en el sistema web de gestión de lotes y ventas.

---

## 📑 Tabla de Contenidos
1. [Gestión Documental de Contratos (Adendas y Escrituras)](#1-gestión-documental-de-contratos-adendas-y-escrituras)
2. [Ciclo de Vida del Lote y Nueva Modalidad "Separar Lote"](#2-ciclo-de-vida-del-lote-y-nueva-modalidad-separar-lote)
3. [Transición Automática de Estado tras Liquidar Pago Inicial](#3-transición-automática-de-estado-tras-liquidar-pago-inicial)
4. [Refactor y Nueva Vista en SalesList (Lista y Cuadrícula)](#4-refactor-y-nueva-vista-en-saleslist-lista-y-cuadrícula)
5. [Optimización de Rendimiento en Selectores y Dropdowns](#5-optimización-de-rendimiento-en-selectores-y-dropdowns)
6. [Refactor Integral de PaymentForm (Registro de Pagos)](#6-refactor-integral-de-paymentform-registro-de-pagos)
7. [Rediseño Completo de la Vista Detalle de Venta (SaleDetails)](#7-rediseño-completo-de-la-vista-detalle-de-venta-saledetails)
8. [Ajustes en Despliegue y Docker](#8-ajustes-en-despliegue-y-docker)
9. [Guía de Verificación y Testing](#9-guía-de-verificación-y-testing)

---

## 1. Gestión Documental de Contratos (Adendas y Escrituras)

### Objetivo
Permitir a los usuarios cargar, consultar, descargar y actualizar documentos adicionales asociados a una venta (específicamente **Adendas** y **Escrituras** en formato PDF), manteniendo el contrato como un archivo opcional.

### Cambios Implementados:
- **Backend (`sales/models.py`, `sales/serializers.py`):**
  - Se agregaron los campos `adenda_pdf` y `escritura_pdf` al modelo `Venta`.
  - Se configuró `contract_pdf`, `adenda_pdf` y `escritura_pdf` con validación de tipo (solo `.pdf`) y tamaño máximo (hasta 10MB).
  - El archivo `contract_pdf` dejó de ser obligatorio y ahora es opcional.
- **Frontend (`ContractDocumentsManagement.tsx`, `SaleForm.tsx`):**
  - Creación del componente `ContractDocumentsManagement.tsx` dentro del detalle de venta, permitiendo ver el estado de cada documento (cargado/pendiente), previsualizarlo o reemplazarlo individualmente.
  - Actualización del formulario de venta (`SaleForm.tsx`) para permitir la subida de los 3 documentos opcionales desde el momento de la creación o en la edición posterior.

---

## 2. Ciclo de Vida del Lote y Nueva Modalidad "Separar Lote"

### Objetivo
Soportar el flujo de separación de lotes previo a la venta definitiva: **Disponible → Separado / Reservado → Vendido → Liquidado**.

### Cambios Implementados:
- **Backend (`sales/models.py`, `lotes/models.py`):**
  - Se incorporó el estado `separado` a los `STATUS_CHOICES` del modelo `Venta`.
  - En el modelo `Lote`, cuando una venta activa tiene estado `'separado'`, el estado del lote es `'reservado'`. Cuando el estado de la venta es `'active'`, el lote pasa a `'vendido'`.
  - Se adaptaron los métodos `clean()`, `cancel_sale()`, `complete_sale()` y `get_active_sale_for_lote()` para considerar tanto ventas `active` como `separado`.
- **Frontend (`SaleForm.tsx`, `salesService.ts`):**
  - Se agregó el botón **"Separar lote"** (color amarillo/ámbar) al lado de "Crear Venta".
  - Al presionar "Separar lote", se envía `status: 'separado'` en el `FormData` al backend, registrando la venta como separada y el lote como reservado.

---

## 3. Transición Automática de Estado tras Liquidar Pago Inicial

### Objetivo
Al registrar pagos o abonos a la inicial de un lote separado, una vez que el saldo pendiente de la inicial llega a `0.00` (o menor), el lote debe convertirse automáticamente en **"Vendido"**.

### Cambios Implementados:
- **Backend (`sales/models.py`, `payments/models.py`):**
  - Métodos `is_initial_payment_complete()` y `get_initial_payment_balance()` agregados en `Venta`.
  - Al crearse o guardarse un pago de tipo `initial` (en `Payment.save()` y `Venta.register_initial_payment()`):
    - Si la venta estaba en estado `'separado'` y se verifica `is_initial_payment_complete() == True`:
      - La venta pasa automáticamente a estado `'active'`.
      - Se invoca `lote.update_status_from_sales()`, cambiando automáticamente el lote de `'reservado'` a `'vendido'`.
- **Frontend (`SaleDetails.tsx`, `InitialPaymentManagement.tsx`):**
  - Refresco automático de los detalles y métricas tras registrar abonos a la inicial.

---

## 4. Refactor y Nueva Vista en SalesList (Lista y Cuadrícula)

### Objetivo
Mejorar la visualización del listado de ventas, ofreciendo una vista alternativa en tarjetas (cuadrícula) y facilitando el filtrado entre ventas activas/separadas y ventas canceladas.

### Cambios Implementados:
- **Frontend (`SalesList.tsx`):**
  - **Selector de Vista:** Botones para alternar entre vista de **Tabla (Lista)** y vista de **Cuadrícula (Cards)**.
  - **Pestañas de Estado:** Pestaña de *Ventas Activas y Separadas* vs Pestaña de *Ventas Canceladas*.
  - **Diseño de Tarjetas en Cuadrícula:** Muestra de forma destacada el lote, cliente, precio, inicial, saldo pendiente, barra de progreso del plan y botones rápidos de acción.
  - Soporte visual completo para el estado `separado` con badge ámbar.

---

## 5. Optimización de Rendimiento en Selectores y Dropdowns

### Objetivo
Eliminar las demoras y bloqueos al desplegar listas de lotes o ventas, evitando consultas pesadas con historial o relaciones no requeridas.

### Cambios Implementados:
- **Backend (`lotes/views.py`, `sales/views.py`, `serializers.py`):**
  - Creación de la acción ultraligera `/api/lotes/lotes/selector/?status=...&search=...` con `LoteSelectorSerializer`.
  - Creación de la acción ultraligera `/api/sales/ventas/selector/?status=active,separado&search=...` con `VentaSelectorSerializer`.
  - Búsqueda directa en base de datos (`select_related`) filtrando por manzana, lote, nombre del cliente o DNI.
- **Frontend (`LoteSelector.tsx`, `VentaPaymentSelector.tsx`):**
  - Creación de componentes de selección rápida con búsqueda reactiva (`debounce` de 250ms), chips identificadores y visualización de estados en tiempo real.

---

## 6. Refactor Integral de PaymentForm (Registro de Pagos)

### Objetivo
Reestructurar completamente el modal de registro de pagos para agilizar la selección del lote/cliente y soportar de forma inteligente tanto ventas activas como lotes separados.

### Cambios Implementados:
- **Frontend (`PaymentForm.tsx`):**
  - Integración de `VentaPaymentSelector` para búsqueda instantánea de lotes y clientes.
  - **Flujo para Lotes Separados:**
    - Bloquea la modalidad exclusivamente a **Pago Inicial**.
    - Despliega tarjeta informativa ámbar indicando el saldo pendiente de inicial y explicando la transición automática a "Vendido".
    - Sugiere automáticamente el monto restante de la inicial.
  - **Flujo para Lotes Vendidos:**
    - Permite alternar entre **Cuota Mensual** y **Pago Inicial**.
    - En cuotas mensuales: carga el cronograma en segundo plano y pre-selecciona la cuota prioritaria (vencidas primero, luego pendientes o parciales) con identificadores visuales (🔴 Vencida, 🟡 Parcial, 🟢 Pendiente).
  - Cajas de subida de archivos (Voucher y Boleta) con previsualización del nombre del archivo y eliminación rápida.

---

## 7. Rediseño Completo de la Vista Detalle de Venta (SaleDetails)

### Objetivo
Elevar la calidad visual y la experiencia de usuario del detalle de venta a un estándar moderno, claro y profesional.

### Cambios Implementados:
- **Frontend (`SaleDetails.tsx`):**
  - **Hero Header en Gradiente Oscuro:** Banner superior con chip del lote (`Mz. A - Lt. 1`), cliente, DNI y badges de estado de la venta y del lote.
  - **Fila de KPIs / Métricas Clave:** 4 tarjetas visibles con Precio Total, Pago Inicial, Saldo Pendiente y Progreso de Amortización.
  - **Bento Grid de Información Estructurada:** Tarjetas ordenadas para datos del lote, cliente y contrato/vencimientos.
  - **Barra de Pestañas Moderna:** Pestañas interactivas para *Plan de Pagos*, *Cronograma de Cuotas*, *Pago Inicial* y *Documentación*.
  - **Accesos Rápidos a Documentos:** Botones para ver contrato y descargar en PDF el cronograma, historial de pagos y boletas.

---

## 8. Ajustes en Despliegue y Docker

### Objetivo
Garantizar despliegues continuos estables en servidores Dokploy / Docker sin errores de construcción en frontend.

### Cambios Implementados:
- **`frontend/dockerfile` y `nginx/Dockerfile`:**
  - Fijación de `pnpm@9` (`npm install -g pnpm@9`) para evitar bloqueos por políticas de ciclo de vida de pnpm 10 (`ERR_PNPM_IGNORED_BUILDS`).
  - Limpieza de variables y módulos no utilizados para compilación estricta con `tsc -b`.

---

## 9. Guía de Verificación y Testing

| Módulo | Acción a Probar | Resultado Esperado |
|---|---|---|
| **Ventas (Crear)** | Seleccionar lote, cliente y presionar **"Separar lote"**. | La venta se crea con estado `Separado` y el lote pasa a `Reservado`. |
| **Ventas (Detalle)** | Abrir una venta en estado `Separado` y revisar encabezado. | Se muestra el badge `Venta Separada` y `Lote Reservado`. |
| **Pagos (Modal)** | Abrir `PaymentForm` y buscar un lote en estado `Separado`. | El tipo de pago se fija en **Pago Inicial**, se muestra el saldo pendiente y se bloquean cuotas. |
| **Pagos (Transición)** | Completar el saldo pendiente del pago inicial. | La venta pasa automáticamente a `Activa` y el lote a `Vendido`. |
| **Documentos** | Cargar Contrato, Adenda o Escritura en el detalle de la venta. | Los archivos se guardan, se pueden previsualizar y descargar en PDF. |
| **Lista de Ventas** | Alternar entre vista Lista y vista Cuadrícula en `SalesList`. | La información se reorganiza fluidamente en tarjetas interactivas. |
