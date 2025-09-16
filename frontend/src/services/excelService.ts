import * as XLSX from "xlsx";
import {
  Report,
  CustomerDebtData,
  PaymentHistoryData,
  AvailableLotsData,
  FinancialOverviewData,
} from "../types";
import DateService from "./dateService";

export interface ExcelExportOptions {
  sheetName?: string;
  filename?: string;
}

class ExcelService {
  private defaultOptions: ExcelExportOptions = {
    sheetName: "Reporte",
    filename: "reporte",
  };

  // Exportar datos de deuda de clientes
  exportCustomerDebt(
    data: CustomerDebtData,
    report: Report,
    options?: ExcelExportOptions
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja de resumen
    const summaryData = [
      ["RESUMEN EJECUTIVO"],
      [""],
      [
        "Total de clientes con deuda",
        data.total_customers_with_debt.toString(),
      ],
      ["Monto total adeudado", data.total_debt_amount.toString()],
      [""],
      ["Generado", new Date().toLocaleDateString("es-PE")],
      ["Reporte", report.name],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

    // Hoja de clientes
    const customersData = [
      [
        "Cliente",
        "Email",
        "Teléfono",
        "Deuda Total",
        "Cuotas Pendientes",
        "Lotes",
      ],
    ];

    data.customers.forEach((customer, index) => {
      const lotesInfo = customer.lotes
        .map((l) => `${l.lote_description} (S/. ${l.remaining_balance})`)
        .join("; ");

      const customerRow = [
        customer.customer_name,
        customer.customer_email || "",
        customer.customer_phone || "",
        customer.total_debt.toString(),
        customer.pending_installments.toString(),
        lotesInfo,
      ];

      customersData.push(customerRow);
    });

    const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
    XLSX.utils.book_append_sheet(wb, customersSheet, "Clientes");

    // Hoja de lotes detallada
    const lotesData = [
      [
        "Cliente",
        "Lote",
        "Saldo Restante",
        "Pagos Realizados",
        "Meses de Financiamiento",
        "Día de Pago",
        "Días hasta Próximo Pago",
      ],
    ];

    data.customers.forEach((customer, customerIndex) => {
      customer.lotes.forEach((lote, loteIndex) => {
        const loteRow = [
          customer.customer_name,
          lote.lote_description,
          lote.remaining_balance.toString(),
          lote.total_payments_made.toString(),
          lote.financing_months.toString(),
          lote.payment_day.toString(),
          lote.days_until_next_payment
            ? lote.days_until_next_payment < 0
              ? `Venció hace ${Math.abs(lote.days_until_next_payment)} Días`
              : lote.days_until_next_payment.toString()
            : "Vence hoy",
        ];

        lotesData.push(loteRow);
      });
    });

    const lotesSheet = XLSX.utils.aoa_to_sheet(lotesData);
    XLSX.utils.book_append_sheet(wb, lotesSheet, "Lotes Detallados");

    // Guardar archivo
    const filename = `${opts.filename || "deuda_clientes"}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Exportar historial de pagos
  exportPaymentHistory(
    data: PaymentHistoryData,
    report: Report,
    options?: ExcelExportOptions
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    const wb = XLSX.utils.book_new();

    // Hoja de resumen
    const summaryData = [
      ["RESUMEN DE PAGOS"],
      [""],
      ["Total de pagos", data.total_payments.toString()],
      ["Monto total", data.total_amount.toString()],
      [""],
      ["Generado", new Date().toLocaleDateString("es-PE")],
      ["Reporte", report.name],
    ];

    if (data.period.start_date || data.period.end_date) {
      summaryData.push([
        "Período",
        `${data.period.start_date || "Inicio"} - ${
          data.period.end_date || "Actualidad"
        }`,
      ]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

    // Hoja de pagos
    const paymentsData = [
      [
        "Fecha",
        "Cliente",
        "Lote",
        "Monto",
        "Método",
        "Número de Recibo",
        "Número de Cuota",
        "Notas",
      ],
    ];

    data.payments.forEach((payment, index) => {
      const paymentRow = [
        DateService.utcToLocalDateOnly(payment.payment_date),
        payment.customer,
        payment.lote,
        payment.amount.toString(),
        payment.method,
        payment.receipt_number || "",
        payment.installment_number ? payment.installment_number.toString() : "",
        payment.notes || "",
      ];

      paymentsData.push(paymentRow);
    });

    const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, paymentsSheet, "Pagos");

    // Hoja de resumen por método
    const methodData = [["Método de Pago", "Cantidad", "Total"]];

    // Agrupar por método
    const methodSummary = data.payments.reduce((acc, payment) => {
      if (!acc[payment.method]) {
        acc[payment.method] = { count: 0, total: 0 };
      }
      acc[payment.method].count++;
      acc[payment.method].total += payment.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    Object.entries(methodSummary).forEach(([method, summary]) => {
      methodData.push([
        method,
        summary.count.toString(),
        summary.total.toString(),
      ]);
    });

    const methodSheet = XLSX.utils.aoa_to_sheet(methodData);
    XLSX.utils.book_append_sheet(wb, methodSheet, "Resumen por Método");

    const filename = `${opts.filename || "historial_pagos"}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Exportar lotes disponibles
  exportAvailableLots(
    data: AvailableLotsData,
    report: Report,
    options?: ExcelExportOptions
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    const wb = XLSX.utils.book_new();

    // Hoja de resumen
    const summaryData = [
      ["RESUMEN DE INVENTARIO"],
      [""],
      ["Total de lotes", data.summary.total_count.toString()],
      ["Área total (m²)", data.summary.total_area.toString()],
      ["Valor total", data.summary.total_value.toString()],
      ["Precio promedio/m²", data.summary.avg_price_per_m2.toString()],
      [""],
      ["Generado", new Date().toLocaleDateString("es-PE")],
      ["Reporte", report.name],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

    // Hoja de lotes
    const lotsData = [
      [
        "Manzana",
        "Lote",
        "Área (m²)",
        "Precio",
        "Precio/m²",
        "Enganche",
        "Meses de Financiamiento",
      ],
    ];

    data.lots.forEach((lot, index) => {
      const lotRow = [
        lot.block,
        lot.lot_number,
        lot.area.toString(),
        lot.price.toString(),
        lot.price_per_m2.toString(),
        lot.initial_payment.toString(),
        lot.financing_months.toString(),
      ];

      lotsData.push(lotRow);
    });

    const lotsSheet = XLSX.utils.aoa_to_sheet(lotsData);
    XLSX.utils.book_append_sheet(wb, lotsSheet, "Lotes");

    const filename = `${opts.filename || "lotes_disponibles"}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Exportar reporte financiero
  exportFinancialOverview(
    data: FinancialOverviewData,
    report: Report,
    options?: ExcelExportOptions
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    const wb = XLSX.utils.book_new();

    // Hoja de resumen ejecutivo
    const summaryData = [
      ["RESUMEN FINANCIERO EJECUTIVO"],
      [""],
      ["VENTAS"],
      [
        "Total de lotes vendidos",
        data.sales?.total_lots_sold?.toString() || "0",
      ],
      [
        "Valor total de ventas",
        data.sales?.total_sales_value?.toString() || "0",
      ],
      [
        "Total de enganches",
        data.sales?.total_initial_payments?.toString() || "0",
      ],
      [""],
      ["PAGOS"],
      ["Total de pagos", data.payments?.total_payments?.toString() || "0"],
      ["Monto total de pagos", data.payments?.total_amount?.toString() || "0"],
      [""],
      ["INVENTARIO"],
      ["Lotes disponibles", data.inventory?.available_lots?.toString() || "0"],
      [
        "Valor del inventario",
        data.inventory?.available_value?.toString() || "0",
      ],
      [
        "Área total disponible (m²)",
        data.inventory?.total_available_area?.toString() || "0",
      ],
      [""],
      ["CUENTAS POR COBRAR"],
      [
        "Clientes con deuda",
        data.receivables?.customers_with_debt?.toString() || "0",
      ],
      ["Deuda total", data.receivables?.total_debt?.toString() || "0"],
      [""],
      ["KPIs"],
      ["Tasa de conversión (%)", data.kpis?.conversion_rate?.toString() || "0"],
      ["Pago promedio", data.kpis?.average_payment?.toString() || "0"],
      [
        "Eficiencia de cobranza (%)",
        data.kpis?.collection_efficiency?.toString() || "0",
      ],
      [""],
      ["Generado", new Date().toLocaleDateString("es-PE")],
      ["Reporte", report.name],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen Ejecutivo");

    // Hoja de ventas detalladas
    if (data.sales) {
      const salesData = [
        ["MÉTRICAS DE VENTAS"],
        [""],
        ["Métrica", "Valor", "Descripción"],
      ];

      Object.entries(data.sales).forEach(([key, value]) => {
        let description = "";
        switch (key) {
          case "total_lots_sold":
            description = "Número total de lotes vendidos";
            break;
          case "total_sales_value":
            description = "Valor total de todas las ventas";
            break;
          case "total_initial_payments":
            description = "Total de enganches recibidos";
            break;
          default:
            description = key;
        }

        salesData.push([key, value?.toString() || "0", description]);
      });

      const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, salesSheet, "Ventas");
    }

    // Hoja de pagos detallados
    if (data.payments) {
      const paymentsData = [
        ["MÉTRICAS DE PAGOS"],
        [""],
        ["Métrica", "Valor", "Descripción"],
      ];

      Object.entries(data.payments).forEach(([key, value]) => {
        let description = "";
        switch (key) {
          case "total_payments":
            description = "Número total de pagos realizados";
            break;
          case "total_amount":
            description = "Monto total de todos los pagos";
            break;
          default:
            description = key;
        }

        paymentsData.push([key, value?.toString() || "0", description]);
      });

      const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(wb, paymentsSheet, "Pagos");
    }

    // Hoja de inventario detallado
    if (data.inventory) {
      const inventoryData = [
        ["MÉTRICAS DE INVENTARIO"],
        [""],
        ["Métrica", "Valor", "Descripción"],
      ];

      Object.entries(data.inventory).forEach(([key, value]) => {
        let description = "";
        switch (key) {
          case "available_lots":
            description = "Número de lotes disponibles para venta";
            break;
          case "available_value":
            description = "Valor total del inventario disponible";
            break;
          case "total_available_area":
            description = "Área total disponible en metros cuadrados";
            break;
          default:
            description = key;
        }

        inventoryData.push([key, value?.toString() || "0", description]);
      });

      const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(wb, inventorySheet, "Inventario");
    }

    // Hoja de cuentas por cobrar
    if (data.receivables) {
      const receivablesData = [
        ["CUENTAS POR COBRAR"],
        [""],
        ["Métrica", "Valor", "Descripción"],
      ];

      Object.entries(data.receivables).forEach(([key, value]) => {
        let description = "";
        switch (key) {
          case "customers_with_debt":
            description = "Número de clientes con deuda pendiente";
            break;
          case "total_debt":
            description = "Monto total de deuda pendiente";
            break;
          default:
            description = key;
        }

        receivablesData.push([key, value?.toString() || "0", description]);
      });

      const receivablesSheet = XLSX.utils.aoa_to_sheet(receivablesData);
      XLSX.utils.book_append_sheet(wb, receivablesSheet, "Cuentas por Cobrar");
    }

    // Hoja de KPIs
    if (data.kpis) {
      const kpisData = [
        ["INDICADORES CLAVE DE RENDIMIENTO (KPIs)"],
        [""],
        ["KPI", "Valor", "Descripción"],
      ];

      Object.entries(data.kpis).forEach(([key, value]) => {
        let description = "";
        switch (key) {
          case "conversion_rate":
            description = "Porcentaje de conversión de leads a ventas";
            break;
          case "average_payment":
            description = "Pago promedio por transacción";
            break;
          case "collection_efficiency":
            description = "Porcentaje de eficiencia en cobranza";
            break;
          default:
            description = key;
        }

        kpisData.push([key, value?.toString() || "0", description]);
      });

      const kpisSheet = XLSX.utils.aoa_to_sheet(kpisData);
      XLSX.utils.book_append_sheet(wb, kpisSheet, "KPIs");
    }

    // Guardar archivo
    const filename = `${opts.filename || "resumen_financiero"}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Método principal para exportar reporte basado en tipo
  exportReport(report: Report, options?: ExcelExportOptions): void {
    if (!report.data || report.status !== "completed") {
      throw new Error("El reporte debe estar completado para exportar a Excel");
    }

    try {
      const filename =
        options?.filename || report.name.replace(/\s+/g, "_").toLowerCase();

      switch (report.report_type) {
        case "customers_debt":
          this.exportCustomerDebt(report.data as CustomerDebtData, report, {
            ...options,
            filename,
          });
          break;
        case "payments_history":
          this.exportPaymentHistory(report.data as PaymentHistoryData, report, {
            ...options,
            filename,
          });
          break;
        case "available_lots":
          this.exportAvailableLots(report.data as AvailableLotsData, report, {
            ...options,
            filename,
          });
          break;
        case "financial_overview":
          this.exportFinancialOverview(
            report.data as FinancialOverviewData,
            report,
            { ...options, filename }
          );
          break;
        case "pending_installments":
          this.exportPendingInstallments(report.data, report, {
            ...options,
            filename,
          });
          break;
        default:
          this.exportGenericReport(report, { ...options, filename });
          break;
      }
    } catch (error) {
      console.error("❌ Error exporting to Excel:", error);
      throw new Error("Error al exportar el reporte a Excel");
    }
  }

  // Exportar cuotas pendientes
  exportPendingInstallments(
    data: any,
    report: Report,
    options?: ExcelExportOptions
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    const wb = XLSX.utils.book_new();

    // Hoja de resumen ejecutivo
    const summaryData = [
      ["RESUMEN"],
      [""],
      [
        "Total de clientes con cuotas pendientes",
        data.summary?.total_customers_with_pending?.toString() || "0",
      ],
      [
        "Total de cuotas vencidas",
        data.summary?.total_overdue_installments?.toString() || "0",
      ],
      [""],
      ["Vencidos", data.summary?.overdue_customers?.toString() || "0"],
      [
        "Próximos a vencer",
        data.summary?.due_soon_customers?.toString() || "0",
      ],
      [""],
      ["Generado", new Date().toLocaleDateString("es-PE")],
      ["Reporte", report.name],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "RESUMEN");

    // Hoja de clientes
    const customersData = [
      [
        "Cliente",
        "Teléfono",
        "Cuotas Pendientes",
        "Cuotas Vencidas",
        "Días Vencidos",
        "Lote Asignado",
        "Saldo Restante",
      ],
    ];

    if (data.all_customers && Array.isArray(data.all_customers)) {
      data.all_customers.forEach((customer: any) => {
        const lotesInfo =
          customer.lotes?.map((l: any) => `${l.lote_description}`).join("; ") ||
          "Sin lotes";
        const overdueInstallments =
          customer.lotes
            ?.map((l: any) => `${l.overdue_installments}`)
            .join("; ") || "0";
        const daysOverdue =
          customer.lotes?.map((l: any) => `${l.days_overdue}`).join("; ") ||
          "0";

        const customerRow = [
          customer.customer_name || "Sin nombre",
          customer.customer_phone || "Sin teléfono",
          customer.total_pending_installments?.toString() || "0",
          overdueInstallments,
          daysOverdue,
          lotesInfo,
          "S/. " + customer.total_pending_amount?.toString() || "S/. 0",
        ];

        customersData.push(customerRow);
      });
    }

    const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
    XLSX.utils.book_append_sheet(wb, customersSheet, "DATOS");

    // Guardar archivo
    const filename = `${opts.filename || "cuotas_pendientes"}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // Exportar reporte genérico
  private exportGenericReport(
    report: Report,
    options?: ExcelExportOptions
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    const wb = XLSX.utils.book_new();

    // Hoja de información del reporte
    const infoData = [
      ["INFORMACIÓN DEL REPORTE"],
      [""],
      ["Nombre", report.name],
      ["Tipo", report.report_type_display],
      ["Descripción", report.description || "Sin descripción"],
      ["Estado", report.status_display],
      ["Solicitado por", report.requested_by_name],
      [
        "Generado",
        report.generated_at
          ? new Date(report.generated_at).toLocaleDateString("es-PE")
          : "N/A",
      ],
      [""],
      ["Datos del Reporte"],
    ];

    const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, infoSheet, "Información");

    // Hoja de datos
    if (report.data) {
      try {
        const dataSheet = XLSX.utils.json_to_sheet([report.data]);
        XLSX.utils.book_append_sheet(wb, dataSheet, "Datos");
      } catch (error) {
        // Si no se puede convertir a JSON, crear hoja con datos como texto
        const dataText = JSON.stringify(report.data, null, 2).split("\n");
        const dataArray = dataText.map((line) => [line]);
        const dataSheet = XLSX.utils.aoa_to_sheet(dataArray);
        XLSX.utils.book_append_sheet(wb, dataSheet, "Datos");
      }
    }

    const filename = `${opts.filename || "reporte_generico"}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }
}

export const excelService = new ExcelService();
export default excelService;
