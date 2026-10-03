import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Building2, User, Check, AlertCircle } from 'lucide-react';
import { salesService } from '../../services';
import { VentaSelectorItem } from '../../services/salesService';
import { dynamicReportsService } from '../../services/dynamicReportsService';
import LoadingSpinner from './LoadingSpinner';

interface VentaPaymentSelectorProps {
  value: number | null; // Venta ID
  onChange: (venta: VentaSelectorItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

const VentaPaymentSelector: React.FC<VentaPaymentSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Buscar por lote (Mz/Lt), cliente o DNI...",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ventas, setVentas] = useState<VentaSelectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<VentaSelectorItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar ventas al abrir o cuando se monte
  useEffect(() => {
    fetchVentas();
  }, []);

  // Seleccionar la venta si se pasa value
  useEffect(() => {
    if (value && value > 0) {
      const found = ventas.find(v => v.id === value);
      if (found) {
        setSelectedVenta(found);
      }
    } else {
      setSelectedVenta(null);
    }
  }, [value, ventas]);

  // Búsqueda con debounce cuando el dropdown está abierto
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      fetchVentas(searchTerm);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVentas = async (searchQuery: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesService.getVentasSelector({
        status: 'active,separado',
        search: searchQuery.trim() || undefined
      });
      setVentas(data);
    } catch (err) {
      console.error('Error al cargar ventas para pagos:', err);
      setError('Error al cargar lista de ventas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (venta: VentaSelectorItem) => {
    setSelectedVenta(venta);
    onChange(venta);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVenta(null);
    onChange(null);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botón Principal Selector */}
      <div
        onClick={toggleDropdown}
        className={`w-full min-h-[50px] px-3.5 py-2.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 shadow-xs ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
        } ${required && !selectedVenta ? 'border-l-4 border-l-blue-500' : ''}`}
      >
        {selectedVenta ? (
          <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                {selectedVenta.lote_block}-{selectedVenta.lote_number}
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm truncate">
                    {selectedVenta.lote_display}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      selectedVenta.status === 'separado'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {selectedVenta.status === 'separado' ? '🟡 Lote Separado' : '🟢 Lote Vendido'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 truncate flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium text-gray-700">{selectedVenta.customer_name}</span>
                  {selectedVenta.customer_doc && (
                    <span className="text-gray-400">({selectedVenta.customer_doc})</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 transition-colors"
                  title="Limpiar selección"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-gray-400">
            <span className="text-sm font-normal">{placeholder}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </div>
        )}
      </div>

      {/* Menú Desplegable con Búsqueda */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header con Buscador */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/80">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por Mz, Lote, Cliente o DNI..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-500">
                <LoadingSpinner size="sm" />
                <span className="text-xs">Buscando ventas y lotes...</span>
              </div>
            ) : error ? (
              <div className="py-6 px-4 text-center text-xs text-red-500 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : ventas.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Building2 className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                <p className="text-sm font-medium text-gray-600">No se encontraron lotes activos o separados</p>
                <p className="text-xs text-gray-400 mt-0.5">Intenta con otro término de búsqueda</p>
              </div>
            ) : (
              ventas.map((venta) => {
                const isSelected = selectedVenta?.id === venta.id;
                return (
                  <div
                    key={venta.id}
                    onClick={() => handleSelect(venta)}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 hover:bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                          venta.status === 'separado'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {venta.lote_block}-{venta.lote_number}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">
                            {venta.lote_display}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              venta.status === 'separado'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {venta.status === 'separado' ? 'Separado' : 'Vendido'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5 truncate">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800">{venta.customer_name}</span>
                          {venta.customer_doc && (
                            <span className="text-gray-400">· {venta.customer_doc}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="text-xs">
                        {venta.status === 'separado' ? (
                          <>
                            <span className="text-gray-400 block text-[10px]">Saldo Inicial</span>
                            <span className="font-semibold text-amber-600">
                              {dynamicReportsService.formatCurrency(venta.initial_balance)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400 block text-[10px]">Precio</span>
                            <span className="font-semibold text-gray-700">
                              {dynamicReportsService.formatCurrency(parseFloat(venta.sale_price || '0'))}
                            </span>
                          </>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VentaPaymentSelector;
