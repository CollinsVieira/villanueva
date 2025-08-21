import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload } from 'lucide-react';
import { Lote } from '../../types';
import loteService from '../../services/loteService';
import paymentService from '../../services/paymentService';
import Alert from '../UI/Alert';
import SearchableSelect from '../UI/SearchableSelect'; // Asegúrate de haber creado este componente

interface PaymentFormProps {
  onClose: () => void;
  onSave: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onClose, onSave }) => {
  const [allLotes, setAllLotes] = useState<Lote[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null); // Estado para los detalles del lote
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loteSearch, setLoteSearch] = useState('');

const filteredLotes = useMemo(() => {
    if (!loteSearch) return allLotes;
    const search = loteSearch.toLowerCase();
    return allLotes.filter(lote => 
      lote.owner?.full_name.toLowerCase().includes(search) ||
      lote.owner?.document_number?.toLowerCase().includes(search) || // <-- Búsqueda por DNI añadida
      `${lote.block}`.toLowerCase().includes(search) ||
      `${lote.lot_number}`.toLowerCase().includes(search)
    );
  }, [allLotes, loteSearch]);


  useEffect(() => {
    // Carga todos los lotes vendidos una sola vez
    loteService.getLotes({ status: 'vendido' }).then(setAllLotes);
  }, []);

  // Cuando el ID del lote seleccionado cambia, busca sus detalles completos
  useEffect(() => {
    if (selectedLoteId) {
      const loteDetails = allLotes.find(l => l.id === selectedLoteId);
      setSelectedLote(loteDetails || null);
    } else {
      setSelectedLote(null);
    }
  }, [selectedLoteId, allLotes]);

  const loteOptions = allLotes.map(lote => ({
    value: lote.id,
    label: `Mz. ${lote.block} - Lt. ${lote.lot_number} (${lote.owner?.full_name})`
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLoteId) {
      setError("Por favor, seleccione un lote.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (selectedFile) {
      formData.append('receipt_image', selectedFile);
    }
    formData.set('lote_id', String(selectedLoteId));

    try {
      await paymentService.createPayment(formData);
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error al registrar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold">Registrar Nuevo Pago</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && <Alert type="error" message={error} />}
            <div>
              <label className="block text-sm font-medium mb-1">Buscar y Seleccionar Lote</label>
              <SearchableSelect 
                options={loteOptions}
                value={selectedLoteId}
                onChange={(value) => setSelectedLoteId(value as number | null)}
                placeholder="Buscar por cliente o lote..."
              />
            </div>
            
            {/* --- BLOQUE DE CUOTAS AÑADIDO --- */}
            {selectedLote && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-center">
                <p>Cuotas Pagadas: <strong>{selectedLote.installments_paid} de {selectedLote.financing_months}</strong></p>
                <p>Saldo Restante: <strong className="text-green-600">${parseFloat(selectedLote.remaining_balance).toFixed(2)}</strong></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Monto del Pago</label>
                    <input type="number" step="0.01" name="amount" className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Pago</label>
                    <input type="date" name="payment_date" className="w-full p-2 border rounded-lg" required />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Método de Pago</label>
                    <select name="method" className="w-full p-2 border rounded-lg">
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">N° de Cuota (Opcional)</label>
                    <input type="number" name="installment_number" className="w-full p-2 border rounded-lg" />
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante (Imagen)</label>
              <div 
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? `Archivo: ${selectedFile.name}` : 'Haz clic para subir una imagen'}
                  </p>
                </div>
              </div>
              <input type="file" name="receipt_image" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

          </div>
          <div className="flex justify-end space-x-3 p-6 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;