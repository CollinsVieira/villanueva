import React, { useState, useEffect } from 'react';
import { X, User, CheckSquare, Copy, Plus } from 'lucide-react';
import { Lote, Customer } from '../../types';
import loteService from '../../services/loteService';
import customerService from '../../services/customerService';
import Alert from '../UI/Alert';

interface LoteFormProps {
  lote?: Lote | null;
  onClose: () => void;
  onSave: () => void;
}

// --- TIPO SIMPLIFICADO ---
type LoteFormData = {
  block: string;
  lot_number: string;
  area: string;
  price: string;
  initial_payment: string;
  financing_months: number;
  payment_day: number;
  owner_id: number | null;
}

const LoteForm: React.FC<LoteFormProps> = ({ lote, onClose, onSave }) => {
  const [formData, setFormData] = useState<LoteFormData>({
    block: '',
    lot_number: '',
    area: '0.00',
    price: '0.00',
    initial_payment: '0.00',
    financing_months: 0,
    payment_day: 15,
    owner_id: null,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState({
    startLotNumber: 1,
    endLotNumber: 10,
    lotNumberPrefix: '',
  });

  useEffect(() => {
    customerService.getCustomers().then(setCustomers);

    if (lote) { // Modo Edición - deshabilitar modo masivo
      setIsBulkMode(false);
      setFormData({
        block: lote.block,
        lot_number: lote.lot_number,
        area: lote.area,
        price: lote.price,
        initial_payment: lote.initial_payment,
        financing_months: lote.financing_months,
        payment_day: lote.payment_day,
        owner_id: lote.owner?.id || null,
      });
    }
  }, [lote]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Manejar el caso del select para que un string vacío sea null
    if (name === 'owner_id' && value === '') {
      setFormData(prev => ({ ...prev, owner_id: null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBulkDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBulkData(prev => ({ ...prev, [name]: name.includes('Number') ? parseInt(value) || 1 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isBulkMode && !lote) {
        // Creación masiva
        const lotesToCreate = [];
        const { startLotNumber, endLotNumber, lotNumberPrefix } = bulkData;
        
        if (startLotNumber > endLotNumber) {
          setError('El número inicial debe ser menor o igual al número final.');
          setIsSubmitting(false);
          return;
        }
        
        for (let i = startLotNumber; i <= endLotNumber; i++) {
          const lotNumber = lotNumberPrefix ? `${lotNumberPrefix}${i}` : i.toString();
          lotesToCreate.push({
            ...formData,
            lot_number: lotNumber,
            owner_id: formData.owner_id ? Number(formData.owner_id) : null,
          });
        }
        
        // Crear todos los lotes
        const createPromises = lotesToCreate.map(loteData => 
          loteService.createLote(loteData)
        );
        
        await Promise.all(createPromises);
        onSave();
        
      } else {
        // Creación/edición individual
        const dataToSend = {
          ...formData,
          owner_id: formData.owner_id ? Number(formData.owner_id) : null,
        };

        if (lote) {
          await loteService.updateLote(lote.id, dataToSend);
        } else {
          await loteService.createLote(dataToSend);
        }
        onSave();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-semibold">
                {lote ? `Editar Lote (Mz. ${lote.block} - Lt. ${lote.lot_number})` : 'Crear Nuevo Lote'}
              </h3>
              {!lote && (
                <p className="text-sm text-gray-600 mt-1">
                  {isBulkMode ? 'Creación masiva de lotes' : 'Creación individual'}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {!lote && (
                <button
                  type="button"
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isBulkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isBulkMode ? (
                    <><User size={16} className="inline mr-1" /> Individual</>
                  ) : (
                    <><Copy size={16} className="inline mr-1" /> Automático</>
                  )}
                </button>
              )}
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {error && <Alert type="error" message={error} />}
            
            {/* Configuración de creación masiva */}
            {isBulkMode && !lote && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Copy className="text-blue-600" size={20} />
                  <h4 className="font-semibold text-blue-900">Configuración de Creación Masiva</h4>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Número Inicial</label>
                    <input 
                      type="number" 
                      name="startLotNumber" 
                      value={bulkData.startLotNumber} 
                      onChange={handleBulkDataChange} 
                      className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      min="1"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Número Final</label>
                    <input 
                      type="number" 
                      name="endLotNumber" 
                      value={bulkData.endLotNumber} 
                      onChange={handleBulkDataChange} 
                      className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                      min="1"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Prefijo (Opcional)</label>
                    <input 
                      type="text" 
                      name="lotNumberPrefix" 
                      value={bulkData.lotNumberPrefix} 
                      onChange={handleBulkDataChange} 
                      placeholder="Ej: LT-"
                      className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
                
                <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
                  <strong>Vista previa:</strong> Se crearán {Math.max(0, bulkData.endLotNumber - bulkData.startLotNumber + 1)} lotes
                  {bulkData.startLotNumber <= bulkData.endLotNumber && (
                    <>
                      <br />
                      <strong>Ejemplos:</strong> {bulkData.lotNumberPrefix}{bulkData.startLotNumber}, {bulkData.lotNumberPrefix}{bulkData.startLotNumber + 1}, ..., {bulkData.lotNumberPrefix}{bulkData.endLotNumber}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Formulario principal */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzana</label>
                    <input type="text" name="block" value={formData.block} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                {!isBulkMode && (
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° de Lote</label>
                      <input type="text" name="lot_number" value={formData.lot_number} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  </div>
                )}
                <div className={isBulkMode ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área (m²)</label>
                    <input type="number" step="0.01" name="area" value={formData.area} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pago Inicial (Enganche)</label>
                    <input type="number" step="0.01" name="initial_payment" value={formData.initial_payment} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meses de Financiamiento</label>
                    <input type="number" name="financing_months" value={Number(formData.financing_months)} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Día de Vencimiento Mensual</label>
                    <input 
                        type="number" 
                        name="payment_day" 
                        value={Number(formData.payment_day)} 
                        onChange={handleChange} 
                        min="1" 
                        max="31"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                        placeholder="15"
                    />
                    <p className="text-xs text-gray-500 mt-1">Día del mes en que vencen las cuotas (1-31)</p>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propietario (Opcional)</label>
                    <select name="owner_id" value={formData.owner_id || ''} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Sin Asignar</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center space-x-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isBulkMode ? 'Creando Lotes...' : 'Guardando...'}</span>
                </>
              ) : (
                <>
                  {isBulkMode ? <Plus size={16} /> : <CheckSquare size={16} />}
                  <span>{isBulkMode ? `Crear ${Math.max(0, bulkData.endLotNumber - bulkData.startLotNumber + 1)} Lotes` : (lote ? 'Actualizar Lote' : 'Crear Lote')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoteForm;