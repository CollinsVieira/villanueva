import React, { useState, useEffect } from 'react';
import { X, Clock, User, Calendar, DollarSign, FileText } from 'lucide-react';
import { Lote } from '../../types';
import { Venta } from '../../services/salesService';
import loteService from '../../services/loteService';
import salesService from '../../services/salesService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import LoadingSpinner from '../UI/LoadingSpinner';

interface LoteDetailModalProps {
  loteId: number;
  onClose: () => void;
}

const LoteDetailModal: React.FC<LoteDetailModalProps> = ({ loteId, onClose }) => {
  const [lote, setLote] = useState<Lote | null>(null);
  const [ventasHistory, setVentasHistory] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const loadLoteDetails = async () => {
      setIsLoading(true);
      try {
        const data = await loteService.getLoteById(loteId);
        setLote(data);
        
        // Cargar historial de ventas
        setIsLoadingHistory(true);
        const history = await salesService.getVentasHistoryByLote(loteId);
        setVentasHistory(history);
      } catch (error) {
        console.error("Error al cargar los detalles del lote", error);
        alert("No se pudieron cargar los detalles del lote.");
      } finally {
        setIsLoading(false);
        setIsLoadingHistory(false);
      }
    };
    loadLoteDetails();
  }, [loteId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'suspended': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Completada';
      case 'suspended': return 'Suspendida';
      default: return status;
    }
  };

  if (isLoading || !lote) {
    return (
      <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Detalles del Lote (Mz. {lote.block} - Lt. {lote.lot_number})
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sección de Detalles */}
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
            <div><strong className="block text-sm">Estado:</strong> <span className="capitalize">{lote.status}</span></div>
            <div><strong className="block text-sm">Precio:</strong> S/. {parseFloat(lote.price).toFixed(2)}</div>
            <div><strong className="block text-sm">Área:</strong> {parseFloat(lote.area).toFixed(0)} m²</div>
            <div><strong className="block text-sm">Manzana:</strong> {lote.block}</div>
          </div>

          {/* Sección de Historial de Ventas */}
          <div>
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Ventas
            </h3>
            
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : ventasHistory.length > 0 ? (
              <div className="space-y-4">
                {ventasHistory.map((venta) => (
                  <div key={venta.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Venta #{venta.id}</h4>
                          <p className="text-sm text-gray-600">
                            {dynamicReportsService.formatDateTime(venta.sale_date)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(venta.status)}`}>
                        {getStatusDisplay(venta.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-600">Cliente:</span>
                          <p className="font-medium">
                            {venta.customer_info?.full_name || venta.customer_display || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-600">Precio:</span>
                          <p className="font-medium">{dynamicReportsService.formatCurrency(parseFloat(venta.sale_price))}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-600">Financiamiento:</span>
                          <p className="font-medium">{venta.financing_months} meses</p>
                        </div>
                      </div>
                    </div>
                    
                    {venta.cancellation_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Motivo de cancelación:</strong> {venta.cancellation_reason}
                        </p>
                      </div>
                    )}
                    
                    {venta.notes && (
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Notas:</strong> {venta.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay historial de ventas para este lote.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoteDetailModal;