import React, { useState } from 'react';
import { 
  CheckSquare, Edit, PlusCircle, Trash2, Search, MapPin, 
  User, DollarSign, Calendar, Square, Check, RotateCcw, 
  Archive, ShieldAlert 
} from 'lucide-react';
import { Lote } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';
import LoteForm from './LoteForm';
import LoteDetailModal from './LoteDetailModal';
import ConfirmationModal from '../../utils/ConfirmationModal';
import dynamicReportsService from '../../services/dynamicReportsService';
import { useLotesUnlimited, useDeletedLotes, useDeleteLote, useRestoreLote } from '../../hooks/useLotesQueries';

const LoteManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filtros para lotes activos
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('A');

  // Filtros para lotes eliminados
  const [deletedSearchTerm, setDeletedSearchTerm] = useState('');
  const [deletedSearchQuery, setDeletedSearchQuery] = useState('');
  const [deletedSelectedBlock, setDeletedSelectedBlock] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [viewingLoteId, setViewingLoteId] = useState<number | null>(null);
  const [selectedLotes, setSelectedLotes] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Estados para el modal de confirmación y motivo de eliminación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete' | 'restore' | null>(null);
  const [loteToDelete, setLoteToDelete] = useState<number | null>(null);
  const [loteToRestore, setLoteToRestore] = useState<Lote | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Construir parámetros de búsqueda para activos
  const queryParams = {
    ...(filterStatus && { status: filterStatus }),
    ...(searchQuery.trim() && { search: searchQuery.trim() }),
    ...(selectedBlock && { block: selectedBlock }),
  };

  // Construir parámetros de búsqueda para eliminados
  const deletedQueryParams = {
    ...(deletedSearchQuery.trim() && { search: deletedSearchQuery.trim() }),
    ...(deletedSelectedBlock && { block: deletedSelectedBlock }),
  };

  // Usar React Query para obtener lotes activos
  const { data: lotes = [], isLoading: isLoadingActive, refetch: refetchActive } = useLotesUnlimited(queryParams);
  
  // Usar React Query para obtener lotes eliminados
  const { data: deletedLotes = [], isLoading: isLoadingDeleted, refetch: refetchDeleted } = useDeletedLotes(deletedQueryParams);

  // Obtener todas las manzanas únicas de los lotes activos y eliminados
  const allBlocks = Array.from(new Set(lotes.map(lote => lote.block).filter(Boolean))).sort();
  const allDeletedBlocks = Array.from(new Set(deletedLotes.map(lote => lote.block).filter(Boolean))).sort();

  // Mutations
  const deleteLoteMutation = useDeleteLote();
  const restoreLoteMutation = useRestoreLote();
  
  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  const handleDeletedSearch = () => {
    setDeletedSearchQuery(deletedSearchTerm);
  };
  
  const handleNew = () => { setSelectedLote(null); setShowForm(true); };
  const handleEdit = (lote: Lote) => { setSelectedLote(lote); setShowForm(true); };
  const handleSave = () => { 
    setShowForm(false); 
    setSelectedLote(null); 
    refetchActive(); 
    refetchDeleted();
  };

  const handleDeleteClick = (id: number) => {
    setLoteToDelete(id);
    setDeletionReason('');
    setConfirmAction('delete');
    setShowConfirmModal(true);
  };

  const handleRestoreClick = (lote: Lote) => {
    setLoteToRestore(lote);
    setConfirmAction('restore');
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!loteToDelete) return;
    
    deleteLoteMutation.mutate(
      { id: loteToDelete, reason: deletionReason.trim() },
      {
        onSuccess: () => {
          setShowConfirmModal(false);
          setLoteToDelete(null);
          setConfirmAction(null);
          setDeletionReason('');
          refetchActive();
          refetchDeleted();
        },
        onError: (err: any) => {
          setError(err.response?.data?.detail || 'Error al retirar el lote del inventario.');
        }
      }
    );
  };

  const confirmRestore = async () => {
    if (!loteToRestore) return;
    
    restoreLoteMutation.mutate(loteToRestore.id, {
      onSuccess: () => {
        setShowConfirmModal(false);
        setLoteToRestore(null);
        setConfirmAction(null);
        refetchActive();
        refetchDeleted();
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Error al restaurar el lote.');
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedLotes.size === 0) return;
    setDeletionReason('');
    setConfirmAction('bulkDelete');
    setShowConfirmModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedLotes.size === 0) return;
    
    try {
      for (const id of Array.from(selectedLotes)) {
        await new Promise((resolve, reject) => {
          deleteLoteMutation.mutate(
            { id, reason: deletionReason.trim() },
            { onSuccess: resolve, onError: reject }
          );
        });
      }
      
      setSelectedLotes(new Set());
      setIsSelectionMode(false);
      setShowConfirmModal(false);
      setConfirmAction(null);
      setDeletionReason('');
      refetchActive();
      refetchDeleted();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al retirar los lotes seleccionados.');
    }
  };

  const handleSelectLote = (loteId: number) => {
    setSelectedLotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loteId)) {
        newSet.delete(loteId);
      } else {
        newSet.add(loteId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedLotes.size === lotes.length) {
      setSelectedLotes(new Set());
    } else {
      setSelectedLotes(new Set(lotes.map(lote => lote.id)));
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedLotes(new Set());
  };

  const getStatusChipClass = (status: string) => {
    switch (status) {
      case 'vendido': return 'bg-red-100 text-red-800 border-red-200';
      case 'reservado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disponible': return 'bg-green-100 text-green-800 border-green-200';
      case 'liquidado': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isLoading = activeTab === 'active' ? isLoadingActive : isLoadingDeleted;
  const currentLotesList = activeTab === 'active' ? lotes : deletedLotes;

  if (isLoading && currentLotesList.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Lotes</h1>
          <p className="text-gray-600 mt-1">
            {activeTab === 'active' ? (
              isSelectionMode 
                ? `${selectedLotes.size} lote${selectedLotes.size !== 1 ? 's' : ''} seleccionado${selectedLotes.size !== 1 ? 's' : ''}`
                : 'Inventario activo de lotes y terrenos.'
            ) : (
              'Historial de lotes retirados/inactivados con preservación de información histórica.'
            )}
          </p>
        </div>

        {/* Acciones principales */}
        {activeTab === 'active' ? (
          <div className="flex items-center space-x-3">
            {isSelectionMode && selectedLotes.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
              >
                <Trash2 size={16} />
                <span>Retirar ({selectedLotes.size})</span>
              </button>
            )}
            <button 
              onClick={toggleSelectionMode}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm ${
                isSelectionMode 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSelectionMode ? (
                <>
                  <Square size={16} />
                  <span>Cancelar</span>
                </>
              ) : (
                <>
                  <CheckSquare size={16} />
                  <span>Seleccionar</span>
                </>
              )}
            </button>
            <button onClick={handleNew} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-colors">
              <PlusCircle size={20} />
              <span>Nuevo Lote</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
            <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
            <span>Los lotes retirados conservan sus clientes, ventas, pagos y reportes intactos.</span>
          </div>
        )}
      </div>

      {/* Tabs Selector: Activos vs Retirados/Historial */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('active');
              setIsSelectionMode(false);
              setSelectedLotes(new Set());
            }}
            className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'active'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapPin size={18} />
            <span>Lotes Activos</span>
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold ${
              activeTab === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {lotes.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('deleted');
              setIsSelectionMode(false);
              setSelectedLotes(new Set());
            }}
            className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'deleted'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Archive size={18} />
            <span>Lotes Retirados (Histórico)</span>
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold ${
              activeTab === 'deleted' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {deletedLotes.length}
            </span>
          </button>
        </nav>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

      {/* Barra de Filtros para Lotes Activos */}
      {activeTab === 'active' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {isSelectionMode && (
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                {selectedLotes.size === lotes.length ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                <span>
                  {selectedLotes.size === lotes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </span>
              </button>
            )}
            
            {/* Buscador */}
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por Manzana, N° de Lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button onClick={handleSearch} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-lg font-medium transition-colors">
              Buscar
            </button>
            
            {/* Filtro por Manzana */}
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent whitespace-nowrap min-w-[140px]"
            >
              <option value="">Todas las manzanas</option>
              {allBlocks.map(block => (
                <option key={block} value={block}>Manzana {block}</option>
              ))}
            </select>
            
            {/* Filtro por Estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent whitespace-nowrap"
            >
              <option value="">Todos los estados</option>
              <option value="disponible">Disponibles</option>
              <option value="vendido">Vendidos</option>
              <option value="reservado">Reservados</option>
              <option value="liquidado">Liquidados</option>
            </select>
          </div>
        </div>
      )}

      {/* Barra de Filtros para Lotes Retirados */}
      {activeTab === 'deleted' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar lotes retirados por Manzana, N° de Lote..."
                value={deletedSearchTerm}
                onChange={(e) => setDeletedSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeletedSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button onClick={handleDeletedSearch} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-lg font-medium transition-colors">
              Buscar
            </button>
            
            <select
              value={deletedSelectedBlock}
              onChange={(e) => setDeletedSelectedBlock(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent whitespace-nowrap min-w-[140px]"
            >
              <option value="">Todas las manzanas</option>
              {allDeletedBlocks.map(block => (
                <option key={block} value={block}>Manzana {block}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grid de Lotes Activos */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {lotes.map((lote) => (
            <div 
              key={lote.id} 
              className={`bg-white rounded-xl shadow-md border transition-all duration-300 transform hover:-translate-y-1 relative ${
                isSelectionMode 
                  ? 'cursor-pointer hover:shadow-xl' 
                  : 'cursor-pointer hover:shadow-xl'
              } ${
                selectedLotes.has(lote.id) 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200'
              }`}
              onClick={() => {
                if (isSelectionMode) {
                  handleSelectLote(lote.id);
                } else {
                  setViewingLoteId(lote.id);
                }
              }}
            >
              {isSelectionMode && (
                <div className="absolute top-4 right-4 z-10">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    selectedLotes.has(lote.id)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}>
                    {selectedLotes.has(lote.id) && <Check size={14} />}
                  </div>
                </div>
              )}

              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="text-blue-600" size={20} />
                    <h3 className="text-xl font-bold text-gray-900">
                      Mz. {lote.block} - Lt. {lote.lot_number}
                    </h3>
                  </div>
                  {!isSelectionMode && (
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border capitalize ${getStatusChipClass(lote.status)}`}>
                      {lote.status}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center text-gray-600 mb-4">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <span className="text-sm font-medium">{parseFloat(lote.area).toFixed(0)} m²</span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-gray-500" size={16} />
                  <span className="text-sm text-gray-600">Propietario / Cliente:</span>
                </div>
                <p className="text-base font-semibold text-gray-900 ml-6 truncate">
                  {lote.current_owner ? lote.current_owner.full_name : 'Sin propietario'}
                </p>
              </div>
                  
              <div className="px-6 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="text-green-600" size={16} />
                    <span className="text-sm text-gray-600">Precio:</span>
                  </div>
                  <span className="font-bold text-lg text-gray-900">
                    {dynamicReportsService.formatCurrency(parseFloat(lote.price))}
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>
                      {new Date(lote.created_at).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                  {!isSelectionMode && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(lote);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" 
                        title="Editar Lote"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(lote.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" 
                        title="Retirar Lote del Inventario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                  {isSelectionMode && (
                    <div className="text-xs text-gray-500 font-medium">
                      {selectedLotes.has(lote.id) ? 'Seleccionado' : 'Clic para seleccionar'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid de Lotes Retirados (Papelera / Histórico) */}
      {activeTab === 'deleted' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {deletedLotes.map((lote) => (
            <div 
              key={lote.id} 
              className="bg-gray-50/80 rounded-xl shadow-md border-2 border-red-200 hover:border-red-400 transition-all duration-300 transform hover:-translate-y-1 relative cursor-pointer"
              onClick={() => setViewingLoteId(lote.id)}
            >
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="text-red-500" size={20} />
                    <h3 className="text-xl font-bold text-gray-800 line-through">
                      Mz. {lote.block} - Lt. {lote.lot_number}
                    </h3>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">
                    Retirado
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600 mb-3">
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium">{parseFloat(lote.area).toFixed(0)} m²</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-600 capitalize">Estado orig: {lote.status}</span>
                  </div>
                </div>

                {/* Motivo de retiro */}
                {lote.deletion_reason && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-900 mb-3">
                    <span className="font-semibold block mb-0.5">Motivo de retiro:</span>
                    <p className="italic">{lote.deletion_reason}</p>
                  </div>
                )}

                {/* Fecha y usuario de retiro */}
                <div className="text-xs text-gray-500 space-y-1 bg-white p-3 rounded-lg border border-gray-200 mb-3">
                  {lote.deleted_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Fecha de retiro:</span>
                      <span className="font-medium text-gray-700">
                        {new Date(lote.deleted_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                  {lote.deleted_by_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Retirado por:</span>
                      <span className="font-medium text-gray-700 truncate max-w-[140px]">{lote.deleted_by_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico del propietario */}
              <div className="px-6 pb-4">
                <div className="flex items-center space-x-2 mb-1">
                  <User className="text-gray-500" size={16} />
                  <span className="text-xs text-gray-500">Historial Cliente:</span>
                </div>
                <p className="text-sm font-semibold text-gray-700 ml-6 truncate">
                  {lote.current_owner ? lote.current_owner.full_name : 'Sin cliente asociado'}
                </p>
              </div>

              {/* Footer con botón de Restaurar */}
              <div className="px-6 py-4 bg-red-50/50 rounded-b-xl border-t border-red-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  ID: #{lote.id}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestoreClick(lote);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1.5 text-sm font-medium shadow-sm transition-colors"
                  title="Restaurar al inventario activo"
                >
                  <RotateCcw size={15} />
                  <span>Restaurar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {currentLotesList.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          {activeTab === 'active' ? (
            <>
              <CheckSquare size={64} className="mx-auto text-gray-400 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No se encontraron lotes activos</h3>
              <p className="text-gray-600 mb-6">Ajuste los filtros o agregue nuevos lotes para comenzar.</p>
              <button 
                onClick={handleNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto shadow-sm"
              >
                <PlusCircle size={20} />
                <span>Crear Primer Lote</span>
              </button>
            </>
          ) : (
            <>
              <Archive size={64} className="mx-auto text-gray-400 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No hay lotes retirados</h3>
              <p className="text-gray-600">No hay lotes en el histórico de eliminados.</p>
            </>
          )}
        </div>
      )}

      {showForm && <LoteForm lote={selectedLote} onClose={() => setShowForm(false)} onSave={handleSave} />}
      
      {viewingLoteId && (
        <LoteDetailModal
          loteId={viewingLoteId}
          onClose={() => setViewingLoteId(null)}
        />
      )}

      {/* Modal de confirmación para Retirar / Eliminar Lote */}
      {(confirmAction === 'delete' || confirmAction === 'bulkDelete') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {confirmAction === 'delete' ? 'Retirar Lote del Inventario' : `Retirar ${selectedLotes.size} Lotes del Inventario`}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Esta acción retirará el lote del inventario activo. Toda la información histórica (clientes, contratos, pagos, cronogramas y reportes) se conservará intacta y podrá ser consultada en cualquier momento o restaurada posteriormente.
              </p>

              {/* Campo opcional de motivo */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Motivo de retiro (opcional):
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Ej: Retiro temporal, corrección de planos, ajuste comercial..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                    setLoteToDelete(null);
                    setDeletionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAction === 'delete' ? confirmDelete : confirmBulkDelete}
                  disabled={deleteLoteMutation.isPending}
                  className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-2"
                >
                  {deleteLoteMutation.isPending && <LoadingSpinner size="sm" />}
                  <span>{confirmAction === 'delete' ? 'Confirmar Retiro' : `Retirar ${selectedLotes.size} Lotes`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para Restaurar Lote */}
      {confirmAction === 'restore' && loteToRestore && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
            setLoteToRestore(null);
          }}
          onConfirm={confirmRestore}
          title="Restaurar Lote al Inventario Activo"
          message={`¿Está seguro de que desea restaurar el lote ${loteToRestore.display_name} al inventario activo? Volverá a estar visible y disponible en las listas de lotes activos.`}
          type="info"
          confirmText="Restaurar Lote"
          cancelText="Cancelar"
          isLoading={restoreLoteMutation.isPending}
        />
      )}
    </div>
  );
};

export default LoteManagement;