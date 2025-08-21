import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Report, CustomerDebtData, PaymentHistoryData, AvailableLotsData } from '../types';
import { reportsService } from './reportsService';

export interface PDFOptions {
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
}

class PDFService {
  private defaultOptions: PDFOptions = {
    format: 'a4',
    orientation: 'portrait',
    quality: 1.5
  };

  // Generar PDF desde elemento HTML
  async generateFromElement(element: HTMLElement, filename: string, options?: PDFOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const canvas = await html2canvas(element, {
        scale: opts.quality,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: opts.orientation,
        unit: 'mm',
        format: opts.format
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Error al generar el PDF');
    }
  }

  // Generar PDF de reporte de deudas
  generateCustomerDebtPDF(report: Report, data: CustomerDebtData): void {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REPORTE DE CLIENTES CON DEUDA', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 20, yPosition);
    
    if (report.start_date || report.end_date) {
      yPosition += 6;
      const period = `Período: ${report.start_date ? reportsService.formatDate(report.start_date) : 'Inicio'} - ${report.end_date ? reportsService.formatDate(report.end_date) : 'Actualidad'}`;
      pdf.text(period, 20, yPosition);
    }

    yPosition += 15;

    // Summary
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN EJECUTIVO', 20, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de clientes con deuda: ${data.total_customers_with_debt}`, 25, yPosition);
    yPosition += 6;
    pdf.text(`Monto total adeudado: ${reportsService.formatCurrency(data.total_debt_amount)}`, 25, yPosition);
    yPosition += 15;

    // Client details
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLE POR CLIENTE', 20, yPosition);
    yPosition += 10;

    data.customers.forEach((customer, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${customer.customer_name}`, 25, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      if (customer.customer_email) {
        pdf.text(`Email: ${customer.customer_email}`, 30, yPosition);
        yPosition += 5;
      }
      if (customer.customer_phone) {
        pdf.text(`Teléfono: ${customer.customer_phone}`, 30, yPosition);
        yPosition += 5;
      }
      
      pdf.text(`Deuda total: ${reportsService.formatCurrency(customer.total_debt)}`, 30, yPosition);
      yPosition += 5;
      pdf.text(`Cuotas pendientes: ${customer.pending_installments}`, 30, yPosition);
      yPosition += 8;

      // Lotes details
      customer.lotes.forEach((lote) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`• ${lote.lote_description}`, 35, yPosition);
        yPosition += 5;
        pdf.text(`  Saldo: ${reportsService.formatCurrency(lote.remaining_balance)}`, 40, yPosition);
        yPosition += 5;
        
        if (lote.days_until_next_payment !== null && lote.days_until_next_payment !== undefined) {
          const daysText = lote.days_until_next_payment > 0 
            ? `${lote.days_until_next_payment} días para próximo pago`
            : `Pago vencido hace ${Math.abs(lote.days_until_next_payment)} días`;
          pdf.text(`  ${daysText}`, 40, yPosition);
          yPosition += 5;
        }
        yPosition += 3;
      });
      
      yPosition += 5;
    });

    pdf.save(`${report.name}.pdf`);
  }

  // Generar PDF de historial de pagos
  generatePaymentHistoryPDF(report: Report, data: PaymentHistoryData): void {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HISTORIAL DE PAGOS', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 20, yPosition);
    
    if (data.period.start_date || data.period.end_date) {
      yPosition += 6;
      const period = `Período: ${data.period.start_date ? reportsService.formatDate(data.period.start_date) : 'Inicio'} - ${data.period.end_date ? reportsService.formatDate(data.period.end_date) : 'Actualidad'}`;
      pdf.text(period, 20, yPosition);
    }

    yPosition += 15;

    // Summary
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN', 20, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de pagos: ${data.total_payments}`, 25, yPosition);
    yPosition += 6;
    pdf.text(`Monto total: ${reportsService.formatCurrency(data.total_amount)}`, 25, yPosition);
    yPosition += 15;

    // Payments table header
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLE DE PAGOS', 20, yPosition);
    yPosition += 10;

    // Table headers
    pdf.setFontSize(10);
    pdf.text('Fecha', 25, yPosition);
    pdf.text('Cliente', 50, yPosition);
    pdf.text('Lote', 100, yPosition);
    pdf.text('Monto', 130, yPosition);
    pdf.text('Método', 160, yPosition);
    yPosition += 2;
    
    // Table line
    pdf.line(25, yPosition, 190, yPosition);
    yPosition += 5;

    // Payments details
    pdf.setFont('helvetica', 'normal');
    data.payments.slice(0, 50).forEach((payment) => { // Limit to 50 payments for PDF
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.text(reportsService.formatDate(payment.payment_date), 25, yPosition);
      pdf.text(payment.customer.substring(0, 20), 50, yPosition);
      pdf.text(payment.lote.substring(0, 15), 100, yPosition);
      pdf.text(reportsService.formatCurrency(payment.amount), 130, yPosition);
      pdf.text(payment.method, 160, yPosition);
      yPosition += 5;
    });

    if (data.payments.length > 50) {
      yPosition += 10;
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... y ${data.payments.length - 50} pagos más`, 25, yPosition);
    }

    pdf.save(`${report.name}.pdf`);
  }

  // Generar PDF de lotes disponibles
  generateAvailableLotsPDF(report: Report, data: AvailableLotsData): void {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LOTES DISPONIBLES', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 20, yPosition);
    yPosition += 15;

    // Summary
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN DE INVENTARIO', 20, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de lotes: ${data.summary.total_count}`, 25, yPosition);
    yPosition += 6;
    pdf.text(`Área total: ${data.summary.total_area.toFixed(2)} m²`, 25, yPosition);
    yPosition += 6;
    pdf.text(`Valor total: ${reportsService.formatCurrency(data.summary.total_value)}`, 25, yPosition);
    yPosition += 6;
    pdf.text(`Precio promedio/m²: ${reportsService.formatCurrency(data.summary.avg_price_per_m2)}`, 25, yPosition);
    yPosition += 15;

    // Lots table header
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLE DE LOTES', 20, yPosition);
    yPosition += 10;

    // Table headers
    pdf.setFontSize(10);
    pdf.text('Manzana', 25, yPosition);
    pdf.text('Lote', 50, yPosition);
    pdf.text('Área (m²)', 70, yPosition);
    pdf.text('Precio', 100, yPosition);
    pdf.text('Precio/m²', 130, yPosition);
    pdf.text('Enganche', 160, yPosition);
    yPosition += 2;
    
    // Table line
    pdf.line(25, yPosition, 190, yPosition);
    yPosition += 5;

    // Lots details
    pdf.setFont('helvetica', 'normal');
    data.lots.forEach((lot) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.text(lot.block, 25, yPosition);
      pdf.text(lot.lot_number, 50, yPosition);
      pdf.text(lot.area.toString(), 70, yPosition);
      pdf.text(reportsService.formatCurrency(lot.price), 100, yPosition);
      pdf.text(reportsService.formatCurrency(lot.price_per_m2), 130, yPosition);
      pdf.text(reportsService.formatCurrency(lot.initial_payment), 160, yPosition);
      yPosition += 5;
    });

    pdf.save(`${report.name}.pdf`);
  }

  // Método principal para generar PDF basado en tipo de reporte
  generateReportPDF(report: Report): void {
    if (!report.data || report.status !== 'completed') {
      throw new Error('El reporte debe estar completado para generar PDF');
    }

    try {
      switch (report.report_type) {
        case 'customers_debt':
          this.generateCustomerDebtPDF(report, report.data as CustomerDebtData);
          break;
        case 'payments_history':
          this.generatePaymentHistoryPDF(report, report.data as PaymentHistoryData);
          break;
        case 'available_lots':
          this.generateAvailableLotsPDF(report, report.data as AvailableLotsData);
          break;
        default:
          // Para otros tipos de reporte, generar PDF genérico
          this.generateGenericPDF(report);
          break;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Error al generar el PDF del reporte');
    }
  }

  // PDF genérico para otros tipos de reporte
  private generateGenericPDF(report: Report): void {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.name.toUpperCase(), 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Tipo: ${report.report_type_display}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 20, yPosition);
    
    if (report.description) {
      yPosition += 10;
      pdf.text('Descripción:', 20, yPosition);
      yPosition += 6;
      
      const splitDescription = pdf.splitTextToSize(report.description, 170);
      pdf.text(splitDescription, 20, yPosition);
      yPosition += splitDescription.length * 6;
    }

    yPosition += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATOS DEL REPORTE', 20, yPosition);
    yPosition += 10;

    // Convert data to JSON string and split into lines
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const jsonString = JSON.stringify(report.data, null, 2);
    const lines = jsonString.split('\n');
    
    lines.forEach((line) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, 20, yPosition);
      yPosition += 4;
    });

    pdf.save(`${report.name}.pdf`);
  }
}

export const pdfService = new PDFService();
export default pdfService;
