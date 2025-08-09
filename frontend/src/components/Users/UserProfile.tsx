import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Shield, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Alert from '../UI/Alert';

const UserProfile: React.FC = () => {
  const { user: currentUser, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (currentUser) {
      const nameParts = currentUser.name.split(' ');
      setFormData({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: currentUser.email,
        phone: currentUser.phone || ''
      });
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await userService.updateCurrentUserProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone
      });

      // Actualizar el contexto de autenticación
      updateUser(updatedUser);
      
      setIsEditing(false);
      setSuccess('Perfil actualizado correctamente');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      setError(err.response?.data?.detail || 'Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      const nameParts = currentUser.name.split(' ');
      setFormData({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: currentUser.email,
        phone: currentUser.phone || ''
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (!currentUser) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Edit size={16} />
                <span>Editar Perfil</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  <X size={16} className="inline mr-1" />
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  <Save size={16} />
                  <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Avatar y nombre */}
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl font-semibold text-blue-600">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{currentUser.name}</h3>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Shield size={14} className="mr-1" />
                    {currentUser.role === 'admin' ? 'Administrador' : 'Trabajador'}
                  </p>
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User size={16} className="inline mr-1" />
                    Nombre
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.first_name}</p>
                  )}
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User size={16} className="inline mr-1" />
                    Apellido
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.last_name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail size={16} className="inline mr-1" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.email}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={16} className="inline mr-1" />
                    Teléfono
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Opcional"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{formData.phone || 'No especificado'}</p>
                  )}
                </div>
              </div>

              {/* Información adicional (solo lectura) */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Información del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      <Calendar size={16} className="inline mr-1" />
                      Fecha de Registro
                    </label>
                    <p className="text-gray-700">
                      {currentUser.createdAt 
                        ? new Date(currentUser.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'No disponible'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Estado
                    </label>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${
                      currentUser.is_active 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {currentUser.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Seguridad de la Cuenta</p>
            <p>Para cambiar tu contraseña o modificar configuraciones de seguridad, contacta con el administrador del sistema.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;