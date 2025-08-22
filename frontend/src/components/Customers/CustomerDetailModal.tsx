import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Trash2, Calendar } from 'lucide-react';
import { Customer, HistoryEvent, Lote } from '../../types';
import customerService from '../../services/customerService';
import loteService from '../../services/loteService';
import LoadingSpinner from '../UI/LoadingSpinner';

interface CustomerDetailModalProps {
  customerId: number;
  onClose: () => void;
  onDataChange: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customerId, onClose, onDataChange }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [availableLotes, setAvailableLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado simplificado para el formulario de asignación
  const [assignment, setAssignment] = useState({
    loteId: '',
    financing_months: 12, // Valor por defecto
  });
  const [calculatedInstallment, setCalculatedInstallment] = useState<number>(0);

  const loadModalData = async () => {
    setIsLoading(true);
    try {
      const [customerData, historyData, lotesData] = await Promise.all([
        customerService.getCustomerById(customerId),
        customerService.getCustomerHistory(customerId),
        loteService.getLotes({ status: 'disponible' })
      ]);
      setCustomer(customerData);
      setHistory(historyData);
      setAvailableLotes(lotesData);
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

  // useEffect para calcular la cuota automáticamente
  useEffect(() => {
    if (assignment.loteId && assignment.financing_months > 0) {
      const selectedLote = availableLotes.find(l => l.id === Number(assignment.loteId));
      if (selectedLote) {
        const installment = parseFloat(selectedLote.price) / assignment.financing_months;
        setCalculatedInstallment(installment);
      }
    } else {
      setCalculatedInstallment(0);
    }
  }, [assignment, availableLotes]);

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAssignment({ ...assignment, [e.target.name]: e.target.value });
  };

  const handleAssignLote = async () => {
    if (!assignment.loteId) return;
    try {
      await loteService.updateLote(Number(assignment.loteId), {
        owner_id: customerId,
        financing_months: Number(assignment.financing_months),
        initial_payment: '0.00', // Se asume 0 pago inicial
      });
      onDataChange();
      loadModalData();
      setAssignment({ loteId: '', financing_months: 12 }); // Reset
    } catch (error) {
      alert('Error al asignar el lote.');
    }
  };

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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{customer.full_name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Detalles del Cliente</h3>
              <p><strong>Email:</strong> {customer.email || 'N/A'}</p>
              <p><strong>Teléfono:</strong> {customer.phone || 'N/A'}</p>
              <p><strong>Documento:</strong> {customer.document_number ? `${customer.document_type} ${customer.document_number}` : 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Lotes Asignados</h3>
              {customer.lotes && customer.lotes.length > 0 ? (
                <ul className="space-y-2">
                  {customer.lotes.map(lote => (
                    <li key={lote.id} className="flex items-center justify-between">
                      <span>• Mz. {lote.block} - Lt. {lote.lot_number}</span>
                      <button 
                        onClick={() => handleUnassignLote(lote.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded-full"
                        title="Quitar lote"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">Sin lotes asignados.</p>}
            </div>
            {/* <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-2 text-blue-800">Asignar y Programar Lote</h3>
              <div className="space-y-3">
                <select name="loteId" value={assignment.loteId} onChange={handleAssignmentChange} className="w-full p-2 border rounded-lg">
                  <option value="">Seleccionar lote disponible</option>
                  {availableLotes.map(lote => <option key={lote.id} value={lote.id}>
                    Mz. {lote.block} - Lt. {lote.lot_number} (S/. {parseFloat(lote.price).toFixed(2)})
                  </option>)}
                </select>
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-400"/>
                  <input type="number" name="financing_months" placeholder="Meses de Cuotas" value={assignment.financing_months} onChange={handleAssignmentChange} className="w-full p-2 border rounded-lg" />
                </div>
                
                {calculatedInstallment > 0 && (
                  <div className="text-center bg-white p-2 rounded-lg">
                    <p className="text-sm text-gray-600">Monto de cuota aprox:</p>
                    <p className="font-bold text-lg text-green-600">S/. {calculatedInstallment.toFixed(2)}</p>
                  </div>
                )}

                <button onClick={handleAssignLote} disabled={!assignment.loteId} className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                  Asignar y Guardar Plan
                </button>
              </div>
            </div> */}
          </div>
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-4 text-lg">Historial de Cambios</h3>
            <div className="space-y-4">
              {history.length > 0 ? history.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-gray-200 p-2 rounded-full"><Clock size={16} /></div>
                  <div>
                    <p className="font-semibold">{item.action}</p>
                    <p className="text-sm text-gray-600">{item.details}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.timestamp).toLocaleString('es-ES')} por {item.user}
                    </p>
                  </div>
                </div>
              )) : <p>No hay historial de cambios para este cliente.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;