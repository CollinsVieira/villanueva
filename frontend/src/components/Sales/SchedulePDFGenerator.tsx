import React from 'react';
import { Calendar } from 'lucide-react';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import customerService from '../../services/customerService';
import { Lote } from '../../types';

interface SchedulePDFGeneratorProps {
  salePrice: string;
  initialPayment: string;
  paymentDay: number;
  financingMonths: number;
  scheduleStartDate: string;
  selectedLote: Lote | null;
  customerId: number;
  disabled?: boolean;
  onError?: (error: string) => void;
}

const SchedulePDFGenerator: React.FC<SchedulePDFGeneratorProps> = ({
  salePrice,
  initialPayment,
  paymentDay,
  financingMonths,
  scheduleStartDate,
  selectedLote,
  customerId,
  disabled = false,
  onError
}) => {
  const generateExampleSchedulePDF = async () => {
    // Validar que se tengan los datos mínimos necesarios
    if (!salePrice || !paymentDay || !financingMonths || !selectedLote) {
      onError?.('Por favor complete el precio de venta, día de pago y meses de financiamiento para generar el ejemplo');
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();

      // Configuración de colores
      const primaryColor: [number, number, number] = [41, 128, 185]; // Azul
      const lightGray: [number, number, number] = [245, 245, 245]; // Gris claro

      // CABECERA DEL DOCUMENTO
      let yPosition = 30;

      // Título principal
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("CRONOGRAMA DE PAGOS - SIMULACIÓN", 105, yPosition, { align: "center" });

      yPosition += 15;

      // Logo de la empresa (texto estilizado)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 0);
      doc.text("GRUPO SERFER & ASOCIADOS", 105, yPosition, { align: "center" });

      yPosition += 10;

      // Información del cliente y lote
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      const selectedCustomer = await customerService.getCustomerById(customerId);
      const customerName = selectedCustomer ? selectedCustomer.full_name : "Cliente";
      const customerDoc = selectedCustomer ? selectedCustomer.document_number : "12345678";

      // Información básica
      doc.text(`Cliente: ${customerName}`, 20, yPosition);
      doc.text(`DNI: ${customerDoc}`, 20, yPosition + 8);
      doc.text(`Lote: Mz. ${selectedLote.block}, Lote ${selectedLote.lot_number}`, 20, yPosition + 16);
      doc.text(`Área: ${selectedLote.area} m²`, 20, yPosition + 24);

      yPosition += 40;

      // Información financiera
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN FINANCIERA", 20, yPosition);
      
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      
      const salePriceNum = parseFloat(salePrice);
      const initialPaymentNum = parseFloat(initialPayment || '0');
      const remainingAmount = salePriceNum - initialPaymentNum;
      const monthlyPaymentRaw = remainingAmount / financingMonths;

      // LÓGICA DE REDONDEO: Redondear cuotas a enteros y sumar centavos a la última cuota
      const roundedMonthlyPayment = Math.floor(monthlyPaymentRaw); // Redondear hacia abajo
      const centsPerPayment = monthlyPaymentRaw - roundedMonthlyPayment; // Centavos por cuota
      const totalCentsToAdd = centsPerPayment * financingMonths; // Total de centavos a sumar
      
      // La última cuota tendrá el monto redondeado más todos los centavos acumulados
      const lastPaymentAmount = roundedMonthlyPayment + totalCentsToAdd;

      doc.text(`Precio de Venta: ${dynamicReportsService.formatCurrency(salePriceNum)}`, 20, yPosition);
      doc.text(`Pago Inicial: ${dynamicReportsService.formatCurrency(initialPaymentNum)}`, 20, yPosition + 8);
      doc.text(`Monto a Financiar: ${dynamicReportsService.formatCurrency(remainingAmount)}`, 20, yPosition + 16);
      doc.text(`Cuota Mensual (1-${financingMonths-1}): ${dynamicReportsService.formatCurrency(roundedMonthlyPayment)}`, 20, yPosition + 24);
      doc.text(`Última Cuota (${financingMonths}): ${dynamicReportsService.formatCurrency(lastPaymentAmount)}`, 20, yPosition + 32);
      doc.text(`Día de Vencimiento: ${paymentDay}`, 20, yPosition + 40);
      doc.text(`Meses de Financiamiento: ${financingMonths}`, 20, yPosition + 48);

      yPosition += 70;

      // Generar cronograma de ejemplo
      doc.setFont("helvetica", "bold");
      doc.text("CRONOGRAMA DE CUOTAS (SIMULACIÓN)", 20, yPosition);
      yPosition += 10;

      // Preparar datos de la tabla
      const scheduleData = [];
      const startDate = scheduleStartDate ? new Date(scheduleStartDate + '-01') : new Date();
      
      for (let i = 1; i <= financingMonths; i++) {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i - 1);
        paymentDate.setDate(paymentDay);
        
        // Determinar el monto de la cuota
        const paymentAmount = i === financingMonths ? lastPaymentAmount : roundedMonthlyPayment;
        
        scheduleData.push([
          i.toString(),
          paymentDate.toLocaleDateString('es-PE', { 
            year: 'numeric', 
            month: 'long' 
          }),
          dynamicReportsService.formatCurrency(paymentAmount),
          'Pendiente'
        ]);
      }

      // Crear tabla
      autoTable(doc, {
        startY: yPosition,
        head: [['Cuota', 'Mes de Pago', 'Monto', 'Estado']],
        body: scheduleData,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255] as [number, number, number],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'right' },
          3: { halign: 'center' }
        }
      });

      // Pie de página
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + 100;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Este es un cronograma de simulación basado en los datos ingresados.", 20, finalY + 20);
      doc.text("Los montos y fechas pueden variar según las condiciones finales del contrato.", 20, finalY + 30);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')}`, 20, finalY + 40);

      // Descargar el PDF
      const fileName = `cronograma_ejemplo_${selectedLote.block}_${selectedLote.lot_number}_${new Date().getTime()}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generando PDF de simulación:', err);
      onError?.('Error al generar el PDF de simulación');
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">📋 Cronograma de Pagos de Simulación</h4>
          <p className="text-sm text-gray-600">
            Genera un PDF de ejemplo del cronograma de pagos basado en los datos ingresados
          </p>
        </div>
        <button
          type="button"
          onClick={generateExampleSchedulePDF}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={disabled 
            ? "Complete los campos requeridos para generar el ejemplo" 
            : "Generar PDF de simulación del cronograma"}
        >
          <Calendar className="h-4 w-4" />
          Simular Cronograma de Pagos
        </button>
      </div>
    </div>
  );
};

export default SchedulePDFGenerator;
