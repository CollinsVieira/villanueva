import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Home, 
  RefreshCw,
  Calendar,
  Download,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dynamicReportsService, pdfService } from '../../../services';
import { LoadingSpinner } from '../../UI';

interface FinancialData {
  sales: {
    total_lots_sold: number;
    total_sales_value: number;
    total_initial_payments: number;
  };
  payments: {
    total_payments: number;
    total_amount: number;
  };
  inventory: {
    available_lots: number;
    available_value: number;
    total_available_area: number;
  };
  receivables: {
    customers_with_debt: number;
    total_debt: number;
  };
  kpis: {
    conversion_rate: number;
    average_payment: number;
    collection_efficiency: number;
  };
  period: {
    start_date?: string;
    end_date?: string;
  };
  generated_at: string;
}

const FinancialOverviewTab: React.FC = () => {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await dynamicReportsService.getFinancialOverview({
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setData(result);
    } catch (error) {
      console.error('Error loading financial overview:', error);
      toast.error('Error al cargar el resumen financiero');
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
      
      const reportElement = document.getElementById('financial-overview-content');
      if (reportElement) {
        await pdfService.generateFromElement(
          reportElement, 
          `resumen-financiero-${new Date().toISOString().split('T')[0]}.pdf`
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
    <div className="p-6" id="financial-overview-content">
      {/* Header con filtros y acciones */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Filtros de fecha */}
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

          {/* Acciones */}
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

        {/* Timestamp */}
        <div className="mt-3 text-sm text-gray-500">
          Última actualización: {dynamicReportsService.formatDateTime(data.generated_at)}
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Tasa de Conversión</p>
              <p className="text-3xl font-bold">{data.kpis.conversion_rate}%</p>
              <p className="text-green-100 text-sm">Lotes vendidos vs disponibles</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Pago Promedio</p>
              <p className="text-2xl font-bold">{dynamicReportsService.formatCurrency(data.kpis.average_payment)}</p>
              <p className="text-blue-100 text-sm">Por transacción</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Eficiencia de Cobranza</p>
              <p className="text-3xl font-bold">{data.kpis.collection_efficiency}%</p>
              <p className="text-purple-100 text-sm">Pagos vs deuda total</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Métricas Detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ventas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Ventas</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Lotes Vendidos</span>
              <span className="font-semibold text-gray-900">{data.sales.total_lots_sold}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Valor Total</span>
              <span className="font-semibold text-green-600">
                {dynamicReportsService.formatCurrency(data.sales.total_sales_value)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Enganches Totales</span>
              <span className="font-semibold text-blue-600">
                {dynamicReportsService.formatCurrency(data.sales.total_initial_payments)}
              </span>
            </div>
          </div>
        </div>

        {/* Pagos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Pagos Recibidos</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total de Pagos</span>
              <span className="font-semibold text-gray-900">{data.payments.total_payments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monto Total</span>
              <span className="font-semibold text-green-600">
                {dynamicReportsService.formatCurrency(data.payments.total_amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Promedio por Pago</span>
              <span className="font-semibold text-blue-600">
                {dynamicReportsService.formatCurrency(data.kpis.average_payment)}
              </span>
            </div>
          </div>
        </div>

        {/* Inventario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Inventario</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Lotes Disponibles</span>
              <span className="font-semibold text-gray-900">{data.inventory.available_lots}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Valor del Inventario</span>
              <span className="font-semibold text-orange-600">
                {dynamicReportsService.formatCurrency(data.inventory.available_value)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Área Total</span>
              <span className="font-semibold text-gray-900">
                {data.inventory.total_available_area.toFixed(0)} m²
              </span>
            </div>
          </div>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Cuentas por Cobrar</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Clientes con Deuda</span>
              <span className="font-semibold text-gray-900">{data.receivables.customers_with_debt}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Deuda Total</span>
              <span className="font-semibold text-red-600">
                {dynamicReportsService.formatCurrency(data.receivables.total_debt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Eficiencia de Cobranza</span>
              <span className={`font-semibold ${data.kpis.collection_efficiency >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {data.kpis.collection_efficiency}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Período */}
      {(data.period.start_date || data.period.end_date) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
    </div>
  );
};

export default FinancialOverviewTab;
