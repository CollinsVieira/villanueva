import React, { useState } from 'react';
import { PaymentSchedule } from '../../types';
import paymentService from '../../services/paymentService';
import { X, Edit, AlertCircle, CheckCircle } from 'lucide-react';

interface BulkAmountModificationFormProps {
  schedules: PaymentSchedule[];
  onSuccess: () => void;
  onCancel: () => void;
}

const BulkAmountModificationForm: React.FC<BulkAmountModificationFormProps> = ({
  schedules,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    new_amount: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular estadísticas de las cuotas seleccionadas
  const totalCurrentAmount = schedules.reduce((sum, s) => sum + parseFloat(s.scheduled_amount), 0);
  const newTotalAmount = formData.new_amount ? parseFloat(formData.new_amount) * schedules.length : 0;
  const totalDifference = newTotalAmount - totalCurrentAmount;

  // Verificar si hay cuotas que no se pueden modificar (solo pagadas y perdonadas no se pueden modificar)
  const hasNonModifiableSchedules = schedules.some(s => ['paid', 'forgiven'].includes(s.status));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasNonModifiableSchedules) {
      setError('No se pueden modificar cuotas que ya están pagadas o perdonadas');
      return;
    }

    if (!formData.new_amount || parseFloat(formData.new_amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduleIds = schedules.map(s => s.id);
      const payload = {
        schedule_ids: scheduleIds,
        new_amount: parseFloat(formData.new_amount),
        notes: formData.notes
      };
      
      await paymentService.modifyMultipleAmounts(
        scheduleIds,
        parseFloat(formData.new_amount),
        formData.notes
      );
      
      // Mostrar toast de éxito
      const { toast } = await import('react-hot-toast');
      toast.success(`${schedules.length} cuotas modificadas exitosamente`);
      
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Error al modificar las cuotas. Por favor, intente nuevamente.';
      setError(errorMessage);
      
      const { toast } = await import('react-hot-toast');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Edit className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Modificar Múltiples Cuotas
                </h3>
                <p className="text-sm text-gray-600">
                  Modificando {schedules.length} cuotas seleccionadas
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasNonModifiableSchedules && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Algunas cuotas seleccionadas no se pueden modificar (pagadas o perdonadas)</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resumen actual */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Resumen de Cuotas Seleccionadas</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cantidad de cuotas:</span>
                  <div className="font-semibold text-lg text-blue-600">{schedules.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Monto actual total:</span>
                  <div className="font-semibold text-lg">S/. {totalCurrentAmount.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Rango de cuotas:</span>
                  <div className="font-semibold text-lg">
                    #{Math.min(...schedules.map(s => s.installment_number))} - 
                    #{Math.max(...schedules.map(s => s.installment_number))}
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de cuotas */}
            <div className="bg-white border rounded-lg">
              <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                <h5 className="font-medium text-gray-900">Cuotas a Modificar</h5>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-xs text-gray-500">
                      <th className="text-left p-2">Cuota</th>
                      <th className="text-left p-2">Monto Actual</th>
                      <th className="text-left p-2">Estado</th>
                      <th className="text-left p-2">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="text-sm">
                        <td className="p-2 font-medium">#{schedule.installment_number}</td>
                        <td className="p-2">S/. {parseFloat(schedule.scheduled_amount).toFixed(2)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            schedule.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            schedule.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                            schedule.status === 'paid' ? 'bg-green-100 text-green-800' :
                            schedule.status === 'forgiven' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.status === 'pending' ? 'Pendiente' :
                             schedule.status === 'overdue' ? 'Vencido' :
                             schedule.status === 'partial' ? 'Parcial' :
                             schedule.status === 'paid' ? 'Pagado' :
                             schedule.status === 'forgiven' ? 'Absuelto' : 'Desconocido'}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600">
                          {new Date(schedule.due_date).toLocaleDateString('es-ES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nuevo monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Monto por Cuota *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">S/.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.new_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_amount: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              {formData.new_amount && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Nuevo total: <span className="font-medium">S/. {newTotalAmount.toFixed(2)}</span>
                  </p>
                  <p className={`text-sm ${totalDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {totalDifference >= 0 ? 'Incremento' : 'Reducción'} total: 
                    <span className="font-medium"> S/. {Math.abs(totalDifference).toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la Modificación *
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Explique el motivo de la modificación múltiple..."
                required
              />
            </div>

            {/* Advertencia sobre redistribución */}
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Redistribución automática</p>
                <p>Las cuotas restantes (no seleccionadas) se ajustarán automáticamente para mantener el total del cronograma igual al monto total de la venta.</p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || hasNonModifiableSchedules || !formData.new_amount || !formData.notes}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Modificando...' : `Modificar ${schedules.length} Cuotas`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkAmountModificationForm;
