export interface CreateBagRequest {
  display_name?: string;
  owner_message?: string;
  contacts: Array<{
    type: 'email' | 'sms' | 'signal' | 'whatsapp' | 'telegram';
    value: string;
    allow_direct_display?: boolean;
  }>;
}

export interface ContactWithId {
  id: string;
  type: 'email' | 'sms' | 'signal' | 'whatsapp' | 'telegram';
  value: string;
  allow_direct_display?: boolean;
}

export interface CreateBagResponse {
  success: boolean;
  data: {
    short_id: string;
    url: string;
    qr_code: string;
    display_name?: string;
    created_at: string;
  };
}

export interface FinderPageData {
  success: boolean;
  data: {
    short_id: string;
    display_name?: string;
    owner_message?: string;
    contact_options: Array<{
      type: 'email' | 'sms' | 'signal' | 'whatsapp' | 'telegram';
      label: string;
      direct_contact?: string;
    }>;
  };
}

export interface SendMessageRequest {
  from_message: string;
  sender_info?: string;
  turnstile_token: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: any;
  retry_after?: number;
}
