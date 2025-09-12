import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, CircleDot, Plus } from 'lucide-react';
import { PaymentSchedule as PaymentScheduleType, Lote } from '../../types';
import paymentService from '../../services/paymentService';
import loteService from '../../services/loteService';
import PaymentRegistrationForm from './PaymentRegistrationForm';
import AmountModificationForm from './AmountModificationForm';
import DateService from '../../services/dateService';

interface PaymentScheduleProps {
  loteId?: number;
  showLoteFilter?: boolean;
}

const PaymentSchedule: React.FC<PaymentScheduleProps> = ({ 
  loteId, 
  showLoteFilter = true 
}) => {
  const [schedules, setSchedules] = useState<PaymentScheduleType[]>([]);
  const [allLotes, setAllLotes] = useState<Lote[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(loteId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentScheduleType | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const itemsPerPage = 10;


  useEffect(() => {
    if (showLoteFilter) {
      loadLotes();
    }
  }, [showLoteFilter]);

  useEffect(() => {
    loadSchedules();
    setCurrentPage(1);
  }, [selectedLoteId, statusFilter]);

  const loadLotes = async () => {
    try {
      const data = await loteService.getLotes({ status: 'vendido' });
      setAllLotes(data);
    } catch (err: any) {
      setError('Error al cargar los lotes');
    }
  };

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      setError(null);
      let data: PaymentScheduleType[] = [];

      // Solo cargar datos si hay un lote seleccionado
      if (selectedLoteId) {
        data = await paymentService.getPaymentScheduleByLote(selectedLoteId);
        
        // Aplicar filtro de estado si no es 'all'
        if (statusFilter !== 'all') {
          data = data.filter(schedule => schedule.status === statusFilter);
        }
      }
      // Si no hay lote seleccionado, no cargar ningún dato

      setSchedules(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar el cronograma de pagos');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSchedule = async () => {
    if (!selectedLoteId) {
      setError('Seleccione un lote para generar el cronograma');
      return;
    }

    try {
      setError(null);
      const { toast } = await import('react-hot-toast');
      toast.loading('Generando cronograma de pagos...');
      
      await paymentService.generateScheduleForLote(selectedLoteId);
      await loadSchedules();
      
      toast.success('Cronograma generado exitosamente');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Error al generar el cronograma';
      setError(errorMsg);
      const { toast } = await import('react-hot-toast');
      toast.error(errorMsg);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'forgiven': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} />;
      case 'partial': return <CircleDot size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'overdue': return <AlertTriangle size={16} />;
      case 'forgiven': return <CheckCircle size={16} />;
      default: return <CircleDot size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'partial': return 'Parcial';
      case 'pending': return 'Pendiente';
      case 'overdue': return 'Vencido';
      case 'forgiven': return 'Absuelto';
      default: return 'Desconocido';
    }
  };

  // Cálculos de paginación
  const totalPages = Math.ceil(schedules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchedules = schedules.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handler functions for payment actions
  const handleRegisterPayment = (schedule: PaymentScheduleType) => {
    setSelectedSchedule(schedule);
    setShowPaymentModal(true);
  };

  const handleModifyAmount = (schedule: PaymentScheduleType) => {
    setSelectedSchedule(schedule);
    setShowModifyModal(true);
  };

  const handleForgiveInstallment = async (schedule: PaymentScheduleType) => {
    if (!confirm(`¿Está seguro de que desea absolver la cuota #${schedule.installment_number}?`)) {
      return;
    }

    try {
      await paymentService.forgiveInstallment(schedule.id, 'Cuota absuelta por el usuario');
      loadSchedules();
      // Show success message
    } catch (error) {
      console.error('Error al absolver cuota:', error);
      // Show error message
    }
  };

  
  if (isLoading && schedules.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando cronograma...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cronograma de Pagos</h1>
          <p className="text-gray-600 mt-1">Gestione el cronograma detallado de cuotas y vencimientos.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showLoteFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Lote *
              </label>
              <select
                value={selectedLoteId || ''}
                onChange={(e) => setSelectedLoteId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione un lote...</option>
                {allLotes.map(lote => (
                  <option key={lote.id} value={lote.id}>
                    Mz. {lote.block} - Lt. {lote.lot_number} ({lote.current_owner?.full_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedLoteId}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="paid">Pagadas</option>
              <option value="overdue">Vencidas</option>
              <option value="partial">Parciales</option>
            </select>
          </div>

          
        </div>
      </div>

      {/* Mensaje cuando no hay lote seleccionado */}
      {!selectedLoteId && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={40} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Seleccione un Lote
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Para ver el cronograma de pagos, por favor seleccione un lote de la lista anterior.
            </p>
          </div>
        </div>
      )}

      {/* Tabla de cronograma - Solo mostrar si hay lote seleccionado */}
      {selectedLoteId && (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="mr-2 text-blue-600" size={20} />
            Cronograma de Cuotas
            {!isLoading && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {schedules.length} cuotas
              </span>
            )}
            {totalPages > 1 && (
              <span className="ml-2 text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
            )}
          </h2>
        </div>

        <div className="overflow-x-auto">
          {isLoading && (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando cronograma...</p>
            </div>
          )}

          {!isLoading && (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuota</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote/Cliente</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                  <th className="p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentSchedules.map((schedule, index) => (
                  <tr key={schedule.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-bold text-sm">
                            #{schedule.installment_number}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {schedule.lote_display || 'N/A'}
                        </div>
                        <div className="text-gray-500">{schedule.customer_display || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <Calendar size={16} className="text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                          {DateService.utcToLocalDateOnly(schedule.due_date)}
                          </div>
                          {schedule.status === 'overdue' && (
                            <div className="text-xs text-red-600">
                              Vencido
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-bold text-gray-900">
                          S/. {parseFloat(schedule.scheduled_amount).toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-bold text-green-600">
                          S/. {parseFloat(schedule.paid_amount).toFixed(2)}
                        </div>
                        {schedule.payment_date && (
                          <div className="text-xs text-gray-500">
                            {new Date(schedule.payment_date).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        {schedule.all_payments && schedule.all_payments.length > 0 && (
                          <div className="mt-2">
                            <details className="group">
                              <summary className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                                Ver {schedule.all_payments.length} pago{schedule.all_payments.length > 1 ? 's' : ''} detallado{schedule.all_payments.length > 1 ? 's' : ''}
                              </summary>
                              <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
                                {schedule.all_payments.map((payment) => (
                                  <div key={payment.id} className="text-xs bg-gray-50 p-2 rounded">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-medium text-gray-700">
                                          S/. {parseFloat(payment.amount).toFixed(2)}
                                        </span>
                                        <span className="ml-2 text-gray-500 capitalize">
                                          ({payment.method})
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        {payment.payment_date_display && (
                                          <div className="text-gray-500">
                                            {payment.payment_date_display}
                                          </div>
                                        )}
                                        {payment.receipt_number && (
                                          <div className="text-blue-600 font-medium">
                                            #{payment.receipt_number}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {payment.receipt_image && (
                                      <div className="mt-1">
                                        <a 
                                          href={payment.receipt_image} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-xs"
                                        >
                                          Ver comprobante
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-red-600">
                        S/. {(parseFloat(schedule.scheduled_amount) - parseFloat(schedule.paid_amount)).toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                        {getStatusIcon(schedule.status)}
                        <span className="ml-1">{getStatusText(schedule.status)}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {schedule.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleModifyAmount(schedule)}
                              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                              title="Modificar monto"
                            >
                              Modificar
                            </button>
                            <button
                              onClick={() => handleForgiveInstallment(schedule)}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                              title="Absolver cuota"
                            >
                              Absolver
                            </button>
                          </>
                        )}
                        {schedule.status === 'partial' && (
                          <button
                            onClick={() => handleRegisterPayment(schedule)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            title="Completar pago"
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!isLoading && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {startIndex + 1} a {Math.min(endIndex, schedules.length)} de {schedules.length} cuotas
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {!isLoading && schedules.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay cronograma para este lote
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Este lote no tiene un cronograma de pagos generado. Genere uno para comenzar a gestionar las cuotas.
            </p>
            <button
              onClick={generateSchedule}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center space-x-2 mx-auto shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <Plus size={20} />
              <span>Generar Cronograma</span>
            </button>
          </div>
        )}
      </div>
      )}

      {/* Payment Registration Modal */}
      {showPaymentModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Registrar Pago - Cuota #{selectedSchedule.installment_number}
            </h3>
            <PaymentRegistrationForm
              schedule={selectedSchedule}
              onSuccess={() => {
                setShowPaymentModal(false);
                setSelectedSchedule(null);
                loadSchedules();
              }}
              onCancel={() => {
                setShowPaymentModal(false);
                setSelectedSchedule(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Amount Modification Modal */}
      {showModifyModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Modificar Monto - Cuota #{selectedSchedule.installment_number}
            </h3>
            <AmountModificationForm
              schedule={selectedSchedule}
              onSuccess={() => {
                setShowModifyModal(false);
                setSelectedSchedule(null);
                loadSchedules();
              }}
              onCancel={() => {
                setShowModifyModal(false);
                setSelectedSchedule(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSchedule;
