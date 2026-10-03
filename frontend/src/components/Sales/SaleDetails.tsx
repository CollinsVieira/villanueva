import React, { useState } from "react";
import { Venta } from "../../services/salesService";
import { dynamicReportsService } from "../../services/dynamicReportsService";
import { useSale, useSalePaymentPlan, useCancelSale, useCompleteSale } from "../../hooks/useSalesQueries";
import {
  Edit,
  DollarSign,
  CheckCircle,
  X,
  Eye,
  Calendar,
  FileDown,
  ArrowLeft,
  Files,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import InitialPaymentForm from "./InitialPaymentForm";
import InitialPaymentManagement from "./InitialPaymentManagement";
import ContractDocumentsManagement from "./ContractDocumentsManagement";
import PaymentSchedule from "../Payments/PaymentSchedule";
import { handleDownloadCronogramaPDF } from "../../utils/PdfCronogramaPagos";
import { handleDownloadHistorialPagosPDF } from "../../utils/PdfResumenPagos";
import { handleDownloadBoletasPagoPDF } from "../../utils/PdfBoletasDePago";
import ConfirmationModal from "../../utils/ConfirmationModal";
import { useConfirmation } from "../../hooks/useConfirmation";
import { getProxyImageUrl } from "../../utils/imageUtils";
import { dateService } from "../../services";

interface SaleDetailsProps {
  saleId: number;
  onEdit?: (sale: Venta) => void;
  onClose?: () => void;
  onBack?: () => void;
}

const SaleDetails: React.FC<SaleDetailsProps> = ({
  saleId,
  onEdit,
  onBack,
}) => {
  const [showInitialPaymentForm, setShowInitialPaymentForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "schedule" | "initial" | "documents">("plan");
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { isOpen, options, confirm, onConfirm, onCancel } = useConfirmation();

  // React Query queries
  const { data: sale, isLoading: saleLoading, error: saleError, refetch: refetchSale } = useSale(saleId);
  const { data: paymentPlan, isLoading: planLoading } = useSalePaymentPlan(saleId, !!sale);

  // Mutations
  const cancelSaleMutation = useCancelSale();
  const completeSaleMutation = useCompleteSale();

  const loading = saleLoading || planLoading;
  const error = saleError ? "Error al cargar los detalles de la venta" : null;

  const loadSaleDetails = async () => {
    await refetchSale();
  };

  const handleCancelSale = async () => {
    if (!sale) return;

    const confirmed = await confirm({
      title: "Cancelar Venta",
      message: `¿Está seguro de cancelar la venta #${sale.id}? Esta acción liberará el lote y no se puede deshacer.`,
      type: "danger",
      confirmText: "Sí, Cancelar Venta",
      cancelText: "No, Mantener",
    });

    if (!confirmed) return;

    cancelSaleMutation.mutate({ 
      id: sale.id, 
      reason: "Cancelada desde detalles de venta" 
    });
  };

  const handleCompleteSale = async () => {
    if (!sale) return;

    const confirmed = await confirm({
      title: "Completar Venta",
      message: `¿Está seguro de marcar como completada la venta #${sale.id}? El lote pasará a estado Liquidado.`,
      type: "success",
      confirmText: "Sí, Completar Venta",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    completeSaleMutation.mutate(sale.id);
  };

  const handleInitialPaymentSuccess = () => {
    setShowInitialPaymentForm(false);
    loadSaleDetails();
  };

  const getSaleStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Venta Activa",
          classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-400"
        };
      case "separado":
        return {
          label: "Venta Separada",
          classes: "bg-amber-500/10 text-amber-300 border-amber-500/30",
          dot: "bg-amber-400"
        };
      case "completed":
        return {
          label: "Completada",
          classes: "bg-blue-500/10 text-blue-300 border-blue-500/30",
          dot: "bg-blue-400"
        };
      case "cancelled":
        return {
          label: "Cancelada",
          classes: "bg-red-500/10 text-red-300 border-red-500/30",
          dot: "bg-red-400"
        };
      default:
        return {
          label: status,
          classes: "bg-gray-500/10 text-gray-300 border-gray-500/30",
          dot: "bg-gray-400"
        };
    }
  };

  const getLoteStatusBadge = (status?: string) => {
    switch (status) {
      case "disponible":
        return { label: "Disponible", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "reservado":
        return { label: "Reservado", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "vendido":
        return { label: "Vendido", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "liquidado":
        return { label: "Liquidado", color: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: status || "N/A", color: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Cargando detalles de la venta...</p>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-red-100 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Error al consultar la venta</h3>
        <p className="text-red-600 text-sm mb-4">{error || "Venta no encontrada"}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Volver a la lista
          </button>
        )}
      </div>
    );
  }

  const saleStatus = getSaleStatusBadge(sale.status);
  const loteStatus = getLoteStatusBadge(sale.lote_info?.status);
  const isSeparado = sale.status === "separado";
  const initialPaymentBalance = parseFloat(sale.initial_payment || "0") - (sale.total_initial_payments || 0);

  return (
    <div className="space-y-6">
      {/* Barra Superior con Navegación y Acciones Principales */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs flex items-center gap-1.5 text-sm font-semibold"
              title="Regresar a la lista"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Venta #{sale.id}
              </h1>
              <span className="text-xs text-gray-400 font-medium">
                · Mz. {sale.lote_info?.block} - Lt. {sale.lote_info?.lot_number}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Registrado el {dynamicReportsService.formatDate(sale.created_at)}
            </p>
          </div>
        </div>

        {/* Botones de Acción Globales */}
        <div className="flex items-center flex-wrap gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(sale)}
              className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5 text-gray-500" />
              Editar Venta
            </button>
          )}

          {(sale.status === "active" || sale.status === "separado") && (
            <>
              <button
                onClick={handleCompleteSale}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Completar Venta
              </button>

              <button
                onClick={handleCancelSale}
                className="px-3.5 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
                Cancelar Venta
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas de Error */}
      {pdfError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{pdfError}</span>
        </div>
      )}

      {/* HERO CARD: Resumen de la Venta */}
      <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 backdrop-blur-md ${saleStatus.classes}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${saleStatus.dot}`} />
                {saleStatus.label}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${loteStatus.color}`}
              >
                Lote {loteStatus.label}
              </span>

              {isSeparado && (
                <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                  Inicial Pendiente
                </span>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                Mz. {sale.lote_info?.block} — Lote {sale.lote_info?.lot_number}
              </h2>
              <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white">{sale.customer_info?.full_name}</span>
                {sale.customer_info?.document_number && (
                  <span className="text-slate-400">· DNI: {sale.customer_info.document_number}</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick PDF Actions Bar en el Hero */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            {sale.contract_pdf && (
              <button
                onClick={() => window.open(getProxyImageUrl(sale.contract_pdf) || sale.contract_pdf, "_blank")}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 backdrop-blur-sm"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Ver Contrato
              </button>
            )}

            <button
              onClick={() => handleDownloadCronogramaPDF(sale.id, setPdfError)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              Cronograma PDF
            </button>

            <button
              onClick={() => handleDownloadHistorialPagosPDF(sale.id, setPdfError)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              Historial PDF
            </button>

            <button
              onClick={() => handleDownloadBoletasPagoPDF(sale.id, setPdfError)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-400" />
              Boletas PDF
            </button>
          </div>
        </div>

        {/* Métricas Clave en Hero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Precio Total</span>
            <span className="text-lg font-black text-white block mt-0.5">
              {dynamicReportsService.formatCurrency(Number(sale.sale_price))}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Pago Inicial Acordado</span>
            <span className="text-lg font-black text-amber-400 block mt-0.5">
              {dynamicReportsService.formatCurrency(Number(sale.initial_payment || 0))}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Saldo Pendiente Total</span>
            <span className="text-lg font-black text-rose-400 block mt-0.5">
              {dynamicReportsService.formatCurrency(parseFloat(sale.remaining_balance || "0"))}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Progreso Plan</span>
            <span className="text-lg font-black text-emerald-400 block mt-0.5">
              {paymentPlan?.payment_status?.completion_percentage || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Detalles Informativos (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tarjeta: Información del Lote */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Información del Lote
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${loteStatus.color}`}>
              {loteStatus.label}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Manzana:</span>
              <span className="font-bold text-gray-900">{sale.lote_info?.block}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Número de Lote:</span>
              <span className="font-bold text-gray-900">{sale.lote_info?.lot_number}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Área Total:</span>
              <span className="font-bold text-gray-900">{sale.lote_info?.area} m²</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 font-medium">Precio m²:</span>
              <span className="font-semibold text-gray-700">
                {dynamicReportsService.formatCurrency(Number(sale.lote_info?.price_per_m2 || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta: Información del Cliente */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Información del Cliente
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Nombre:</span>
              <span className="font-bold text-gray-900 text-right truncate max-w-[170px]" title={sale.customer_info?.full_name}>
                {sale.customer_info?.full_name}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Documento / DNI:</span>
              <span className="font-bold text-gray-900">{sale.customer_info?.document_number}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Teléfono:</span>
              <span className="font-semibold text-gray-700">
                {sale.customer_info?.phone || "No especificado"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 font-medium">Estado Cliente:</span>
              <span className="text-emerald-700 font-semibold">Activo</span>
            </div>
          </div>
        </div>

        {/* Tarjeta: Contrato y Fechas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Contrato y Vencimientos
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Fecha de Contrato:</span>
              <span className="font-bold text-gray-900">
                {sale.contract_date ? dateService.utcToLocalDateOnly(sale.contract_date) : "No especificada"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Día de Vencimiento:</span>
              <span className="font-bold text-purple-700">
                {sale.payment_day ? `Día ${sale.payment_day} de cada mes` : "No especificado"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Meses Financiamiento:</span>
              <span className="font-bold text-gray-900">{sale.financing_months || 0} meses</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-medium">Documentos:</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sale.contract_pdf ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-400"}`}>
                  Contrato
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sale.adenda_pdf ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-400"}`}>
                  Adenda
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sale.escritura_pdf ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-400"}`}>
                  Escritura
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE OPERACIONES */}
      <div className="space-y-4">
        {/* Navegación por pestañas */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab("plan")}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "plan"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Plan de Pagos
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "schedule"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Cronograma de Cuotas
          </button>

          <button
            onClick={() => setActiveTab("initial")}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "initial"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            Pago Inicial
            {initialPaymentBalance > 0 && (
              <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                Pendiente
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "documents"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Files className="w-4 h-4" />
            Documentación
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <div>
          {activeTab === "plan" ? (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    Resumen Financiero y Estado del Plan
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Visualice el avance en el pago de cuotas y saldo restante de la venta
                  </p>
                </div>
              </div>

              {paymentPlan ? (
                <div className="space-y-6">
                  {/* Tarjetas de progreso numérico */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-blue-700">
                        {paymentPlan.payment_status.completion_percentage}%
                      </div>
                      <div className="text-xs font-semibold text-gray-600 mt-1 uppercase">Completado</div>
                    </div>

                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 text-center">
                      <div className="text-lg font-bold text-emerald-700">
                        {dynamicReportsService.formatCurrency(
                          parseFloat(paymentPlan.payment_status.paid_amount?.toString() || "0")
                        )}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 mt-1 uppercase">Total Pagado</div>
                    </div>

                    <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4 text-center">
                      <div className="text-lg font-bold text-rose-700">
                        {dynamicReportsService.formatCurrency(
                          sale.remaining_balance ? parseFloat(sale.remaining_balance) : 0
                        )}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 mt-1 uppercase">Saldo Restante</div>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 text-center">
                      <div className="text-lg font-bold text-purple-700">
                        {(paymentPlan.payment_status.paid || 0) + (paymentPlan.payment_status.forgiven || 0)} / {paymentPlan.payment_status.total_installments || 0}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 mt-1 uppercase">Cuotas Pagadas</div>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-600">
                      <span>Progreso de Amortización</span>
                      <span>{paymentPlan.payment_status.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${paymentPlan.payment_status.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Detalle de Cuotas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Cuotas Pendientes</span>
                      <span className="font-bold text-gray-800 text-base">{paymentPlan.payment_status.pending || 0}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Cuotas Vencidas</span>
                      <span className="font-bold text-red-600 text-base">{paymentPlan.payment_status.overdue || 0}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Cuotas Parciales</span>
                      <span className="font-bold text-amber-600 text-base">{paymentPlan.payment_status.partial || 0}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <span className="text-[11px] text-gray-500 block uppercase font-medium">Cuotas Perdonadas</span>
                      <span className="font-bold text-purple-600 text-base">{paymentPlan.payment_status.forgiven || 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No se pudo cargar la información del plan de pagos.
                </div>
              )}
            </div>
          ) : activeTab === "schedule" ? (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Cronograma Detallado de Cuotas
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mz. {sale.lote_info?.block} - Lt. {sale.lote_info?.lot_number} · Cliente: {sale.customer_info?.full_name}
                  </p>
                </div>
              </div>
              <PaymentSchedule 
                ventaId={sale.id} 
                showLoteFilter={false} 
                onActionSuccess={loadSaleDetails}
              />
            </div>
          ) : activeTab === "initial" ? (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    Gestión de Pagos Iniciales
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Registre pagos o abonos de inicial para Mz. {sale.lote_info?.block} - Lt. {sale.lote_info?.lot_number}
                  </p>
                </div>
              </div>
              <InitialPaymentManagement 
                saleId={sale.id} 
                sale={sale}
                onPaymentAdded={() => loadSaleDetails()}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Files className="w-5 h-5 text-blue-600" />
                    Gestión Documental del Contrato
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cargue y descargue el Contrato, Adendas y Escritura en formato PDF
                  </p>
                </div>
              </div>
              <ContractDocumentsManagement 
                sale={sale} 
                onDocumentUpdated={() => loadSaleDetails()} 
              />
            </div>
          )}
        </div>
      </div>

      {showInitialPaymentForm && (
        <InitialPaymentForm
          saleId={sale.id}
          onSuccess={handleInitialPaymentSuccess}
          onCancel={() => setShowInitialPaymentForm(false)}
        />
      )}

      {/* Modal de confirmación */}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={options?.title || ""}
        message={options?.message || ""}
        type={options?.type}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        isLoading={cancelSaleMutation.isPending || completeSaleMutation.isPending}
      />
    </div>
  );
};

export default SaleDetails;
