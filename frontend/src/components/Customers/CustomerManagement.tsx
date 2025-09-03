import React, { useState, useEffect } from 'react';
import { Users, Edit, Trash2, PlusCircle, Search } from 'lucide-react';
import { Customer } from '../../types';
import customerService from '../../services/customerService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';
import CustomerForm from './CustomerForm';
import CustomerDetailModal from './CustomerDetailModal';

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadCustomers(searchTerm);
  }, []);

  const loadCustomers = async (currentSearchTerm: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const data = await customerService.getCustomers(currentSearchTerm);
      setCustomers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadCustomers(searchTerm);
    setCurrentPage(1); // Reiniciar a la primera página cuando se busque
  };

  // Cálculos de paginación
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = customers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };
  
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };
  
  const handleDeleteCustomer = async (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar este cliente?')) {
      try {
        await customerService.deleteCustomer(id);
        loadCustomers(searchTerm); // Recargar manteniendo la búsqueda actual
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al eliminar el cliente.');
      }
    }
  };

  

  const handleSave = () => {
    setShowForm(false);
    setEditingCustomer(null);
    loadCustomers(searchTerm);
  };

  if (isLoading && customers.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1">Haga clic en un cliente para ver sus detalles y historial.</p>
        </div>
        <button onClick={handleNewCustomer} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <PlusCircle size={20} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* --- BARRA DE BÚSQUEDA AÑADIDA --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm  flex items-center space-x-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellidos, DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2  rounded-lg"
          />
        </div>
        <button onClick={handleSearch} className="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="mr-2 text-green-600" size={20} />
            Lista de Clientes
            {!isLoading && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {customers.length} registros
              </span>
            )}
            {totalPages > 1 && (
              <span className="ml-2 text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Nombre Completo</th>
                  <th className="p-3 text-left">Contacto</th>
                  <th className="p-3 text-left">Documento</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentCustomers.map((customer) => (
                  <tr key={customer.id} onClick={() => setViewingCustomerId(customer.id)} className="hover:bg-gray-100 cursor-pointer">
                    <td className="p-3 font-medium text-gray-900">{customer.full_name}</td>
                    <td className="p-3 text-sm text-gray-600">
                      <div>{customer.email}</div>
                      <div>{customer.phone}</div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {customer.document_number ? `${customer.document_type}: ${customer.document_number}` : 'No especificado'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end space-x-2">
                        {/* <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(customer.id, setError); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Download size={16} />
                        </button> */}
                        <button onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        
        {/* Paginación */}
        {!isLoading && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50  flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {startIndex + 1} a {Math.min(endIndex, customers.length)} de {customers.length} registros
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    currentPage === page
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {!isLoading && customers.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda o verifica los filtros aplicados.' 
                : 'Comience registrando el primer cliente para ver la lista aquí.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleNewCustomer}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl flex items-center space-x-2 mx-auto shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <PlusCircle size={20} />
                <span>Registrar Primer Cliente</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {showForm && (
        <CustomerForm 
          customer={editingCustomer}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {viewingCustomerId && (
        <CustomerDetailModal 
          customerId={viewingCustomerId}
          onClose={() => setViewingCustomerId(null)}
          onDataChange={() => loadCustomers(searchTerm)}
          setError={setError}
        />
      )}
    </div>
  );
};

export default CustomerManagement;