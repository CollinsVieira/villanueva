import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Home, FileText } from 'lucide-react';
import { Customer } from '../../types';
import customerService from '../../services/customerService';

interface CustomerFormProps {
  customer?: Customer | null;
  onClose: () => void;
  onSave: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    document_type: '',
    document_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        document_type: customer.document_type || '',
        document_number: customer.document_number || '',
      });
    }
  }, [customer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (customer) {
        await customerService.updateCustomer(customer.id, formData);
      } else {
        await customerService.createCustomer(formData);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error al guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombres y Apellidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              {/* Email y Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              {/* Tipo y Número de Documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                <input type="text" name="document_type" value={formData.document_type} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° Documento</label>
                <input type="text" name="document_number" value={formData.document_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg"></textarea>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;