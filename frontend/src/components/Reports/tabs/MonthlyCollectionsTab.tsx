import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  RefreshCw,
  Download,
  PieChart
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dynamicReportsService, excelService } from '../../../services';
import { LoadingSpinner } from '../../UI';

const MonthlyCollectionsTab: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await dynamicReportsService.getMonthlyCollections({
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setData(result);
    } catch (error) {
      console.error('Error loading monthly collections:', error);
      toast.error('Error al cargar cobranzas mensuales');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
    toast.success('Datos actualizados');
  };

  const handleFilterChange = () => {
    loadData();
  };

  const handleExportExcel = async () => {
    if (!data) return;
    
    try {
      toast.loading('Exportando a Excel...', { id: 'excel-export' });
      
      // Crear un reporte temporal para la exportación
      const tempReport = {
        id: 0,
        name: 'Colecciones Mensuales',
        report_type: 'monthly_collections' as const,
        report_type_display: 'Colecciones Mensuales',
        status: 'completed' as const,
        status_display: 'Completado',
        data: data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requested_by: 0,
        requested_by_name: 'Sistema'
      };
      
      excelService.exportReport(tempReport);
      toast.success('Excel exportado exitosamente', { id: 'excel-export' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar a Excel', { id: 'excel-export' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No se pudieron cargar los datos</p>
        <button
          onClick={loadData}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6" id="monthly-collections-content">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleFilterChange}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Aplicar
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              <Download className="w-4 h-4" />
                              <span>Exportar a Excel</span>
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Última actualización: {dynamicReportsService.formatDateTime(data.generated_at)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Cobrado</p>
              <p className="text-2xl font-bold">{dynamicReportsService.formatCurrency(data.total_collected)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Transacciones</p>
              <p className="text-3xl font-bold">{data.total_transactions}</p>
            </div>
            <span className="text-3xl">💳</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Promedio por Cobro</p>
              <p className="text-xl font-bold">
                {dynamicReportsService.formatCurrency(data.total_collected / data.total_transactions)}
              </p>
            </div>
            <PieChart className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Period Info */}
      {(data.period.start_date || data.period.end_date) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Período del reporte:</span>
            <span className="text-blue-800">
              {data.period.start_date ? dynamicReportsService.formatDate(data.period.start_date) : 'Inicio'} - {' '}
              {data.period.end_date ? dynamicReportsService.formatDate(data.period.end_date) : 'Actualidad'}
            </span>
          </div>
        </div>
      )}

      {/* By Method Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cobranzas por Método</h3>
          <div className="space-y-3">
            {data.by_method.map((method: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{dynamicReportsService.getMethodIcon(method.method)}</span>
                  <span className="font-medium text-gray-900 capitalize">{method.method}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {dynamicReportsService.formatCurrency(method.total)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {method.count} transacciones ({method.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución Porcentual</h3>
          <div className="space-y-3">
            {data.by_method.map((method: any, index: number) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 capitalize">{method.method}</span>
                  <span className="text-gray-600">{method.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-blue-600' :
                      index === 1 ? 'bg-green-600' :
                      index === 2 ? 'bg-yellow-600' : 'bg-purple-600'
                    }`}
                    style={{ width: `${method.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {data.monthly_breakdown && data.monthly_breakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cobranzas por Mes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transacciones
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cobrado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promedio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.monthly_breakdown.map((month: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month.month_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {month.count}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {dynamicReportsService.formatCurrency(month.total)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                      {dynamicReportsService.formatCurrency(month.average_per_payment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.total_transactions === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cobranzas registradas</h3>
          <p className="text-gray-600">
            No se encontraron cobranzas en el período seleccionado
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyCollectionsTab;
