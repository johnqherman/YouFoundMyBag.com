import { ContactWithId } from '../../types';
import ContactInput from '../ContactInput';
import PhoneInputErrorBoundary from '../PhoneInputErrorBoundary';
import { AlertIcon } from '../icons/AppIcons';

interface ContactDetailsProps {
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
}

export default function ContactDetails({
  formData,
  onChange,
  onNext,
  onBack,
  addContact,
  removeContact,
  updateContact,
  getAvailableContactTypes,
  error,
}: ContactDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1 text-regal-navy-900">
          Contact Details
        </h3>
        <p className="text-sm text-regal-navy-600">
          {!formData.secure_messaging_enabled
            ? 'Provide at least one contact method for finders to reach you'
            : 'How finders can reach you'}
        </p>
      </div>

      {formData.secure_messaging_enabled && (
        <div>
          <label
            htmlFor="owner_email"
            className="block text-sm font-medium mb-2 text-regal-navy-800"
          >
            Your email address <span className="text-cinnabar-600">*</span>
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={formData.owner_email}
            onChange={(e) =>
              onChange({ owner_email: e.target.value.replace(/\s/g, '') })
            }
            required
            className="input-field"
            maxLength={254}
          />
          <p className="text-xs text-regal-navy-600 mt-1.5">
            Used to access your secure inbox
          </p>
        </div>
      )}

      <div>
        <div className="mb-2">
          <label className="block text-sm font-medium text-regal-navy-800">
            {formData.secure_messaging_enabled
              ? 'Direct contact methods'
              : 'Contact methods'}{' '}
            {formData.secure_messaging_enabled ? (
              <span className="text-regal-navy-500 font-normal">
                (optional)
              </span>
            ) : (
              <span className="text-cinnabar-600">*</span>
            )}
          </label>
        </div>

        <div className="alert-warning mb-3">
          <p className="text-xs font-medium flex items-center gap-2">
            <AlertIcon color="currentColor" />
            {formData.secure_messaging_enabled
              ? 'Fully public. Anyone who finds your item can see these.'
              : 'These contact details will be publicly visible to anyone who finds your item.'}
          </p>
        </div>

        {formData.contacts.length > 0 &&
          getAvailableContactTypes(-1).length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={addContact}
                className="text-sm link flex items-center gap-1"
              >
                + Add contact method
              </button>
            </div>
          )}

        <div className="space-y-3">
          {formData.contacts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-regal-navy-300">
              <button
                type="button"
                onClick={addContact}
                className="text-sm link"
              >
                + Add direct contact method
              </button>
            </div>
          ) : (
            formData.contacts.map((contact, index) => (
              <PhoneInputErrorBoundary key={`boundary-${contact.id}`}>
                <ContactInput
                  key={contact.id}
                  contact={contact}
                  onUpdate={(updatedContact) =>
                    updateContact(index, updatedContact)
                  }
                  onRemove={() => removeContact(index)}
                  availableTypes={getAvailableContactTypes(index)}
                  showRemoveButton={
                    formData.secure_messaging_enabled ||
                    formData.contacts.length > 1
                  }
                />
              </PhoneInputErrorBoundary>
            ))
          )}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="btn-ghost">
          ← Back
        </button>
        <button type="button" onClick={onNext} className="btn-primary">
          Next: Review & Submit
        </button>
      </div>
    </div>
  );
}
