import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { dashboardSummaryService, paymentService } from '../services';
import { LoadingSpinner } from '../components/UI';
import PaymentForm from '../components/Payments/PaymentForm';
import DateService from '../services/dateService';

interface DueDateItem {
  id: number;
  venta: number;
  lote_info: {
    id: number;
    block: string;
    lot_number: string;
  };
  customer_info: {
    id: number;
    full_name: string;
    document_number: string;
  };
  due_date: string;
  scheduled_amount: number;
  status: string;
  installment_number: number;
}

const Vencimientos: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dueDates, setDueDates] = useState<DueDateItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [dueDatesOrdering, setDueDatesOrdering] = useState<'asc' | 'desc'>('desc');
  
  // Modal de registro de pago
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadDueDates();
  }, [currentPage, statusFilter, dueDatesOrdering]);

  const loadDueDates = async () => {
    try {
      setLoading(true);
      const response = await dashboardSummaryService.getAllDueDates(
        statusFilter, 
        currentPage, 
        20, 
        dueDatesOrdering
      );
      setDueDates(response.results);
      setTotalPages(Math.ceil(response.count / 20));
    } catch (error) {
      console.error('Error cargando vencimientos:', error);
      toast.error('Error al cargar los vencimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Primero actualizar las cuotas vencidas
      const updateResult = await paymentService.updateOverdueInstallments();
      
      if (updateResult.success) {
        if (updateResult.updated_count > 0) {
          toast.success(`${updateResult.message}`);
        }
      }
      
      // Luego cargar los datos actualizados
      await loadDueDates();
      
      if (updateResult.updated_count === 0) {
        toast.success('Datos actualizados');
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error('Error al actualizar los datos');
    } finally {
      setRefreshing(false);
    }
  };

  const getDaysUntilDue = (due_date: string) => {
    const dueDate = new Date(due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'border-red-500';
    if (days === 0) return 'border-red-400';
    if (days === 1) return 'border-orange-400';
    if (days <= 2) return 'border-orange-400';
    return 'border-yellow-400';
  };

  const getUrgencyIconColor = (days: number) => {
    if (days < 0) return 'text-red-600';
    if (days === 0) return 'text-red-500';
    if (days === 1) return 'text-orange-500';
    if (days <= 2) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getUrgencyBgColor = (days: number) => {
    if (days < 0) return 'bg-red-50';
    if (days === 0) return 'bg-red-50';
    if (days === 1) return 'bg-orange-50';
    if (days <= 2) return 'bg-orange-50';
    return 'bg-yellow-50';
  };

  const getUrgencyIcon = (days: number) => {
    if (days < 0 || days <= 1) return <AlertTriangle className="w-5 h-5" />;
    if (days <= 2) return <Clock className="w-5 h-5" />;
    return <Calendar className="w-5 h-5" />;
  };

  const handleNavigateToSale = (ventaId: number) => {
    navigate('/admin/ventas', { state: { saleId: ventaId, viewMode: 'details' } });
  };

  const filteredDueDates = dueDates.filter(dueDate => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      dueDate.customer_info.full_name.toLowerCase().includes(searchLower) ||
      dueDate.lote_info.block.toLowerCase().includes(searchLower) ||
      dueDate.lote_info.lot_number.toLowerCase().includes(searchLower);
    
    const matchesDate = !selectedDate || dueDate.due_date === selectedDate;
    
    return matchesSearch && matchesDate;
  });

  if (loading && dueDates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col">
        <p className="text-gray-500 mb-4">Cargando vencimientos...</p>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Próximos Vencimientos de Cuotas</h1>
          <p className="text-gray-600 mt-1">Listado de pagos pendientes por vencer próximamente.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por cliente o lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtros de estado y ordenamiento */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => { setStatusFilter('overdue'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'overdue' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Vencidas
            </button>
          </div>
          
          {/* Botón de ordenamiento */}
          <button
            onClick={() => {
              setDueDatesOrdering(prev => prev === 'asc' ? 'desc' : 'asc');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${
              dueDatesOrdering === 'desc' 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}
            title={dueDatesOrdering === 'asc' ? 'Ver todas las cuotas' : 'Próximos 5 días'}
          >
            <ArrowUpDown className="w-4 h-4" />
            {dueDatesOrdering === 'asc' ? 'Todas' : 'Próx. 5 días'}
          </button>
        </div>
      </div>

      {/* Lista de Vencimientos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredDueDates.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredDueDates.map((dueDate) => {
              const daysUntil = getDaysUntilDue(dueDate.due_date);
              
              return (
                <div 
                  key={dueDate.id} 
                  onClick={() => handleNavigateToSale(dueDate.venta)}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-l-4 cursor-pointer ${getUrgencyColor(daysUntil)}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Icono de alerta */}
                    <div className={`p-3 rounded-full ${getUrgencyBgColor(daysUntil)}`}>
                      <span className={getUrgencyIconColor(daysUntil)}>
                        {getUrgencyIcon(daysUntil)}
                      </span>
                    </div>

                    {/* Información del lote y cliente */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">LOTE / MANZANA</p>
                      <p className="font-semibold text-gray-900">
                        Mz. {dueDate.lote_info.block} - Lt. {dueDate.lote_info.lot_number}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {dueDate.customer_info.full_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Cuota #{dueDate.installment_number} · Vence: {DateService.utcToLocalDateOnly(dueDate.due_date.toString())}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {/* Monto */}
                    <p className="text-xs text-gray-500 uppercase mb-1">MONTO</p>
                    <p className="text-sm font-semibold text-gray-900">
                      S/ {parseFloat(dueDate.scheduled_amount.toString()).toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${getUrgencyColor(daysUntil).split(' ')[0]}`}>
                      {daysUntil < 0 ? `Vencido hace ${Math.abs(daysUntil)} días` :
                        daysUntil === 0 ? 'Vence hoy' : 
                        daysUntil === 1 ? 'Vence mañana' : 
                        `Vence en ${daysUntil} días`}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                      dueDate.status === 'overdue' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {dueDate.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay vencimientos para mostrar</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Registro de Pago */}
      {showPaymentForm && (
        <PaymentForm
          onClose={() => setShowPaymentForm(false)}
          onSave={() => {
            setShowPaymentForm(false);
            loadDueDates();
            toast.success('Pago registrado correctamente');
          }}
        />
      )}
    </div>
  );
};

export default Vencimientos;
