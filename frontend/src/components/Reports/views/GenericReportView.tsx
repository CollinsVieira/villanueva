import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface GenericReportViewProps {
  data: any;
  reportType: string;
}

const GenericReportView: React.FC<GenericReportViewProps> = ({ data, reportType }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [copiedItems, setCopiedItems] = useState<string[]>([]);

  const toggleExpansion = (key: string) => {
    setExpandedItems(prev =>
      prev.includes(key)
        ? prev.filter(item => item !== key)
        : [...prev, key]
    );
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => [...prev, key]);
      setTimeout(() => {
        setCopiedItems(prev => prev.filter(item => item !== key));
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const renderValue = (value: any, key: string, level: number = 0): React.ReactNode => {
    const indentClass = level > 0 ? `ml-${level * 4}` : '';
    
    if (value === null || value === undefined) {
      return (
        <span className={`text-gray-500 italic ${indentClass}`}>
          null
        </span>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`font-medium ${value ? 'text-green-600' : 'text-red-600'} ${indentClass}`}>
          {value.toString()}
        </span>
      );
    }

    if (typeof value === 'number') {
      return (
        <span className={`font-medium text-blue-600 ${indentClass}`}>
          {value.toLocaleString()}
        </span>
      );
    }

    if (typeof value === 'string') {
      // Check if it's a date string
      const dateRegex = /^\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2}:?\d{0,2}\.?\d{0,3}Z?$/;
      if (dateRegex.test(value)) {
        try {
          const date = new Date(value);
          return (
            <span className={`text-purple-600 ${indentClass}`}>
              {date.toLocaleDateString('es-PE')} {date.toLocaleTimeString('es-PE')}
            </span>
          );
        } catch {
          // If date parsing fails, treat as regular string
        }
      }

      return (
        <div className={`flex items-center space-x-2 ${indentClass}`}>
          <span className="text-gray-900 break-all">"{value}"</span>
          <button
            onClick={() => copyToClipboard(value, `${key}-${level}`)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="Copiar"
          >
            {copiedItems.includes(`${key}-${level}`) ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      );
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedItems.includes(`${key}-${level}`);
      
      return (
        <div className={indentClass}>
          <button
            onClick={() => toggleExpansion(`${key}-${level}`)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 font-medium"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Array ({value.length} elementos)</span>
          </button>
          
          {isExpanded && (
            <div className="mt-2 ml-4 space-y-2">
              {value.map((item, index) => (
                <div key={index} className="border-l-2 border-gray-200 pl-4">
                  <div className="text-sm text-gray-500 mb-1">
                    [{index}]
                  </div>
                  {renderValue(item, `${key}-${index}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expandedItems.includes(`${key}-${level}`);
      const keys = Object.keys(value);
      
      return (
        <div className={indentClass}>
          <button
            onClick={() => toggleExpansion(`${key}-${level}`)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 font-medium"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Objeto ({keys.length} propiedades)</span>
          </button>
          
          {isExpanded && (
            <div className="mt-2 ml-4 space-y-3">
              {keys.map(objKey => (
                <div key={objKey} className="border-l-2 border-gray-200 pl-4">
                  <div className="font-medium text-gray-700 mb-1">
                    {objKey}:
                  </div>
                  {renderValue(value[objKey], `${key}-${objKey}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <span className={`text-gray-600 ${indentClass}`}>
        {String(value)}
      </span>
    );
  };

  const generateSummary = (data: any) => {
    if (typeof data !== 'object' || data === null) return null;

    const stats = {
      totalKeys: 0,
      totalArrays: 0,
      totalObjects: 0,
      totalValues: 0
    };

    const countItems = (obj: any) => {
      if (Array.isArray(obj)) {
        stats.totalArrays++;
        obj.forEach(countItems);
      } else if (typeof obj === 'object' && obj !== null) {
        stats.totalObjects++;
        Object.keys(obj).forEach(key => {
          stats.totalKeys++;
          countItems(obj[key]);
        });
      } else {
        stats.totalValues++;
      }
    };

    countItems(data);

    return stats;
  };

  const stats = generateSummary(data);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {reportType}
            </h2>
            <p className="text-gray-600">
              Vista detallada de los datos del reporte
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalKeys}</div>
              <div className="text-sm text-blue-800">Propiedades</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.totalArrays}</div>
              <div className="text-sm text-green-800">Arrays</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.totalObjects}</div>
              <div className="text-sm text-purple-800">Objetos</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.totalValues}</div>
              <div className="text-sm text-orange-800">Valores</div>
            </div>
          </div>
        )}
      </div>

      {/* Data Viewer */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Datos del Reporte
          </h3>
        </div>
        
        <div className="p-6">
          {typeof data === 'object' && data !== null ? (
            <div className="space-y-4">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="font-semibold text-gray-800 mb-2 text-lg">
                    {key}:
                  </div>
                  <div className="ml-4">
                    {renderValue(value, key)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                No hay datos estructurados para mostrar
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <pre className="text-sm text-gray-800 break-all whitespace-pre-wrap">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON Viewer */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              JSON Completo
            </h3>
            <button
              onClick={() => copyToClipboard(JSON.stringify(data, null, 2), 'full-json')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              {copiedItems.includes('full-json') ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericReportView;
