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

  export interface LoteHistory {
  id: number;
  user: User;
  action: string;
  details: string;
  timestamp: string;
}

export interface Lote {
  id: number;
  block: string;
  lot_number: string;
  area: string;
  price: string;
  initial_payment: string;
  financing_months: number;
  remaining_balance: string;
  status: 'disponible' | 'vendido' | 'reservado' | 'desarrollo';
  owner?: Customer;
  installments_paid: number; // <-- AÑADIR ESTA LÍNEA
  monthly_installment: string;
  history: LoteHistory[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  lote: Lote;
  amount: string;
  payment_date: string;
  method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  receipt_number?: string;
  installment_number?: number;
  receipt_image?: string;
  notes?: string;
  recorded_by: User;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  document_type?: string;
  document_number?: string;
  created_at: string;
  updated_at: string;
  created_by: User;
  lotes: Lote[];
}

export interface HistoryEvent {
  timestamp: string;
  action: string;
  details: string;
  user: string;
}


