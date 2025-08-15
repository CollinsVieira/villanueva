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

  // Types for Reports
  export interface Report {
    id: number;
    name: string;
    report_type: ReportType;
    report_type_display: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    status: ReportStatus;
    status_display: string;
    data?: any;
    created_at: string;
    updated_at: string;
    generated_at?: string;
    requested_by: number;
    requested_by_name: string;
  }

  export type ReportType = 
    | 'customers_debt' 
    | 'payments_history' 
    | 'available_lots' 
    | 'sales_summary' 
    | 'financial_overview' 
    | 'pending_installments' 
    | 'monthly_collections' 
    | 'custom';

  export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

  export interface ReportCreateData {
    name: string;
    report_type: ReportType;
    description?: string;
    start_date?: string;
    end_date?: string;
  }

  export interface ReportSummary {
    total_reports: number;
    completed_reports: number;
    pending_reports: number;
    failed_reports: number;
    recent_reports: Report[];
  }

  export interface ReportTypeChoice {
    value: ReportType;
    label: string;
  }

  // Specific Report Data Types
  export interface CustomerDebtData {
    total_customers_with_debt: number;
    total_debt_amount: number;
    customers: CustomerDebtItem[];
  }

  export interface CustomerDebtItem {
    customer_id: number;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    total_debt: number;
    pending_installments: number;
    lotes: LoteDebtItem[];
  }

  export interface LoteDebtItem {
    lote_id: number;
    lote_description: string;
    remaining_balance: number;
    total_payments_made: number;
    financing_months: number;
    days_until_next_payment?: number;
  }

  export interface PaymentHistoryData {
    total_payments: number;
    total_amount: number;
    period: {
      start_date?: string;
      end_date?: string;
    };
    payments: PaymentHistoryItem[];
  }

  export interface PaymentHistoryItem {
    id: number;
    amount: number;
    payment_date: string;
    method: string;
    receipt_number?: string;
    lote: string;
    customer: string;
    installment_number?: number;
    notes?: string;
  }

  export interface AvailableLotsData {
    summary: {
      total_count: number;
      total_area: number;
      total_value: number;
      avg_price_per_m2: number;
    };
    lots: AvailableLotItem[];
  }

  export interface AvailableLotItem {
    id: number;
    block: string;
    lot_number: string;
    area: number;
    price: number;
    price_per_m2: number;
    initial_payment: number;
    financing_months: number;
  }