import customerService from "../../services/customerService";

export const handleDownloadPDF = async (
  id: number,
  setError: (error: string | null) => void
) => {
  try {
    setError(null);
    const toastId = "pdf-export";

    // Mostrar toast de carga
    const { toast } = await import("react-hot-toast");
    toast.loading("Generando PDF del cliente...", { id: toastId });

    const data = await customerService.getCustomerById(id);
    console.log(data);
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
    doc.text("REPORTE DE CLIENTE", 105, yPosition, { align: "center" });

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
    yPosition += 10;

    const tableDataInfoCustomer = [
      ["Cliente", data.full_name || "N/A"],
      ["DNI", data.document_number || "N/A"],
      ["Teléfono", data.phone || "Sin teléfono"],
      ["Email", data.email || "Sin email"],
    ];
    autoTable(doc, {
      body: tableDataInfoCustomer,
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
    doc.text("RESUMEN DE PAGOS", 20, yPosition);
    yPosition += 15;

    // Preparar datos de la tabla
    const tableHeaders = [
      "Cuota N°",
      "Monto (S/)",
      "Fecha Pago",
      "Método",
      "N° Recibo",
      "Estado",
    ];

    const tableData = data.payments?.map((payment) => {
      const installmentInfo =
        payment.payment_type === "initial"
          ? "Inicial"
          : `${payment.installment_number || "-"}`;
      const amount = `S/ ${parseFloat(payment.amount).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
      })}`;
      const paymentDate = payment.payment_date_display || "-";
      const method =
        payment.method === "transferencia" ? "Transferencia" : payment.method;
      const receiptNumber = payment.receipt_number || "-";
      const status = payment.is_overdue ? "VENCIDO" : "CANCELADO";

      return [
        installmentInfo,
        amount,
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
        0: { halign: "center", cellWidth: 20 }, // Cuota N°
        1: { halign: "center", cellWidth: 30 }, // Monto
        2: { halign: "center", cellWidth: 35 }, // Fecha
        3: { halign: "center", cellWidth: 25 }, // Método
        4: { halign: "center", cellWidth: 20 }, // N° Recibo
        5: { halign: "center", cellWidth: 35 }, // Estado
      },
      didParseCell: function (data: any) {
        // Colorear filas vencidas
        if (data.section === "body" && data.column.index === 5) {
          const status = data.cell.text[0];
          if (status === "VENCIDO") {
            data.cell.styles.fillColor = [231, 76, 60]; // Rojo
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [255, 255, 255];
          } else if (status === "CANCELADO") {
            data.cell.styles.fillColor = [46, 204, 113]; // Verde
            data.cell.styles.fontStyle = "bold";
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

    for (const payment of data.payments || []) {
      if (payment.receipt_image) {
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
        const imageUrl = payment.receipt_image.replace(
          "http://192.168.100.4:8000",
          ""
        );

        // Centra el texto usando el punto medio de la página
        doc.text(
          `Recibo del pago de S/ ${payment.amount} | N°. Operación: ${payment.receipt_number}`,
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
      `${data.full_name}${" - "}${
        data.document_number
      }${" - Resumen de pagos"}.pdf`
    );
    toast.success("PDF generado exitosamente", { id: toastId });
  } catch (err: any) {
    const { toast } = await import("react-hot-toast");
    toast.error("Error al generar el PDF", { id: "pdf-export" });
    setError(err.response?.data?.detail || "Error al generar el PDF.");
  }
};
