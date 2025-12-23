import React, { useState, useEffect } from 'react';
import { CheckSquare, Edit, PlusCircle, Trash2, Search, MapPin, User, DollarSign, Calendar, Square, Check } from 'lucide-react';
import { Lote } from '../../types';
import loteService from '../../services/loteService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';
import LoteForm from './LoteForm';
import LoteDetailModal from './LoteDetailModal';
import ConfirmationModal from '../../utils/ConfirmationModal';
import dynamicReportsService from '../../services/dynamicReportsService';

const LoteManagement: React.FC = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [viewingLoteId, setViewingLoteId] = useState<number | null>(null);
  const [selectedLotes, setSelectedLotes] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState('A');
  const [allBlocks, setAllBlocks] = useState<string[]>([]);

  // Estados para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete' | null>(null);
  const [loteToDelete, setLoteToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar todas las manzanas al inicio
  useEffect(() => {
    const loadAllBlocks = async () => {
      try {
        let page = 1;
        const seen = new Set<string>();
        while (true) {
          const { next, results } = await loteService.getLotesPage({ page, page_size: 5000 });
          results.forEach(lote => {
            if (lote.block) seen.add(lote.block);
          });
          if (!next) break;
          page += 1;
        }
        const blocks = Array.from(seen).sort();
        setAllBlocks(blocks);
      } catch (err) {
        console.error('Error al cargar las manzanas:', err);
      }
    };
    loadAllBlocks();
  }, []);

  // Carga inicial y cuando cambia el filtro de estado o manzana
  useEffect(() => {
    loadLotes(searchTerm);
  }, [filterStatus, selectedBlock]);

  const loadLotes = async (currentSearchTerm: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const baseParams: { status?: string; search?: string; block?: string } = {};
      if (filterStatus) baseParams.status = filterStatus;
      if (currentSearchTerm) baseParams.search = currentSearchTerm;
      if (selectedBlock) baseParams.block = selectedBlock;

      let page = 1;
      const all: Lote[] = [] as any;
      while (true) {
        const { next, results } = await loteService.getLotesPage({ ...baseParams, page, page_size: 5000 });
        all.push(...results);
        if (!next) break;
        page += 1;
      }

      setLotes(all);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los lotes.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- NUEVA FUNCIÓN PARA BÚSQUEDA MANUAL ---
  const handleSearch = () => {
    loadLotes(searchTerm);
  };
  
  // ... (resto de funciones handleNew, handleEdit, etc. sin cambios)
  const handleNew = () => { setSelectedLote(null); setShowForm(true); };
  const handleEdit = (lote: Lote) => { setSelectedLote(lote); setShowForm(true); };
  const handleSave = () => { setShowForm(false); setSelectedLote(null); loadLotes(''); };
  const handleDelete = (id: number) => {
    setLoteToDelete(id);
    setConfirmAction('delete');
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!loteToDelete) return;
    
    setIsDeleting(true);
    try {
      await loteService.deleteLote(loteToDelete);
      loadLotes(searchTerm);
      setShowConfirmModal(false);
      setLoteToDelete(null);
      setConfirmAction(null);
    } catch (err: any) {
      // Verificar si el error es específico sobre tener dueño
      const errorMessage = err.response?.data?.detail || err.message || '';
      if (errorMessage.toLowerCase().includes('dueño') || errorMessage.toLowerCase().includes('owner') || errorMessage.toLowerCase().includes('propietario')) {
        setError('Error al eliminar un lote porque tiene dueño');
      } else {
        setError(err.response?.data?.detail || 'Error al eliminar el lote.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedLotes.size === 0) return;
    
    setConfirmAction('bulkDelete');
    setShowConfirmModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedLotes.size === 0) return;
    
    setIsDeleting(true);
    
    try {
      const deletePromises = Array.from(selectedLotes).map(id => loteService.deleteLote(id));
      await Promise.all(deletePromises);
      setSelectedLotes(new Set());
      setIsSelectionMode(false);
      loadLotes(searchTerm);
      setShowConfirmModal(false);
      setConfirmAction(null);
    } catch (err: any) {
      // Verificar si el error es específico sobre tener dueño
      const errorMessage = err.response?.data?.detail || err.message || '';
      if (errorMessage.toLowerCase().includes('dueño') || errorMessage.toLowerCase().includes('owner') || errorMessage.toLowerCase().includes('propietario')) {
        setError('Error al eliminar lotes porque algunos tienen dueño');
      } else {
        setError(err.response?.data?.detail || 'Error al eliminar los lotes.');
      }
    } finally {
      setIsDeleting(false);
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


  if (isLoading && lotes.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Lotes</h1>
          <p className="text-gray-600 mt-1">
            {isSelectionMode 
              ? `${selectedLotes.size} lote${selectedLotes.size !== 1 ? 's' : ''} seleccionado${selectedLotes.size !== 1 ? 's' : ''}`
              : 'Haga clic en cualquier lote para ver sus detalles.'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isSelectionMode && selectedLotes.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Trash2 size={16} />
              <span>Eliminar ({selectedLotes.size})</span>
            </button>
          )}
          <button 
            onClick={toggleSelectionMode}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
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
          <button onClick={handleNew} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <PlusCircle size={20} />
            <span>Nuevo Lote</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Seleccionar todos (solo en modo selección) */}
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
          
          {/* --- BUSCADOR MANUAL --- */}
          <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por Manzana, N° de Lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3  rounded-lg"
            />
          </div>
          <button onClick={handleSearch} className="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Buscar
        </button>
          
          {/* --- FILTRO POR MANZANA --- */}
          <select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent whitespace-nowrap min-w-[120px]"
          >
            <option value="">Todas las manzanas</option>
            {allBlocks.map(block => (
              <option key={block} value={block}>Manzana {block}</option>
            ))}
          </select>
          
          {/* --- FILTRO POR ESTADO --- */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {lotes.map((lote) => (
          <div 
            key={lote.id} 
            className={`bg-white rounded-xl shadow-lg border transition-all duration-300 transform hover:-translate-y-1 relative ${
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
            {/* Checkbox de selección */}
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

            {/* Header de la card */}
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
              
              {/* Información del lote */}
              <div className="flex items-center text-gray-600 mb-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <span className="text-sm font-medium">{parseFloat(lote.area).toFixed(0)} m²</span>
                </div>
              </div>
            </div>

            {/* Información del propietario */}
            <div className="px-6 pb-4">
              <div className="flex items-center space-x-2 mb-4">
                <User className="text-gray-500" size={16} />
                <span className="text-sm text-gray-600">Propietario:</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 ml-6">
                {lote.current_owner ? lote.current_owner.full_name : 'Sin propietario'}
              </p>
            </div>
                
            {/* Información financiera */}
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

            {/* Footer con acciones */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
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
                        handleDelete(lote.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" 
                      title="Eliminar Lote"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {isSelectionMode && (
                  <div className="text-xs text-gray-500">
                    {selectedLotes.has(lote.id) ? 'Seleccionado' : 'Clic para seleccionar'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lotes.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <CheckSquare size={64} className="mx-auto text-gray-400 mb-6" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No se encontraron lotes</h3>
          <p className="text-gray-600 mb-6">Ajuste los filtros o agregue nuevos lotes para comenzar.</p>
          <button 
            onClick={handleNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto"
          >
            <PlusCircle size={20} />
            <span>Crear Primer Lote</span>
          </button>
        </div>
      )}

      {showForm && <LoteForm lote={selectedLote} onClose={() => setShowForm(false)} onSave={handleSave} />}
      
      {viewingLoteId && (
        <LoteDetailModal
          loteId={viewingLoteId}
          onClose={() => setViewingLoteId(null)}
        />
      )}

      {/* Modal de confirmación */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setLoteToDelete(null);
        }}
        onConfirm={confirmAction === 'delete' ? confirmDelete : confirmBulkDelete}
        title={confirmAction === 'delete' ? 'Eliminar Lote' : 'Eliminar Lotes'}
        message={
          confirmAction === 'delete' 
            ? '¿Está seguro de que desea eliminar este lote? Esta acción no se puede deshacer.'
            : `¿Está seguro de que desea eliminar ${selectedLotes.size} lote${selectedLotes.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`
        }
        type="danger"
        confirmText={confirmAction === 'delete' ? 'Eliminar' : `Eliminar ${selectedLotes.size}`}
        cancelText="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default LoteManagement;