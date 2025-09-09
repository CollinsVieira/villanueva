import React, { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Customer } from "../../types";
import customerService from "../../services/customerService";
import LoadingSpinner from "../UI/LoadingSpinner";
import { handleDownloadPDF } from "./PdfResumenPagos";
import { handleDownloadCronogramaPDF } from "../Payments/PdfCronogramaPagos";

interface CustomerDetailModalProps {
  customerId: number;
  onClose: () => void;
  setError: (error: string | null) => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customerId,
  onClose,
  setError,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadModalData = async () => {
    setIsLoading(true);
    try {
      const customerData = await customerService.getCustomerById(customerId);
      setCustomer(customerData);
    } catch (error) {
      console.error("Error al cargar datos del cliente", error);
      alert("No se pudieron cargar los datos del cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModalData();
  }, [customerId]);


  const handleDownloadCronograma = async (customerId: number, setError: (error: string | null) => void) => {
    try {
      // Get customer's ventas activas
      const customerData = await customerService.getCustomerById(customerId);
      const activeVentas = customerData.ventas?.filter(venta => venta.status === 'active');
      
      if (!activeVentas || activeVentas.length === 0) {
        setError("Este cliente no tiene ventas activas para generar cronograma.");
        return;
      }
      
      // If customer has multiple ventas activas, use the first one or let user choose
      // For now, we'll use the first venta
      const ventaId = activeVentas[0].id;
      
      // Call the PDF generation function with venta ID instead of lote ID
      await handleDownloadCronogramaPDF(ventaId, setError);
    } catch (error) {
      console.error("Error getting customer ventas:", error);
      setError("Error al obtener las ventas del cliente.");
    }
  };

  if (isLoading || !customer) {
    return (
      <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-row justify-between w-full pr-8 pl-8">
            <div className="flex  flex-col gap-2">
              <p className="text-sm text-gray-600 mt-1">Detalles del cliente</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPDF(customer.id, setError);
                }}
                className="p-2 text-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg flex items-center gap-2 bg-blue-400"
                title="Descargar Historial de Pagos"
              >
                <Download size={16} />
                <span>Historial de Pagos</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadCronograma(customer.id, setError);
                }}
                className="p-2 text-white hover:bg-slate-200 hover:text-slate-900 rounded-lg flex items-center gap-2 bg-emerald-500"
                title="Descargar Cronograma de Pagos"
              >
                <Download size={16} />
                <span>Cronograma de Pagos</span>
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Cerrar"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Información del Cliente
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">Nombre:</span>
                  <span className="font-medium">
                    {customer.full_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">Email:</span>
                  <span className="font-medium">
                    {customer.email || "No especificado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">Teléfono:</span>
                  <span className="font-medium">
                    {customer.phone || "No especificado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">{customer.document_type}:</span>
                  <span className="font-medium">
                    {customer.document_number
                      ? `${customer.document_number}`
                      : "No especificado"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Ventas Activas
              </h3>
              {customer.ventas && customer.ventas.length > 0 ? (
                <div className="space-y-3">
                  {customer.ventas.map((venta) => (
                    <div
                      key={venta.id}
                      className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="font-medium text-gray-800">
                              {venta.lote_display}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {venta.status === 'active' ? 'Activa' : venta.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Precio de Venta:</span>
                              <span className="ml-2">S/ {parseFloat(venta.sale_price).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="font-medium">Pago Inicial:</span>
                              <span className="ml-2">S/ {parseFloat(venta.initial_payment).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="font-medium">Saldo Pendiente:</span>
                              <span className="ml-2 text-red-600 font-medium">S/ {parseFloat(venta.remaining_balance).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="font-medium">Fecha de Venta:</span>
                              <span className="ml-2">{new Date(venta.sale_date).toLocaleDateString('es-ES')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <p className="text-lg">No tiene ventas activas</p>
                  <p className="text-sm">
                    Este cliente aún no tiene lotes asignados a través de ventas
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;
