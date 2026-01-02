export interface CreateBagRequest {
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email: string;
  contacts: Contact[];
}

export interface CreateBagResponse {
  success: boolean;
  data: {
    short_id: string;
    url: string;
    qr_code: string;
    owner_name?: string;
    bag_name?: string;
    created_at: string;
  };
}

export interface FinderPageData {
  success: boolean;
  data: {
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    owner_message?: string;
    contact_options: Array<{
      type: 'sms' | 'signal' | 'whatsapp' | 'telegram';
      label: string;
      direct_contact?: string;
    }>;
  };
}

export interface Contact {
  type: 'sms' | 'signal' | 'whatsapp' | 'telegram';
  value: string;
}

export interface ContactWithId extends Contact {
  id: string;
}

export interface DbContact {
  id: string;
  bag_id: string;
  type: string;
  value: string;
  created_at: Date;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  retry_after?: number;
}

export interface Conversation {
  id: string;
  bag_id: string;
  status: 'active' | 'resolved' | 'archived';
  finder_email?: string;
  finder_display_name?: string;
  last_message_at: string;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_type: 'finder' | 'owner';
  message_content: string;
  read_at?: string;
  sent_at: string;
}

export interface ConversationThread {
  conversation: Conversation;
  messages: ConversationMessage[];
  bag: {
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'recovered' | 'archived';
  };
}

export interface OwnerDashboard {
  bags: Array<{
    id: string;
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'recovered' | 'archived';
    created_at: string;
    conversation_count: number;
    latest_conversation?: string;
  }>;
}

export interface OwnerSession {
  token: string;
  email: string;
  bag_ids: string[];
  expires_at: string;
  conversation_id?: string;
  session_type?: 'owner' | 'finder' | 'magic_owner' | 'magic_finder';
}

export interface StartConversationRequest {
  finder_message: string;
  finder_email?: string;
  finder_display_name?: string;
  turnstile_token: string;
}

export interface SendReplyRequest {
  conversation_id: string;
  message_content: string;
}

export type MessageContext = 'initial' | 'follow-up' | 'response';

export interface MessageContextInfo {
  context: MessageContext;
  isFirstFromSender: boolean;
  hasRecipientReplied: boolean;
  lastSenderType: 'finder' | 'owner' | null;
}

export interface BagData {
  id: string;
  short_id: string;
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email: string;
  status: 'active' | 'recovered' | 'archived';
  created_at: string;
  updated_at: string;
}
