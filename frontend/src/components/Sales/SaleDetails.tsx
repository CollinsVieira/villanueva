import React, { useState, useEffect } from 'react';
import salesService, { Venta, PaymentPlan } from '../../services/salesService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { Edit, DollarSign, FileText, CheckCircle, X, Download, Eye, Calendar, FileDown, ArrowLeft } from 'lucide-react';
import InitialPaymentForm from './InitialPaymentForm';
import PaymentSchedule from '../Payments/PaymentSchedule';
import { handleDownloadCronogramaPDF } from '../../utils/PdfCronogramaPagos';
import { handleDownloadHistorialPagosPDF } from '../../utils/PdfResumenPagos';

interface SaleDetailsProps {
  saleId: number;
  onEdit?: (sale: Venta) => void;
  onClose?: () => void;
  onBack?: () => void;
}

const SaleDetails: React.FC<SaleDetailsProps> = ({ saleId, onEdit, onClose, onBack }) => {
  const [sale, setSale] = useState<Venta | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInitialPaymentForm, setShowInitialPaymentForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'schedule'>('plan');

  useEffect(() => {
    loadSaleDetails();
  }, [saleId]);

  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      const [saleData, planData] = await Promise.all([
        salesService.getVenta(saleId),
        salesService.getVentaPaymentPlan(saleId).catch(() => null)
      ]);
      
      setSale(saleData);
      setPaymentPlan(planData);
    } catch (err) {
      setError('Error al cargar los detalles de la venta');
      console.error('Error loading sale details:', err);
    } finally {
      setLoading(false);
    }
  };

  console.log(sale);
  console.log(paymentPlan);
  
  const handleCancelSale = async () => {
    if (!sale || !confirm(`¿Está seguro de cancelar la venta #${sale.id}?`)) return;
    
    try {
      await salesService.cancelVenta(sale.id, 'Cancelada desde detalles');
      loadSaleDetails();
    } catch (err) {
      setError('Error al cancelar la venta');
      console.error('Error canceling sale:', err);
    }
  };

  const handleCompleteSale = async () => {
    if (!sale || !confirm(`¿Está seguro de completar la venta #${sale.id}?`)) return;
    
    try {
      await salesService.completeVenta(sale.id);
      loadSaleDetails();
    } catch (err) {
      setError('Error al completar la venta');
      console.error('Error completing sale:', err);
    }
  };

  const handleInitialPaymentSuccess = () => {
    setShowInitialPaymentForm(false);
    loadSaleDetails();
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'active': 'Activa',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return statusLabels[status] || status;
  };


  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Cargando detalles de la venta...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="text-red-600">{error || 'Venta no encontrada'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Volver a Ventas</span>
            </button>
          )}
        </div>
        <div className="flex items-center   space-x-2">
          <h1 className="text-3xl font-bold text-gray-900 flex">Detalles de Venta</h1>
          {sale && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              sale.status === 'active' ? 'bg-green-100 text-green-800' :
              sale.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {getStatusLabel(sale.status)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Venta #{sale.id}
            </h2>
          </div>
        </div>
        
        
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Lote Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información del Lote</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manzana:</span>
                    <span className="font-medium">{sale.lote_info?.block}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Número de Lote:</span>
                    <span className="font-medium">{sale.lote_info?.lot_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Área:</span>
                    <span className="font-medium">{sale.lote_info?.area} m²</span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información del Cliente</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-medium">{sale.customer_info?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Documento:</span>
                    <span className="font-medium">{sale.customer_info?.document_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="font-medium">{sale.customer_info?.phone || 'No especificado'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información Financiera</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio de venta:</span>
                    <span className="font-medium">{dynamicReportsService.formatCurrency(Number(sale.sale_price))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pago inicial:</span>
                    <span className="font-medium">{sale.initial_payment ? dynamicReportsService.formatCurrency(Number(sale.initial_payment)) : 'No registrado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo pendiente:</span>
                    <span className="font-medium">{
                      dynamicReportsService.formatCurrency(sale.remaining_balance? parseFloat(sale.remaining_balance) : 0)}</span>
                  </div>
                </div>
              </div>

              {/* Contract Information */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Información del Contrato</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Fecha de Contrato:</span>
                    <span className="ml-2 font-medium">
                      {sale.contract_date ? dynamicReportsService.formatDate(sale.contract_date) : 'No especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Día de Vencimiento:</span>
                    <span className="ml-2 font-medium">
                      {sale.payment_day ? `${sale.payment_day} de cada mes` : 'No especificado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha de Creación:</span>
                    <span className="ml-2 font-medium">
                      {dynamicReportsService.formatDate(sale.created_at)}
                    </span>
                  </div>
                </div>
                
                {sale.contract_pdf && (
                  <div className="mt-4">
                    <span className="text-gray-600">Contrato PDF:</span>
                    <span className="ml-2 font-medium text-green-600">Disponible</span>
                  </div>
                )}
                
                {sale.notes && (
                  <div className="mt-4">
                    <span className="text-gray-600">Notas:</span>
                    <p className="mt-1 text-gray-800">{sale.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de botones unificada */}
      <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex justify-end gap-3">
            {/* Botones de PDF */}
            {sale.contract_pdf && (
              <>
                <button
                  onClick={() => window.open(sale.contract_pdf, '_blank')}
                  className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Contrato
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = sale.contract_pdf!;
                    link.download = `contrato_venta_${sale.id}.pdf`;
                    link.click();
                  }}
                  className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Contrato
                </button>
              </>
            )}
            
            {/* Botones de PDF de pagos */}
            <button
              onClick={() => handleDownloadCronogramaPDF(sale.id, setError)}
              className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
            >
              <FileDown className="h-4 w-4" />
              Descargar Cronograma
            </button>
            <button
              onClick={() => handleDownloadHistorialPagosPDF(sale.id, setError)}
              className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
            >
              <FileDown className="h-4 w-4" />
              Descargar Historial de Pagos
            </button>        
            
            {!sale.initial_payment && sale.status === 'active' && (
              <button
                onClick={() => setShowInitialPaymentForm(true)}
                className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Registrar Pago Inicial
              </button>
            )}
            
            {sale.status === 'active' && (
              <>
                <button
                  onClick={handleCompleteSale}
                  className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Completar Venta
                </button>
                <button
                  onClick={handleCancelSale}
                  className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar Venta
                </button>
              </>
            )}
            
            {onEdit && (
              <button 
                onClick={() => onEdit(sale)}
                className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 ga-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
            )}
            
            {onClose && (
              <button 
                onClick={onClose}
                className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2 ga-2"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            )}
          </div>
        </div>

      <div className="mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('plan')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'plan' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign size={16} />
              Plan de Pagos
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'schedule' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar size={16} />
              Cronograma
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'plan' ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Plan de Pagos</h3>
              </div>
              <div className="p-6">
                {paymentPlan ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {paymentPlan.payment_status.completion_percentage}%
                        </div>
                        <div className="text-sm text-gray-600">Completado</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {dynamicReportsService.formatCurrency(parseFloat(paymentPlan.payment_status.paid_amount.toString() || '0'))}
                        </div>
                        <div className="text-sm text-gray-600">Pagado</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {dynamicReportsService.formatCurrency(
                            sale.remaining_balance ? parseFloat(sale.remaining_balance) : 0
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Pendiente</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {(
                            (paymentPlan.payment_status.paid || 0) +
                            (paymentPlan.payment_status.forgiven || 0)
                          )}/{paymentPlan.payment_status.total_installments || 0}
                        </div>
                        <div className="text-sm text-gray-600">Cuotas</div>
                      </div>
                    </div>

                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${paymentPlan.payment_status.completion_percentage || 0}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Fecha inicio:</span> {dynamicReportsService.formatDate(paymentPlan.start_date)}</div>
                      <div><span className="font-medium">Día de pago:</span> {paymentPlan.payment_day}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay plan de pagos disponible
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar size={20} />
                  Cronograma de Pagos - Venta #{sale.id}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Cronograma detallado de cuotas para Mz. {sale.lote_info?.block} - Lt. {sale.lote_info?.lot_number} - {sale.customer_info?.full_name}
                </p>
              </div>
              <div className="p-6">
                <PaymentSchedule 
                  loteId={sale.lote} 
                  showLoteFilter={false}
                />
              </div>
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
    </div>
  );
};

export default SaleDetails;
