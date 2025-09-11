import React, { useState, useEffect } from 'react';
import salesService, { VentaCreate, Venta } from '../../services/salesService';
import loteService from '../../services/loteService';
import customerService from '../../services/customerService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { Lote, Customer } from '../../types';
import { Eye, Download, FileText } from 'lucide-react';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);

  useEffect(() => {
    loadLotes();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (sale) {
      setFormData({
        lote: sale.lote || 0,
        customer: sale.customer || 0,
        sale_price: sale.sale_price || '',
        initial_payment: sale.initial_payment || '',
        contract_date: sale.contract_date || '',
        schedule_start_date: sale.schedule_start_date || '',
        contract_pdf: undefined, // No se puede editar el PDF existente
        notes: sale.notes || '',
        payment_day: sale.payment_day || 15, // Usar el valor existente
        financing_months: sale.financing_months || 12 // Usar el valor existente
      });
      setExistingPdf(sale.contract_pdf || null);
    }
  }, [sale]);

  // Establecer el lote seleccionado cuando se cargan los lotes y hay una venta existente
  useEffect(() => {
    if (sale && lotes.length > 0) {
      const lote = lotes.find(l => l.id === sale.lote);
      if (lote) {
        setSelectedLote(lote);
      }
    }
  }, [sale, lotes]);

  const loadLotes = async () => {
    try {
      const data = await loteService.getLotes();
      // Si estamos editando una venta, incluir todos los lotes (incluyendo el vendido)
      // Si estamos creando una nueva venta, solo mostrar lotes disponibles
      if (sale) {
        setLotes(data as any);
      } else {
        const filteredLotes = data.filter((lote: any) => lote.status === 'disponible');
        setLotes(filteredLotes as any);
      }
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
      sale_price: lote ? lote.price || '' : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.lote <= 0 || formData.customer <= 0 || !formData.sale_price || !formData.payment_day) {
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
                value={formData.lote > 0 ? formData.lote.toString() : ''}
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
                value={formData.customer > 0 ? formData.customer.toString() : ''}
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
                      onClick={() => window.open(existingPdf, '_blank')}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Ver PDF"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = existingPdf;
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
