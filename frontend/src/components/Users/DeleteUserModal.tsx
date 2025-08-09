import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { User } from '../../types';

interface DeleteUserModalProps {
  user: User;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ 
  user, 
  onConfirm, 
  onClose, 
  isLoading = false 
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // El error será manejado por el componente padre
      console.error('Error al eliminar usuario:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Eliminar Usuario
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            ¿Está seguro de que desea eliminar al usuario{' '}
            <span className="font-semibold text-gray-900">{user.name}</span>?
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Esta acción no se puede deshacer</p>
                <p>El usuario será eliminado permanentemente del sistema y perderá el acceso a todas las funcionalidades.</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {user.role === 'admin' ? 'Administrador' : 'Trabajador'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Eliminando...' : 'Eliminar Usuario'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;