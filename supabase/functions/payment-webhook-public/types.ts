// types.ts
export interface PaymentNotification {
    action: string;
    api_version?: string;
    data: {
      id: string;
    };
    date_created?: string;
    id?: string;
    live_mode?: boolean;
    type?: string;
    user_id?: string;
  }
  
  export interface PaymentDetails {
    id: string;
    status: string;
    status_detail: string;
    external_reference: string;
    payment_method_id: string;
    payment_type_id: string;
    transaction_amount: number;
    date_created: string;
    date_approved: string;
    payer: any;
    metadata: Record<string, any>;
    preapproval_id?: string;
    subscription_id?: string;
    description?: string;
    live_mode?: boolean;
  }
  
  export interface PaymentAttempt {
    id: string;
    user_id: string;
    preference_id: string;
    plan_id: string;
    plan_name: string;
    plan_price: number;
    plan_interval: string;
    status: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface SubscriptionDetails {
    id: string;
    status: string;
    payer_id: string;
    reason: string;
    external_reference: string;
    date_created: string;
    last_modified: string;
    auto_recurring: {
      frequency: number;
      frequency_type: string;
      transaction_amount: number;
      currency_id: string;
    };
  }
  
  export interface PaymentProcessResult {
    success: boolean;
    status: string;
    message?: string;
    payment_id?: string;
    test_mode?: boolean;
  }