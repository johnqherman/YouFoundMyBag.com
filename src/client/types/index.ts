export interface CreateBagRequest {
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email?: string;
  contacts: Contact[];
  secure_messaging_enabled?: boolean;
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
  data:
    | {
        status: 'disabled';
      }
    | {
        status: 'active';
        short_id: string;
        owner_name?: string;
        bag_name?: string;
        owner_message?: string;
        secure_messaging_enabled: boolean;
        show_branding?: boolean;
        tag_color_start?: string | null;
        tag_color_end?: string | null;
        contact_options: Array<{
          type:
            | 'sms'
            | 'whatsapp'
            | 'email'
            | 'instagram'
            | 'telegram'
            | 'signal'
            | 'other';
          label: string;
          value: string;
          is_primary: boolean;
        }>;
      };
}

export interface Contact {
  type:
    | 'sms'
    | 'whatsapp'
    | 'email'
    | 'instagram'
    | 'telegram'
    | 'signal'
    | 'other';
  value: string;
  label?: string;
  is_primary?: boolean;
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
  finder_notifications_sent: number;
  owner_notifications_sent: number;
  last_message_at: string;
  created_at: string;
  archived_at?: string;
  permanently_deleted_at?: string;
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
  unread_count?: number;
  bag: {
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'disabled' | 'over_limit';
  };
}

export interface OwnerDashboard {
  bags: Array<{
    id: string;
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'disabled' | 'over_limit';
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
  owner_email?: string;
  secure_messaging_enabled: boolean;
  status: 'active' | 'disabled' | 'over_limit';
  created_at: string;
  updated_at: string;
  tag_color_start?: string | null;
  tag_color_end?: string | null;
  show_branding?: boolean | null;
}

export interface CachedBag {
  id: string;
  short_id: string;
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email?: string;
  secure_messaging_enabled: boolean;
  status: 'active' | 'disabled' | 'over_limit';
  created_at: Date;
  updated_at: Date;
  tag_color_start?: string | null;
  tag_color_end?: string | null;
  show_branding?: boolean | null;
}

export interface CachedContact {
  type: string;
  value: string;
  label?: string;
  is_primary?: boolean;
}

export interface CachedFinderPageData {
  short_id: string;
  owner_name?: string;
  owner_name_override?: string;
  bag_name?: string;
  owner_message?: string;
  secure_messaging_enabled: boolean;
  contact_options_encrypted: CachedContact[];
  show_branding?: boolean;
  tag_color_start?: string | null;
  tag_color_end?: string | null;
}

export interface CachedConversationMessage {
  id: string;
  conversation_id: string;
  sender_type: 'finder' | 'owner';
  message_content: string;
  read_at?: string;
  sent_at: string;
}

export interface CachedConversationThread {
  conversation: Conversation;
  messages: CachedConversationMessage[];
  unread_count?: number;
  bag: {
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'disabled' | 'over_limit';
  };
}

export interface TwemojiProps {
  children: React.ReactNode;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
}

export type { IntlTelInputRef } from 'intl-tel-input/reactWithUtils';

export interface PlanInfo {
  plan: 'free' | 'pro';
  bagLimit: number;
  canEditBags: boolean;
  showBranding: boolean;
  subscription_status?:
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'incomplete'
    | null;
}

export interface DashboardData {
  owner_email?: string;
  owner_name?: string | null;
  bags: Array<{
    id: string;
    short_id: string;
    owner_name?: string;
    owner_name_override?: string;
    bag_name?: string;
    status: 'active' | 'disabled' | 'over_limit';
    created_at: string;
    conversation_count: number;
    unread_count: number;
    latest_conversation?: string;
  }>;
  conversations: ConversationThread[];
  plan?: PlanInfo;
}

export interface EmailPreferences {
  email: string;
  all_emails_enabled: boolean;
  bag_created_enabled: boolean;
  conversation_notifications_enabled: boolean;
  reply_notifications_enabled: boolean;
  system_updates_enabled: boolean;
}

export interface QRCodeData {
  qr_code: string;
  url: string;
  short_id: string;
}

export type SectionId =
  | 'qr'
  | 'name'
  | 'rotate'
  | 'status'
  | 'email'
  | 'appearance'
  | 'resolve'
  | 'delete';

export interface NavigationItem {
  id: SectionId;
  label: string;
  mobileLabel?: string;
  icon: React.ReactNode;
  group: 'primary' | 'settings' | 'advanced';
}

export type IconSize = 'small' | 'medium' | 'large';
export type IconColor = 'currentColor';

export interface BrandIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface BagCreatedProps {
  bagData: CreateBagResponse;
  onCreateAnother: () => void;
  isPro?: boolean;
}

export interface RequestMagicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  initialEmail?: string;
}

export interface CharacterLimitTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  name?: string;
  variant?: 'light' | 'dark';
}

export interface CharacterLimitInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  type?: 'text' | 'email';
  name?: string;
}

export interface ContactInputProps {
  contact: ContactWithId;
  onUpdate: (contact: ContactWithId) => void;
  onRemove?: () => void;
  availableTypes: Array<
    'sms' | 'whatsapp' | 'email' | 'instagram' | 'telegram' | 'signal' | 'other'
  >;
  showRemoveButton?: boolean;
}

export interface PrivacyWarningProps {
  message: string;
  variant?: 'light' | 'dark';
  className?: string;
}

export interface PhoneInputErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface PhoneInputErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

export interface ContactModalProps {
  shortId: string;
  ownerName?: string;
  bagName?: string;
  onClose: () => void;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'primary';
}

export interface BagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bag: {
    id: string;
    short_id: string;
    owner_name?: string;
    owner_name_override?: string;
    bag_name?: string;
    status: 'active' | 'disabled' | 'over_limit';
    owner_email?: string;
    conversation_count?: number;
  };
  onBagUpdated: () => void;
  planInfo?: PlanInfo;
}

export interface CreateBagFormProps {
  onSuccess: (bagData: CreateBagResponse) => void;
  initialEmail?: string;
  initialOwnerName?: string;
  isPro?: boolean;
}

export interface FormData {
  owner_name: string;
  bag_name: string;
  owner_message: string;
  owner_email: string;
  contacts: ContactWithId[];
  secure_messaging_enabled: boolean;
}

export interface ContactDetailsProps {
  formData: {
    owner_email: string;
    contacts: ContactWithId[];
    secure_messaging_enabled: boolean;
  };
  onChange: (updates: Partial<ContactDetailsProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
  addContact: () => void;
  removeContact: (index: number) => void;
  updateContact: (index: number, contact: ContactWithId) => void;
  getAvailableContactTypes: (
    currentIndex: number
  ) => Array<
    'sms' | 'whatsapp' | 'email' | 'instagram' | 'telegram' | 'signal' | 'other'
  >;
  error?: string | null;
  emailLocked?: boolean;
}

export interface ContactPreferenceProps {
  formData: {
    secure_messaging_enabled: boolean;
  };
  onChange: (updates: Partial<ContactPreferenceProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
  onContactPreferenceChange: (useSecureMessaging: boolean) => void;
}

export interface ReviewSubmitProps {
  formData: {
    owner_name: string;
    bag_name: string;
    owner_message: string;
    owner_email: string;
    contacts: ContactWithId[];
    secure_messaging_enabled: boolean;
  };
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onContactsReorder?: (contacts: ContactWithId[]) => void;
  loading: boolean;
  error?: string | null;
}

export interface SortableContactItemProps {
  contact: ContactWithId;
  index: number;
  isDragDisabled: boolean;
}

export interface BasicInfoProps {
  formData: {
    owner_name: string;
    bag_name: string;
    owner_message: string;
  };
  onChange: (updates: Partial<BasicInfoProps['formData']>) => void;
  onNext: () => void;
  ownerNameLocked?: boolean;
}
