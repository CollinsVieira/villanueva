import React, { useState, useEffect, useRef } from "react";
import { CreditCard, X, Upload } from "lucide-react";
import { paymentService, loteService } from "../../services";
import { Lote } from "../../types";
import { Alert } from "../UI";
import { SearchableSelect } from "../UI";
import DateService from "../../services/dateService";

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
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [installmentNumber, setInstallmentNumber] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<"installment" | "initial">(
    "installment"
  );

  const [paymentDate, setPaymentDate] = useState(DateService.getCurrentLocalDate());
  const [receiptDate, setReceiptDate] = useState(DateService.getCurrentLocalDate());

  useEffect(() => {
    // Carga todos los lotes vendidos una sola vez
    loteService.getLotes({ status: "reservado" }).then(setAllLotes);
  }, []);

  // Recalcular cuando cambie el tipo de pago o el lote seleccionado
  useEffect(() => {
    if (selectedLote) {
      // Si ya existe un pago inicial, forzar tipo 'installment'
      if (selectedLote.has_initial_payment && paymentType === "initial") {
        setPaymentType("installment");
        return;
      }

      if (paymentType === "initial") {
        setPaymentAmount(selectedLote.initial_payment?.toString() || "0");
        setInstallmentNumber(0); // Los pagos iniciales no tienen número de cuota
      } else {
        const monthlyAmount = parseFloat(
          selectedLote.monthly_installment || "0"
        );
        setPaymentAmount(monthlyAmount.toString());
        const nextInstallment = (selectedLote.installments_paid || 0) + 1;
        setInstallmentNumber(nextInstallment);
      }
    }
  }, [paymentType, selectedLote]);

  // Cuando el ID del lote seleccionado cambia, busca sus detalles completos
  useEffect(() => {
    if (selectedLoteId) {
      const loteDetails = allLotes.find((l) => l.id === selectedLoteId);
      setSelectedLote(loteDetails || null);
    } else {
      setSelectedLote(null);
      setPaymentAmount("");
      setInstallmentNumber(1);
    }
  }, [selectedLoteId, allLotes]);

  const loteOptions = allLotes.map((lote) => ({
    value: lote.id,
    label: `Mz. ${lote.block} - Lt. ${lote.lot_number} (${lote.owner?.full_name})`,
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
      formData.append("receipt_image", selectedFile);
    }
    formData.set("lote_id", String(selectedLoteId));
    formData.set("payment_type", paymentType);

    // Usar el servicio de fechas para convertir a UTC correctamente
    const utcDateString = DateService.localDateToUTCSafe(paymentDate);
    formData.set("payment_date", utcDateString);
    
    // También convertir la fecha de operación si está presente
    if (receiptDate) {
      // Para receipt_date, enviar solo la fecha sin la hora
      formData.set("receipt_date", receiptDate);
    }
    try {
      await paymentService.createPayment(formData);
      onSave();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Ocurrió un error al registrar el pago."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    Registrar Pago Realizado
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Registre un pago que ya fue efectuado por el cliente
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
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {error && <Alert type="error" message={error} />}

            {/* Selección de lote */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                Seleccionar Lote y Cliente
              </label>
              <SearchableSelect
                options={loteOptions}
                value={selectedLoteId}
                onChange={(value) => setSelectedLoteId(value as number | null)}
                placeholder="Buscar por cliente, DNI o lote..."
              />
            </div>

            {/* Información del lote seleccionado */}
            {selectedLote && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                    <span className="text-blue-600 text-xs font-bold">✓</span>
                  </div>
                  Información del Lote Seleccionado
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Cliente
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedLote.owner?.full_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedLote.owner?.document_number}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Lote
                    </p>
                    <p className="font-semibold text-gray-900">
                      Mz. {selectedLote.block} - Lt. {selectedLote.lot_number}
                    </p>
                    <p className="text-xs text-gray-600">
                      {parseFloat(selectedLote.area).toFixed(0)} m²
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Progreso de Pagos
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedLote.installments_paid} de{" "}
                      {selectedLote.financing_months} cuotas
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            selectedLote.financing_months > 0
                              ? (selectedLote.installments_paid /
                                  selectedLote.financing_months) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Saldo Restante
                    </p>
                    <p className="font-bold text-2xl text-red-600">
                      S/.{parseFloat(selectedLote.remaining_balance).toFixed(2)}
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">
                      💡 Cuota Mensual Sugerida
                    </p>
                    <p className="font-bold text-3xl text-blue-600">
                      S/.
                      {parseFloat(
                        selectedLote.monthly_installment || "0"
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Datos del pago */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-blue-600 text-xs font-bold">2</span>
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
                      name="amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg "
                      required
                      placeholder="0.00"
                    />
                  </div>
                  {selectedLote && (
                    <p className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                      💡 Cuota sugerida: S/.
                      {parseFloat(
                        selectedLote.monthly_installment || "0"
                      ).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={paymentDate} // Usar 'value' en lugar de 'defaultValue'
                    onChange={(e) => setPaymentDate(e.target.value)} // Actualizar el estado al cambiar
                    className="w-full p-3 border border-gray-300 rounded-lg "
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Pago
                </label>
                <select
                  value={paymentType}
                  onChange={(e) =>
                    setPaymentType(e.target.value as "installment" | "initial")
                  }
                  disabled={selectedLote?.has_initial_payment}
                  className="w-full p-3 border border-gray-300 rounded-lg  disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="installment">💳 Cuota Mensual</option>
                  <option
                    value="initial"
                    disabled={selectedLote?.has_initial_payment}
                  >
                    {selectedLote?.has_initial_payment
                      ? "💰 Pago Inicial Ya Realizado"
                      : "💰 Pago Inicial/Enganche"}
                  </option>
                </select>
                {selectedLote?.has_initial_payment && (
                  <p className="text-xs text-green-600 mt-1 bg-green-100 px-2 py-1 rounded">
                    ✅ Pago inicial de S/. {selectedLote.initial_payment_amount}{" "}
                    ya registrado
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  name="method"
                  className="w-full p-3 border border-gray-300 rounded-lg "
                >
                  <option value="transferencia">
                    💳 Transferencia Bancaria
                  </option>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta de Crédito/Débito</option>
                  <option value="otro">🔄 Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" >
                  N° de Cuota
                </label>
                <input
                  type="number"
                  name="installment_number"
                  value={installmentNumber}
                  onChange={(e) =>
                    setInstallmentNumber(parseInt(e.target.value) || 1)
                  }
                  disabled={paymentType === "initial"}
                  className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  min="1"
                  max={selectedLote?.financing_months || 999}
                  
                />
              </div>
            </div>

            {/* Información de comprobante */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-blue-600 text-xs font-bold">3</span>
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
                    name="receipt_number"
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
                    name="receipt_date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg "
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
                  name="notes"
                  rows={3}
                  placeholder="Observaciones, comentarios adicionales..."
                  className="w-full p-3 border border-gray-300 rounded-lg  resize-none"
                ></textarea>
              </div>
            </div>
            {/* Subir comprobante */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-blue-600 text-xs font-bold">4</span>
                </div>
                Subir Comprobante (Opcional)
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                  selectedFile
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
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
                name="receipt_image"
                ref={fileInputRef}
                onChange={handleFileChange}
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
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
              disabled={isSubmitting || !selectedLoteId}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  <span>Guardar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
