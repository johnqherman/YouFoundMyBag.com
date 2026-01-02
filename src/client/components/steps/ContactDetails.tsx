import { ContactWithId } from '../../types';
import ContactInput from '../ContactInput';
import PhoneInputErrorBoundary from '../PhoneInputErrorBoundary';

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
    'sms' | 'signal' | 'whatsapp' | 'telegram' | 'instagram' | 'email' | 'other'
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
        <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
        {!formData.secure_messaging_enabled && (
          <p className="text-sm text-neutral-400 mb-6">
            Provide at least one contact method for finders to reach you.
          </p>
        )}
      </div>

      {formData.secure_messaging_enabled && (
        <div>
          <label
            htmlFor="owner_email"
            className="block text-sm font-medium mb-2"
          >
            Your email address *
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={formData.owner_email}
            onChange={(e) => onChange({ owner_email: e.target.value })}
            required
            className="input-field"
            maxLength={254}
          />
          <p className="text-xs text-neutral-400 mt-1">
            Used to access your secure inbox
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">
            {formData.secure_messaging_enabled
              ? 'Additional contact methods (optional)'
              : 'Contact methods *'}
          </label>
          {formData.contacts.length > 0 &&
            getAvailableContactTypes(-1).length > 0 && (
              <button
                type="button"
                onClick={addContact}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                + Add contact method
              </button>
            )}
        </div>

        <div
          className={`px-3 py-2 rounded-lg mb-4 ${
            formData.secure_messaging_enabled
              ? 'bg-amber-900 border border-amber-700 text-amber-200'
              : 'bg-red-900 border border-red-700 text-red-200'
          }`}
        >
          <p className="text-xs">
            ⚠️{' '}
            <strong>
              {formData.secure_messaging_enabled
                ? 'These will be fully visible to anyone who finds your item.'
                : 'All information below will be fully visible to anyone who finds your item.'}
            </strong>
            <br />
            {formData.secure_messaging_enabled
              ? 'Finders can always reach you through our secure private messaging system.'
              : 'We cannot moderate or assist with direct communications.'}
          </p>
        </div>

        <div className="space-y-3">
          {formData.contacts.length === 0 ? (
            <div className="text-center py-6 bg-neutral-900 rounded-xl border-2 border-dashed border-neutral-700">
              <p className="text-neutral-400 text-sm mb-3">
                No contact methods added
              </p>
              <button
                type="button"
                onClick={addContact}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add your first contact method
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
                  showRemoveButton={true}
                />
              </PhoneInputErrorBoundary>
            ))
          )}
        </div>
      </div>

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
        >
          ← Back
        </button>
        <button type="button" onClick={onNext} className="btn-primary">
          Next: Review & Submit
        </button>
      </div>
    </div>
  );
}
