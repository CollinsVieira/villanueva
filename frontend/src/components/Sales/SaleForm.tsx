import React, { useState, useEffect } from 'react';
import salesService, { VentaCreate, Venta } from '../../services/salesService';
import loteService from '../../services/loteService';
import customerService from '../../services/customerService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { Lote, Customer } from '../../types';

interface SaleFormProps {
  sale?: Venta;
  onSave?: (sale: Venta) => void;
  onCancel?: () => void;
}

const SaleForm: React.FC<SaleFormProps> = ({ sale, onSave, onCancel }) => {
  const [formData, setFormData] = useState<VentaCreate>({
    lote: 0,
    customer: 0,
    sale_price: '',
    initial_payment: '',
    contract_date: '',
    notes: '',
    payment_day: 15
  });
  
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLotes();
    loadCustomers();
    
    if (sale) {
      setFormData({
        lote: sale.lote,
        customer: sale.customer,
        sale_price: sale.sale_price,
        initial_payment: sale.initial_payment || '',
        contract_date: sale.contract_date || '',
        notes: sale.notes || '',
        payment_day: 15 // Valor por defecto para ventas existentes
      });
    }
  }, [sale]);

  const loadLotes = async () => {
    try {
      const data = await loteService.getLotes();
      // Filter available lotes (not sold or with cancelled sales)
      const filteredLotes = data.filter((lote: any) => !lote.customer_id);
      setLotes(filteredLotes as any);
    } catch (err) {
      console.error('Error loading lotes:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customerService.getCustomers();
      setCustomers(data as any);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const handleLoteChange = (loteId: string) => {
    const lote = lotes.find(l => l.id === parseInt(loteId));
    setSelectedLote(lote || null);
    setFormData(prev => ({
      ...prev,
      lote: parseInt(loteId),
      sale_price: lote ? (lote as any).total_price?.toString() || '' : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lote || !formData.customer || !formData.sale_price || !formData.payment_day) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let savedSale: Venta;
      
      if (sale) {
        // Update existing sale
        savedSale = await salesService.updateVenta(sale.id, formData);
      } else {
        // Create new sale
        savedSale = await salesService.createVenta(formData);
      }
      
      onSave?.(savedSale);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar la venta');
      console.error('Error saving sale:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">{sale ? 'Editar Venta' : 'Nueva Venta'}</h2>
      </div>
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lote" className="block text-sm font-medium text-gray-700 mb-1">Lote *</label>
              <select
                id="lote"
                value={formData.lote.toString()}
                onChange={(e: any) => handleLoteChange(e.target.value)}
                disabled={!!sale}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar lote</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id.toString()}>
                    Mz. {lote.block}, Lote {lote.lot_number} - {dynamicReportsService.formatCurrency((lote as any).price || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                id="customer"
                value={formData.customer.toString()}
                onChange={(e: any) => setFormData(prev => ({ ...prev, customer: parseInt(e.target.value) }))}
                disabled={!!sale}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id.toString()}>
                    {customer.full_name} - {customer.document_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLote && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h4 className="font-medium mb-2">Información del Lote</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Área:</span> {selectedLote.area} m²
                </div>
                <div>
                  <span className="font-medium">Precio total:</span> {dynamicReportsService.formatCurrency((selectedLote as any).price || 0)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta *</label>
              <input
                id="sale_price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e: any) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="initial_payment" className="block text-sm font-medium text-gray-700 mb-1">Pago Inicial</label>
              <input
                id="initial_payment"
                type="number"
                step="0.01"
                value={formData.initial_payment}
                onChange={(e: any) => setFormData(prev => ({ ...prev, initial_payment: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contract_date" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Contrato</label>
            <input
              id="contract_date"
              type="date"
              value={formData.contract_date}
              onChange={(e: any) => setFormData(prev => ({ ...prev, contract_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="payment_day" className="block text-sm font-medium text-gray-700 mb-1">Día de Vencimiento Mensual *</label>
            <input
              id="payment_day"
              type="number"
              min="1"
              max="31"
              value={formData.payment_day}
              onChange={(e: any) => setFormData(prev => ({ ...prev, payment_day: parseInt(e.target.value) }))}
              placeholder="15"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Día del mes en que vencen las cuotas (1-31)
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e: any) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales sobre la venta..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (sale ? 'Actualizar' : 'Crear Venta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaleForm;
