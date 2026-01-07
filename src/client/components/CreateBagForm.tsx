import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import type {
  CreateBagRequest,
  CreateBagResponse,
  ContactWithId,
} from '../types/index';
import StepIndicator from './StepIndicator';
import BasicInfo from './steps/BasicInfo';
import { emailSchema } from '../../infrastructure/utils/validation';
import ContactPreference from './steps/ContactPreference';
import ContactDetails from './steps/ContactDetails';
import ReviewSubmit from './steps/ReviewSubmit';

interface Props {
  onSuccess: (bagData: CreateBagResponse) => void;
}

interface FormData {
  owner_name: string;
  bag_name: string;
  owner_message: string;
  owner_email: string;
  contacts: ContactWithId[];
  secure_messaging_enabled: boolean;
}

export default function CreateBagForm({ onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    owner_name: '',
    bag_name: '',
    owner_message: '',
    owner_email: '',
    contacts: [],
    secure_messaging_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepNames = [
    'Basic Information',
    'Contact Preferences',
    'Contact Details',
    'Review & Submit',
  ];
  const totalSteps = stepNames.length;

  const allContactTypes: Array<
    'sms' | 'whatsapp' | 'email' | 'instagram' | 'telegram' | 'signal' | 'other'
  > = ['sms', 'whatsapp', 'email', 'instagram', 'telegram', 'signal', 'other'];

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
            type: availableTypes[0] as ContactWithId['type'],
            value: '',
            is_primary: prev.contacts.length === 0,
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
        contacts: prev.contacts.map((contact, i) => {
          if (i === index) {
            return updatedContact;
          }
          if (updatedContact.is_primary && contact.is_primary) {
            return { ...contact, is_primary: false };
          }
          return contact;
        }),
      }));
    },
    []
  );

  const handleContactPreferenceChange = (useSecureMessaging: boolean) => {
    if (!useSecureMessaging) {
      setFormData((prev) => ({
        ...prev,
        secure_messaging_enabled: false,
        owner_email: '',
      }));
      if (formData.contacts.length === 0) {
        addContact();
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        secure_messaging_enabled: true,
        contacts: [],
      }));
    }
  };

  const validateCurrentStep = (): boolean => {
    setError(null);

    switch (currentStep) {
      case 2:
        return true;
      case 3: {
        if (formData.secure_messaging_enabled) {
          if (!formData.owner_email.trim()) {
            setError('An email address is required for secure messaging');
            return false;
          }
          const result = emailSchema.safeParse(formData.owner_email.trim());
          if (!result.success) {
            setError('Please enter a valid email address');
            return false;
          }
        } else {
          const validContacts = formData.contacts.filter((contact) =>
            contact.value.trim()
          );
          if (validContacts.length === 0) {
            setError(
              'At least one contact method is required for direct contact'
            );
            return false;
          }
        }

        const validContacts = formData.contacts.filter((contact) =>
          contact.value.trim()
        );
        for (const contact of validContacts) {
          const validationError = validateContactFormat(
            contact.type,
            contact.value
          );
          if (validationError) {
            setError(validationError);
            return false;
          }
        }
        return true;
      }
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleContactsReorder = (reorderedContacts: ContactWithId[]) => {
    const updatedContacts = reorderedContacts.map((contact, index) => ({
      ...contact,
      is_primary: index === 0,
    }));
    setFormData((prev) => ({ ...prev, contacts: updatedContacts }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (formData.secure_messaging_enabled) {
        if (!formData.owner_email.trim()) {
          setError('An email address is required for secure messaging');
          return;
        }

        const result = emailSchema.safeParse(formData.owner_email.trim());
        if (!result.success) {
          setError('Please enter a valid email address');
          return;
        }
      } else {
        const validContacts = formData.contacts.filter((contact) =>
          contact.value.trim()
        );

        if (validContacts.length === 0) {
          setError(
            'At least one contact method is required for direct contact'
          );
          return;
        }
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
        secure_messaging_enabled: formData.secure_messaging_enabled,
        contacts: validContacts.map(({ type, value, label }, index) => ({
          type,
          value,
          label,
          is_primary: index === 0,
        })),
      };

      if (formData.secure_messaging_enabled) {
        requestData.owner_email = formData.owner_email.trim();
      }

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
          return 'Please enter a valid phone number with country code';
        }
        break;
      case 'email': {
        const result = emailSchema.safeParse(value);
        if (!result.success) {
          return 'Please enter a valid email address';
        }
        break;
      }
      case 'other':
        if (value.length < 3) {
          return 'Contact information should be at least 3 characters';
        }
        break;
    }
    return null;
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfo
            formData={{
              owner_name: formData.owner_name,
              bag_name: formData.bag_name,
              owner_message: formData.owner_message,
            }}
            onChange={updateFormData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <ContactPreference
            formData={{
              secure_messaging_enabled: formData.secure_messaging_enabled,
            }}
            onChange={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
            onContactPreferenceChange={handleContactPreferenceChange}
          />
        );
      case 3:
        return (
          <ContactDetails
            formData={{
              owner_email: formData.owner_email,
              contacts: formData.contacts,
              secure_messaging_enabled: formData.secure_messaging_enabled,
            }}
            onChange={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
            addContact={addContact}
            removeContact={removeContact}
            updateContact={updateContact}
            getAvailableContactTypes={getAvailableContactTypes}
            error={error}
          />
        );
      case 4:
        return (
          <ReviewSubmit
            formData={formData}
            onBack={prevStep}
            onSubmit={handleSubmit}
            onContactsReorder={handleContactsReorder}
            loading={loading}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="card">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepNames={stepNames}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderCurrentStep()}
      </form>
    </div>
  );
}
