import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, MapPin, Check } from 'lucide-react';
import loteService, { LoteSelectorItem } from '../../services/loteService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import LoadingSpinner from './LoadingSpinner';

interface LoteSelectorProps {
  value: number | null;
  onChange: (loteId: number | null, loteItem: LoteSelectorItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  statusFilter?: string; // Por defecto 'disponible,separado,reservado'
}

const LoteSelector: React.FC<LoteSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleccionar o buscar lote...",
  required = false,
  statusFilter = "disponible,separado,reservado"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lotes, setLotes] = useState<LoteSelectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteSelectorItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar lote seleccionado inicial si existe
  useEffect(() => {
    if (value && value > 0) {
      // Si el lote ya está en la lista cargada, lo seleccionamos directamente
      const found = lotes.find(l => l.id === value);
      if (found) {
        setSelectedLote(found);
      } else {
        loadInitialLote(value);
      }
    } else {
      setSelectedLote(null);
    }
  }, [value, lotes]);

  // Carga inicial o búsqueda con debounce
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      fetchLotes(searchTerm);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadInitialLote = async (loteId: number) => {
    try {
      const lote = await loteService.getLoteById(loteId);
      if (lote) {
        setSelectedLote({
          id: lote.id,
          block: lote.block,
          lot_number: lote.lot_number,
          display_name: lote.display_name || `Mz. ${lote.block} - Lt. ${lote.lot_number}`,
          area: lote.area,
          price: lote.price,
          status: lote.status
        });
      }
    } catch (err) {
      console.error('Error al cargar el lote inicial:', err);
    }
  };

  const fetchLotes = async (searchQuery: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loteService.getLotesSelector({
        status: statusFilter,
        search: searchQuery.trim() || undefined
      });
      setLotes(data);
    } catch (err) {
      console.error('Error al cargar lotes para el selector:', err);
      setError('Error al cargar la lista de lotes');
      setLotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchLotes(searchTerm);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSelectLote = (lote: LoteSelectorItem) => {
    setSelectedLote(lote);
    onChange(lote.id, lote);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLote(null);
    onChange(null, null);
    setSearchTerm('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">Disponible</span>;
      case 'separado':
      case 'reservado':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Separado</span>;
      case 'vendido':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">Vendido</span>;
      case 'liquidado':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">Liquidado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botón trigger del selector */}
      <div
        onClick={handleInputClick}
        className={`w-full px-3 py-2.5 border rounded-lg transition-all cursor-pointer flex items-center justify-between ${
          disabled
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-500'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-sm'
            : required && !selectedLote
            ? 'border-red-300 hover:border-gray-400 bg-white'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
          <MapPin size={18} className={`flex-shrink-0 ${selectedLote ? 'text-blue-600' : 'text-gray-400'}`} />
          {selectedLote ? (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-semibold text-gray-900">
                  Mz. {selectedLote.block}, Lote {selectedLote.lot_number}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({selectedLote.area} m² • {dynamicReportsService.formatCurrency(Number(selectedLote.price))})
                </span>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(selectedLote.status)}
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {selectedLote && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              title="Limpiar selección"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
          />
        </div>
      </div>

      {/* Menú desplegable flotante con buscador integrado */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {/* Barra de búsqueda */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/80 sticky top-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Manzana (ej: A) o Lote (ej: 12)..."
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Lista de resultados */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 scrollbar-thin scrollbar-thumb-gray-200">
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <LoadingSpinner />
                <span className="text-xs">Cargando lotes...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-xs text-red-500">
                {error}
              </div>
            ) : lotes.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <MapPin size={24} className="mx-auto text-gray-300 mb-1.5" />
                <p className="text-xs font-medium text-gray-600">No se encontraron lotes</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {searchTerm ? 'Pruebe con otros términos de búsqueda' : 'No hay lotes disponibles en este momento'}
                </p>
              </div>
            ) : (
              lotes.map((lote) => {
                const isSelected = selectedLote?.id === lote.id;
                return (
                  <div
                    key={lote.id}
                    onClick={() => handleSelectLote(lote)}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            Mz. {lote.block}, Lote {lote.lot_number}
                          </span>
                          {getStatusBadge(lote.status)}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Área: {lote.area} m²</span>
                          <span>•</span>
                          <span className="font-semibold text-gray-700">
                            {dynamicReportsService.formatCurrency(Number(lote.price))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex-shrink-0 text-blue-600 bg-blue-100/60 p-1 rounded-full">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pie informativo */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>
              {lotes.length} {lotes.length === 1 ? 'lote encontrado' : 'lotes encontrados'}
            </span>
            <span className="text-[10px] text-gray-400">Presione Esc para cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoteSelector;
