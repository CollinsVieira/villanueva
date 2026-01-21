import React, { useState, useRef } from "react";
import { CreditCard, X, Upload } from "lucide-react";
import { paymentService } from "../../services";
import { Payment } from "../../types";
import { Alert } from "../UI";

interface EditPaymentFormProps {
  payment: Payment;
  onClose: () => void;
  onSave: () => void;
}

type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

const EditPaymentForm: React.FC<EditPaymentFormProps> = ({ payment, onClose, onSave }) => {
  const [amount, setAmount] = useState(payment.amount);
  const [method, setMethod] = useState<PaymentMethod>((payment.method as PaymentMethod) || 'transferencia');
  const [receiptNumber, setReceiptNumber] = useState(payment.receipt_number || '');
  const [receiptDate, setReceiptDate] = useState(
    payment.receipt_date ? new Date(payment.receipt_date).toISOString().split('T')[0] : ''
  );
  const [paymentDate, setPaymentDate] = useState(
    new Date(payment.payment_date).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(payment.notes || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBoletaFile, setSelectedBoletaFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boletaInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleBoletaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedBoletaFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await paymentService.updatePayment(payment.id, {
        amount: parseFloat(amount),
        method,
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        receipt_image: selectedFile || undefined,
        boleta_image: selectedBoletaFile || undefined,
        notes,
        payment_date: `${paymentDate}T12:00:00Z`,
      });

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error updating payment:', err);
      console.error('Error response data:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message || 'Error al actualizar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    Editar Pago
                  </h3>
                  <p className="text-yellow-100 text-sm">
                    Modifique los datos del pago seleccionado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {error && <Alert type="error" message={error} />}

            {/* Información del pago */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-blue-600 text-xs font-bold">ℹ</span>
                </div>
                Información del Pago
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Cliente
                  </p>
                  <p className="font-semibold text-gray-900">
                    {payment.customer_info?.full_name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {payment.customer_info?.document_number || 'Sin documento'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Lote
                  </p>
                  <p className="font-semibold text-gray-900">
                    Mz. {payment.lote_info?.block} - Lt. {payment.lote_info?.lot_number}
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    N° de Cuota
                  </p>
                  <p className="font-semibold text-gray-900">
                    {payment.payment_schedule_info?.installment_number || 'Pago Inicial'}
                  </p>
                </div>
              </div>
            </div>

            {/* Datos del pago */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-yellow-600 text-xs font-bold">1</span>
                </div>
                Datos del Pago
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto del Pago *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      S/.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="transferencia">💳 Transferencia Bancaria</option>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta de Crédito/Débito</option>
                  <option value="otro">🔄 Otro</option>
                </select>
              </div>
            </div>

            {/* Información de comprobante */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-yellow-600 text-xs font-bold">2</span>
                </div>
                Información del Comprobante
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N° de Operación/Recibo
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="Ej: OP-123456789"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    📋 Número de transferencia, recibo, etc.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Operación
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    📅 Fecha del comprobante bancario
                  </p>
                </div>
              </div>

              {/* Campo de notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observaciones, comentarios adicionales..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                ></textarea>
              </div>
            </div>

            {/* Comprobante actual */}
            {payment.receipt_image && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Comprobante Actual</h4>
                <p className="text-sm text-blue-600">
                  Ya existe un comprobante. Puede subir uno nuevo para reemplazarlo.
                </p>
              </div>
            )}

            {/* Boleta de pago actual */}
            {(payment.boleta_image || payment.payment_schedule_info?.boleta_image) && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-semibold text-purple-800 mb-2">Boleta de Pago Actual</h4>
                <p className="text-sm text-purple-600">
                  Ya existe una boleta de pago. Puede subir una nueva para reemplazarla.
                </p>
              </div>
            )}

            {/* Subir comprobante */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-yellow-600 text-xs font-bold">3</span>
                </div>
                {payment.receipt_image ? 'Reemplazar Comprobante' : 'Subir Comprobante'}
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                  selectedFile
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-white hover:border-yellow-400 hover:bg-yellow-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      selectedFile ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    <Upload
                      className={`h-8 w-8 ${
                        selectedFile ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    {selectedFile ? (
                      <>
                        <p className="font-medium text-green-700">
                          ✅ Archivo seleccionado
                        </p>
                        <p className="text-sm text-green-600">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Haz clic para cambiar el archivo
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-700">
                          📸 Subir comprobante
                        </p>
                        <p className="text-sm text-gray-500">
                          Haz clic para seleccionar una imagen
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG, JPEG hasta 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>

            {/* Subir boleta de pago */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-yellow-600 text-xs font-bold">4</span>
                </div>
                {(payment.boleta_image || payment.payment_schedule_info?.boleta_image) ? 'Reemplazar Boleta de Pago' : 'Subir Boleta de Pago'}
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                  selectedBoletaFile
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-white hover:border-yellow-400 hover:bg-yellow-50"
                }`}
                onClick={() => boletaInputRef.current?.click()}
              >
                <div className="text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      selectedBoletaFile ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    <Upload
                      className={`h-8 w-8 ${
                        selectedBoletaFile ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    {selectedBoletaFile ? (
                      <>
                        <p className="font-medium text-green-700">
                          ✅ Boleta seleccionada
                        </p>
                        <p className="text-sm text-green-600">
                          {selectedBoletaFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Haz clic para cambiar el archivo
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-700">
                          📄 Subir boleta de pago
                        </p>
                        <p className="text-sm text-gray-500">
                          Haz clic para seleccionar una imagen
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG, JPEG hasta 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={boletaInputRef}
                onChange={handleBoletaFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  <span>Actualizar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPaymentForm;

