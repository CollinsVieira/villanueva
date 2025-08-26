import api from './api';
import axios from 'axios';
import { User } from '../types';

// Configuración base de la API
const API_BASE_URL =  'http://192.168.100.4:8000/api/v1';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'worker';
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

class AuthService {
  // Función para mapear datos del backend al frontend
  private mapUserData(userData: any): User {
    return {
      ...userData,
      id: userData.id.toString(), // Asegurar que el ID sea string
      name: userData.name || `${userData.first_name} ${userData.last_name}`.trim(),
      createdAt: userData.created_at,
      updatedAt: userData.updated_at
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Usar axios directamente para el login (sin interceptores)
    const response = await axios.post(`${API_BASE_URL}/auth/login/`, credentials);
    return {
      ...response.data,
      user: this.mapUserData(response.data.user)
    };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    // Usar axios directamente para el registro (sin interceptores)
    const response = await axios.post(`${API_BASE_URL}/auth/register/`, data);
    return {
      ...response.data,
      user: this.mapUserData(response.data.user)
    };
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar tokens independientemente del resultado
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me/');
    return this.mapUserData(response.data);
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch('/auth/profile/', data);
    return this.mapUserData(response.data);
  }

  async changePassword(data: { old_password: string; new_password: string }): Promise<void> {
    await api.post('/auth/change-password/', data);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/reset-password/', { email });
  }

  // Método para verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Método para obtener el token de acceso
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // Método para obtener el token de refresh
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }
}

export default new AuthService(); 