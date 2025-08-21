import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Report, 
  ReportCreateData, 
  ReportTypeChoice, 
  ReportSummary 
} from '../types';
import { reportsService } from '../services';
import ReportsHeader from '../components/Reports/ReportsHeader';
import ReportCard from '../components/Reports/ReportCard';
import CreateReportModal from '../components/Reports/CreateReportModal';
import ReportViewer from '../components/Reports/ReportViewer';
import { LoadingSpinner } from '../components/UI';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportTypeChoice[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filters, setFilters] = useState<{ type?: string; status?: string }>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadReports();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [reportsData, typesData, summaryData] = await Promise.all([
        reportsService.getReports(),
        reportsService.getReportTypes(),
        reportsService.getReportSummary()
      ]);
      
      setReports(reportsData);
      setReportTypes(typesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const reportsData = await reportsService.getReports(filters);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error al cargar los reportes');
    }
  };

  const handleCreateReport = async (data: ReportCreateData) => {
    try {
      const newReport = await reportsService.createReport(data);
      setReports(prev => [newReport, ...prev]);
      toast.success('Reporte creado exitosamente');
      
      // Update summary
      const summaryData = await reportsService.getReportSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Error al crear el reporte');
      throw error;
    }
  };

  const handleGenerateReport = async (reportId: number) => {
    try {
      toast.loading('Generando reporte...', { id: 'generating' });
      
      await reportsService.generateReport(reportId);
      
      // Reload reports to get updated status
      await loadReports();
      
      // Update summary
      const summaryData = await reportsService.getReportSummary();
      setSummary(summaryData);
      
      toast.success('Reporte generado exitosamente', { id: 'generating' });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte', { id: 'generating' });
    }
  };

  const handleDownloadReport = async (reportId: number) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) {
        toast.error('Reporte no encontrado');
        return;
      }

      if (report.status !== 'completed') {
        toast.error('El reporte debe estar completado para descargarlo');
        return;
      }

      toast.loading('Preparando descarga...', { id: 'downloading' });

      // Use our PDF service to generate PDF
      const { pdfService } = await import('../services');
      pdfService.generateReportPDF(report);
      
      toast.success('Descarga iniciada', { id: 'downloading' });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error al descargar el reporte', { id: 'downloading' });
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const handleFilterChange = (newFilters: { type?: string; status?: string }) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ReportsHeader
        onCreateReport={() => setIsCreateModalOpen(true)}
        onFilterChange={handleFilterChange}
        reportTypes={reportTypes}
        currentFilters={filters}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reportes</p>
                  <p className="text-3xl font-bold text-gray-900">{summary.total_reports}</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completados</p>
                  <p className="text-3xl font-bold text-green-600">{summary.completed_reports}</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">{summary.pending_reports}</p>
                </div>
                <div className="text-3xl">⏳</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fallidos</p>
                  <p className="text-3xl font-bold text-red-600">{summary.failed_reports}</p>
                </div>
                <div className="text-3xl">❌</div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Grid */}
        {reports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onView={handleViewReport}
                onGenerate={handleGenerateReport}
                onDownload={handleDownloadReport}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay reportes disponibles
            </h3>
            <p className="text-gray-600 mb-6">
              {filters.type || filters.status 
                ? 'No se encontraron reportes con los filtros aplicados' 
                : 'Comienza creando tu primer reporte para analizar los datos de tu negocio'}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Crear Primer Reporte
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateReport}
      />

      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

export default Reports;
