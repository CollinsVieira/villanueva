export interface User {
    id: string;
    name: string;
    email: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    role: 'admin' | 'worker';
    avatar?: string;
    phone?: string;
    is_active?: boolean;
    createdAt: string;
    updatedAt?: string;
  }
  export interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateUser: (user: User) => void;
    isLoading: boolean;
    error: string | null;
  }