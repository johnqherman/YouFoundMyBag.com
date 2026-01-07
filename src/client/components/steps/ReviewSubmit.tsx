import { ContactWithId } from '../../types';
import {
  formatContactValue,
  formatPhoneNumber,
  formatContactTypeName,
} from '../../../infrastructure/utils/formatting';
import { getContactMethodIcon } from '../icons/AppIcons';
import {
  SignalIcon,
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  brandColors,
} from '../icons/BrandIcons';

interface ReviewSubmitProps {
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
  loading: boolean;
  error: string | null;
}

export default function ReviewSubmit({
  formData,
  onBack,
  onSubmit,
  loading,
  error,
}: ReviewSubmitProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1 text-regal-navy-900">
          Review & Submit
        </h3>
        <p className="text-sm text-regal-navy-600">
          Please review your information before creating your QR code
        </p>
      </div>

      <div className="bg-regal-navy-50 border border-regal-navy-100 rounded-lg p-5">
        <h4 className="font-medium text-regal-navy-900 mb-3 text-sm">
          Basic Information
        </h4>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-regal-navy-600">Your name:</span>
            <span className="text-regal-navy-900 font-medium text-right">
              {formData.owner_name || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-regal-navy-600">Bag type:</span>
            <span className="text-regal-navy-900 font-medium text-right">
              {formData.bag_name || 'Not provided'}
            </span>
          </div>
          {formData.owner_message && (
            <div className="flex justify-between gap-4 items-start">
              <span className="text-regal-navy-600 shrink-0">Message:</span>
              <span className="text-regal-navy-900 font-medium text-right">
                &quot;{formData.owner_message}&quot;
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-regal-navy-50 border border-regal-navy-100 rounded-lg p-5">
        <h4 className="font-medium text-regal-navy-900 mb-3 text-sm">
          Contact Preferences
        </h4>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-regal-navy-600">Contact method:</span>
            <span className="text-regal-navy-900 font-medium text-right">
              {formData.secure_messaging_enabled
                ? 'Secure messaging'
                : 'Direct contact only'}
            </span>
          </div>
          {formData.secure_messaging_enabled && (
            <div className="flex justify-between gap-4">
              <span className="text-regal-navy-600">Email:</span>
              <span className="text-regal-navy-900 font-medium text-right break-all">
                {formData.owner_email}
              </span>
            </div>
          )}
        </div>
      </div>

      {formData.contacts.length > 0 && (
        <div className="bg-regal-navy-50 border border-regal-navy-100 rounded-lg p-5">
          <h4 className="font-medium text-regal-navy-900 mb-3 text-sm">
            Contact Methods
          </h4>
          <div className="space-y-2.5">
            {formData.contacts
              .filter((contact) => contact.value.trim())
              .map((contact, index) => {
                const getBrandIconForType = (type: string) => {
                  switch (type) {
                    case 'signal':
                      return (
                        <SignalIcon
                          size={18}
                          style={{ color: brandColors.signal }}
                        />
                      );
                    case 'whatsapp':
                      return (
                        <WhatsAppIcon
                          size={18}
                          style={{ color: brandColors.whatsapp }}
                        />
                      );
                    case 'telegram':
                      return (
                        <TelegramIcon
                          size={18}
                          style={{ color: brandColors.telegram }}
                        />
                      );
                    case 'instagram':
                      return (
                        <InstagramIcon
                          size={18}
                          style={{ color: brandColors.instagram }}
                        />
                      );
                    default: {
                      const ContactIcon = getContactMethodIcon(type);
                      return <ContactIcon color="currentColor" />;
                    }
                  }
                };

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 text-sm p-2.5 rounded-lg bg-white border border-regal-navy-100 hover:border-regal-navy-200 transition-all duration-200"
                  >
                    <span className="text-regal-navy-700 flex items-center gap-2.5">
                      <span className="brand-icon flex-shrink-0">
                        {getBrandIconForType(contact.type)}
                      </span>
                      <span className="font-medium">
                        {contact.label || formatContactTypeName(contact.type)}
                      </span>
                      {contact.is_primary && (
                        <span className="badge badge-neutral text-xs">
                          Primary
                        </span>
                      )}
                    </span>
                    <span className="text-regal-navy-900 font-medium text-right break-all">
                      {contact.type === 'sms' ||
                      contact.type === 'whatsapp' ||
                      contact.type === 'signal' ||
                      (contact.type === 'telegram' &&
                        contact.value.startsWith('+'))
                        ? formatPhoneNumber(contact.value)
                        : formatContactValue(contact.type, contact.value)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {error && <div className="alert-error">{error}</div>}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost"
          disabled={loading}
        >
          ← Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create QR Code'}
        </button>
      </div>
    </div>
  );
}
