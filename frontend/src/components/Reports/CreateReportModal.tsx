import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ReportCreateData, ReportTypeChoice } from '../../types';
import { reportsService } from '../../services';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportCreateData) => Promise<void>;
}

const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [reportTypes, setReportTypes] = useState<ReportTypeChoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ReportCreateData>();

  const selectedType = watch('report_type');

  useEffect(() => {
    if (isOpen) {
      fetchReportTypes();
    }
  }, [isOpen]);

  const fetchReportTypes = async () => {
    try {
      const types = await reportsService.getReportTypes();
      setReportTypes(types);
    } catch (error) {
      console.error('Error fetching report types:', error);
    }
  };

  const handleFormSubmit = async (data: ReportCreateData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getReportDescription = (type: string) => {
    const descriptions = {
      customers_debt: 'Analiza clientes con deudas pendientes, cuotas vencidas y proyecciones de cobro.',
      payments_history: 'Historial completo de pagos realizados con filtros por fecha y método.',
      available_lots: 'Inventario de lotes disponibles para la venta con valoraciones.',
      sales_summary: 'Resumen de ventas realizadas en un período específico.',
      financial_overview: 'Vista general de la situación financiera del negocio.',
      pending_installments: 'Seguimiento de cuotas pendientes por cliente y lote.',
      monthly_collections: 'Análisis de cobranzas mensuales con desglose por método de pago.',
      custom: 'Reporte personalizado con parámetros específicos.'
    };
    return descriptions[type as keyof typeof descriptions] || '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Crear Nuevo Reporte
              </h2>
              <p className="text-sm text-gray-600">
                Configura los parámetros de tu reporte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          {/* Nombre del reporte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Reporte *
            </label>
            <input
              type="text"
              {...register('name', { required: 'El nombre es obligatorio' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Reporte de Deudores - Enero 2024"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo de reporte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Reporte *
            </label>
            <select
              {...register('report_type', { required: 'Selecciona un tipo de reporte' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un tipo...</option>
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {reportsService.getReportTypeIcon(type.value)} {type.label}
                </option>
              ))}
            </select>
            {errors.report_type && (
              <p className="mt-1 text-sm text-red-600">{errors.report_type.message}</p>
            )}
            
            {/* Descripción del tipo seleccionado */}
            {selectedType && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {getReportDescription(selectedType)}
                </p>
              </div>
            )}
          </div>

          {/* Descripción opcional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe el propósito específico de este reporte..."
            />
          </div>

          {/* Rango de fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Inicio
              </label>
              <input
                type="date"
                {...register('start_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Fin
              </label>
              <input
                type="date"
                {...register('end_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Info sobre fechas */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Las fechas son opcionales. Si no especificas fechas, 
              el reporte incluirá todos los datos disponibles hasta la fecha actual.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creando...' : 'Crear Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReportModal;
