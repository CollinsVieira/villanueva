import salesService from "../services/salesService";
import paymentService from "../services/paymentService";
import { getProxyImageUrl } from "./imageUtils";

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
    const paymentData = await paymentService.getPaymentScheduleByVenta(ventaId);
    const paymentSchedules = paymentData.schedules;
    const initialPayments = paymentData.initial_payments;
    
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
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnsU_kN9M7iqQCGOsKmYFRGoFgCNVO0DkEJg&s"; // URL del logo - dejar vacío para configurar después
    if (logoUrl) {
      doc.addImage(logoUrl, "PNG", 20, 10, 22.5, 40);
    } else {
      // Placeholder para el logo
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(20, 10, 22.5, 40, "F");
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

    // Calcular el total de pagos iniciales
    const totalInitialPayments = initialPayments.reduce((total, payment) => {
      return total + parseFloat(payment.amount);
    }, 0);

    const tableDataInfoVenta = [
      ["Venta ID", ventaData.id.toString()],
      ["Cliente", ventaData.customer_info?.full_name || "N/A"],
      ["DNI", ventaData.customer_info?.document_number || "N/A"],
      ["Lote", `Mz. ${ventaData.lote_info?.block} - Lt. ${ventaData.lote_info?.lot_number}`],
      ["Precio Total", `S/ ${parseFloat(ventaData.sale_price).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
      ["Pago Inicial", `S/ ${totalInitialPayments.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`],
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
    yPosition += 35;

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

    const tableData: any[] = [];
    
    // Agregar pagos iniciales al principio de la tabla
    initialPayments.forEach((payment) => {
      const paidAmount = `S/ ${parseFloat(payment.amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const paymentDate = payment.payment_date_display || "-";
      const method = payment.method ? payment.method.toUpperCase() : "-";
      const receiptNumber = payment.receipt_number || "-";
      
      tableData.push([
        "INICIAL", // Cuota N°
        "", // Monto Prog. (vacío para pagos iniciales)
        paidAmount,
        paymentDate,
        method,
        receiptNumber,
        "PAGADO", // Estado
      ]);
    });
    
    paymentSchedules?.forEach((schedule) => {
      const installmentInfo = schedule.installment_number.toString();
      const scheduledAmount = `S/ ${parseFloat(schedule.scheduled_amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      
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
          status = "ABSUELTO";
      }

      // Si hay pagos múltiples, mostrar cada uno en una fila separada
      if (schedule.all_payments && schedule.all_payments.length > 0) {
        schedule.all_payments.forEach((payment, index) => {
          const paidAmount = `S/ ${parseFloat(payment.amount).toLocaleString("es-PE", {
            minimumFractionDigits: 2,
          })}`;
          const paymentDate = payment.payment_date_display || "-";
          const method = payment.method ? payment.method.toUpperCase() : "-";
          const receiptNumber = payment.receipt_number || "-";
          
          tableData.push([
            index === 0 ? installmentInfo : "", // Solo mostrar el número de cuota en la primera fila
            index === 0 ? scheduledAmount : "", // Solo mostrar el monto programado en la primera fila
            paidAmount,
            paymentDate,
            method,
            receiptNumber,
            index === schedule.all_payments!.length - 1 ? status : "", // Solo mostrar el estado en la última fila
          ]);
        });
      } else {
        // Si no hay pagos o solo hay un pago, usar la lógica original
        const paidAmount = `S/ ${parseFloat(schedule.paid_amount).toLocaleString("es-PE", {
          minimumFractionDigits: 2,
        })}`;
        const paymentDate = schedule.payment_date ? new Date(schedule.payment_date).toLocaleDateString("es-ES") : "-";
        const method = schedule.payment_method ? schedule.payment_method.toUpperCase() : "-";
        const receiptNumber = schedule.receipt_number || "-";
        
        tableData.push([
          installmentInfo,
          scheduledAmount,
          paidAmount,
          paymentDate,
          method,
          receiptNumber,
          status,
        ]);
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

    // Mostrar comprobantes de pagos iniciales primero
    for (const payment of initialPayments || []) {
      if (payment.receipt_image) {
        // URL corregida para usar con el proxy
        const imageUrl = getProxyImageUrl(payment.receipt_image);

        if (imageUrl) {
          // Obtener las propiedades de la imagen usando jsPDF
          const imgProps = doc.getImageProperties(imageUrl);
          
          // Usar un factor de escala que convierta píxeles a mm (aproximadamente 96 DPI = 0.26458 mm/px)
          const scaleFactor = 0.15; // Factor ajustable para un buen tamaño en el PDF
          let imageWidth = imgProps.width * scaleFactor;
          let imageHeight = imgProps.height * scaleFactor;

          // Limitar solo si la imagen es extremadamente grande (para que quepa en la página)
          const pageWidthLimit = pageWidth - 40; // Dejar 20mm de margen a cada lado
          if (imageWidth > pageWidthLimit) {
            const ratio = pageWidthLimit / imageWidth;
            imageWidth = pageWidthLimit;
            imageHeight = imageHeight * ratio;
          }

          // Verificar si necesita una nueva página
          if (imageY + imageHeight + 30 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            imageY = 40;
          }

          // Centrar la imagen
          const xCentered = (pageWidth - imageWidth) / 2;

          // Título del comprobante del pago inicial
          doc.text(
            `Pago Inicial - S/ ${parseFloat(payment.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })} | N°. Operación: ${payment.receipt_number || "N/A"}`,
            pageWidth / 2,
            imageY - 10,
            { align: "center" }
          );

          // Agregar la imagen con sus dimensiones originales escaladas
          doc.addImage(
            imageUrl,
            "PNG",
            xCentered,
            imageY,
            imageWidth,
            imageHeight
          );

          // Incrementa la posición Y para la siguiente imagen
          imageY += imageHeight + 25;
        }
      }
    }

    for (const schedule of paymentSchedules || []) {
      // Mostrar todas las imágenes de comprobantes para esta cuota
      if (schedule.all_payments && schedule.all_payments.length > 0) {
        for (let paymentIndex = 0; paymentIndex < schedule.all_payments.length; paymentIndex++) {
          const payment = schedule.all_payments[paymentIndex];
          if (payment.receipt_image) {
            // URL corregida para usar con el proxy
            const imageUrl = getProxyImageUrl(payment.receipt_image);

            if (imageUrl) {
              // Obtener las propiedades de la imagen usando jsPDF
              const imgProps = doc.getImageProperties(imageUrl);
              
              // Usar un factor de escala que convierta píxeles a mm
              const scaleFactor = 0.15;
              let imageWidth = imgProps.width * scaleFactor;
              let imageHeight = imgProps.height * scaleFactor;

              // Limitar solo si la imagen es extremadamente grande
              const pageWidthLimit = pageWidth - 40;
              if (imageWidth > pageWidthLimit) {
                const ratio = pageWidthLimit / imageWidth;
                imageWidth = pageWidthLimit;
                imageHeight = imageHeight * ratio;
              }

              // Verificar si necesita una nueva página
              if (imageY + imageHeight + 30 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                imageY = 40;
              }

              // Centrar la imagen
              const xCentered = (pageWidth - imageWidth) / 2;

              // Título del comprobante con información del pago específico
              doc.text(
                `Cuota ${schedule.installment_number} - Pago ${paymentIndex + 1}/${schedule.all_payments?.length || 0} - S/ ${parseFloat(payment.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })} | N°. Operación: ${payment.receipt_number || "N/A"}`,
                pageWidth / 2,
                imageY - 10,
                { align: "center" }
              );

              // Agregar la imagen con sus dimensiones originales escaladas
              doc.addImage(
                imageUrl,
                "PNG",
                xCentered,
                imageY,
                imageWidth,
                imageHeight
              );

              // Incrementa la posición Y para la siguiente imagen
              imageY += imageHeight + 25;
            }
          }
        }
      } else if (schedule.receipt_image) {
        // Lógica original para cuotas sin pagos múltiples
        const imageUrl = getProxyImageUrl(schedule.receipt_image);

        if (imageUrl) {
          // Obtener las propiedades de la imagen usando jsPDF
          const imgProps = doc.getImageProperties(imageUrl);
          
          // Usar un factor de escala que convierta píxeles a mm
          const scaleFactor = 0.15;
          let imageWidth = imgProps.width * scaleFactor;
          let imageHeight = imgProps.height * scaleFactor;

          // Limitar solo si la imagen es extremadamente grande
          const pageWidthLimit = pageWidth - 40;
          if (imageWidth > pageWidthLimit) {
            const ratio = pageWidthLimit / imageWidth;
            imageWidth = pageWidthLimit;
            imageHeight = imageHeight * ratio;
          }

          // Verificar si necesita una nueva página
          if (imageY + imageHeight + 30 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            imageY = 40;
          }

          // Centrar la imagen
          const xCentered = (pageWidth - imageWidth) / 2;

          doc.text(
            `Cuota ${schedule.installment_number} - S/ ${parseFloat(schedule.paid_amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })} | N°. Operación: ${schedule.receipt_number || "N/A"}`,
            pageWidth / 2,
            imageY - 10,
            { align: "center" }
          );

          // Agregar la imagen con sus dimensiones originales escaladas
          doc.addImage(
            imageUrl,
            "PNG",
            xCentered,
            imageY,
            imageWidth,
            imageHeight
          );

          imageY += imageHeight + 25;
        }
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
