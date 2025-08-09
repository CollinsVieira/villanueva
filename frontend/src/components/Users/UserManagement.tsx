import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, UserPlus, Mail, Shield } from 'lucide-react';
import userService, { CreateUserData, UpdateUserData } from '../../services/userService';
import { User } from '../../types';
import UserForm from './UserForm';
import DeleteUserModal from './DeleteUserModal';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const usersData = await userService.getUsers();
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
      setError(err.response?.data?.detail || 'Error al cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: User['role']) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getRoleText = (role: User['role']) => {
    return role === 'admin' ? 'Administrador' : 'Trabajador';
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleFormSubmit = async (data: CreateUserData | UpdateUserData) => {
    setIsSubmitting(true);
    try {
      if (selectedUser) {
        // Editar usuario existente
        await userService.updateUser(selectedUser.id, data as UpdateUserData);
      } else {
        // Crear nuevo usuario
        await userService.createUser(data as CreateUserData);
      }
      
      setShowUserForm(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      throw err; // Re-lanzar para que UserForm maneje el error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      await userService.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Error al eliminar usuario:', err);
      setError(err.response?.data?.detail || 'Error al eliminar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModals = () => {
    setShowUserForm(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Shield size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar usuarios</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadUsers}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">Administre los usuarios del sistema y sus permisos</p>
        </div>
        <button
          onClick={handleCreateUser}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <UserPlus size={20} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredUsers.length} de {users.length} usuarios
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Usuario</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Rol</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Estado</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Fecha de Registro</th>
                <th className="text-right py-3 px-6 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Mail size={14} className="mr-1" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRoleColor(user.role)}`}>
                      <Shield size={14} className="inline mr-1" />
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="Editar usuario"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Eliminar usuario"
                        disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Search size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
            <p className="text-gray-600">Ajuste los filtros de búsqueda o agregue un nuevo usuario.</p>
          </div>
        )}
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Usuarios</p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <UserPlus className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trabajadores</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter(u => u.role === 'worker').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <UserPlus className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onSubmit={handleFormSubmit}
          onClose={closeModals}
          isLoading={isSubmitting}
        />
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <DeleteUserModal
          user={selectedUser}
          onConfirm={handleConfirmDelete}
          onClose={closeModals}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default UserManagement;