import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Customer, HistoryEvent } from '../../types';
import customerService from '../../services/customerService';
import LoadingSpinner from '../UI/LoadingSpinner';
import loteService from '../../services/loteService';

interface CustomerDetailModalProps {
  customerId: number;
  onClose: () => void;
  onDataChange: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customerId, onClose, onDataChange }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadModalData = async () => {
    setIsLoading(true);
    try {
      const [customerData, historyData] = await Promise.all([
        customerService.getCustomerById(customerId),
        customerService.getCustomerHistory(customerId)
      ]);
      setCustomer(customerData);
      setHistory(historyData);
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



  const handleUnassignLote = async (loteId: number) => {
    if (window.confirm('¿Está seguro de que desea quitar este lote del cliente? El lote volverá a estar disponible.')) {
      try {
        await loteService.updateLote(loteId, { owner_id: null });
        onDataChange();
        loadModalData();
      } catch (error) {
        alert('Error al quitar el lote del cliente.');
        console.error("Error en handleUnassignLote:", error);
      }
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
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{customer.full_name}</h2>
            <p className="text-sm text-gray-600 mt-1">Detalles del cliente</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Cerrar"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Información del Cliente</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">Email:</span>
                  <span className="font-medium">{customer.email || 'No especificado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">Teléfono:</span>
                  <span className="font-medium">{customer.phone || 'No especificado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 min-w-[80px]">Documento:</span>
                  <span className="font-medium">
                    {customer.document_number ? `${customer.document_type} ${customer.document_number}` : 'No especificado'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Lotes Asignados</h3>
              {customer.lotes && customer.lotes.length > 0 ? (
                <div className="space-y-3">
                  {customer.lotes.map(lote => (
                    <div key={lote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="font-medium">Mz. {lote.block} - Lt. {lote.lot_number}</span>
                      </div>
                      <button 
                        onClick={() => handleUnassignLote(lote.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Quitar lote"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>Este cliente no tiene lotes asignados</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Historial de Cambios</h3>
            <div className="space-y-3">
              {history.length > 0 ? history.map((item, index) => (
                <div key={index} className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium text-blue-700 bg-blue-200 px-3 py-1 rounded-full">
                          {item.lote_name}
                        </span>
                        <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                          {new Date(item.timestamp).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 mb-2">{item.action}</p>
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">{item.details}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>Realizado por:</span>
                        <span className="font-medium bg-gray-100 px-2 py-1 rounded">{item.user}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-lg">No hay historial de cambios</p>
                  <p className="text-sm">Este cliente aún no tiene registros de actividad</p>
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