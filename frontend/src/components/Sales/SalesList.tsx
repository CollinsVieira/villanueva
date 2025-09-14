import React, { useState, useEffect } from 'react';
import salesService, { Venta, PaginatedResponse } from '../../services/salesService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { Search, Plus, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../UI/LoadingSpinner';

interface SalesListProps {
  onCreateSale?: () => void;
  onViewSale?: (sale: Venta) => void;
  onEditSale?: (sale: Venta) => void;
}

const SalesList: React.FC<SalesListProps> = ({
  onCreateSale,
  onViewSale,
}) => {
  const [sales, setSales] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación del backend
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const itemsPerPage = 25; // Coincide con el PAGE_SIZE del backend

  // Cargar datos iniciales
  useEffect(() => {
    loadSales(searchTerm, statusFilter, currentPage);
  }, []);

  useEffect(() => {
    loadSales(searchTerm, statusFilter, currentPage);
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(1); // Reiniciar a la primera página cuando se busque
    loadSales(searchTerm, statusFilter, 1);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1); // Reiniciar a la primera página cuando cambie el filtro
    loadSales(searchTerm, newStatus, 1);
  };

  const loadSales = async (currentSearchTerm: string, currentStatusFilter: string, page: number = 1) => {
    setLoading(true);
    try {
      setError(null);
      const params: any = {
        page: page
      };
      
      if (currentStatusFilter !== 'all') {
        params.status = currentStatusFilter;
      }
      
      if (currentSearchTerm.trim()) {
        params.search = currentSearchTerm.trim();
      }
      
      const response: PaginatedResponse<Venta> = await salesService.getVentas(params);
      setSales(response.results);
      setTotalCount(response.count);
      setHasNext(!!response.next);
      setHasPrevious(!!response.previous);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar las ventas.');
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Activa', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
      completed: { label: 'Completada', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  // Cálculos de paginación del backend
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalCount);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && sales.length === 0) return <LoadingSpinner />;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Ventas</h1>
          <p className="text-gray-600 mt-1">Haga clic en una venta para ver sus detalles y historial.</p>
        </div>
        <div className="flex items-center space-x-3">
        {onCreateSale && (
          <button 
          onClick={onCreateSale} 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nueva Venta</span>
          </button>
        )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center space-x-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por ID, lote, cliente o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 rounded-lg"
          />
        </div>
        <button onClick={handleSearch} className="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Buscar
        </button>
        <select 
          value={statusFilter} 
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="cancelled">Canceladas</option>
          <option value="completed">Completadas</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="mr-2 text-green-600" size={20} />
            Lista de Ventas
            {!loading && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {totalCount} registros
              </span>
            )}
            {totalPages > 1 && (
              <span className="ml-2 text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
            )}
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {sales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron ventas
              </div>
            ) : (
              sales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-blue-500 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onViewSale?.(sale)}
                >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">Venta #{sale.id}</h3>
                          {getStatusBadge(sale.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Lote:</span> {sale.lote_display}
                          </div>
                          <div>
                            <span className="font-medium">Cliente:</span> {sale.customer_display}
                          </div>
                          <div>
                            <span className="font-medium">Precio:</span> {dynamicReportsService.formatCurrency(parseFloat(sale.sale_price))}
                          </div>
                          <div>
                            <span className="font-medium">Pago inicial:</span> {
                              sale.initial_payment 
                                ? dynamicReportsService.formatCurrency(parseFloat(sale.initial_payment))
                                : 'No registrado'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Fecha contrato:</span> {
                              sale.contract_date 
                                ? dynamicReportsService.formatDate(sale.contract_date)
                                : 'No definida'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Día de vencimiento:</span> {
                              sale.payment_day 
                                ? `${sale.payment_day} de cada mes`
                                : 'No especificado'
                            }
                          </div>
                        </div>

                        {sale.notes && (
                          <div className="text-sm">
                            <span className="font-medium">Notas:</span> {sale.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {/* {onViewSale && (
                          <button
                            onClick={() => onViewSale(sale)}
                            className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )} */}
                        
                        {/* {onEditSale && sale.status === 'active' && (
                          <button
                            onClick={() => onEditSale(sale)}
                            className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )} */}
                        
                        {/* {sale.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleCompleteSale(sale)}
                              className="p-2 border border-gray-300 rounded text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelSale(sale)}
                              className="p-2 border border-gray-300 rounded text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )} */}
                      </div>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {startRecord} a {endRecord} de {totalCount} registros
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevious}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              
              {/* Renderizar números de página con ellipsis */}
              {(() => {
                const pages = [];
                const maxVisiblePages = 5;
                
                if (totalPages <= maxVisiblePages) {
                  // Si hay pocas páginas, mostrar todas
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === i
                            ? 'bg-green-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                } else {
                  // Lógica para mostrar páginas con ellipsis
                  if (currentPage <= 3) {
                    // Mostrar primeras páginas
                    for (let i = 1; i <= 4; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === i
                              ? 'bg-green-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    );
                  } else if (currentPage >= totalPages - 2) {
                    // Mostrar últimas páginas
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        1
                      </button>
                    );
                    pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === i
                              ? 'bg-green-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // Mostrar páginas del medio
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        1
                      </button>
                    );
                    pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                    
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === i
                              ? 'bg-green-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pages;
                }
              })()}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNext}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesList;
