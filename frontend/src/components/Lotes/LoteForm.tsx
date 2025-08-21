import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Hash, MapPin, User, CheckSquare } from 'lucide-react';
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
    owner_id: null,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerService.getCustomers().then(setCustomers);

    if (lote) { // Modo Edición
      setFormData({
        block: lote.block,
        lot_number: lote.lot_number,
        area: lote.area,
        price: lote.price,
        initial_payment: lote.initial_payment,
        financing_months: lote.financing_months,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // El backend ahora se encarga del 'status' automáticamente
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold">{lote ? `Editar Lote (Mz. ${lote.block} - Lt. ${lote.lot_number})` : 'Crear Nuevo Lote'}</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && <Alert type="error" message={error} />}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzana</label>
                    <input type="text" name="block" value={formData.block} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° de Lote</label>
                    <input type="text" name="lot_number" value={formData.lot_number} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área (m²)</label>
                    <input type="number" step="0.01" name="area" value={formData.area} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pago Inicial (Enganche)</label>
                    <input type="number" step="0.01" name="initial_payment" value={formData.initial_payment} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meses de Financiamiento</label>
                    <input type="number" name="financing_months" value={Number(formData.financing_months)} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propietario (Opcional)</label>
                    <select name="owner_id" value={formData.owner_id || ''} onChange={handleChange} className="w-full p-2 border rounded-lg">
                        <option value="">Sin Asignar</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoteForm;