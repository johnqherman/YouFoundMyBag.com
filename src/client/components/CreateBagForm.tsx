import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import type {
  CreateBagRequest,
  CreateBagResponse,
  ContactWithId,
} from '../types/index';
import ContactInput from './ContactInput';
import PhoneInputErrorBoundary from './PhoneInputErrorBoundary';

interface Props {
  onSuccess: (bagData: CreateBagResponse) => void;
}

interface FormData {
  display_name: string;
  owner_message: string;
  contacts: ContactWithId[];
}

export default function CreateBagForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    owner_message: '',
    contacts: [
      {
        id: crypto.randomUUID(),
        type: 'email',
        value: '',
        allow_direct_display: false,
      },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allContactTypes: Array<
    'email' | 'sms' | 'signal' | 'whatsapp' | 'telegram'
  > = ['email', 'sms', 'signal', 'whatsapp', 'telegram'];

  const getAvailableContactTypes = (currentIndex: number) => {
    const usedTypes = formData.contacts
      .map((contact, index) => (index !== currentIndex ? contact.type : null))
      .filter(Boolean);
    return allContactTypes.filter((type) => !usedTypes.includes(type));
  };

  const addContact = () => {
    const availableTypes = getAvailableContactTypes(-1);
    if (availableTypes.length > 0) {
      setFormData((prev) => ({
        ...prev,
        contacts: [
          ...prev.contacts,
          {
            id: crypto.randomUUID(),
            type: availableTypes[0] as
              | 'email'
              | 'sms'
              | 'signal'
              | 'whatsapp'
              | 'telegram',
            value: '',
            allow_direct_display: false,
          },
        ],
      }));
    }
  };

  const removeContact = (index: number) => {
    if (formData.contacts.length > 1) {
      setFormData((prev) => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index),
      }));
    }
  };

  const updateContact = useCallback(
    (index: number, updatedContact: ContactWithId) => {
      setFormData((prev) => ({
        ...prev,
        contacts: prev.contacts.map((contact, i) =>
          i === index
            ? {
                ...updatedContact,
                allow_direct_display:
                  updatedContact.allow_direct_display || false,
              }
            : contact
        ),
      }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validContacts = formData.contacts.filter((contact) =>
        contact.value.trim()
      );

      if (validContacts.length === 0) {
        setError('At least one contact method is required');
        return;
      }

      const contactTypes = validContacts.map((contact) => contact.type);
      const uniqueTypes = new Set(contactTypes);
      if (contactTypes.length !== uniqueTypes.size) {
        setError('You cannot use the same contact type more than once');
        return;
      }

      for (const contact of validContacts) {
        const validationError = validateContactFormat(
          contact.type,
          contact.value
        );
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      const requestData: CreateBagRequest = {
        ...formData,
        display_name: formData.display_name?.trim() || undefined,
        owner_message: formData.owner_message?.trim() || undefined,
        contacts: validContacts.map(({ id, ...contact }) => contact),
      };

      const result = await api.createBag(requestData);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bag');
    } finally {
      setLoading(false);
    }
  };

  const validateContactFormat = (
    type: string,
    value: string
  ): string | null => {
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'sms':
      case 'whatsapp':
      case 'signal':
        if (!value.startsWith('+') || value.length < 7) {
          return 'Please enter a valid phone number';
        }
        break;
      case 'telegram':
        if (!value.startsWith('@')) {
          return 'Telegram username should start with @';
        }
        break;
    }
    return null;
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-6">Create your bag QR code</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium mb-2"
          >
            Your name (optional)
          </label>
          <input
            id="display_name"
            type="text"
            placeholder="e.g., John"
            maxLength={50}
            value={formData.display_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, display_name: e.target.value }))
            }
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="owner_message"
            className="block text-sm font-medium mb-2"
          >
            Message for finder (optional)
          </label>
          <textarea
            id="owner_message"
            placeholder="e.g., Please text me and keep the bag somewhere safe."
            maxLength={500}
            rows={3}
            value={formData.owner_message}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                owner_message: e.target.value,
              }))
            }
            className="input-field resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium">
              Contact methods *
            </label>
            {getAvailableContactTypes(-1).length > 0 && (
              <button
                type="button"
                onClick={addContact}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                + Add another contact method
              </button>
            )}
          </div>

          <div className="space-y-3">
            {formData.contacts.map((contact, index) => (
              <PhoneInputErrorBoundary key={`boundary-${contact.id}`}>
                <ContactInput
                  key={contact.id}
                  contact={contact}
                  onUpdate={(updatedContact) =>
                    updateContact(index, updatedContact)
                  }
                  onRemove={() => removeContact(index)}
                  availableTypes={getAvailableContactTypes(index)}
                  showRemoveButton={formData.contacts.length > 1}
                />
              </PhoneInputErrorBoundary>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating...' : 'Create QR Code'}
        </button>
      </form>
    </div>
  );
}
