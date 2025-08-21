import React, { useState, useEffect } from 'react';
import { CreditCard, PlusCircle, Download, Trash2, Search } from 'lucide-react';
import { Payment } from '../../types';
import paymentService from '../../services/paymentService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';
import PaymentForm from './PaymentForm';
import { useDebounce } from '../../hooks/useDebounce';

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    // Esta función se ejecutará cada vez que dejes de escribir en el buscador
    loadPayments();
  }, [debouncedSearchTerm]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      setError(null);
      // Enviamos el término de búsqueda a la API
      const data = await paymentService.getPayments(debouncedSearchTerm);
      setPayments(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los pagos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSearchTerm(''); // Limpiar la búsqueda para ver el nuevo pago
  };
  
  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar este pago?')) {
      try {
        await paymentService.deletePayment(id);
        loadPayments();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al eliminar el pago.');
      }
    }
  };

  if (isLoading && payments.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-gray-600 mt-1">Registre y administre los pagos de los clientes.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusCircle size={20} />
          <span>Registrar Pago</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        {/* --- BUSCADOR SIMPLE PERO FUNCIONAL --- */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente, DNI, lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading && <div className="p-4 text-center">Buscando...</div>}
          {!isLoading && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Lote</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Fecha de Pago</th>
                  <th className="p-3 text-left">Monto</th>
                  <th className="p-3 text-center">Comprobante</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      Mz. {payment.lote.block} - Lt. {payment.lote.lot_number}
                    </td>
                    <td className="p-3">{payment.lote.owner?.full_name || 'N/A'}</td>
                    <td className="p-3">{new Date(payment.payment_date).toLocaleDateString('es-ES')}</td>
                    <td className="p-3 font-semibold">${parseFloat(payment.amount).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      {payment.receipt_image ? (
                        <a 
                          href={payment.receipt_image} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:underline"
                        >
                          <Download size={16} className="mr-1" />
                          Ver
                        </a>
                      ) : (
                        'No adjunto'
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(payment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar Pago">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isLoading && payments.length === 0 && (
          <div className="text-center py-12">
            <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg">No se han registrado pagos</h3>
            <p className="text-gray-600">
              {debouncedSearchTerm ? 'Ningún pago coincide con tu búsqueda.' : 'Comience por registrar un nuevo pago.'}
            </p>
          </div>
        )}
      </div>

      {showForm && (
        <PaymentForm 
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default PaymentManagement;