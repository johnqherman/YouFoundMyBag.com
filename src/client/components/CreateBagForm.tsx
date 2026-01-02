import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import type {
  CreateBagRequest,
  CreateBagResponse,
  ContactWithId,
} from '../types/index';
import ContactInput from './ContactInput';
import PhoneInputErrorBoundary from './PhoneInputErrorBoundary';
import CharacterLimitInput from './CharacterLimitInput';
import CharacterLimitTextArea from './CharacterLimitTextArea';
import PrivacyWarning from './PrivacyWarning';

interface Props {
  onSuccess: (bagData: CreateBagResponse) => void;
}

interface FormData {
  owner_name: string;
  bag_name: string;
  owner_message: string;
  owner_email: string;
  contacts: ContactWithId[];
}

export default function CreateBagForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState<FormData>({
    owner_name: '',
    bag_name: '',
    owner_message: '',
    owner_email: '',
    contacts: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allContactTypes: Array<'sms' | 'signal' | 'whatsapp' | 'telegram'> = [
    'sms',
    'signal',
    'whatsapp',
    'telegram',
  ];

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
              | 'sms'
              | 'signal'
              | 'whatsapp'
              | 'telegram',
            value: '',
          },
        ],
      }));
    }
  };

  const removeContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const updateContact = useCallback(
    (index: number, updatedContact: ContactWithId) => {
      setFormData((prev) => ({
        ...prev,
        contacts: prev.contacts.map((contact, i) =>
          i === index ? updatedContact : contact
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
      if (!formData.owner_email.trim()) {
        setError('Your email address is required');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.owner_email.trim())) {
        setError('Please enter a valid email address');
        return;
      }

      const validContacts = formData.contacts.filter((contact) =>
        contact.value.trim()
      );

      if (validContacts.length > 0) {
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
      }

      const requestData: CreateBagRequest = {
        owner_name: formData.owner_name?.trim() || undefined,
        bag_name: formData.bag_name?.trim() || undefined,
        owner_message: formData.owner_message?.trim() || undefined,
        owner_email: formData.owner_email.trim(),
        contacts: validContacts.map(({ type, value }) => ({
          type,
          value,
        })),
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
            htmlFor="owner_name"
            className="block text-sm font-medium mb-2"
          >
            Your name (optional)
          </label>
          <CharacterLimitInput
            value={formData.owner_name}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, owner_name: value }))
            }
            maxLength={30}
            placeholder="e.g., John"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="bag_name" className="block text-sm font-medium mb-2">
            Bag type (optional)
          </label>
          <CharacterLimitInput
            value={formData.bag_name}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, bag_name: value }))
            }
            maxLength={30}
            placeholder="e.g., Backpack, Laptop Bag"
            className="input-field"
          />
        </div>

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
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, owner_email: e.target.value }))
            }
            required
            className="input-field"
            maxLength={254}
          />
          <p className="text-xs text-neutral-400 mt-1">
            Required for secure messaging dashboard access
          </p>
        </div>

        <div>
          <label
            htmlFor="owner_message"
            className="block text-sm font-medium mb-2"
          >
            Message for finder (optional)
          </label>
          <PrivacyWarning
            message="Avoid sharing personal contact details here."
            storageKey="create-bag-message-privacy-tip"
            variant="dark"
            className="mb-3"
          />
          <CharacterLimitTextArea
            value={formData.owner_message}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                owner_message: value,
              }))
            }
            maxLength={150}
            placeholder="e.g., Please text me and keep the bag somewhere safe."
            rows={3}
            className="input-field"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              Contact methods (optional)
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

          <div className="bg-amber-900 border border-amber-700 text-amber-200 px-3 py-2 rounded-lg mb-4">
            <p className="text-xs">
              ⚠️{' '}
              <strong>
                These will be visible to anyone who finds your item.
              </strong>{' '}
              Finders can always reach you through our secure
              private messaging system.
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating...' : 'Create QR Code'}
        </button>
      </form>
    </div>
  );
}
