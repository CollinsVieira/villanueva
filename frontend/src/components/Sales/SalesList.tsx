import React, { useState, useEffect } from 'react';
import salesService, { Venta } from '../../services/salesService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import { Search, Plus } from 'lucide-react';

interface SalesListProps {
  onCreateSale?: () => void;
  onViewSale?: (sale: Venta) => void;
  onEditSale?: (sale: Venta) => void;
}

const SalesList: React.FC<SalesListProps> = ({
  onCreateSale,
  onViewSale
}) => {
  const [sales, setSales] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, [statusFilter]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await salesService.getVentas(params);
      setSales(data.results || data);
    } catch (err) {
      setError('Error al cargar las ventas');
      console.error('Error loading sales:', err);
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

  const filteredSales = sales.filter(sale => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      sale.id.toString().includes(searchLower) ||
      sale.lote_display?.toLowerCase().includes(searchLower) ||
      sale.customer_display?.toLowerCase().includes(searchLower) ||
      sale.customer_info?.document_number.includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">Cargando ventas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestión de Ventas</h2>
            {onCreateSale && (
              <button 
                onClick={onCreateSale} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nueva Venta
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar por ID, lote, cliente o documento..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select 
              value={statusFilter} 
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="cancelled">Canceladas</option>
              <option value="completed">Completadas</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredSales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron ventas
              </div>
            ) : (
              filteredSales.map((sale) => (
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
      </div>
    </div>
  );
};

export default SalesList;
