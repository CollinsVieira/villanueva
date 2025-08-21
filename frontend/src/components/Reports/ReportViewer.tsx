import React from 'react';
import { X, Download, FileText, Calendar, User } from 'lucide-react';
import { Report, CustomerDebtData, PaymentHistoryData, AvailableLotsData } from '../../types';
import { reportsService, pdfService } from '../../services';
import CustomerDebtView from './views/CustomerDebtView';
import PaymentHistoryView from './views/PaymentHistoryView';
import AvailableLotsView from './views/AvailableLotsView';
import GenericReportView from './views/GenericReportView';

interface ReportViewerProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  isOpen,
  onClose
}) => {
  const handleDownloadPDF = () => {
    try {
      pdfService.generateReportPDF(report);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // Aquí podrías mostrar un toast de error
    }
  };

  const renderReportContent = () => {
    if (report.status !== 'completed' || !report.data) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium mb-2">Reporte no disponible</h3>
          <p className="text-sm text-center">
            {report.status === 'pending' && 'El reporte aún no ha sido generado.'}
            {report.status === 'processing' && 'El reporte se está generando...'}
            {report.status === 'failed' && 'Hubo un error al generar el reporte.'}
          </p>
        </div>
      );
    }

    switch (report.report_type) {
      case 'customers_debt':
        return <CustomerDebtView data={report.data as CustomerDebtData} />;
      case 'payments_history':
        return <PaymentHistoryView data={report.data as PaymentHistoryData} />;
      case 'available_lots':
        return <AvailableLotsView data={report.data as AvailableLotsData} />;
      default:
        return <GenericReportView data={report.data} reportType={report.report_type_display} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">
              {reportsService.getReportTypeIcon(report.report_type)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {report.name}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <FileText className="w-4 h-4" />
                  <span>{report.report_type_display}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{report.requested_by_name}</span>
                </span>
                {report.generated_at && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Generado: {reportsService.formatDate(report.generated_at)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {report.status === 'completed' && (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" id="report-content">
          {renderReportContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${reportsService.getStatusColor(report.status)}`}>
                {report.status_display}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {report.start_date && (
                <span>Desde: {reportsService.formatDate(report.start_date)}</span>
              )}
              {report.end_date && (
                <span>Hasta: {reportsService.formatDate(report.end_date)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
