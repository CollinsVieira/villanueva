import React from 'react';
import { 
  Calendar, 
  User, 
  Download, 
  Eye, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreHorizontal 
} from 'lucide-react';
import { Report } from '../../types';
import { reportsService } from '../../services';

interface ReportCardProps {
  report: Report;
  onView: (report: Report) => void;
  onGenerate: (reportId: number) => void;
  onDownload: (reportId: number) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onView,
  onGenerate,
  onDownload
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const canGenerate = report.status === 'pending' || report.status === 'failed';
  const canDownload = report.status === 'completed';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {reportsService.getReportTypeIcon(report.report_type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {report.name}
              </h3>
              <p className="text-sm text-gray-600">
                {report.report_type_display}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon(report.status)}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${reportsService.getStatusColor(report.status)}`}>
              {report.status_display}
            </span>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {report.description}
          </p>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {report.start_date && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Desde: {reportsService.formatDate(report.start_date)}</span>
            </div>
          )}
          {report.end_date && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Hasta: {reportsService.formatDate(report.end_date)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{report.requested_by_name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(report)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {canGenerate && (
              <button
                onClick={() => onGenerate(report.id)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Generar reporte"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            
            {canDownload && (
              <button
                onClick={() => onDownload(report.id)}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Descargar reporte"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
