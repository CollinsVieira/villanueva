import React, { useState, useRef } from "react";
import { 
  CreditCard, 
  X, 
  Upload, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Layers,
  Sparkles
} from "lucide-react";
import { paymentService, salesService, dynamicReportsService } from "../../services";
import { VentaSelectorItem } from "../../services/salesService";
import DateService from "../../services/dateService";
import VentaPaymentSelector from "../UI/VentaPaymentSelector";

interface PaymentFormProps {
  onClose: () => void;
  onSave: () => void;
  initialVentaId?: number | null;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onClose, onSave, initialVentaId = null }) => {
  const [selectedVenta, setSelectedVenta] = useState<VentaSelectorItem | null>(null);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  
  // Tipo de pago: 'installment' (cuota) o 'initial' (pago inicial)
  const [paymentType, setPaymentType] = useState<"installment" | "initial">("installment");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("transferencia");
  const [paymentDate, setPaymentDate] = useState(DateService.getCurrentLocalDate());
  const [receiptDate, setReceiptDate] = useState(DateService.getCurrentLocalDate());
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Archivos
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [selectedBoletaFile, setSelectedBoletaFile] = useState<File | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const boletaInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener cuotas disponibles ordenadas por prioridad (vencidas primero, luego pendientes, luego parciales)
  const getAvailableSchedules = () => {
    const available = paymentSchedules.filter(
      (s) => s.status === "pending" || s.status === "overdue" || s.status === "partial"
    );

    const priorityOrder = { overdue: 1, pending: 2, partial: 3 };

    return available.sort((a, b) => {
      const priorityA = priorityOrder[a.status as keyof typeof priorityOrder] || 4;
      const priorityB = priorityOrder[b.status as keyof typeof priorityOrder] || 4;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.installment_number - b.installment_number;
    });
  };

  // Cargar cronograma de pagos cuando se selecciona una venta activa
  const loadPaymentSchedules = async (ventaId: number) => {
    setIsLoadingSchedules(true);
    try {
      const paymentData = await paymentService.getPaymentScheduleByVenta(ventaId);
      const schedules = paymentData.schedules || [];
      setPaymentSchedules(schedules);

      // Auto-seleccionar la próxima cuota por prioridad
      const available = schedules.filter(
        (s: any) => s.status === "pending" || s.status === "overdue" || s.status === "partial"
      );

      const overdue = available.find((s: any) => s.status === "overdue");
      const nextPending = available.find((s: any) => s.status === "pending");
      const nextPartial = available.find((s: any) => s.status === "partial");

      const targetSchedule = overdue || nextPending || nextPartial || available[0];

      if (targetSchedule) {
        setSelectedScheduleId(targetSchedule.id);
        setPaymentAmount(
          targetSchedule.status === "partial"
            ? (targetSchedule.remaining_amount?.toString() || "0")
            : (targetSchedule.scheduled_amount?.toString() || "0")
        );
      }
    } catch (err) {
      console.error("Error loading payment schedules:", err);
      setError("Error al cargar el cronograma de pagos del lote seleccionado");
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  // Manejar cambio de venta seleccionada
  const handleVentaChange = (venta: VentaSelectorItem | null) => {
    setSelectedVenta(venta);
    setError(null);
    setSelectedReceiptFile(null);
    setSelectedBoletaFile(null);

    if (!venta) {
      setPaymentSchedules([]);
      setSelectedScheduleId(null);
      setPaymentAmount("");
      return;
    }

    if (venta.status === "separado") {
      // Si el lote está SEPARADO, solo se permite pagar la inicial
      setPaymentType("initial");
      setPaymentSchedules([]);
      setSelectedScheduleId(null);
      const balance = venta.initial_balance > 0 ? venta.initial_balance : parseFloat(venta.initial_payment || "0");
      setPaymentAmount(balance > 0 ? balance.toString() : "");
    } else {
      // Venta activa (lote vendido)
      setPaymentType("installment");
      loadPaymentSchedules(venta.id);
    }
  };

  // Manejar cambio manual de cuota en el selector
  const handleScheduleChange = (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    const selected = paymentSchedules.find((s) => s.id === scheduleId);
    if (selected) {
      setPaymentAmount(
        selected.status === "partial"
          ? (selected.remaining_amount?.toString() || "0")
          : (selected.scheduled_amount?.toString() || "0")
      );
    }
  };

  // Manejar cambio de tipo de pago
  const handlePaymentTypeChange = (type: "installment" | "initial") => {
    setPaymentType(type);
    setError(null);

    if (type === "initial" && selectedVenta) {
      const balance = selectedVenta.initial_balance > 0 
        ? selectedVenta.initial_balance 
        : parseFloat(selectedVenta.initial_payment || "0");
      setPaymentAmount(balance > 0 ? balance.toString() : "");
      setSelectedScheduleId(null);
    } else if (type === "installment" && selectedVenta) {
      if (paymentSchedules.length === 0) {
        loadPaymentSchedules(selectedVenta.id);
      } else {
        const available = getAvailableSchedules();
        if (available.length > 0) {
          const first = available[0];
          setSelectedScheduleId(first.id);
          setPaymentAmount(first.scheduled_amount?.toString() || "0");
        }
      }
    }
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedVenta) {
      setError("Por favor, seleccione un lote y cliente.");
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Por favor, ingrese un monto de pago válido mayor a 0.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (paymentType === "initial") {
        // Registrar pago inicial a través de la venta
        await salesService.registerInitialPayment(selectedVenta.id, {
          amount: paymentAmount,
          method: paymentMethod,
          receipt_number: receiptNumber || undefined,
          receipt_date: receiptDate || undefined,
          payment_date: paymentDate ? `${paymentDate}T12:00:00Z` : undefined,
          receipt_image: selectedReceiptFile || undefined,
          notes: notes || undefined,
        });
      } else {
        // Registrar pago de cuota a través del cronograma
        if (!selectedScheduleId) {
          setError("No se ha seleccionado una cuota válida para registrar el pago.");
          setIsSubmitting(false);
          return;
        }

        await paymentService.registerPayment(selectedScheduleId, {
          amount: amountNum,
          method: paymentMethod,
          receipt_number: receiptNumber || undefined,
          receipt_date: receiptDate || undefined,
          payment_date: paymentDate ? `${paymentDate}T12:00:00Z` : undefined,
          receipt_image: selectedReceiptFile || undefined,
          boleta_image: selectedBoletaFile || undefined,
          notes: notes || undefined,
        });
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error("Error registering payment:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Error al registrar el pago. Verifique los datos e intente nuevamente.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoteSeparado = selectedVenta?.status === "separado";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header con gradiente moderno */}
        <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-blue-950 p-5 text-white shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-blue-400 shadow-inner">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Registrar Pago
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                    Cobranzas
                  </span>
                </h3>
                <p className="text-slate-300 text-xs mt-0.5">
                  Registre abonos de inicial o cuotas mensuales de lotes vendidos y separados
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulario con scroll vertical */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-gray-50/50">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {/* SECCIÓN 1: Selección de Lote y Cliente */}
            <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  Seleccionar Lote y Cliente *
                </label>
                {selectedVenta && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      isLoteSeparado
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {isLoteSeparado ? "🟡 Lote Separado" : "🟢 Lote Vendido"}
                  </span>
                )}
              </div>

              <VentaPaymentSelector
                value={selectedVenta?.id || initialVentaId}
                onChange={handleVentaChange}
                placeholder="Escribe manzana, lote, cliente o DNI para buscar..."
                required
              />

              {/* Tarjeta Informativa de la Venta Seleccionada */}
              {selectedVenta && (
                <div
                  className={`mt-3 rounded-xl p-4 border transition-all ${
                    isLoteSeparado
                      ? "bg-amber-50/60 border-amber-200/80"
                      : "bg-blue-50/50 border-blue-100"
                  }`}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Lote</span>
                      <span className="font-bold text-gray-900 text-sm">{selectedVenta.lote_display}</span>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Cliente</span>
                      <span className="font-bold text-gray-900 text-sm truncate block" title={selectedVenta.customer_name}>
                        {selectedVenta.customer_name}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Precio Total</span>
                      <span className="font-bold text-gray-900 text-sm">
                        {dynamicReportsService.formatCurrency(parseFloat(selectedVenta.sale_price || "0"))}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">
                        {isLoteSeparado ? "Saldo Inicial" : "Pago Inicial"}
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          isLoteSeparado ? "text-amber-700 font-extrabold" : "text-gray-900"
                        }`}
                      >
                        {isLoteSeparado
                          ? dynamicReportsService.formatCurrency(selectedVenta.initial_balance)
                          : dynamicReportsService.formatCurrency(parseFloat(selectedVenta.initial_payment || "0"))}
                      </span>
                    </div>
                  </div>

                  {/* Banner Exclusivo si el lote está separado */}
                  {isLoteSeparado && (
                    <div className="mt-3 bg-amber-100/70 border border-amber-300/80 rounded-lg p-3 text-amber-900 text-xs flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block text-amber-950">
                          Lote en estado Separado (Reservado)
                        </strong>
                        Para este lote se debe registrar el <strong>Pago Inicial</strong>. Una vez completado el saldo de inicial ({dynamicReportsService.formatCurrency(selectedVenta.initial_balance)}), el lote pasará automáticamente a estado <strong>"Vendido"</strong>.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: Modalidad y Datos del Pago */}
            <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-4">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                Modalidad y Monto del Pago
              </label>

              {/* Selector de Tipo de Pago (Tabs) */}
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("installment")}
                  disabled={isLoteSeparado || !selectedVenta}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    paymentType === "installment" && !isLoteSeparado
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Cuota Mensual
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("initial")}
                  disabled={!selectedVenta}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    paymentType === "initial" || isLoteSeparado
                      ? "bg-white text-amber-700 shadow-xs border border-amber-200/60"
                      : "text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                  Pago Inicial {isLoteSeparado ? "(Obligatorio)" : ""}
                </button>
              </div>

              {/* Si es cuota mensual, mostrar selector de cuota */}
              {paymentType === "installment" && !isLoteSeparado && selectedVenta && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Seleccionar Cuota del Cronograma *
                  </label>
                  {isLoadingSchedules ? (
                    <div className="py-2 text-xs text-gray-500 italic">Cargando cuotas pendientes...</div>
                  ) : getAvailableSchedules().length === 0 ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Todas las cuotas de este lote se encuentran pagadas o no hay cuotas pendientes.
                    </div>
                  ) : (
                    <select
                      value={selectedScheduleId || ""}
                      onChange={(e) => handleScheduleChange(parseInt(e.target.value))}
                      className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {getAvailableSchedules().map((schedule) => {
                        const isOverdue = schedule.status === "overdue";
                        const isPartial = schedule.status === "partial";
                        const tag = isOverdue ? "🔴 Vencida" : isPartial ? "🟡 Parcial" : "🟢 Pendiente";
                        const amount = isPartial ? schedule.remaining_amount : schedule.scheduled_amount;
                        return (
                          <option key={schedule.id} value={schedule.id}>
                            Cuota #{schedule.installment_number} — {tag} — Monto: S/. {parseFloat(amount || "0").toLocaleString()} (Vence: {new Date(schedule.due_date).toLocaleDateString()})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              {/* Campos de Monto, Fecha y Método */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Monto a Pagar (S/.) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                      S/.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Fecha del Pago *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Método de Pago *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="transferencia">💳 Transferencia Bancaria</option>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta Crédito / Débito</option>
                    <option value="otro">🔄 Otro / Depósito</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Comprobante y Observaciones */}
            <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-4">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                Datos del Comprobante y Adjuntos
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    N° de Operación / Recibo
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="Ej: OP-84920492"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fecha del Comprobante
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Upload Boxes para Comprobante y Boleta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Comprobante / Voucher */}
                <div
                  onClick={() => receiptInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    selectedReceiptFile
                      ? "border-emerald-400 bg-emerald-50/60"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                  }`}
                >
                  <Upload className={`w-6 h-6 mx-auto mb-1.5 ${selectedReceiptFile ? "text-emerald-600" : "text-gray-400"}`} />
                  <span className="text-xs font-bold text-gray-800 block">
                    {selectedReceiptFile ? "✓ Comprobante Cargado" : "Subir Voucher / Comprobante"}
                  </span>
                  <span className="text-[11px] text-gray-500 truncate block mt-0.5">
                    {selectedReceiptFile ? selectedReceiptFile.name : "Click para adjuntar imagen (JPG/PNG)"}
                  </span>
                  <input
                    type="file"
                    ref={receiptInputRef}
                    onChange={(e) => e.target.files?.[0] && setSelectedReceiptFile(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Boleta de Pago */}
                <div
                  onClick={() => boletaInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    selectedBoletaFile
                      ? "border-emerald-400 bg-emerald-50/60"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                  }`}
                >
                  <FileText className={`w-6 h-6 mx-auto mb-1.5 ${selectedBoletaFile ? "text-emerald-600" : "text-gray-400"}`} />
                  <span className="text-xs font-bold text-gray-800 block">
                    {selectedBoletaFile ? "✓ Boleta Cargada" : "Subir Boleta de Pago (Opcional)"}
                  </span>
                  <span className="text-[11px] text-gray-500 truncate block mt-0.5">
                    {selectedBoletaFile ? selectedBoletaFile.name : "Click para adjuntar boleta emitida"}
                  </span>
                  <input
                    type="file"
                    ref={boletaInputRef}
                    onChange={(e) => e.target.files?.[0] && setSelectedBoletaFile(e.target.files[0])}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notas u Observaciones
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información adicional sobre la transacción, banco de origen, etc."
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer con Acciones */}
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedVenta}
              className={`px-6 py-2.5 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
                isLoteSeparado
                  ? "bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300"
                  : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              } disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando Pago...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>{isLoteSeparado ? "Registrar Pago de Inicial" : "Guardar Pago"}</span>
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
