import salesService from "../services/salesService";
import paymentService from "../services/paymentService";

export const handleDownloadHistorialPagosPDF = async (
  ventaId: number,
  setError: (error: string | null) => void
) => {
  const toastId = "pdf-historial-export";
  
  try {
    setError(null);

    // Mostrar toast de carga
    const { toast } = await import("react-hot-toast");
    toast.loading("Generando PDF del historial de pagos...", { id: toastId });

    // Obtener datos de la venta y sus pagos
    const ventaData = await salesService.getVenta(ventaId);
    const paymentSchedules = await paymentService.getPaymentScheduleByVenta(ventaId);
    
    if (!ventaData) {
      toast.error("No se encontró la venta especificada", { id: toastId });
      return;
    }

    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    // Configuración de colores
    const primaryColor = [41, 128, 185]; // Azul
    const lightGray = [245, 245, 245]; // Gris claro

    // LOGO DE LA EMPRESA
    const logoUrl =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQl5JN3aOWU7dTuFjgBd8MVkNVSN-eYxT2mFA&s"; // URL del logo - dejar vacío para configurar después
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
    doc.text("HISTORIAL DE PAGOS", 105, yPosition, { align: "center" });

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
    yPosition += 10;

    const tableDataInfoVenta = [
      ["Venta ID", ventaData.id.toString()],
      ["Cliente", ventaData.customer_info?.full_name || "N/A"],
      ["DNI", ventaData.customer_info?.document_number || "N/A"],
      ["Lote", `Mz. ${ventaData.lote_info?.block} - Lt. ${ventaData.lote_info?.lot_number}`],
      ["Precio Total", `S/ ${parseFloat(ventaData.sale_price).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Saldo Pendiente", `S/ ${parseFloat(ventaData.remaining_balance || '0').toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
    ];
    autoTable(doc, {
      body: tableDataInfoVenta,
      startY: yPosition,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 8,
      },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "center" },
        1: { halign: "center" },
      },
      margin: { left: 20, right: 20 },
      didDrawPage: function (data) {
        yPosition = data.cursor?.y || yPosition;
      },
    });
    yPosition += 25;

    // Título de la tabla de pagos
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIAL DE PAGOS", 20, yPosition);
    yPosition += 15;

    // Preparar datos de la tabla
    const tableHeaders = [
      "Cuota N°",
      "Monto Prog.",
      "Monto Pagado",
      "Fecha Pago",
      "Método",
      "N° Recibo",
      "Estado",
    ];

    const tableData = paymentSchedules?.map((schedule) => {
      const installmentInfo = schedule.installment_number.toString();
      const scheduledAmount = `S/ ${parseFloat(schedule.scheduled_amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const paidAmount = `S/ ${parseFloat(schedule.paid_amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const paymentDate = schedule.payment_date ? new Date(schedule.payment_date).toLocaleDateString("es-ES") : "-";
      const method = schedule.payment_method ? schedule.payment_method.toUpperCase() : "-";
      const receiptNumber = schedule.receipt_number || "-";
      console.log(schedule);
      console.log(schedule.payment_method);
      console.log(schedule.status);
      console.log(schedule.receipt_number);
      
      let status = "";
      switch (schedule.status) {
        case 'paid':
          status = "PAGADO";
          break;
        case 'pending':
          status = "PENDIENTE";
          break;
        case 'overdue':
          status = "VENCIDO";
          break;
        case 'partial':
          status = schedule.is_forgiven ? "PERDONADO" : "PARCIAL";
          break;
        default:
          status = "DESCONOCIDO";
      }

      return [
        installmentInfo,
        scheduledAmount,
        paidAmount,
        paymentDate,
        method,
        receiptNumber,
        status,
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
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 }, // Cuota N°
        1: { halign: "right", cellWidth: 25 }, // Monto Prog.
        2: { halign: "right", cellWidth: 25 }, // Monto Pagado
        3: { halign: "center", cellWidth: 25 }, // Fecha Pago
        4: { halign: "center", cellWidth: 20 }, // Método
        5: { halign: "center", cellWidth: 20 }, // N° Recibo
        6: { halign: "center", cellWidth: 25 }, // Estado
      },
      didParseCell: function (data: any) {
        // Colorear filas según el estado
        if (data.section === "body" && data.column.index === 6) {
          const status = data.cell.text[0];
          if (status === "VENCIDO") {
            data.cell.styles.fillColor = [231, 76, 60]; // Rojo
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [255, 255, 255];
          } else if (status === "PAGADO") {
            data.cell.styles.fillColor = [46, 204, 113]; // Verde
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [255, 255, 255];
          } else if (status === "PARCIAL") {
            data.cell.styles.fillColor = [241, 196, 15]; // Amarillo
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [0, 0, 0];
          } else if (status === "PERDONADO") {
            data.cell.styles.fillColor = [149, 165, 166]; // Gris
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      },
      margin: { top: 10, right: 20, bottom: 10, left: 20 },
      tableWidth: "wrap",
    };

    // Generar la tabla
    autoTable(doc, tableConfig);
    yPosition += 50;

    let imageY = 20; // Posición inicial en la nueva página
    doc.addPage();

    doc.setFontSize(16);
    doc.text("COMPROBANTES DE PAGO", 20, imageY);
    imageY += 15;

    // Obtiene el ancho total de la página del PDF
    const pageWidth = doc.internal.pageSize.getWidth();

    for (const schedule of paymentSchedules || []) {
      if (schedule.receipt_image) {
        // Si la imagen se sale de la página, crea una nueva
        if (imageY + 120 > doc.internal.pageSize.getHeight()) {
          // Aumenta el espacio para la imagen
          doc.addPage();
          imageY = 40; // Reinicia la posición Y con más margen
        }

        // --- INICIO DE LA LÓGICA PARA CENTRAR ---

        // 1. Define el ancho que tendrá tu imagen en el PDF
        const imageWidth = 120; // Ancho de la imagen (ajusta si es necesario)
        const imageHeight = 80; // Alto de la imagen (ajusta si es necesario)

        // 2. Calcula la posición 'x' para que la imagen quede centrada
        const xCentered = (pageWidth - imageWidth) / 2;

        // --- FIN DE LA LÓGICA PARA CENTRAR ---

        // URL corregida para usar con el proxy
        const imageUrl = schedule.receipt_image.replace(
          "http://192.168.100.4:8000",
          ""
        );

        // Centra el texto usando el punto medio de la página
        doc.text(
          `Cuota ${schedule.installment_number} - S/ ${parseFloat(schedule.paid_amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })} | N°. Operación: ${schedule.receipt_number || "N/A"}`,
          pageWidth / 2, // Posición x en el centro
          imageY - 10,
          { align: "center" } // Opción de alineación
        );

        // Usa la variable xCentered para la posición de la imagen
        doc.addImage(
          imageUrl,
          "PNG",
          xCentered,
          imageY,
          imageWidth,
          imageHeight
        );

        // Incrementa la posición Y para la siguiente imagen, dejando más espacio
        imageY += imageHeight + 25;
      }
    }

    doc.save(
      `Historial_Pagos_Venta${ventaData.id}_${ventaData.customer_info?.full_name?.replace(/\s+/g, '_') || 'Cliente'}.pdf`
    );
    toast.success("PDF del historial de pagos generado exitosamente", { id: toastId });
  } catch (err: any) {
    const { toast } = await import("react-hot-toast");
    toast.error("Error al generar el PDF del historial", { id: toastId });
    setError(err.response?.data?.detail || "Error al generar el PDF del historial.");
  }
};
