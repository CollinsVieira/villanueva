import React, { useState } from 'react';
import salesService, { VentaInitialPayment } from '../../services/salesService';

interface InitialPaymentFormProps {
  saleId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const InitialPaymentForm: React.FC<InitialPaymentFormProps> = ({
  saleId,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<VentaInitialPayment>({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    method: 'cash',
    receipt_number: '',
    receipt_date: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await salesService.registerInitialPayment(saleId, formData);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar el pago inicial');
      console.error('Error registering initial payment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Registrar Pago Inicial</h2>
        </div>
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e: any) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
              <input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e: any) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
              <select
                id="method"
                value={formData.method}
                onChange={(e: any) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="check">Cheque</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>

            <div>
              <label htmlFor="receipt_number" className="block text-sm font-medium text-gray-700 mb-1">Número de Recibo</label>
              <input
                id="receipt_number"
                type="text"
                value={formData.receipt_number}
                onChange={(e: any) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                placeholder="Número de recibo o referencia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="receipt_date" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Recibo</label>
              <input
                id="receipt_date"
                type="date"
                value={formData.receipt_date}
                onChange={(e: any) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e: any) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el pago..."
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
                {loading ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InitialPaymentForm;
