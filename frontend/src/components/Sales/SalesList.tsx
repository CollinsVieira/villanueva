import React, { useState } from 'react';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { 
  Search, Plus, Users, ChevronLeft, ChevronRight, LayoutGrid, List,
  MapPin, User, Calendar, CreditCard, FileText, CheckCircle2,
  XCircle, AlertCircle, Eye, ArrowRight, ShieldAlert, Archive,
  Check
} from 'lucide-react';
import LoadingSpinner from '../UI/LoadingSpinner';
import { useSales } from '../../hooks/useSalesQueries';
import { Venta } from '../../services/salesService';

interface SalesListProps {
  onCreateSale?: () => void;
  onViewSale?: (sale: Venta) => void;
  onEditSale?: (sale: Venta) => void;
}

const SalesList: React.FC<SalesListProps> = ({
  onCreateSale,
  onViewSale,
}) => {
  // Tabs: 'active' (Ventas Activas/Vigentes) | 'cancelled' (Ventas Canceladas)
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');

  // Modo de visualización: 'grid' (cuadrícula de lotes vendidos) | 'table' (lista tabular)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('sales_view_mode') as 'grid' | 'table') || 'grid';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24; // 24 elementos se distribuye perfectamente en rejillas de 2, 3 y 4 columnas

  // Guardar preferencia de vista
  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('sales_view_mode', mode);
  };

  // Construir parámetros según la pestaña activa
  const effectiveStatus = activeTab === 'cancelled' 
    ? 'cancelled' 
    : (activeStatusFilter === 'all' ? undefined : activeStatusFilter);

  // Parámetros de la consulta
  const queryParams = {
    page: currentPage,
    ...(effectiveStatus && { status: effectiveStatus }),
    // Si estamos en tab activa y sin filtro específico, excluir canceladas del queryset
    ...(activeTab === 'active' && activeStatusFilter === 'all' && { active_only: undefined }),
    ...(searchQuery.trim() && { search: searchQuery.trim() }),
  };

  // React Query para la lista principal
  const { data, isLoading, error } = useSales(queryParams);

  // React Query para obtener contadores globales de cada pestaña
  const { data: activeCountData } = useSales({ status: 'active', page: 1 });
  const { data: cancelledCountData } = useSales({ status: 'cancelled', page: 1 });

  const rawSales = data?.results || [];
  // Si estamos en pestaña activa y sin filtro especial, aseguramos filtrar canceladas por si acaso
  const sales = activeTab === 'active' 
    ? rawSales.filter(s => s.status !== 'cancelled') 
    : rawSales.filter(s => s.status === 'cancelled');

  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const hasNext = !!data?.next;
  const hasPrevious = !!data?.previous;
  const startRecord = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endRecord = Math.min(currentPage * itemsPerPage, totalCount);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchTerm);
  };

  const handleTabChange = (tab: 'active' | 'cancelled') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      active: { 
        label: 'Vigente / Activa', 
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
      },
      completed: { 
        label: 'Completada / Liquidada', 
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: <Check size={13} className="mr-1 text-blue-600" />
      },
      cancelled: { 
        label: 'Cancelada', 
        className: 'bg-red-50 text-red-700 border border-red-200',
        icon: <XCircle size={13} className="mr-1 text-red-600" />
      },
      suspended: { 
        label: 'Suspendida', 
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: <AlertCircle size={13} className="mr-1 text-amber-600" />
      }
    };
    
    const config = statusConfig[status] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800 border border-gray-200',
      icon: null
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Helper para calcular porcentaje pagado
  const calculatePaymentProgress = (sale: Venta) => {
    const price = parseFloat(sale.sale_price) || 0;
    if (price <= 0) return 0;
    
    if (sale.remaining_balance !== undefined) {
      const balance = parseFloat(sale.remaining_balance.toString()) || 0;
      const paid = Math.max(0, price - balance);
      return Math.min(100, Math.round((paid / price) * 100));
    }
    
    if (sale.initial_payment) {
      const initial = parseFloat(sale.initial_payment) || 0;
      return Math.min(100, Math.round((initial / price) * 100));
    }
    
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Ventas</h1>
          <p className="text-gray-600 mt-1">
            {activeTab === 'active' 
              ? 'Control comercial y seguimiento de lotes vendidos, cronogramas y pagos.' 
              : 'Histórico de contratos y ventas canceladas con motivos registrados.'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {activeTab === 'active' && onCreateSale && (
            <button 
              onClick={onCreateSale} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 font-medium shadow-sm transition-all duration-200 hover:shadow"
            >
              <Plus size={20} />
              <span>Nueva Venta</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector: Ventas Activas vs Ventas Canceladas */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('active')}
            className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm transition-all duration-150 ${
              activeTab === 'active'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle2 size={18} className={activeTab === 'active' ? 'text-emerald-600' : 'text-gray-400'} />
            <span>Ventas Vigentes</span>
            {activeCountData?.count !== undefined && (
              <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold ${
                activeTab === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {activeCountData.count}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('cancelled')}
            className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm transition-all duration-150 ${
              activeTab === 'cancelled'
                ? 'border-red-600 text-red-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Archive size={18} className={activeTab === 'cancelled' ? 'text-red-500' : 'text-gray-400'} />
            <span>Ventas Canceladas (Histórico)</span>
            {cancelledCountData?.count !== undefined && (
              <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold ${
                activeTab === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {cancelledCountData.count}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Alerta informativa en pestaña de canceladas */}
      {activeTab === 'cancelled' && (
        <div className="flex items-start space-x-3 text-sm text-red-800 bg-red-50 border border-red-200 p-4 rounded-xl">
          <ShieldAlert size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Registro Histórico de Cancelaciones:</span>
            <p className="mt-0.5 text-red-700">
              Las ventas canceladas conservan el detalle del lote, cliente, fechas y el motivo por el cual fue anulado el contrato para trazabilidad y auditoría.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {(error as any)?.response?.data?.detail || 'Error al cargar las ventas'}
        </div>
      )}

      {/* Barra de Filtros, Búsqueda y Selector de Vista */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por ID, manzana, lote, cliente o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <button 
            onClick={handleSearch} 
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Buscar
          </button>

          {/* Filtro de estado para la pestaña activa */}
          {activeTab === 'active' && (
            <select 
              value={activeStatusFilter} 
              onChange={(e) => {
                setActiveStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas / En curso</option>
              <option value="completed">Completadas / Liquidadas</option>
            </select>
          )}

          {/* Toggle de Cuadrícula vs Lista */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => handleViewModeChange('grid')}
              title="Vista en Cuadrícula"
              className={`p-2 rounded-lg transition-all duration-150 ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => handleViewModeChange('table')}
              title="Vista en Lista / Tabla"
              className={`p-2 rounded-lg transition-all duration-150 ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido: Estado de carga o Lista/Cuadrícula */}
      {isLoading && sales.length === 0 ? (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            {activeTab === 'active' ? <Users size={30} /> : <Archive size={30} />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {activeTab === 'active' ? 'No se encontraron ventas vigentes' : 'No hay ventas canceladas registradas'}
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {searchQuery 
              ? 'No hay resultados que coincidan con los criterios de búsqueda ingresados.' 
              : activeTab === 'active' 
                ? 'Aún no se han registrado ventas activas en el sistema.' 
                : 'No se registran anulaciones de ventas en el historial.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA EN CUADRÍCULA (GRID DE LOTES VENDIDOS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sales.map((sale) => {
            const progress = calculatePaymentProgress(sale);
            const isCancelled = sale.status === 'cancelled';
            const isCompleted = sale.status === 'completed';

            return (
              <div
                key={sale.id}
                onClick={() => onViewSale?.(sale)}
                className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
                  isCancelled 
                    ? 'border-red-200 hover:border-red-300' 
                    : isCompleted 
                      ? 'border-blue-200 hover:border-blue-300' 
                      : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-xl flex items-center justify-center ${
                        isCancelled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
                          {sale.lote_display || `Lote #${sale.lote}`}
                        </h3>
                        <span className="text-xs text-gray-400 font-mono">
                          Venta #{sale.id}
                        </span>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(sale.status)}
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50/80 px-3 py-2 rounded-xl mb-4">
                    <User size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="font-medium truncate" title={sale.customer_display}>
                      {sale.customer_display || 'Cliente no disponible'}
                    </span>
                  </div>

                  {/* Panel Financiero */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-3.5 border border-gray-100 space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Precio Total</span>
                      <span className="font-bold text-gray-900">
                        {dynamicReportsService.formatCurrency(parseFloat(sale.sale_price) || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Inicial</span>
                      <span className="font-semibold text-gray-700">
                        {sale.initial_payment 
                          ? dynamicReportsService.formatCurrency(parseFloat(sale.initial_payment)) 
                          : 'Sin inicial'}
                      </span>
                    </div>

                    {sale.remaining_balance !== undefined && !isCancelled && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500">Saldo Pendiente</span>
                        <span className={`font-bold ${parseFloat(sale.remaining_balance.toString()) <= 0 ? 'text-emerald-600' : 'text-amber-700'}`}>
                          {dynamicReportsService.formatCurrency(parseFloat(sale.remaining_balance.toString()) || 0)}
                        </span>
                      </div>
                    )}

                    {/* Barra de Progreso de Pago */}
                    {!isCancelled && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                          <span>Progreso de amortización</span>
                          <span className="font-semibold text-emerald-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-blue-600' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Motivo de Cancelación si aplica */}
                  {isCancelled && sale.cancellation_reason && (
                    <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800">
                      <span className="font-semibold block mb-0.5">Motivo de anulación:</span>
                      <p className="line-clamp-2 text-red-700">{sale.cancellation_reason}</p>
                    </div>
                  )}

                  {/* Fechas & Configuración Comercial */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center space-x-1.5">
                      <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {sale.contract_date ? dynamicReportsService.formatDate(sale.contract_date) : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <CreditCard size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {sale.payment_day ? `Día ${sale.payment_day} c/mes` : 'Sin día'}
                      </span>
                    </div>
                  </div>

                  {/* Documentos Adjuntos (Badges) */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {sale.contract_pdf && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <FileText size={10} className="mr-1 text-blue-500" />
                        Contrato
                      </span>
                    )}
                    {sale.adenda_pdf && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        <FileText size={10} className="mr-1 text-purple-500" />
                        Adenda
                      </span>
                    )}
                    {sale.escritura_pdf && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        <FileText size={10} className="mr-1 text-teal-500" />
                        Escritura
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer de la Tarjeta */}
                <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-emerald-700 group-hover:bg-emerald-50/50 transition-colors">
                  <span>Ver expediente completo</span>
                  <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA EN TABLA / LISTA */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Lote / Venta</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Precio Total</th>
                  <th className="py-3.5 px-4">Inicial</th>
                  <th className="py-3.5 px-4">Saldo Pendiente</th>
                  <th className="py-3.5 px-4">Día Pago / Contrato</th>
                  <th className="py-3.5 px-4">Documentos</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => onViewSale?.(sale)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
                        <MapPin size={15} className="text-emerald-600 flex-shrink-0" />
                        <span>{sale.lote_display || `Lote #${sale.lote}`}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono ml-5">
                        Venta #{sale.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 truncate max-w-[200px]" title={sale.customer_display}>
                        {sale.customer_display}
                      </div>
                      {sale.customer_info?.document_number && (
                        <div className="text-xs text-gray-500">
                          Doc: {sale.customer_info.document_number}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-gray-900">
                      {dynamicReportsService.formatCurrency(parseFloat(sale.sale_price) || 0)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-700">
                      {sale.initial_payment 
                        ? dynamicReportsService.formatCurrency(parseFloat(sale.initial_payment))
                        : <span className="text-gray-400 text-xs">Sin inicial</span>}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {sale.remaining_balance !== undefined ? (
                        <span className={`font-semibold ${parseFloat(sale.remaining_balance.toString()) <= 0 ? 'text-emerald-600' : 'text-amber-700'}`}>
                          {dynamicReportsService.formatCurrency(parseFloat(sale.remaining_balance.toString()) || 0)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                      <div>{sale.payment_day ? `Día ${sale.payment_day} c/mes` : 'No especificado'}</div>
                      <div className="text-gray-400">
                        {sale.contract_date ? dynamicReportsService.formatDate(sale.contract_date) : 'Sin fecha'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {sale.contract_pdf && (
                          <span title="Contrato PDF" className="p-1 bg-blue-50 text-blue-600 rounded">
                            <FileText size={14} />
                          </span>
                        )}
                        {sale.adenda_pdf && (
                          <span title="Adenda PDF" className="p-1 bg-purple-50 text-purple-600 rounded">
                            <FileText size={14} />
                          </span>
                        )}
                        {sale.escritura_pdf && (
                          <span title="Escritura PDF" className="p-1 bg-teal-50 text-teal-600 rounded">
                            <FileText size={14} />
                          </span>
                        )}
                        {!sale.contract_pdf && !sale.adenda_pdf && !sale.escritura_pdf && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(sale.status)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSale?.(sale);
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye size={13} />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      {!isLoading && totalPages > 1 && (
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-900">{startRecord}</span> a{' '}
            <span className="font-semibold text-gray-900">{endRecord}</span> de{' '}
            <span className="font-semibold text-gray-900">{totalCount}</span> registros
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!hasPrevious}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>
            
            {/* Números de página */}
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let startPage = Math.max(1, currentPage - 2);
              let endPage = Math.min(totalPages, startPage + maxVisible - 1);

              if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === i
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!hasNext}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;
