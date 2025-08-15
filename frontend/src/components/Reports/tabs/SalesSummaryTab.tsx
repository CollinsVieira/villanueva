import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dynamicReportsService, pdfService } from '../../../services';
import { LoadingSpinner } from '../../UI';

const SalesSummaryTab: React.FC = () => {
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
      const result = await dynamicReportsService.getSalesSummary({
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setData(result);
    } catch (error) {
      console.error('Error loading sales summary:', error);
      toast.error('Error al cargar resumen de ventas');
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

  const handleDownloadPDF = async () => {
    if (!data) return;
    
    try {
      toast.loading('Generando PDF...', { id: 'pdf-generation' });
      
      const reportElement = document.getElementById('sales-summary-content');
      if (reportElement) {
        await pdfService.generateFromElement(
          reportElement, 
          `resumen-ventas-${new Date().toISOString().split('T')[0]}.pdf`
        );
        toast.success('PDF generado exitosamente', { id: 'pdf-generation' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF', { id: 'pdf-generation' });
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
    <div className="p-6" id="sales-summary-content">
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
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Última actualización: {dynamicReportsService.formatDateTime(data.generated_at)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Lotes Vendidos</p>
              <p className="text-3xl font-bold">{data.total_lots_sold}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Área Vendida</p>
              <p className="text-2xl font-bold">{data.total_area_sold.toFixed(0)} m²</p>
            </div>
            <span className="text-3xl">📐</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Valor Total</p>
              <p className="text-xl font-bold">{dynamicReportsService.formatCurrency(data.total_sales_value)}</p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Precio Promedio</p>
              <p className="text-xl font-bold">{dynamicReportsService.formatCurrency(data.average_lot_price)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-200" />
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

      {/* Monthly Breakdown */}
      {data.monthly_breakdown && data.monthly_breakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Mes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lotes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enganches
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Promedio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.monthly_breakdown.map((month: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month.month}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {month.count}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {dynamicReportsService.formatCurrency(month.total_value)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {month.total_area.toFixed(0)} m²
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                      {dynamicReportsService.formatCurrency(month.total_initial_payments)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600">
                      {dynamicReportsService.formatCurrency(month.avg_price_per_lot)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.total_lots_sold === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ventas registradas</h3>
          <p className="text-gray-600">
            No se encontraron ventas en el período seleccionado
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesSummaryTab;
