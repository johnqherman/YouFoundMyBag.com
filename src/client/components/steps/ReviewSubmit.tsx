import { ContactWithId } from '../../types';

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
  const getContactIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return '📞';
      case 'whatsapp':
        return '📱';
      case 'email':
        return '📧';
      case 'instagram':
        return '📸';
      case 'telegram':
        return '✈️';
      case 'signal':
        return '🔐';
      case 'other':
        return '📞';
      default:
        return '📞';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
        <p className="text-sm text-neutral-400 mb-6">
          Please review your information before creating your QR code.
        </p>
      </div>

      <div className="bg-neutral-900 rounded-xl p-4">
        <h4 className="font-medium text-white mb-3">Basic Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">Your name:</span>
            <span className="text-white">
              {formData.owner_name || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Bag type:</span>
            <span className="text-white">
              {formData.bag_name || 'Not provided'}
            </span>
          </div>
          {formData.owner_message && (
            <div className="flex justify-between items-start">
              <span className="text-neutral-400">Message:</span>
              <span className="text-white text-right max-w-xs">
                &quot;{formData.owner_message}&quot;
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 rounded-xl p-4">
        <h4 className="font-medium text-white mb-3">Contact Preferences</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">Contact method:</span>
            <span className="text-white">
              {formData.secure_messaging_enabled
                ? 'Secure messaging'
                : 'Direct contact only'}
            </span>
          </div>
          {formData.secure_messaging_enabled && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Email:</span>
              <span className="text-white">{formData.owner_email}</span>
            </div>
          )}
        </div>
      </div>

      {formData.contacts.length > 0 && (
        <div className="bg-neutral-900 rounded-xl p-4">
          <h4 className="font-medium text-white mb-3">Contact Methods</h4>
          <div className="space-y-2">
            {formData.contacts
              .filter((contact) => contact.value.trim())
              .map((contact, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-neutral-400 flex items-center gap-2">
                    {getContactIcon(contact.type)}{' '}
                    {contact.label || contact.type}
                    {contact.is_primary && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </span>
                  <span className="text-white">{contact.value}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-neutral-400 hover:text-white"
          disabled={loading}
        >
          ← Back
        </button>
        <button onClick={onSubmit} disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create QR Code'}
        </button>
      </div>
    </div>
  );
}
