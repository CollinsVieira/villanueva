import paymentService from "../services/paymentService";

export const handleDownloadCronogramaPDF = async (
  ventaId: number,
  setError: (error: string | null) => void
) => {
  const toastId = "pdf-cronograma-export";
  
  try {
    setError(null);

    // Mostrar toast de carga
    const { toast } = await import("react-hot-toast");
    toast.loading("Generando PDF del cronograma de pagos...", { id: toastId });

    // Obtener datos del cronograma de pagos por venta
    const schedules = await paymentService.getPaymentScheduleByVenta(ventaId);
    
    if (!schedules || schedules.length === 0) {
      toast.error("No se encontró cronograma de pagos para esta venta", { id: toastId });
      return;
    }

    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    // Configuración de colores
    const primaryColor = [41, 128, 185]; // Azul
    const lightGray = [245, 245, 245]; // Gris claro
    const greenColor = [46, 204, 113]; // Verde
    const redColor = [231, 76, 60]; // Rojo
    const yellowColor = [241, 196, 15]; // Amarillo
    const grayColor = [149, 165, 166]; // Gris

    // LOGO DE LA EMPRESA
    const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQl5JN3aOWU7dTuFjgBd8MVkNVSN-eYxT2mFA&s";
    
    try {
      if (logoUrl) {
        doc.addImage(logoUrl, "PNG", 20, 10, 40, 20);
      }
    } catch (logoError) {
      // Placeholder para el logo
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(20, 10, 40, 20, "F");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("LOGO EMPRESA", 40, 22, { align: "center" });
    }

    // CABECERA DEL DOCUMENTO
    let yPosition = 45;
    // Título principal
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("CRONOGRAMA DE PAGOS", 105, yPosition, { align: "center" });

    yPosition += 15;

    // Logo de la empresa (texto estilizado)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 0); // Verde para el logo
    doc.text("GRUPO SERFER & ASOCIADOS", 105, yPosition, { align: "center" });
    yPosition += 20;

    // Restaurar color
    doc.setTextColor(0, 0, 0);

    // Subtítulo con fecha
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generado el: ${new Date().toLocaleDateString("es-ES")}`,
      105,
      yPosition,
      { align: "center" }
    );
    yPosition += 15;

    // Información del lote y cliente desde la venta
    const firstSchedule = schedules[0];
    const ventaInfo = firstSchedule.venta || firstSchedule.venta || { id: ventaId, status: 'active' };
    const loteInfo = firstSchedule.lote_display || "N/A";
    const customerInfo = firstSchedule.customer_display || "N/A";

    // Calcular totales desde los schedules
    const totalScheduled = schedules.reduce((sum, s) => {
      const amount = parseFloat(s.scheduled_amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalPaid = schedules.reduce((sum, s) => {
      const amount = parseFloat(s.paid_amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const tableDataInfoLote = [
      ["Lote", loteInfo],
      ["Cliente", customerInfo],
      ["Estado de Venta", ventaInfo.status === 'active' ? 'Activa' : ventaInfo.status],
      ["Total Programado", `S/ ${totalScheduled.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Total Pagado", `S/ ${totalPaid.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Saldo Pendiente", `S/ ${(totalScheduled - totalPaid).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      body: tableDataInfoLote,
      startY: yPosition,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "center" },
        1: { halign: "center" },
      },
      margin: { left: 5, right: 5 },
      didDrawPage: function (data) {
        yPosition = data.cursor?.y || yPosition;
      },
    });
    
    yPosition += 25;

    // Resumen del cronograma
    const totalSchedules = schedules.length;
    const paidSchedules = schedules.filter(s => s.status === 'paid').length;
    const pendingSchedules = schedules.filter(s => s.status === 'pending').length;
    const overdueSchedules = schedules.filter(s => s.status === 'overdue').length;
    const partialSchedules = schedules.filter(s => s.status === 'partial').length;
    const forgivenSchedules = schedules.filter(s => s.status === 'forgiven').length;
    
    const totalRemaining = schedules.reduce((sum, s) => {
      const amount = parseFloat(s.remaining_amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);


    // Título del resumen
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DEL CRONOGRAMA", 20, yPosition);
    yPosition += 10;

    const summaryData = [
      ["Total de Cuotas", totalSchedules.toString()],
      ["Cuotas Pagadas", paidSchedules.toString()],
      ["Cuotas Pendientes", pendingSchedules.toString()],
      ["Cuotas Vencidas", overdueSchedules.toString()],
      ["Cuotas Parciales", partialSchedules.toString()],
      ["Cuotas Perdonadas", forgivenSchedules.toString()],
      ["Total Pagado", `S/ ${totalPaid.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Total Programado", `S/ ${totalScheduled.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Total Pendiente", `S/ ${totalRemaining.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: yPosition,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "left" },
        1: { halign: "center" },
      },
      margin: { left: 5, right: 5 },
      didDrawPage: function (data) {
        yPosition = data.cursor?.y || yPosition;
      },
    });
    
    yPosition += 25;

    // Título de la tabla de cronograma
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DEL CRONOGRAMA", 20, yPosition);
    yPosition += 15;

    // Preparar datos de la tabla
    const tableHeaders = [
      "Cuota",
      "Vencimiento",
      "Monto Prog.",
      "Monto Pagado",
      "Pendiente",
      "Fecha Pago",
      "Estado",
    ];

    const tableData = schedules.map((schedule, index) => {
      try {
        const scheduledAmount = `S/ ${parseFloat(schedule.scheduled_amount || '0').toLocaleString("es-PE", {
          minimumFractionDigits: 2,
        })}`;
        const paidAmount = `S/ ${parseFloat(schedule.paid_amount || '0').toLocaleString("es-PE", {
          minimumFractionDigits: 2,
        })}`;
        const remainingAmount = `S/ ${parseFloat(schedule.remaining_amount || '0').toLocaleString("es-PE", {
          minimumFractionDigits: 2,
        })}`;
         const dueDate = schedule.due_date ? new Date(schedule.due_date).toLocaleDateString("es-ES") : "-";
         const paymentDate = schedule.payment_date ? new Date(schedule.payment_date).toLocaleDateString("es-ES") : "-";
        
        let statusText = "";
        switch (schedule.status) {
          case 'paid':
            statusText = "PAGADO";
            break;
          case 'pending':
            statusText = "PENDIENTE";
            break;
          case 'overdue':
            statusText = "VENCIDO";
            break;
          case 'partial':
            statusText = "PARCIAL";
            break;
          case 'forgiven':
            statusText = "PERDONADO";
            break;
          default:
            statusText = "DESCONOCIDO";
        }

        return [
          (schedule.installment_number || index + 1).toString(),
          dueDate,
          scheduledAmount,
          paidAmount,
          remainingAmount,
          paymentDate,
          statusText,
         ];
       } catch (rowError) {
         return [
           (index + 1).toString(),
           "-",
           "S/ 0.00",
           "S/ 0.00",
           "S/ 0.00",
           "-",
           "ERROR",
         ];
       }
    });

    // Configuración de la tabla
    const tableConfig: any = {
      head: [tableHeaders],
      body: tableData,
      startY: yPosition,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 20 }, // Cuota
        1: { halign: "center", cellWidth: 30 }, // Vencimiento
        2: { halign: "right", cellWidth: 30 }, // Monto Prog.
        3: { halign: "right", cellWidth: 30 }, // Monto Pagado
        4: { halign: "right", cellWidth: 30 }, // Pendiente
        5: { halign: "center", cellWidth: 30 }, // Fecha Pago
        6: { halign: "center", cellWidth: 30 }, // Estado
      },
      didParseCell: function (data: any) {
        try {
          // Colorear filas según el estado
          if (data.section === "body" && data.column.index === 6) {
            const status = data.cell.text[0];
            if (status === "PAGADO") {
              data.cell.styles.fillColor = greenColor;
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = [255, 255, 255];
            } else if (status === "VENCIDO") {
              data.cell.styles.fillColor = redColor;
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = [255, 255, 255];
            } else if (status === "PARCIAL") {
              data.cell.styles.fillColor = yellowColor;
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = [0, 0, 0];
            } else if (status === "PERDONADO") {
              data.cell.styles.fillColor = grayColor;
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
         } catch (cellError) {
           // Error silencioso al colorear celda
         }
      },
      margin: { top: 10, right: 5, bottom: 10, left: 5 },
      tableWidth: "auto",
    };

    // Generar la tabla
    autoTable(doc, tableConfig);

    // Generar nombre del archivo
    const fileName = `Cronograma_Pagos_Venta${ventaInfo.id}_${customerInfo.toString().replace(/\s+/g, '_')}.pdf`;
    
    doc.save(fileName);
    
    toast.success("PDF del cronograma generado exitosamente", { id: toastId });

  } catch (err: any) {
    const { toast } = await import("react-hot-toast");
    toast.error("Error al generar el PDF del cronograma", { id: toastId });
    
    // Mensaje de error más específico
    let errorMessage = "Error al generar el PDF del cronograma.";
    
    if (err.message) {
      errorMessage += ` Detalles: ${err.message}`;
    }
    
    if (err.response?.data?.detail) {
      errorMessage += ` Error del servidor: ${err.response.data.detail}`;
    }
    
    setError(errorMessage);
  }
};