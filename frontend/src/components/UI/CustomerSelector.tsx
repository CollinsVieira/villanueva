import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, User } from 'lucide-react';
import { Customer } from '../../types';
import customerService from '../../services/customerService';
import LoadingSpinner from './LoadingSpinner';

interface CustomerSelectorProps {
  value: number | null;
  onChange: (customerId: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Buscar cliente...",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar cliente seleccionado inicial
  useEffect(() => {
    if (value && value > 0) {
      loadInitialCustomer();
    }
  }, [value]);

  // Buscar cuando cambia el término de búsqueda (con debounce)
  useEffect(() => {
    if (!isOpen) return;
    
    const timeoutId = setTimeout(() => {
      loadCustomers(searchTerm);
    }, 300); // Debounce de 300ms

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

  const loadInitialCustomer = async () => {
    if (!value || value <= 0) return;
    
    try {
      const customer = await customerService.getCustomerById(value);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error('Error loading initial customer:', error);
      setError('Error al cargar el cliente seleccionado');
    }
  };

  const loadCustomers = async (searchQuery: string = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Usar la búsqueda del backend que busca en todos los clientes
      const response = await customerService.getCustomers(searchQuery, 1);
      
      if (Array.isArray(response.results)) {
        setCustomers(response.results);
      } else {
        setError('Formato de datos inválido');
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Error al cargar los clientes');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputClick = () => {
    if (disabled) return;
    
    setIsOpen(true);
    loadCustomers(''); // Cargar sin término de búsqueda inicial
    
    // Enfocar el input de búsqueda después de un pequeño delay
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onChange(customer.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    onChange(null);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Los clientes ya vienen filtrados del backend, no necesitamos filtrar localmente
  const filteredCustomers = customers;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input principal */}
      <div
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${required && !selectedCustomer ? 'border-red-300' : ''}
        `}
        onClick={handleInputClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {selectedCustomer ? (
              <>
                <User size={16} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {selectedCustomer.full_name || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {selectedCustomer.document_number || 'Sin documento'} • {selectedCustomer.email || 'Sin email'}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-gray-500 text-sm">
                {placeholder}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {selectedCustomer && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Barra de búsqueda */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar por nombre, documento o email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="max-h-60 overflow-y-auto">
            {error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                {error}
              </div>
            ) : isLoading ? (
              <div className="p-4 text-center">
                <LoadingSpinner />
                <p className="text-sm text-gray-500 mt-2">Cargando clientes...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className={`
                    p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0
                    ${selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <User size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {customer.full_name || 'Sin nombre'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {customer.document_number || 'Sin documento'} • {customer.email || 'Sin email'}
                      </div>
                      {customer.phone && (
                        <div className="text-xs text-gray-400 truncate">
                          📞 {customer.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer con información */}
          {!isLoading && !error && customers.length > 0 && (
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
              {searchTerm ? (
                `Mostrando ${customers.length} resultados para "${searchTerm}"`
              ) : (
                `Mostrando ${customers.length} clientes`
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;