import React, { useState, useEffect } from 'react';
import { X, User, CheckSquare, Copy, Plus, FileText, Download, Trash2 } from 'lucide-react';
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
  payment_day: number;
  owner_id: number | null;
  contract_file?: File | null;
  contract_date: string;
  existing_contract_file?: string;
}

const LoteForm: React.FC<LoteFormProps> = ({ lote, onClose, onSave }) => {
  const [formData, setFormData] = useState<LoteFormData>({
    block: '',
    lot_number: '',
    area: '0.00',
    price: '0.00',
    initial_payment: '0.00',
    financing_months: 0,
    payment_day: 15,
    owner_id: null,
    contract_file: null,
    contract_date: '',
    existing_contract_file: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState({
    startLotNumber: 1,
    endLotNumber: 10,
    lotNumberPrefix: '',
  });

  useEffect(() => {
    customerService.getCustomers().then(setCustomers);

    if (lote) { // Modo Edición - deshabilitar modo masivo
      setIsBulkMode(false);
      setFormData({
        block: lote.block,
        lot_number: lote.lot_number,
        area: lote.area,
        price: lote.price,
        initial_payment: lote.initial_payment,
        financing_months: lote.financing_months,
        payment_day: lote.payment_day,
        owner_id: lote.owner?.id || null,
        contract_file: null,
        contract_date: lote.contract_date ? lote.contract_date.slice(0, 16) : '', // Formato para datetime-local
        existing_contract_file: lote.contract_file || '',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, contract_file: file }));
  };

  const handleBulkDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBulkData(prev => ({ ...prev, [name]: name.includes('Number') ? parseInt(value) || 1 : value }));
  };

  const handleDownloadContract = () => {
    if (formData.existing_contract_file) {
      const link = document.createElement('a');
      link.href = formData.existing_contract_file;
      link.target = '_blank';
      link.download = formData.existing_contract_file.split('/').pop() || 'contrato.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteContract = () => {
    setFormData(prev => ({ 
      ...prev, 
      existing_contract_file: '',
      contract_file: null 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isBulkMode && !lote) {
        // Creación masiva
        const lotesToCreate = [];
        const { startLotNumber, endLotNumber, lotNumberPrefix } = bulkData;
        
        if (startLotNumber > endLotNumber) {
          setError('El número inicial debe ser menor o igual al número final.');
          setIsSubmitting(false);
          return;
        }
        
        for (let i = startLotNumber; i <= endLotNumber; i++) {
          const lotNumber = lotNumberPrefix ? `${lotNumberPrefix}${i}` : i.toString();
          lotesToCreate.push({
            block: formData.block,
            lot_number: lotNumber,
            area: formData.area,
            price: formData.price,
            initial_payment: formData.initial_payment,
            financing_months: formData.financing_months,
            payment_day: formData.payment_day,
            owner_id: formData.owner_id ? Number(formData.owner_id) : null,
          });
        }
        
        // Crear todos los lotes
        const createPromises = lotesToCreate.map(loteData => 
          loteService.createLote(loteData)
        );
        
        await Promise.all(createPromises);
        onSave();
        
      } else {
        // Creación/edición individual
        const hasFile = formData.contract_file instanceof File;
        const shouldDeleteContract = !formData.existing_contract_file && !hasFile;
        
        if (hasFile) {
          // Usar FormData para archivos
          const formDataToSend = new FormData();
          formDataToSend.append('block', formData.block);
          formDataToSend.append('lot_number', formData.lot_number);
          formDataToSend.append('area', formData.area);
          formDataToSend.append('price', formData.price);
          formDataToSend.append('initial_payment', formData.initial_payment);
          formDataToSend.append('financing_months', formData.financing_months.toString());
          formDataToSend.append('payment_day', formData.payment_day.toString());
          formDataToSend.append('owner_id', formData.owner_id ? formData.owner_id.toString() : '');
          formDataToSend.append('contract_file', formData.contract_file!);
          if (formData.contract_date) {
            formDataToSend.append('contract_date', formData.contract_date);
          }

          if (lote) {
            await loteService.updateLoteWithFile(lote.id, formDataToSend);
          } else {
            await loteService.createLoteWithFile(formDataToSend);
          }
        } else {
          // Usar datos normales sin archivo
          const dataToSend: any = {
            block: formData.block,
            lot_number: formData.lot_number,
            area: formData.area,
            price: formData.price,
            initial_payment: formData.initial_payment,
            financing_months: formData.financing_months,
            payment_day: formData.payment_day,
            owner_id: formData.owner_id ? Number(formData.owner_id) : null,
            contract_date: formData.contract_date || undefined,
          };

          // Solo incluir contract_file si se debe eliminar
          if (shouldDeleteContract) {
            dataToSend.contract_file = null;
          }

          if (lote) {
            await loteService.updateLote(lote.id, dataToSend);
          } else {
            await loteService.createLote(dataToSend);
          }
        }
        onSave();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-semibold">
                {lote ? `Editar Lote (Mz. ${lote.block} - Lt. ${lote.lot_number})` : 'Crear Nuevo Lote'}
              </h3>
              {!lote && (
                <p className="text-sm text-gray-600 mt-1">
                  {isBulkMode ? 'Creación masiva de lotes' : 'Creación individual'}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {!lote && (
                <button
                  type="button"
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isBulkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isBulkMode ? (
                    <><User size={16} className="inline mr-1" /> Individual</>
                  ) : (
                    <><Copy size={16} className="inline mr-1" /> Automático</>
                  )}
                </button>
              )}
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {error && <Alert type="error" message={error} />}
            
            {/* Configuración de creación masiva */}
            {isBulkMode && !lote && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Copy className="text-blue-600" size={20} />
                  <h4 className="font-semibold text-blue-900">Configuración de Creación Masiva</h4>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Número Inicial</label>
                    <input 
                      type="number" 
                      name="startLotNumber" 
                      value={bulkData.startLotNumber} 
                      onChange={handleBulkDataChange} 
                      className="w-full p-2 border border-blue-300 rounded-lg " 
                      min="1"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Número Final</label>
                    <input 
                      type="number" 
                      name="endLotNumber" 
                      value={bulkData.endLotNumber} 
                      onChange={handleBulkDataChange} 
                      className="w-full p-2 border border-blue-300 rounded-lg " 
                      min="1"
                      required 
                    />
                  </div>
                </div>
                
                <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
                  <strong>Vista previa:</strong> Se crearán {Math.max(0, bulkData.endLotNumber - bulkData.startLotNumber + 1)} lotes
                  {bulkData.startLotNumber <= bulkData.endLotNumber && (
                    <>
                      <br />
                      <strong>Ejemplos:</strong> {bulkData.lotNumberPrefix}{bulkData.startLotNumber}, {bulkData.lotNumberPrefix}{bulkData.startLotNumber + 1}, ..., {bulkData.lotNumberPrefix}{bulkData.endLotNumber}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Formulario principal */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzana</label>
                    <input type="text" name="block" value={formData.block} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg  " required />
                </div>
                {!isBulkMode && (
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° de Lote</label>
                      <input type="text" name="lot_number" value={formData.lot_number} onChange={handleChange} className="w-full p-3  border border-gray-300 rounded-lg " required />
                  </div>
                )}
                <div className={isBulkMode ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área (m²)</label>
                    <input type="number" step="0.01" name="area" value={formData.area} onChange={handleChange} className="w-full p-3  border border-gray-300 rounded-lg " required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full p-3  border border-gray-300 rounded-lg " required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pago Inicial (Enganche)</label>
                    <input type="number" step="0.01" name="initial_payment" value={formData.initial_payment} onChange={handleChange} className="w-full p-3  border border-gray-300 rounded-lg " />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meses de Financiamiento</label>
                    <input type="number" name="financing_months" value={Number(formData.financing_months)} onChange={handleChange} className="w-full p-3  border border-gray-300 rounded-lg " />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Día de Vencimiento Mensual</label>
                    <input 
                        type="number" 
                        name="payment_day" 
                        value={Number(formData.payment_day)} 
                        onChange={handleChange} 
                        min="1" 
                        max="31"
                        className="w-full p-3 border border-gray-300 rounded-lg " 
                        placeholder="15"
                    />
                    <p className="text-xs text-gray-500 mt-1">Día del mes en que vencen las cuotas (1-31)</p>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
                    <select name="owner_id" value={formData.owner_id || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg ">
                        <option value="">Sin Asignar</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                </div>
                
                {/* Campos de contrato - solo en modo edición */}
                {lote && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FileText className="inline mr-2" size={16} />
                      Contrato PDF
                    </label>
                    
                    {/* Mostrar contrato existente */}
                    {formData.existing_contract_file && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="text-green-600" size={16} />
                            <span className="text-sm text-green-800">
                              Contrato existente: {formData.existing_contract_file.split('/').pop()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleDownloadContract}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center space-x-1"
                            >
                              <Download size={12} />
                              <span>Descargar</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteContract}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 flex items-center space-x-1"
                            >
                              <Trash2 size={12} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Input para nuevo archivo */}
                    <div className="flex items-center space-x-3">
                      <input 
                        type="file" 
                        name="contract_file" 
                        accept=".pdf"
                        onChange={handleFileChange} 
                        className="flex-1 p-3 border border-gray-300 rounded-lg text-sm text-gray-700"
                      />
                      {formData.contract_file && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, contract_file: null }))}
                          className="px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {formData.contract_file && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <FileText size={12} className="mr-1" />
                        Nuevo archivo: {formData.contract_file.name}
                      </p>
                    )}
                  </div>
                )}
                
                {lote && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora del Contrato</label>
                    <input 
                      type="datetime-local" 
                      name="contract_date" 
                      value={formData.contract_date || ''} 
                      onChange={handleChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-700"
                    />
                  </div>
                )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center space-x-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isBulkMode ? 'Creando Lotes...' : 'Guardando...'}</span>
                </>
              ) : (
                <>
                  {isBulkMode ? <Plus size={16} /> : <CheckSquare size={16} />}
                  <span>{isBulkMode ? `Crear ${Math.max(0, bulkData.endLotNumber - bulkData.startLotNumber + 1)} Lotes` : (lote ? 'Actualizar Lote' : 'Crear Lote')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoteForm;
