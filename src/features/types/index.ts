export interface Bag {
  id: string;
  short_id: string;
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email?: string;
  secure_messaging_enabled: boolean;
  opt_out_timestamp?: Date;
  opt_out_ip_address?: string;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface Contact {
  id: string;
  bag_id: string;
  type:
    | 'sms'
    | 'whatsapp'
    | 'email'
    | 'instagram'
    | 'telegram'
    | 'signal'
    | 'other';
  value: string;
  is_primary?: boolean;
  display_order?: number;
  label?: string;
  created_at: Date;
}

export type MessageContext = 'initial' | 'follow-up' | 'response';

export interface MessageContextInfo {
  context: MessageContext;
  isFirstFromSender: boolean;
  hasRecipientReplied: boolean;
  lastSenderType: 'finder' | 'owner' | null;
}

export interface DatabaseMessage {
  id: string | null;
  conversation_id: string;
  sender_type: 'finder' | 'owner';
  message_content: string;
  read_at: string | null;
  sent_at: string;
}

export interface EmailPreferences {
  id: string;
  email: string;
  unsubscribe_token: string;
  all_emails_enabled: boolean;
  bag_created_enabled: boolean;
  conversation_notifications_enabled: boolean;
  reply_notifications_enabled: boolean;
  unsubscribed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
