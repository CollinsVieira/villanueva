import React, { useState, useEffect, useRef } from "react";
import { CreditCard, X, Upload } from "lucide-react";
import { paymentService, loteService, salesService, dynamicReportsService } from "../../services";
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
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [activeVenta, setActiveVenta] = useState<any>(null); // Venta activa del lote
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]); // Cronograma de pagos
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
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
    loteService.getLotes({ status: "vendido" }).then(setAllLotes);
  }, []);

  // Función para encontrar una cuota específica por número
  const findScheduleByInstallmentNumber = (installmentNum: number) => {
    return paymentSchedules.find(s => s.installment_number === installmentNum && s.status !== 'paid');
  };

  // Recalcular cuando cambie el tipo de pago o la venta activa
  useEffect(() => {
    if (activeVenta) {
      if (paymentType === "initial") {
        // Para pago inicial, usar el monto de la venta
        setPaymentAmount(activeVenta.initial_payment?.toString() || "0");
        setInstallmentNumber(0);
      } else {
        // Para cuotas, solo auto-seleccionar si no hay una cuota específica seleccionada
        // o si la cuota seleccionada ya no existe
        const currentSchedule = findScheduleByInstallmentNumber(installmentNumber);
        
        if (!currentSchedule) {
          // Solo buscar la próxima cuota pendiente si no hay una selección válida
          const pendingSchedules = paymentSchedules.filter(s => s.status === 'pending');
          if (pendingSchedules.length > 0) {
            const nextSchedule = pendingSchedules[0];
            setPaymentAmount(nextSchedule.scheduled_amount?.toString() || "0");
            setInstallmentNumber(nextSchedule.installment_number);
            setSelectedScheduleId(nextSchedule.id);
          }
        } else {
          // Usar la cuota específica seleccionada
          setPaymentAmount(currentSchedule.scheduled_amount?.toString() || "0");
          setSelectedScheduleId(currentSchedule.id);
        }
      }
    }
  }, [paymentType, activeVenta, paymentSchedules]);

  // Efecto separado para cuando el usuario cambia manualmente el número de cuota
  useEffect(() => {
    if (paymentType === "installment" && installmentNumber > 0 && paymentSchedules.length > 0) {
      const selectedSchedule = findScheduleByInstallmentNumber(installmentNumber);
      if (selectedSchedule) {
        setPaymentAmount(selectedSchedule.scheduled_amount?.toString() || "0");
        setSelectedScheduleId(selectedSchedule.id);
      }
    }
  }, [installmentNumber, paymentSchedules, paymentType]);

  // Cuando el ID del lote seleccionado cambia, busca sus detalles completos y la venta activa
  useEffect(() => {
    if (selectedLoteId) {
      const loteDetails = allLotes.find((l) => l.id === selectedLoteId);
      setSelectedLote(loteDetails || null);
      
      // Buscar la venta activa para este lote
      if (loteDetails) {
        loadActiveVentaAndSchedules(selectedLoteId);
      }
    } else {
      setSelectedLote(null);
      setActiveVenta(null);
      setPaymentSchedules([]);
      setSelectedScheduleId(null);
      setPaymentAmount("");
      setInstallmentNumber(1);
    }
  }, [selectedLoteId, allLotes]);

  const loadActiveVentaAndSchedules = async (loteId: number) => {
    try {
      // Buscar venta activa para el lote
      const ventas = await salesService.getVentasByLote(loteId);
      const activeVenta = ventas.find((v: any) => v.status === 'active');
      
      if (activeVenta) {
        setActiveVenta(activeVenta);
        
        // Cargar cronograma de pagos
        const paymentData = await paymentService.getPaymentScheduleByVenta(activeVenta.id);
        setPaymentSchedules(paymentData.schedules);
        
        // Si es pago inicial y ya existe, cambiar a cuota
        if (paymentType === "initial" && parseFloat(activeVenta.initial_payment || "0") > 0) {
          setPaymentType("installment");
        }
      } else {
        setActiveVenta(null);
        setPaymentSchedules([]);
        setError("No se encontró una venta activa para este lote");
      }
    } catch (err) {
      console.error('Error loading venta and schedules:', err);
      setError("Error al cargar la información de la venta");
    }
  };

  const loteOptions = allLotes.map((lote) => ({
    value: lote.id,
    label: `Mz. ${lote.block} - Lt. ${lote.lot_number} (${lote.current_owner?.full_name})`,
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLoteId || !activeVenta) {
      setError("Por favor, seleccione un lote con venta activa.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      if (paymentType === "initial") {
        // Pago inicial a través de la venta
        await salesService.registerInitialPayment(activeVenta.id, {
          amount: paymentAmount,
          // El backend no espera payment_date para pago inicial
          method: (e.currentTarget.elements.namedItem('method') as HTMLSelectElement)?.value || 'transferencia',
          receipt_number: (e.currentTarget.elements.namedItem('receipt_number') as HTMLInputElement)?.value,
          receipt_date: (e.currentTarget.elements.namedItem('receipt_date') as HTMLInputElement)?.value,
          receipt_image: selectedFile || undefined,
          notes: (e.currentTarget.elements.namedItem('notes') as HTMLTextAreaElement)?.value,
        });
      } else {
        // Pago de cuota a través del cronograma
        if (!selectedScheduleId) {
          setError("No se encontró una cuota pendiente para pagar.");
          return;
        }
        
        await paymentService.registerPayment(selectedScheduleId, {
          amount: parseFloat(paymentAmount),
          method: (e.currentTarget.elements.namedItem('method') as HTMLSelectElement)?.value || 'transferencia',
          receipt_number: e.currentTarget.receipt_number.value,
          receipt_date: e.currentTarget.receipt_date.value,
          receipt_image: selectedFile || undefined,
          notes: e.currentTarget.notes.value,
        });
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el pago');
      console.error('Error saving payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
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
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
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

            {/* Información de la venta activa */}
            {selectedLote && activeVenta && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                    <span className="text-blue-600 text-xs font-bold">✓</span>
                  </div>
                  Información de la Venta Activa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Cliente
                    </p>
                    <p className="font-semibold text-gray-900 ">
                      {activeVenta.customer_info?.full_name || selectedLote.current_owner?.full_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {activeVenta.customer_info?.document_number || selectedLote.current_owner?.document_number}
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
                      Precio de Venta
                    </p>
                    <p className="font-semibold text-gray-900">
                      {dynamicReportsService.formatCurrency(parseFloat(activeVenta.sale_price || "0"))}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Pago Inicial
                    </p>
                    <p className="font-semibold text-gray-900">
                      {dynamicReportsService.formatCurrency(parseFloat(activeVenta.initial_payment || "0"))}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Saldo Pendiente
                    </p>
                    <p className="font-bold text-2xl text-red-600">
                      {dynamicReportsService.formatCurrency(parseFloat(activeVenta.remaining_balance || "0"))}
                    </p>
                  </div>
                  {paymentSchedules.length > 0 && (
                    <div className="md:col-span-2 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-700 mb-1">
                        📅 Cronograma de Pagos
                      </p>
                      <p className="font-bold text-sm text-green-600">
                        {paymentSchedules.filter(s => s.status === 'pending').length} cuotas pendientes <br />
                      </p>
                      <p className="font-bold text-sm text-blue-600">
                        {paymentSchedules.filter(s => s.status === 'paid').length} cuotas pagadas <br />
                      </p>
                      <p className="font-bold text-sm text-yellow-600">
                      {paymentSchedules.filter(s => s.status === 'forgiven').length} cuotas perdonadas <br />
                      </p>
                      <p className="font-bold text-sm text-red-600">
                        {paymentSchedules.filter(s => s.status === 'overdue').length} cuotas vencidas <br />
                      </p>
                    </div>
                  )}
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
