import React from 'react';
import { FileText, Plus, Filter } from 'lucide-react';

interface ReportsHeaderProps {
  onCreateReport: () => void;
  onFilterChange: (filters: { type?: string; status?: string }) => void;
  reportTypes: Array<{ value: string; label: string }>;
  currentFilters: { type?: string; status?: string };
}

const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  onCreateReport,
  onFilterChange,
  reportTypes,
  currentFilters
}) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Reportes
              </h1>
              <p className="text-gray-600">
                Genera y gestiona reportes de tu negocio inmobiliario
              </p>
            </div>
          </div>
          
          <button
            onClick={onCreateReport}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Reporte</span>
          </button>
        </div>
        
        {/* Filtros */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          
          <select
            value={currentFilters.type || ''}
            onChange={(e) => onFilterChange({ ...currentFilters, type: e.target.value || undefined })}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            {reportTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          
          <select
            value={currentFilters.status || ''}
            onChange={(e) => onFilterChange({ ...currentFilters, status: e.target.value || undefined })}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">Procesando</option>
            <option value="completed">Completado</option>
            <option value="failed">Fallido</option>
          </select>
          
          {(currentFilters.type || currentFilters.status) && (
            <button
              onClick={() => onFilterChange({})}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsHeader;
