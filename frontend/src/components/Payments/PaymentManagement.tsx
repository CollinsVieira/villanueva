import React, { useState, useEffect } from 'react';
import { CreditCard, PlusCircle, Download, Search, DollarSign, Calendar, TrendingUp, Users, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { Payment } from '../../types';
import paymentService from '../../services/paymentService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';
import PaymentForm from './PaymentForm';
import PaymentSchedule from './PaymentSchedule';
import { useDebounce } from '../../hooks/useDebounce';
import DateService from '../../services/dateService';
import { dynamicReportsService } from '../../services';

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'schedule'>('payments');
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Esta función se ejecutará cada vez que dejes de escribir en el buscador
    loadPayments();
    setCurrentPage(1); // Reiniciar a la primera página cuando cambie la búsqueda
  }, [debouncedSearchTerm]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      setError(null);
      // Enviamos el término de búsqueda a la API
      const data = await paymentService.getPayments(debouncedSearchTerm);
      setPayments(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los pagos.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular estadísticas de los pagos
  const paymentStats = React.useMemo(() => {
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const uniqueCustomers = new Set(payments.map(p => p.customer_info?.id).filter(Boolean)).size;
    const thisMonthPayments = payments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    });
    const thisMonthAmount = thisMonthPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    return {
      totalPayments,
      totalAmount,
      uniqueCustomers,
      thisMonthPayments: thisMonthPayments.length,
      thisMonthAmount
    };
  }, [payments]);

  // Cálculos de paginación
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = payments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSave = () => {
    setShowForm(false);
    setSearchTerm(''); // Limpiar la búsqueda para ver el nuevo pago
    loadPayments(); // Recargar la lista de pagos para mostrar el nuevo pago
  };
  
  const handleExportToExcel = async () => {
    try {
      setError(null);
      const toastId = 'excel-export';
      
      // Mostrar toast de carga
      const { toast } = await import('react-hot-toast');
      toast.loading('Generando Excel con imágenes...', { id: toastId });

      // Importar las librerías necesarias
      const XLSX = await import('xlsx');
      
      // Preparar datos para Excel
      const excelData = [];
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        toast.loading(`Procesando registro ${i + 1} de ${payments.length}...`, { id: toastId });

        excelData.push({
          'Lote': `Mz. ${payment.lote_info?.block} - Lt. ${payment.lote_info?.lot_number}`,
          'Cliente': payment.customer_info?.full_name || 'N/A',
          'DNI': payment.customer_info?.document_number || 'N/A',
          'Teléfono': payment.customer_info?.phone || 'Sin teléfono',
          'Email': 'Sin email', // Email no disponible en customer_info
          'N° Cuota': payment.payment_schedule?.installment_number || 'N/A',
          'Fecha de Pago': new Date(payment.payment_date).toLocaleDateString('es-ES'),
          'Monto': parseFloat(payment.amount).toFixed(2),
          'Método de Pago': payment.method,
          'N° de Operación': payment.receipt_number || 'N/A',
          'Fecha del Recibo': payment.receipt_date_display || 'N/A',
          'Tiene Comprobante': payment.receipt_image ? 'Sí' : 'No',
        });
      }

      // Crear workbook y worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      
      // Configurar anchos de columna
      const colWidths = [
        { wch: 20 }, // Lote
        { wch: 25 }, // Cliente
        { wch: 12 }, // DNI
        { wch: 15 }, // Teléfono
        { wch: 25 }, // Email
        { wch: 10 }, // N° Cuota
        { wch: 12 }, // Fecha de Pago
        { wch: 12 }, // Monto
        { wch: 15 }, // Método de Pago
        { wch: 20 }, // N° de Operación
        { wch: 15 }, // Fecha del Recibo
        { wch: 40 }, // URL Comprobante
        { wch: 18 }, // Tiene Comprobante
        { wch: 15 }  // Tamaño Imagen
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
      
      // Guardar el archivo
      XLSX.writeFile(wb, `reporte-pagos-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel generado exitosamente', { id: toastId });
      
    } catch (error) {
      console.error('Error generating Excel:', error);
      setError('Error al generar el Excel');
      const { toast } = await import('react-hot-toast');
      toast.error('Error al generar el Excel', { id: 'excel-export' });
    }
  };

  if (isLoading && payments.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-gray-600 mt-1">Registre y administre los pagos de los clientes.</p>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab === 'payments' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportToExcel}
                disabled={payments.length === 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-xl flex items-center space-x-2 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={18} />
                <span>Excel</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <PlusCircle size={20} />
            <span>Registrar Pago</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={18} />
            <span>Historial de Pagos</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
              activeTab === 'schedule'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={18} />
            <span>Cronograma de Cuotas</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'payments' ? (
        <>
          {/* Payment Statistics */}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30">
            {/* <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"> */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium text-left">Total Recaudado</p>
                  <p className="text-2xl font-bold text-white">{dynamicReportsService.formatCurrency(paymentStats.totalAmount)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <DollarSign size={24} />
                </div>
              </div>
            </div>

            <div className="bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30">
            {/* <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"> */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total de Pagos</p>
                  <p className="text-2xl font-bold text-white text-left">{paymentStats.totalPayments}</p>
                  <p className="text-blue-100 text-xs">Pagos registrados</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <CreditCard size={24} />
                </div>
              </div>
            </div>

            <div className="bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30">
            {/* <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"> */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Clientes Activos</p>
                  <p className="text-2xl font-bold text-white text-left">{paymentStats.uniqueCustomers}</p>
                  <p className="text-purple-100 text-xs text-left">Con pagos</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <Users size={24} />
                </div>
              </div>
            </div>

            <div className="bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30">
            {/* <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"> */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium text-left">Este Mes</p>
                  <p className="text-2xl font-bold text-white">{dynamicReportsService.formatCurrency(paymentStats.thisMonthAmount)}</p>
                  <p className="text-orange-100 text-xs text-left">{paymentStats.thisMonthPayments} pagos</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, DNI, número de lote, número de operación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              {isLoading && debouncedSearchTerm && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Buscando...</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCard className="mr-2 text-blue-600" size={20} />
                Historial de Pagos
                {!isLoading && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {payments.length} registros
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
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando pagos...</p>
                </div>
              )}
              {!isLoading && (
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <tr>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Cuota</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Pago</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Operación</th>
                      <th className="p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentPayments.map((payment, index) => (
                      <tr key={payment.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-blue-600 font-semibold text-sm">
                                {payment.lote_info?.block}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">Mz. {payment.lote_info?.block} - Lt. {payment.lote_info?.lot_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <Users size={16} className="text-purple-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{payment.customer_info?.full_name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">
                                {payment.customer_info?.document_number || 'Sin documento'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {(payment.payment_schedule?.installment_number || payment.payment_schedule_info?.installment_number) ? (
                            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                              #{(payment.payment_schedule?.installment_number || payment.payment_schedule_info?.installment_number)}
                            </span>
                          ) : (
                            <span className="bg-orange-100 text-orange-500 px-3 py-1 rounded-full text-xs">Inicial</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <Calendar size={16} className="text-gray-400 mr-2" />
                            <span className="text-gray-900">
                              {DateService.utcToLocalDateOnly(payment.payment_date)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <span className="font-bold text-lg text-green-600">{dynamicReportsService.formatCurrency(parseFloat(payment.amount))}</span>
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {payment.method}
                          </div>
                        </td>
                        <td className="p-4">
                          {payment.receipt_number ? (
                            <div className="bg-gray-50 rounded-lg p-2">
                              <span className="font-mono text-sm font-medium text-gray-900 block">{payment.receipt_number}</span>
                              {payment.receipt_date && (
                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                  <Calendar size={12} className="mr-1" />
                                  {payment.receipt_date_display || 'N/A'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">No especificado</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {payment.receipt_image ? (
                            <a 
                              href={payment.receipt_image} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Download size={14} className="mr-1" />
                              Ver
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm italic">No adjunto</span>
                          )}
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
                  Mostrando {startIndex + 1} a {Math.min(endIndex, payments.length)} de {payments.length} registros
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
          </div>

          {!isLoading && payments.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {debouncedSearchTerm ? 'No se encontraron pagos' : 'No hay pagos registrados'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {debouncedSearchTerm 
                  ? 'Intenta con otros términos de búsqueda o verifica los filtros aplicados.' 
                  : 'Comience registrando el primer pago de sus clientes para ver el historial aquí.'
                }
              </p>
              {!debouncedSearchTerm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center space-x-2 mx-auto shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <PlusCircle size={20} />
                  <span>Registrar Primer Pago</span>
                </button>
              )}
            </div>
          )}
        </> 
      ) : (
        <PaymentSchedule />
      )}

      {showForm && (
        <PaymentForm 
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default PaymentManagement;