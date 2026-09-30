import React, { useState } from "react";
import { Venta } from "../../services/salesService";
import { useUpdateSale } from "../../hooks/useSalesQueries";
import { getProxyImageUrl } from "../../utils/imageUtils";
import {
  FileText,
  Eye,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FilePlus,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface ContractDocumentsManagementProps {
  sale: Venta;
  onDocumentUpdated?: () => void;
}

type DocumentType = "contract_pdf" | "adenda_pdf" | "escritura_pdf";

interface DocumentConfig {
  key: DocumentType;
  title: string;
  description: string;
  badgeLabel: string;
  currentUrl?: string;
  downloadPrefix: string;
}

const ContractDocumentsManagement: React.FC<ContractDocumentsManagementProps> = ({
  sale,
  onDocumentUpdated,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateSaleMutation = useUpdateSale();

  const documents: DocumentConfig[] = [
    {
      key: "contract_pdf",
      title: "Contrato Principal",
      description: "Documento oficial del contrato de compraventa firmado.",
      badgeLabel: "Contrato",
      currentUrl: sale.contract_pdf,
      downloadPrefix: "contrato",
    },
    {
      key: "adenda_pdf",
      title: "Adenda del Contrato",
      description: "Modificaciones, prórrogas o acuerdos anexos al contrato principal.",
      badgeLabel: "Adenda",
      currentUrl: sale.adenda_pdf,
      downloadPrefix: "adenda",
    },
    {
      key: "escritura_pdf",
      title: "Escritura Pública",
      description: "Testimonio notarial o documento de escritura pública del inmueble.",
      badgeLabel: "Escritura",
      currentUrl: sale.escritura_pdf,
      downloadPrefix: "escritura",
    },
  ];

  const handleOpenUploadModal = (docType: DocumentType) => {
    setSelectedDoc(docType);
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("El archivo debe ser un documento PDF.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("El tamaño del archivo no puede exceder los 10MB.");
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !selectedFile) {
      setUploadError("Por favor seleccione un archivo PDF.");
      return;
    }

    const payload: Record<string, File> = {
      [selectedDoc]: selectedFile,
    };

    updateSaleMutation.mutate(
      {
        id: sale.id,
        data: payload as any,
      },
      {
        onSuccess: () => {
          toast.success("Documento actualizado exitosamente");
          handleCloseModal();
          onDocumentUpdated?.();
        },
        onError: (err: any) => {
          const errorMsg =
            err.response?.data?.[selectedDoc]?.[0] ||
            err.response?.data?.detail ||
            "Error al subir el documento";
          setUploadError(errorMsg);
          toast.error(errorMsg);
        },
      }
    );
  };

  const getDocName = (key: DocumentType) => {
    switch (key) {
      case "contract_pdf":
        return "Contrato Principal";
      case "adenda_pdf":
        return "Adenda";
      case "escritura_pdf":
        return "Escritura Pública";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Gestión Documental del Contrato - Venta #{sale.id}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Administración de documentos asociados a Mz. {sale.lote_info?.block} - Lt.{" "}
              {sale.lote_info?.lot_number} ({sale.customer_info?.full_name})
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {documents.map((doc) => {
              const isAvailable = Boolean(doc.currentUrl);
              const fileUrl = doc.currentUrl
                ? getProxyImageUrl(doc.currentUrl) || doc.currentUrl
                : null;

              return (
                <div
                  key={doc.key}
                  className={`border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 ${
                    isAvailable
                      ? "border-green-200 bg-green-50/20 shadow-sm hover:shadow-md"
                      : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              isAvailable
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                Disponible
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                                No adjuntado
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{doc.description}</p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    {isAvailable && fileUrl && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(fileUrl, "_blank")}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          title="Ver en nueva pestaña"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = fileUrl;
                            link.download = `${doc.downloadPrefix}_venta_${sale.id}.pdf`;
                            link.click();
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                          title="Descargar archivo"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal(doc.key)}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                        isAvailable
                          ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <Upload className="h-4 w-4" />
                          Reemplazar Documento
                        </>
                      ) : (
                        <>
                          <FilePlus className="h-4 w-4" />
                          Subir Documento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de carga/actualización de documento */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Subir / Modificar {getDocName(selectedDoc)}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Venta #{sale.id} • Mz. {sale.lote_info?.block} Lt. {sale.lote_info?.lot_number}
            </p>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar archivo PDF *
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                {selectedFile && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    ✓ Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Formatos permitidos: PDF. Tamaño máximo: 10MB.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={updateSaleMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || updateSaleMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateSaleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Guardar Documento
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDocumentsManagement;
