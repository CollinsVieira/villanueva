import React, { useState } from 'react';
import { PaymentSchedule } from '../../types';
import paymentService from '../../services/paymentService';

interface PaymentRegistrationFormProps {
  schedule: PaymentSchedule;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentRegistrationForm: React.FC<PaymentRegistrationFormProps> = ({
  schedule,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    amount: schedule.remaining_amount || (parseFloat(schedule.scheduled_amount) - parseFloat(schedule.paid_amount)).toString(),
    method: 'transferencia' as const,
    receipt_number: '',
    notes: '',
    receipt_image: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await paymentService.registerPayment(schedule.id, {
        amount: parseFloat(formData.amount),
        method: formData.method,
        receipt_number: formData.receipt_number,
        notes: formData.notes,
        receipt_image: formData.receipt_image || undefined
      });
      onSuccess();
    } catch (error) {
      console.error('Error registering payment:', error);
      setError('Error al registrar el pago. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, receipt_image: file }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monto a Pagar
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">S/.</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={parseFloat(schedule.remaining_amount || '0')}
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Pendiente: S/. {parseFloat(schedule.remaining_amount || '0').toFixed(2)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Método de Pago
        </label>
        <select
          value={formData.method}
          onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="check">Cheque</option>
          <option value="card">Tarjeta</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Número de Recibo (Opcional)
        </label>
        <input
          type="text"
          value={formData.receipt_number}
          onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ej: REC-001"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagen del Recibo (Opcional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas (Opcional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Observaciones adicionales..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
        </button>
      </div>
    </form>
  );
};

export default PaymentRegistrationForm;
