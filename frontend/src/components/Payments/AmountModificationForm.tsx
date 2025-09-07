import React, { useState } from 'react';
import { PaymentSchedule } from '../../types';
import paymentService from '../../services/paymentService';

interface AmountModificationFormProps {
  schedule: PaymentSchedule;
  onSuccess: () => void;
  onCancel: () => void;
}

const AmountModificationForm: React.FC<AmountModificationFormProps> = ({
  schedule,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    new_amount: schedule.scheduled_amount,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await paymentService.modifyAmount(
        schedule.id,
        parseFloat(formData.new_amount),
        formData.notes
      );
      onSuccess();
    } catch (error) {
      console.error('Error modifying amount:', error);
      setError('Error al modificar el monto. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountDifference = parseFloat(formData.new_amount) - parseFloat(schedule.scheduled_amount);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Información Actual</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Monto Original: S/. {parseFloat(schedule.original_amount).toFixed(2)}</p>
          <p>Monto Programado: S/. {parseFloat(schedule.scheduled_amount).toFixed(2)}</p>
          <p>Monto Pagado: S/. {parseFloat(schedule.paid_amount).toFixed(2)}</p>
          <p>Pendiente: S/. {parseFloat(schedule.remaining_amount).toFixed(2)}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nuevo Monto Programado
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">S/.</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.new_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, new_amount: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        {amountDifference !== 0 && (
          <p className={`text-xs mt-1 ${amountDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {amountDifference > 0 ? 'Incremento' : 'Reducción'}: S/. {Math.abs(amountDifference).toFixed(2)}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Motivo de la Modificación
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Explique el motivo de la modificación..."
          required
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
          disabled={isSubmitting || amountDifference === 0}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Modificando...' : 'Modificar Monto'}
        </button>
      </div>
    </form>
  );
};

export default AmountModificationForm;
