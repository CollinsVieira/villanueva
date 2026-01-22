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
    
    // Obtener también los pagos iniciales
    const initialPayments = await paymentService.getInitialPayments(ventaId);
    
    if (!ventaData) {
      toast.error("No se encontró la venta especificada", { id: toastId });
      return;
    }

    // Debug: mostrar los datos recibidos
    console.log('PaymentSchedules recibidos:', paymentSchedules);
    console.log('InitialPayments recibidos:', initialPayments);
    console.log('Campos boleta_image schedules:', paymentSchedules.map(s => ({ id: s.id, boleta_image: s.boleta_image })));
    console.log('Campos boleta_image inicial:', initialPayments.map(p => ({ id: p.id, boleta_image: p.boleta_image })));
    
    // Filtrar solo las cuotas que tienen boleta de pago
    const schedulesWithBoleta = paymentSchedules.filter(schedule => schedule.boleta_image);
    
    // Filtrar pagos iniciales que tienen boleta de pago
    const initialPaymentsWithBoleta = initialPayments.filter(payment => payment.boleta_image);
    
    console.log('Schedules con boleta:', schedulesWithBoleta);
    console.log('Pagos iniciales con boleta:', initialPaymentsWithBoleta);
    
    const totalBoletasCount = schedulesWithBoleta.length + initialPaymentsWithBoleta.length;
    
    if (totalBoletasCount === 0) {
      toast.error(`No se encontraron boletas de pago para esta venta. Total schedules: ${paymentSchedules.length}, Total pagos iniciales: ${initialPayments.length}`, { id: toastId });
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

    // Obtener dimensiones de la página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Función auxiliar para agregar una boleta al PDF (una por página)
    const addBoletaToPDF = async (imageUrl: string, title: string, amount: string, paymentDate: string, status: string) => {
      // Crear nueva página para cada boleta
      // La primera página ya contiene la información general, así que todas las boletas van en páginas nuevas
      doc.addPage();

      // Posición inicial
      let currentY = 20;

      // Información del pago en la parte superior
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(title, pageWidth / 2, currentY, { align: "center" });
      currentY += 10;

      // Monto del pago
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(amount, pageWidth / 2, currentY, { align: "center" });
      currentY += 8;

      // Fecha y estado
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha de pago: ${paymentDate}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 6;
      doc.text(`Estado: ${status}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      try {
        // Cargar imagen para obtener dimensiones originales
        if (imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Error al cargar imagen"));
            img.src = imageUrl;
          });

          // Obtener dimensiones originales de la imagen
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          // Calcular el espacio disponible en la página
          const availableWidth = pageWidth - 40; // Márgenes de 20px a cada lado
          const availableHeight = pageHeight - currentY - 20; // Espacio disponible restante
          
          // Calcular escala para ajustar la imagen al espacio disponible manteniendo proporción
          const scaleWidth = availableWidth / originalWidth;
          const scaleHeight = availableHeight / originalHeight;
          const scale = Math.min(scaleWidth, scaleHeight, 1); // No agrandar, solo reducir si es necesario
          
          // Dimensiones finales
          const finalWidth = originalWidth * scale;
          const finalHeight = originalHeight * scale;
          
          // Centrar la imagen horizontalmente
          const xCentered = (pageWidth - finalWidth) / 2;
          
          // Agregar la imagen con sus dimensiones calculadas
          doc.addImage(imageUrl, "PNG", xCentered, currentY, finalWidth, finalHeight);
        } else {
          throw new Error("URL de imagen no válida");
        }
      } catch (imageError) {
        console.error('Error al cargar imagen:', imageError);
        // Si hay error al cargar la imagen, mostrar un placeholder
        const placeholderWidth = 150;
        const placeholderHeight = 100;
        const xCentered = (pageWidth - placeholderWidth) / 2;
        
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(xCentered, currentY, placeholderWidth, placeholderHeight, "F");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Imagen no disponible", pageWidth / 2, currentY + placeholderHeight / 2, { align: "center" });
        doc.setTextColor(0, 0, 0); // Restaurar color
      }
    };

    // Primero mostrar boletas de pagos iniciales
    for (const payment of initialPaymentsWithBoleta) {
      if (payment.boleta_image && typeof payment.boleta_image === 'string') {
        const imageUrl = getProxyImageUrl(payment.boleta_image);
        if (imageUrl) {
          const title = "PAGO INICIAL";
          const amount = `Monto: S/ ${parseFloat(payment.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
          const paymentDate = payment.payment_date ? 
            new Date(payment.payment_date).toLocaleDateString("es-ES") : 
            "Fecha no registrada";
          const status = "PAGADO";

          await addBoletaToPDF(imageUrl, title, amount, paymentDate, status);
        }
      }
    }

    // Luego mostrar boletas de cuotas mensuales
    for (const schedule of schedulesWithBoleta) {
      if (schedule.boleta_image && typeof schedule.boleta_image === 'string') {
        const imageUrl = getProxyImageUrl(schedule.boleta_image);
        if (imageUrl) {
          const title = `CUOTA N° ${schedule.installment_number}`;
          const amount = `Monto: S/ ${parseFloat(schedule.scheduled_amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
          const paymentDate = schedule.payment_date ? 
            new Date(schedule.payment_date).toLocaleDateString("es-ES") : 
            "Fecha no registrada";
          const status = schedule.status === 'paid' ? 'PAGADO' : 
                        schedule.status === 'partial' ? 'PARCIAL' : 
                        schedule.status === 'forgiven' ? 'PERDONADO' : 
                        schedule.status.toUpperCase();

          await addBoletaToPDF(imageUrl, title, amount, paymentDate, status);
        }
      }
    }

    // Generar el archivo PDF
    const fileName = `Boletas_Pago_Venta${ventaData.id}_${ventaData.customer_info?.full_name?.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
    doc.save(fileName);
    
    toast.success(`PDF de boletas de pago generado exitosamente. ${totalBoletasCount} boletas incluidas (${initialPaymentsWithBoleta.length} pagos iniciales + ${schedulesWithBoleta.length} cuotas).`, { id: toastId });
  } catch (err: any) {
    const { toast } = await import("react-hot-toast");
    toast.error("Error al generar el PDF de boletas de pago", { id: toastId });
    setError(err.response?.data?.detail || "Error al generar el PDF de boletas de pago.");
  }
};
