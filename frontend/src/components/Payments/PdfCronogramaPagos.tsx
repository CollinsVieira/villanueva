import paymentService from "../../services/paymentService";

export const handleDownloadCronogramaPDF = async (
  loteId: number,
  setError: (error: string | null) => void
) => {
  try {
    setError(null);
    const toastId = "pdf-cronograma-export";

    // Mostrar toast de carga
    const { toast } = await import("react-hot-toast");
    toast.loading("Generando PDF del cronograma de pagos...", { id: toastId });

    // Obtener datos del cronograma de pagos
    const schedules = await paymentService.getPaymentScheduleByLote(loteId);
    
    if (!schedules || schedules.length === 0) {
      toast.error("No se encontró cronograma de pagos para este lote", { id: toastId });
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
    const logoUrl =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQl5JN3aOWU7dTuFjgBd8MVkNVSN-eYxT2mFA&s";
    if (logoUrl) {
      doc.addImage(logoUrl, "PNG", 20, 10, 40, 20);
    } else {
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
    doc.text("VILLANUEVA PROJECTS", 105, yPosition, { align: "center" });
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

    // Información del lote y cliente
    const loteInfo = schedules[0].lote;
    const customerInfo = schedules[0].customer;

    const tableDataInfoLote = [
      ["Lote", `Mz. ${loteInfo.block} - Lt. ${loteInfo.lot_number}`],
      ["Cliente", customerInfo.full_name || "N/A"],
      ["DNI", customerInfo.document_number || "N/A"],
      ["Área", `${loteInfo.area} m²`],
      ["Precio Total", `S/ ${parseFloat(loteInfo.price).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Cuota Mensual", `S/ ${parseFloat(loteInfo.monthly_installment).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Plazo", `${loteInfo.financing_months} meses`],
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
        0: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "center", cellWidth: 40 },
        1: { halign: "center", cellWidth: 60 },
      },
      margin: { left: 20, right: 20 },
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

    const totalPaid = schedules.reduce((sum, s) => sum + parseFloat(s.paid_amount), 0);
    const totalScheduled = schedules.reduce((sum, s) => sum + parseFloat(s.scheduled_amount), 0);
    const totalRemaining = schedules.reduce((sum, s) => sum + parseFloat(s.remaining_amount), 0);

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
        0: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "left", cellWidth: 50 },
        1: { halign: "center", cellWidth: 40 },
      },
      margin: { left: 20, right: 20 },
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

    const tableData = schedules.map((schedule) => {
      const scheduledAmount = `S/ ${parseFloat(schedule.scheduled_amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const paidAmount = `S/ ${parseFloat(schedule.paid_amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const remainingAmount = `S/ ${parseFloat(schedule.remaining_amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const dueDate = schedule.due_date_display || "-";
      const paymentDate = schedule.payment_date_display || "-";
      
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
        schedule.installment_number.toString(),
        dueDate,
        scheduledAmount,
        paidAmount,
        remainingAmount,
        paymentDate,
        statusText,
      ];
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
        0: { halign: "center", cellWidth: 15 }, // Cuota
        1: { halign: "center", cellWidth: 25 }, // Vencimiento
        2: { halign: "right", cellWidth: 25 }, // Monto Prog.
        3: { halign: "right", cellWidth: 25 }, // Monto Pagado
        4: { halign: "right", cellWidth: 25 }, // Pendiente
        5: { halign: "center", cellWidth: 25 }, // Fecha Pago
        6: { halign: "center", cellWidth: 25 }, // Estado
      },
      didParseCell: function (data: any) {
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
      },
      margin: { top: 10, right: 15, bottom: 10, left: 15 },
      tableWidth: "wrap",
    };

    // Generar la tabla
    autoTable(doc, tableConfig);

    // Si hay comprobantes de pago, agregar una nueva página
    const schedulesWithReceipts = schedules.filter(s => s.receipt_image);
    
    if (schedulesWithReceipts.length > 0) {
      doc.addPage();
      let imageY = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("COMPROBANTES DE PAGO", 20, imageY);
      imageY += 15;

      const pageWidth = doc.internal.pageSize.getWidth();

      for (const schedule of schedulesWithReceipts) {
        if (schedule.receipt_image) {
          // Si la imagen se sale de la página, crea una nueva
          if (imageY + 120 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            imageY = 40;
          }

          const imageWidth = 120;
          const imageHeight = 80;
          const xCentered = (pageWidth - imageWidth) / 2;

          // URL corregida para usar con el proxy
          const imageUrl = schedule.receipt_image.replace(
            "http://192.168.100.4:8000",
            ""
          );

          // Texto descriptivo
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(
            `Cuota ${schedule.installment_number} - S/ ${parseFloat(schedule.paid_amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })} | N° Recibo: ${schedule.receipt_number || "N/A"}`,
            pageWidth / 2,
            imageY - 10,
            { align: "center" }
          );

          try {
            doc.addImage(
              imageUrl,
              "PNG",
              xCentered,
              imageY,
              imageWidth,
              imageHeight
            );
          } catch (error) {
            // Si hay error con la imagen, mostrar placeholder
            doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
            doc.rect(xCentered, imageY, imageWidth, imageHeight, "F");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text("Imagen no disponible", xCentered + imageWidth/2, imageY + imageHeight/2, { align: "center" });
            doc.setTextColor(0, 0, 0);
          }

          imageY += imageHeight + 25;
        }
      }
    }

    // Generar nombre del archivo
    const fileName = `Cronograma_Pagos_Mz${loteInfo.block}_Lt${loteInfo.lot_number}_${customerInfo.full_name.replace(/\s+/g, '_')}.pdf`;
    
    doc.save(fileName);
    toast.success("PDF del cronograma generado exitosamente", { id: toastId });
  } catch (err: any) {
    const { toast } = await import("react-hot-toast");
    toast.error("Error al generar el PDF del cronograma", { });
    setError(err.response?.data?.detail || "Error al generar el PDF del cronograma.");
  }
};
