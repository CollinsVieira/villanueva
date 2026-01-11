import React, { useState, useEffect } from 'react';
import { VentaCreate, Venta } from '../../services/salesService';
import loteService from '../../services/loteService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { Lote } from '../../types';
import { Eye, Download, FileText } from 'lucide-react';
import CustomerSelector from '../UI/CustomerSelector';
import SchedulePDFGenerator from './SchedulePDFGenerator';
import { getProxyImageUrl } from '../../utils/imageUtils';
import { useCreateSale, useUpdateSale } from '../../hooks/useSalesQueries';


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
    schedule_start_date: '',
    contract_pdf: undefined,
    notes: '',
    payment_day: 15,
    financing_months: 12
  });
  
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);

  // Usar React Query mutations
  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();

  const loading = createSaleMutation.isPending || updateSaleMutation.isPending;

  useEffect(() => {
    if (sale) {
      // Si estamos editando, solo cargar el lote específico de la venta
      loadSingleLote(sale.lote);
      
      // Convertir schedule_start_date de YYYY-MM-DD a YYYY-MM para el input type="month"
      let scheduleStartDate = sale.schedule_start_date || '';
      if (scheduleStartDate && scheduleStartDate.length > 7) {
        scheduleStartDate = scheduleStartDate.substring(0, 7); // "2023-01-01" -> "2023-01"
      }
      
      setFormData({
        lote: sale.lote || 0,
        customer: sale.customer || 0,
        sale_price: sale.sale_price || '',
        initial_payment: sale.initial_payment || '',
        contract_date: sale.contract_date || '',
        schedule_start_date: scheduleStartDate,
        contract_pdf: undefined,
        notes: sale.notes || '',
        payment_day: sale.payment_day || 15,
        financing_months: sale.financing_months || 12
      });
      setExistingPdf(sale.contract_pdf || null);
    } else {
      // Si estamos creando, cargar todos los lotes disponibles
      loadLotes();
    }
  }, [sale]);

  const loadSingleLote = async (loteId: number) => {
    try {
      const lote = await loteService.getLoteById(loteId);
      setSelectedLote(lote);
      setLotes([lote]);
    } catch (err) {
      console.error('Error loading lote:', err);
    }
  };

  const loadLotes = async () => {
    try {
      let page = 1;
      const all: Lote[] = [] as any;
      while (true) {
        const { next, results } = await loteService.getLotesPage({ page, page_size: 100 });
        all.push(...results);
        if (!next) break;
        page += 1;
      }
      // Solo mostrar lotes disponibles para nuevas ventas
      const filteredLotes = all.filter((lote: any) => lote.status === 'disponible');
      setLotes(filteredLotes as any);
    } catch (err) {
      console.error('Error loading lotes:', err);
    }
  };


  const handleLoteChange = (loteId: string) => {
    const lote = lotes.find(l => l.id === parseInt(loteId));
    setSelectedLote(lote || null);
    setFormData(prev => ({
      ...prev,
      lote: parseInt(loteId),
      sale_price: lote ? lote.price || '' : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.lote <= 0 || formData.customer <= 0 || !formData.sale_price || !formData.payment_day) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    setError(null);
    
    if (sale) {
      // Update existing sale - solo enviar campos editables (sin lote)
      const { lote, ...updateData } = formData;
      updateSaleMutation.mutate(
        { id: sale.id, data: updateData },
        {
          onSuccess: (savedSale) => {
            onSave?.(savedSale);
          },
          onError: (err: any) => {
            setError(err.response?.data?.detail || 'Error al actualizar la venta');
          }
        }
      );
    } else {
      // Create new sale
      createSaleMutation.mutate(formData, {
        onSuccess: (savedSale) => {
          onSave?.(savedSale);
        },
        onError: (err: any) => {
          setError(err.response?.data?.detail || 'Error al crear la venta');
        }
      });
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
              {sale ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {selectedLote ? `Mz. ${selectedLote.block}, Lote ${selectedLote.lot_number}` : 'Cargando...'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {selectedLote ? `${selectedLote.area} m² • ${dynamicReportsService.formatCurrency((selectedLote as any).price || 0)}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  id="lote"
                  value={formData.lote > 0 ? formData.lote.toString() : ''}
                  onChange={(e: any) => handleLoteChange(e.target.value)}
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
              )}
            </div>

            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <CustomerSelector
                value={formData.customer > 0 ? formData.customer : null}
                onChange={(customerId) => setFormData(prev => ({ ...prev, customer: customerId || 0 }))}
                placeholder="Buscar cliente..."
                required
              />
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
              <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 mb-1">
                Precio de Venta *
                {selectedLote && formData.sale_price === selectedLote.price && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (llenado automáticamente)
                  </span>
                )}
              </label>
              <div className="relative">
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
                {selectedLote && formData.sale_price !== selectedLote.price && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sale_price: selectedLote.price }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    title="Restaurar precio original del lote"
                  >
                    Restaurar
                  </button>
                )}
              </div>
              {selectedLote && (
                <p className="text-xs text-gray-500 mt-1">
                  Precio del lote: {dynamicReportsService.formatCurrency(parseFloat(selectedLote.price))}
                </p>
              )}
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

          <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="schedule_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio del Cronograma
                <span className="text-xs text-gray-500 ml-1">(Opcional)</span>
              </label>
              <input
                id="schedule_start_date"
                type="month"
                value={formData.schedule_start_date}
                onChange={(e: any) => setFormData(prev => ({ ...prev, schedule_start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="YYYY-MM"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no se especifica, las cuotas comenzarán desde el mes actual
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="contract_pdf" className="block text-sm text-black mb-1 font-bold">
              Contrato en PDF
            </label>
            
            {sale && existingPdf ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Contrato cargado</span>
                  <div className="flex gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => window.open(getProxyImageUrl(existingPdf) || existingPdf, '_blank')}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Ver PDF"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getProxyImageUrl(existingPdf) || existingPdf || '';
                        link.download = `contrato_venta_${sale.id}.pdf`;
                        link.click();
                      }}
                      className="p-1 text-gray-600 hover:text-gray-800"
                      title="Descargar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Para cambiar el PDF, selecciona un nuevo archivo
                </p>
              </div>
            ) : null}
            
            <input
              id="contract_pdf"
              type="file"
              accept=".pdf"
              onChange={(e: any) => {
                const file = e.target.files?.[0];
                setFormData(prev => ({ ...prev, contract_pdf: file }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {formData.contract_pdf && (
              <p className="text-xs text-green-600 mt-1">
                Nuevo archivo: {formData.contract_pdf.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Solo archivos PDF. Tamaño máximo: 10MB
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="financing_months" className="block text-sm font-medium text-gray-700 mb-1">Meses de Financiamiento *</label>
              <input
                id="financing_months"
                type="number"
                min="1"
                max="120"
                value={formData.financing_months}
                onChange={(e: any) => setFormData(prev => ({ ...prev, financing_months: parseInt(e.target.value) }))}
                placeholder="12"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número de meses para el financiamiento
              </p>
            </div>
          </div>

          {/* Componente para generar PDF de ejemplo */}
          <SchedulePDFGenerator
            salePrice={formData.sale_price || ''}
            initialPayment={formData.initial_payment || ''}
            paymentDay={formData.payment_day}
            financingMonths={formData.financing_months}
            scheduleStartDate={formData.schedule_start_date || ''}
            selectedLote={selectedLote}
            customerId={formData.customer}
            disabled={!formData.sale_price || !formData.payment_day || !formData.financing_months || !selectedLote}
            onError={setError}
          />

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
