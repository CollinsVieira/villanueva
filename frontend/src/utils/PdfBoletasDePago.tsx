import salesService from "../services/salesService";
import paymentService from "../services/paymentService";
import { getProxyImageUrl } from "./imageUtils";

export const handleDownloadBoletasPagoPDF = async (
  ventaId: number,
  setError: (error: string | null) => void
) => {
  const toastId = "pdf-boletas-export";
  
  try {
    setError(null);

    // Mostrar toast de carga
    const { toast } = await import("react-hot-toast");
    toast.loading("Generando PDF de boletas de pago...", { id: toastId });

    // Obtener datos de la venta y sus pagos
    const ventaData = await salesService.getVenta(ventaId);
    const paymentData = await paymentService.getPaymentScheduleByVenta(ventaId);
    const paymentSchedules = paymentData.schedules;
    
    if (!ventaData) {
      toast.error("No se encontró la venta especificada", { id: toastId });
      return;
    }

    // Debug: mostrar los datos recibidos
    console.log('PaymentSchedules recibidos:', paymentSchedules);
    console.log('Campos boleta_image:', paymentSchedules.map(s => ({ id: s.id, boleta_image: s.boleta_image })));
    
    // Filtrar solo las cuotas que tienen boleta de pago
    const schedulesWithBoleta = paymentSchedules.filter(schedule => schedule.boleta_image);
    
    console.log('Schedules con boleta:', schedulesWithBoleta);
    
    if (schedulesWithBoleta.length === 0) {
      toast.error(`No se encontraron boletas de pago para esta venta. Total schedules: ${paymentSchedules.length}`, { id: toastId });
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Configuración de colores
    const primaryColor = [41, 128, 185]; // Azul
    const lightGray = [245, 245, 245]; // Gris claro

    // LOGO DE LA EMPRESA
    const logoUrl =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnsU_kN9M7iqQCGOsKmYFRGoFgCNVO0DkEJg&s";
    
    try {
      if (logoUrl) {
        // Logo en formato 9:16 (altura 30, ancho 16.875)
        doc.addImage(logoUrl, "PNG", 20, 10, 16.875, 30);
      }
    } catch (logoError) {
      // Placeholder para el logo en formato 9:16
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(20, 10, 16.875, 30, "F");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("LOGO", 28.4375, 27, { align: "center" });
    }

    // CABECERA DEL DOCUMENTO
    let yPosition = 55;

    // Título principal
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("BOLETAS DE PAGO", 105, yPosition, { align: "center" });

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

    // Información básica de la venta
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DE LA VENTA", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${ventaData.customer_info?.full_name || "N/A"}`, 20, yPosition);
    yPosition += 6;
    doc.text(`DNI: ${ventaData.customer_info?.document_number || "N/A"}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Lote: Mz. ${ventaData.lote_info?.block} - Lt. ${ventaData.lote_info?.lot_number}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Venta ID: ${ventaData.id}`, 20, yPosition);
    yPosition += 20;

    // Obtener el ancho total de la página del PDF
    const pageWidth = doc.internal.pageSize.getWidth();
    let imageY = yPosition;

    // Título de la sección de boletas
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("BOLETAS DE PAGO", 20, imageY);
    imageY += 15;

    // Restaurar color
    doc.setTextColor(0, 0, 0);

    // Mostrar cada boleta de pago
    for (const schedule of schedulesWithBoleta) {
      if (schedule.boleta_image) {
        // Si la imagen se sale de la página, crear una nueva
        if (imageY + 140 > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          imageY = 40; // Reinicia la posición Y con más margen
        }

        // Configuración de la imagen
        const imageWidth = 120; // Ancho de la imagen
        const imageHeight = 100; // Alto de la imagen (un poco más alto para boletas)
        const xCentered = (pageWidth - imageWidth) / 2;

        // URL corregida para usar con el proxy
        const imageUrl = getProxyImageUrl(schedule.boleta_image);

        // Información de la cuota
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          `CUOTA N° ${schedule.installment_number}`,
          pageWidth / 2,
          imageY - 15,
          { align: "center" }
        );

        // Monto de la cuota
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Monto: S/ ${parseFloat(schedule.scheduled_amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
          pageWidth / 2,
          imageY - 5,
          { align: "center" }
        );

        try {
          // Agregar la imagen de la boleta si la URL es válida
          if (imageUrl) {
            doc.addImage(
              imageUrl,
              "PNG",
              xCentered,
              imageY,
              imageWidth,
              imageHeight
            );
          } else {
            throw new Error("URL de imagen no válida");
          }
        } catch (imageError) {
          // Si hay error al cargar la imagen, mostrar un placeholder
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          doc.rect(xCentered, imageY, imageWidth, imageHeight, "F");
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(
            "Imagen no disponible",
            pageWidth / 2,
            imageY + imageHeight / 2,
            { align: "center" }
          );
          doc.setTextColor(0, 0, 0); // Restaurar color
        }

        // Información adicional debajo de la imagen
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const paymentDate = schedule.payment_date ? 
          new Date(schedule.payment_date).toLocaleDateString("es-ES") : 
          "Fecha no registrada";
        doc.text(
          `Fecha de pago: ${paymentDate}`,
          pageWidth / 2,
          imageY + imageHeight + 10,
          { align: "center" }
        );

        const status = schedule.status === 'paid' ? 'PAGADO' : 
                      schedule.status === 'partial' ? 'PARCIAL' : 
                      schedule.status === 'forgiven' ? 'PERDONADO' : 
                      schedule.status.toUpperCase();
        doc.text(
          `Estado: ${status}`,
          pageWidth / 2,
          imageY + imageHeight + 18,
          { align: "center" }
        );

        // Incrementar la posición Y para la siguiente boleta
        imageY += imageHeight + 35;
      }
    }

    // Generar el archivo PDF
    const fileName = `Boletas_Pago_Venta${ventaData.id}_${ventaData.customer_info?.full_name?.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
    doc.save(fileName);
    
    toast.success(`PDF de boletas de pago generado exitosamente. ${schedulesWithBoleta.length} boletas incluidas.`, { id: toastId });
  } catch (err: any) {
    const { toast } = await import("react-hot-toast");
    toast.error("Error al generar el PDF de boletas de pago", { id: toastId });
    setError(err.response?.data?.detail || "Error al generar el PDF de boletas de pago.");
  }
};
