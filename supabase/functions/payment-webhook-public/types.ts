// Definição de tipos para o webhook de pagamento

// Tipos para o Mercado Pago
export interface MercadoPagoPayment {
  id: string | number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  payment_method_id: string;
  payment_type_id?: string;
  description?: string;
  external_reference?: string;
  metadata?: Record<string, any>;
  date_created?: string;
  date_approved?: string;
  preapproval_id?: string;
}

export interface MercadoPagoSubscription {
  id: string;
  status: string;
  payer_id?: string;
  reason?: string;
  external_reference?: string;
  date_created?: string;
  last_modified?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
}

// Tipos para o Supabase
export interface PaymentAttempt {
  id: string;
  user_id: string;
  plan_id?: string;
  plan_name?: string;
  plan_price?: number;
  plan_interval?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentData {
  id?: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string | number;
  status: string;
  subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialLogData {
  user_id: string;
  action: string;
  description: string;
  data: Record<string, any>;
}

// Tipos para os metadados de pagamento
export interface PaymentMetadata {
  user_id: string;
  plan_id?: string;
  plan_name?: string;
  plan_price?: number;
  plan_interval?: string;
}
