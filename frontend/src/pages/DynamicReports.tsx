import React, { useState } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Home, 
  AlertTriangle, 
  Calendar,
  DollarSign 
} from 'lucide-react';

// Import tab components
import CustomersDebtTab from '../components/Reports/tabs/CustomersDebtTab';
import PaymentsHistoryTab from '../components/Reports/tabs/PaymentsHistoryTab';
import AvailableLotsTab from '../components/Reports/tabs/AvailableLotsTab';
import PendingInstallmentsTab from '../components/Reports/tabs/PendingInstallmentsTab';
import SalesSummaryTab from '../components/Reports/tabs/SalesSummaryTab';
import FinancialOverviewTab from '../components/Reports/tabs/FinancialOverviewTab';
import MonthlyCollectionsTab from '../components/Reports/tabs/MonthlyCollectionsTab';

type TabId = 
  | 'customers-debt' 
  | 'payments-history' 
  | 'available-lots' 
  | 'pending-installments' 
  | 'sales-summary' 
  | 'financial-overview' 
  | 'monthly-collections';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  component: React.ComponentType;
}

const DynamicReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('financial-overview');

  const tabs: Tab[] = [
    {
      id: 'financial-overview',
      label: 'Resumen Financiero',
      icon: TrendingUp,
      description: 'Vista general del estado financiero del negocio',
      component: FinancialOverviewTab
    },
    {
      id: 'customers-debt',
      label: 'Clientes con Deuda',
      icon: AlertTriangle,
      description: 'Clientes con saldos pendientes y vencimientos',
      component: CustomersDebtTab
    },
    {
      id: 'pending-installments',
      label: 'Cuotas Pendientes',
      icon: Calendar,
      description: 'Seguimiento de cuotas por vencer y vencidas',
      component: PendingInstallmentsTab
    },
    {
      id: 'payments-history',
      label: 'Historial de Pagos',
      icon: CreditCard,
      description: 'Registro completo de pagos realizados',
      component: PaymentsHistoryTab
    },
    {
      id: 'available-lots',
      label: 'Lotes Disponibles',
      icon: Home,
      description: 'Inventario de lotes para la venta',
      component: AvailableLotsTab
    },
    {
      id: 'sales-summary',
      label: 'Resumen de Ventas',
      icon: FileText,
      description: 'Métricas de ventas por período',
      component: SalesSummaryTab
    },
    {
      id: 'monthly-collections',
      label: 'Cobranzas Mensuales',
      icon: DollarSign,
      description: 'Análisis temporal de ingresos',
      component: MonthlyCollectionsTab
    }
  ];

  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Reportes en Tiempo Real
              </h1>
              <p className="text-gray-600">
                Analiza los datos actuales de tu negocio inmobiliario
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Description */}
      {activeTabConfig && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="px-6 py-3">
            <p className="text-blue-800 text-sm">
              <span className="font-medium">{activeTabConfig.label}:</span> {activeTabConfig.description}
            </p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default DynamicReports;
