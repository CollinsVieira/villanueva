import api from './api';
import { User } from '../types';

// Helper para manejar respuestas paginadas
const handlePaginatedResponse = (data: any): any[] => {
  // Si la respuesta tiene estructura paginada, devolver solo los resultados
  if (data && typeof data === 'object' && 'results' in data) {
    return data.results;
  }
  // Si no tiene estructura paginada, devolver los datos tal como están
  return Array.isArray(data) ? data : [];
};

export interface CreateUserData {
  email: string;
  username?: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'worker';
  phone?: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: 'admin' | 'worker';
  phone?: string;
  is_active?: boolean;
}

class UserService {
  // Función para mapear datos del backend al frontend
  private mapUserData(userData: any): User {
    return {
      ...userData,
      id: userData.id ? userData.id.toString() : '', // Manejar caso donde id sea undefined
      name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      createdAt: userData.created_at,
      updatedAt: userData.updated_at
    };
  }

  // Obtener lista de usuarios (solo admin)
  async getUsers(): Promise<User[]> {
    const response = await api.get('/auth/');
    const users = handlePaginatedResponse(response.data);
    return users.map((user: any) => this.mapUserData(user));
  }

  // Obtener usuario por ID
  async getUser(id: string): Promise<User> {
    const response = await api.get(`/auth/${id}/`);
    return this.mapUserData(response.data);
  }

  // Crear nuevo usuario (solo admin)
  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post('/auth/', data);
    return this.mapUserData(response.data);
  }

  // Actualizar usuario
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.patch(`/auth/${id}/`, data);
    return this.mapUserData(response.data);
  }

  // Eliminar usuario (desactivar)
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/auth/${id}/`);
  }

  // Obtener perfil del usuario actual
  async getCurrentUserProfile(): Promise<User> {
    const response = await api.get('/auth/me/');
    return this.mapUserData(response.data);
  }

  // Actualizar perfil del usuario actual
  async updateCurrentUserProfile(data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<User> {
    const response = await api.patch('/auth/me/', data);
    return this.mapUserData(response.data);
  }
}

export default new UserService(); 