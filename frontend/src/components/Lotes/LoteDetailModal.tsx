import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { Lote } from '../../types';
import loteService from '../../services/loteService';
import LoadingSpinner from '../UI/LoadingSpinner';

interface LoteDetailModalProps {
  loteId: number;
  onClose: () => void;
}

const LoteDetailModal: React.FC<LoteDetailModalProps> = ({ loteId, onClose }) => {
  const [lote, setLote] = useState<Lote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLoteDetails = async () => {
      setIsLoading(true);
      try {
        const data = await loteService.getLoteById(loteId);
        setLote(data);
      } catch (error) {
        console.error("Error al cargar los detalles del lote", error);
        alert("No se pudieron cargar los detalles del lote.");
      } finally {
        setIsLoading(false);
      }
    };
    loadLoteDetails();
  }, [loteId]);

  if (isLoading || !lote) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Detalles del Lote (Mz. {lote.block} - Lt. {lote.lot_number})
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sección de Detalles */}
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
            <div><strong className="block text-sm">Propietario:</strong> {lote.owner?.full_name || 'Sin Asignar'}</div>
            <div><strong className="block text-sm">Estado:</strong> <span className="capitalize">{lote.status}</span></div>
            <div><strong className="block text-sm">Precio:</strong> S/. {parseFloat(lote.price).toFixed(2)}</div>
            <div><strong className="block text-sm">Saldo Restante:</strong> S/. {parseFloat(lote.remaining_balance).toFixed(2)}</div>
          </div>

          {/* Sección de Historial */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">Historial de Cambios</h3>
            <div className="space-y-4">
              {lote.history && lote.history.length > 0 ? lote.history.map((item) => (
                <div key={item.id} className="flex items-start space-x-3">
                  <div className="bg-gray-200 p-2 rounded-full"><Clock size={16} /></div>
                  <div>
                    <p className="font-semibold">{item.action}</p>
                    <p className="text-sm text-gray-600">{item.details}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.timestamp).toLocaleString('es-ES')} por {item.user.name}
                    </p>
                  </div>
                </div>
              )) : <p>No hay historial de cambios para este lote.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoteDetailModal;