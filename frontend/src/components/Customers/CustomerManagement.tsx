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
        <button onClick={handleNewCustomer} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <PlusCircle size={20} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* --- BARRA DE BÚSQUEDA AÑADIDA --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center space-x-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellidos, DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <button onClick={handleSearch} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Nombre Completo</th>
                  <th className="p-3 text-left">Contacto</th>
                  <th className="p-3 text-left">Documento</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((customer) => (
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
        />
      )}
    </div>
  );
};

export default CustomerManagement;