import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  Plus, 
  Eye,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
    import { Venta } from "../../services/salesService";
import paymentService from "../../services/paymentService";
import { dynamicReportsService } from "../../services/dynamicReportsService";
import InitialPaymentForm from "./InitialPaymentForm";

interface InitialPaymentManagementProps {
  saleId: number;
  sale: Venta;
  onPaymentAdded: () => void;
}

interface InitialPayment {
  id: number;
  amount: string;
  payment_date: string;
  method: string;
  receipt_number: string;
  receipt_date: string;
  receipt_image?: string;
  notes: string;
  recorded_by: {
    name: string;
  };
  created_at: string;
}

const InitialPaymentManagement: React.FC<InitialPaymentManagementProps> = ({
  saleId,
  sale,
  onPaymentAdded
}) => {
  const [initialPayments, setInitialPayments] = useState<InitialPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadInitialPayments();
  }, [saleId]);

  const loadInitialPayments = async () => {
    try {
      setLoading(true);
      const payments = await paymentService.getInitialPayments(saleId);
      setInitialPayments(payments);
    } catch (err: any) {
      console.error('Error al cargar los pagos iniciales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAdded = () => {
    setShowPaymentForm(false);
    loadInitialPayments();
    onPaymentAdded();
  };

  const totalPaid = initialPayments.reduce((sum, payment) => 
    sum + parseFloat(payment.amount), 0
  );

  const remainingBalance = parseFloat(sale.initial_payment || "0") - totalPaid;
  const isComplete = remainingBalance <= 0;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return '💵';
      case 'transferencia':
        return '🏦';
      case 'tarjeta':
        return '💳';
      default:
        return '💰';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transferencia';
      case 'tarjeta':
        return 'Tarjeta';
      default:
        return 'Otro';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen del Pago Inicial */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="h-6 w-6 text-blue-600" />
          <h4 className="text-lg font-semibold text-gray-900">Resumen del Pago Inicial</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-gray-900">
              {dynamicReportsService.formatCurrency(parseFloat(sale.initial_payment || "0"))}
            </div>
            <div className="text-sm text-gray-600">Total a Pagar</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-green-600">
              {dynamicReportsService.formatCurrency(totalPaid)}
            </div>
            <div className="text-sm text-gray-600">Pagado</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {dynamicReportsService.formatCurrency(remainingBalance)}
            </div>
            <div className="text-sm text-gray-600">Pendiente</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso del pago inicial</span>
            <span>{Math.round((totalPaid / parseFloat(sale.initial_payment || "1")) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((totalPaid / parseFloat(sale.initial_payment || "1")) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Estado */}
        <div className="mt-4 flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-600 font-medium">Pago inicial completado</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-orange-600 font-medium">Pago inicial pendiente</span>
            </>
          )}
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h5 className="text-lg font-semibold flex items-center gap-2">
            <FileText size={20} />
            Historial de Pagos Iniciales
          </h5>
        </div>
        
        <div className="p-6">
          {initialPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No se han registrado pagos iniciales</p>
              {!isComplete && (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                >
                  <Plus size={16} />
                  Registrar Primer Pago
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {initialPayments.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">{getMethodIcon(payment.method)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-lg">
                          {dynamicReportsService.formatCurrency(parseFloat(payment.amount))}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getMethodLabel(payment.method)} • {dynamicReportsService.formatDate(payment.payment_date)}
                        </div>
                        {payment.receipt_number && (
                          <div className="text-xs text-gray-500">
                            Operación: {payment.receipt_number}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {payment.receipt_image && (
                        <button
                          onClick={() => window.open(payment.receipt_image, '_blank')}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver comprobante"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <div className="text-right text-xs text-gray-500">
                        <div>Registrado por: {payment.recorded_by.name}</div>
                        <div>{dynamicReportsService.formatDate(payment.created_at)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {payment.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Notas:</span> {payment.notes}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showPaymentForm && (
        <InitialPaymentForm
          saleId={saleId}
          maxAmount={remainingBalance}
          onSuccess={handlePaymentAdded}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
    </div>
  );
};

export default InitialPaymentManagement;
