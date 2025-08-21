import React, { useState, useEffect } from 'react';
import { CheckSquare, Edit, Eye, PlusCircle, Trash2, Search } from 'lucide-react';
import { Lote } from '../../types';
import loteService from '../../services/loteService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';
import LoteForm from './LoteForm';
import LoteDetailModal from './LoteDetailModal';

const LoteManagement: React.FC = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [viewingLoteId, setViewingLoteId] = useState<number | null>(null);

  // Carga inicial y cuando cambia el filtro de estado
  useEffect(() => {
    loadLotes(searchTerm);
  }, [filterStatus]);

  const loadLotes = async (currentSearchTerm: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const params: { status?: string; search?: string } = {};
      if (filterStatus) params.status = filterStatus;
      if (currentSearchTerm) params.search = currentSearchTerm;
      
      const data = await loteService.getLotes(params);
      setLotes(data);
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
  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar este lote?')) {
      try {
        await loteService.deleteLote(id);
        loadLotes(searchTerm);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al eliminar el lote.');
      }
    }
  };
  const getStatusChipClass = (status: string) => {
    switch (status) {
      case 'vendido': return 'bg-red-100 text-red-800 border-red-200';
      case 'reservado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disponible': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  if (isLoading && lotes.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Lotes</h1>
          <p className="text-gray-600 mt-1">Visualice y administre todos los lotes.</p>
        </div>
        <button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <PlusCircle size={20} />
          <span>Nuevo Lote</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center space-x-4">
        {/* --- BUSCADOR MANUAL --- */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por Manzana o N° de Lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // Opcional: buscar con Enter
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <button onClick={handleSearch} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          Buscar
        </button>
        {/* --- FILTRO EXISTENTE --- */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Todos los estados</option>
          <option value="disponible">Disponibles</option>
          <option value="vendido">Vendidos</option>
          <option value="reservado">Reservados</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">Lote</th>
                <th className="p-3 text-left">Propietario</th>
                <th className="p-3 text-left">Precio</th>
                <th className="p-3 text-left">Saldo Restante</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lotes.map((lote) => (
                <tr key={lote.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">Mz. {lote.block} - Lt. {lote.lot_number}</td>
                  <td className="p-3">{lote.owner?.full_name || 'Sin Asignar'}</td>
                  <td className="p-3">${parseFloat(lote.price).toFixed(2)}</td>
                  <td className="p-3 font-semibold">${parseFloat(lote.remaining_balance).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border capitalize ${getStatusChipClass(lote.status)}`}>
                      {lote.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => setViewingLoteId(lote.id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Ver Detalles">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(lote)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar Lote">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(lote.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar Lote">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lotes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <CheckSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg">No se encontraron lotes</h3>
            <p className="text-gray-600">Ajuste los filtros o agregue nuevos lotes.</p>
          </div>
        )}
      </div>

      {showForm && <LoteForm lote={selectedLote} onClose={() => setShowForm(false)} onSave={handleSave} />}
      
      {viewingLoteId && (
        <LoteDetailModal
          loteId={viewingLoteId}
          onClose={() => setViewingLoteId(null)}
        />
      )}
    </div>
  );
};

export default LoteManagement;