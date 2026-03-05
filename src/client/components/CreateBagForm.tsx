import {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../utils/api.js';
import { useToast } from '../hooks/useToast.js';
import type {
  CreateBagRequest,
  ContactWithId,
  CreateBagFormProps,
  FormData,
} from '../types/index.js';
import StepIndicator from './StepIndicator.js';
import BasicInfo from './steps/BasicInfo.js';
import { emailSchema } from '../../infrastructure/utils/validation.js';
import ContactPreference from './steps/ContactPreference.js';
import ContactDetails from './steps/ContactDetails.js';
import ReviewSubmit from './steps/ReviewSubmit.js';
import RequestMagicLinkModal from './RequestMagicLinkModal.js';

export default function CreateBagForm({
  onSuccess,
  initialEmail = '',
  initialOwnerName = '',
  isPro = false,
}: CreateBagFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    owner_name: initialOwnerName,
    bag_name: '',
    owner_message: '',
    owner_email: initialEmail,
    contacts: [],
    secure_messaging_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);

  useEffect(() => {
    if (
      initialEmail &&
      formData.secure_messaging_enabled &&
      !formData.owner_email
    ) {
      setFormData((prev) => ({ ...prev, owner_email: initialEmail }));
    }
  }, [initialEmail]);

  useEffect(() => {
    if (initialOwnerName && !formData.owner_name) {
      setFormData((prev) => ({ ...prev, owner_name: initialOwnerName }));
    }
  }, [initialOwnerName]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setCardHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        owner_email: prev.owner_email || initialEmail,
        contacts: [],
      }));
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 2:
        return true;
      case 3: {
        if (formData.secure_messaging_enabled) {
          if (!formData.owner_email.trim()) {
            toast.error('An email address is required for secure messaging');
            return false;
          }
          const result = emailSchema.safeParse(formData.owner_email.trim());
          if (!result.success) {
            toast.error('Please enter a valid email address');
            return false;
          }

          const blankContacts = formData.contacts.filter(
            (contact) => !contact.value.trim()
          );
          if (blankContacts.length > 0) {
            toast.error('Please fill in or remove empty contact methods');
            return false;
          }
        } else {
          const validContacts = formData.contacts.filter((contact) =>
            contact.value.trim()
          );
          if (validContacts.length === 0) {
            toast.error(
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
            toast.error(validationError);
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
    setLoading(true);

    try {
      if (formData.secure_messaging_enabled) {
        if (!formData.owner_email.trim()) {
          toast.error('An email address is required for secure messaging');
          return;
        }

        const result = emailSchema.safeParse(formData.owner_email.trim());
        if (!result.success) {
          toast.error('Please enter a valid email address');
          return;
        }

        const blankContacts = formData.contacts.filter(
          (contact) => !contact.value.trim()
        );
        if (blankContacts.length > 0) {
          toast.error('Please fill in or remove empty contact methods');
          return;
        }
      } else {
        const validContacts = formData.contacts.filter((contact) =>
          contact.value.trim()
        );

        if (validContacts.length === 0) {
          toast.error(
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
          toast.error('You cannot use the same contact type more than once');
          return;
        }

        for (const contact of validContacts) {
          const validationError = validateContactFormat(
            contact.type,
            contact.value
          );
          if (validationError) {
            toast.error(validationError);
            return;
          }
        }
      }

      const requestData: CreateBagRequest = {
        owner_name: formData.owner_name?.trim() || undefined,
        bag_name: formData.bag_name?.trim() || undefined,
        owner_message: formData.owner_message?.trim() || undefined,
        secure_messaging_enabled: formData.secure_messaging_enabled,
        contacts: validContacts.map(({ type, value, label }, index) => {
          let cleanValue = value;
          if (type === 'telegram' || type === 'instagram') {
            cleanValue = value.replace(/^@+/, '');
          }
          return {
            type,
            value: cleanValue,
            label: type === 'other' && label ? label : undefined,
            is_primary: index === 0,
          };
        }),
      };

      if (formData.secure_messaging_enabled) {
        requestData.owner_email = formData.owner_email.trim();
      }

      const result = await api.createBag(requestData);
      onSuccess(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create bag';
      if (message.includes('plan limit') || message.includes('Plan limit')) {
        setShowDashboardModal(true);
      } else {
        toast.error(message);
      }
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
      case 'telegram': {
        const cleanValue = value.replace(/^@+/, '');
        if (cleanValue.length < 4 || cleanValue.length > 31) {
          return 'Telegram username must be 4-31 characters';
        }
        if (!/^[A-Za-z0-9_]{4,31}$/.test(cleanValue)) {
          return 'Telegram username can only contain letters, numbers, and underscores';
        }
        break;
      }
      case 'instagram': {
        const cleanValue = value.replace(/^@+/, '');
        if (cleanValue.length < 1 || cleanValue.length > 30) {
          return 'Instagram username must be 1-30 characters';
        }
        if (!/^[A-Za-z0-9_.]{1,30}$/.test(cleanValue)) {
          return 'Instagram username can only contain letters, numbers, periods, and underscores';
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
      case 1: {
        const ownerNameLocked = !isPro && !!initialOwnerName;
        return (
          <BasicInfo
            formData={{
              owner_name: formData.owner_name,
              bag_name: formData.bag_name,
              owner_message: formData.owner_message,
            }}
            onChange={updateFormData}
            onNext={nextStep}
            ownerNameLocked={ownerNameLocked}
          />
        );
      }
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <motion.div
        className="bg-white border border-regal-navy-100 rounded-lg shadow-soft overflow-hidden"
        animate={{ height: cardHeight ?? 'auto' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div ref={contentRef} className="p-4 sm:p-6">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepNames={stepNames}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderCurrentStep()}
              </motion.div>
            </AnimatePresence>
          </form>
        </div>
      </motion.div>

      <RequestMagicLinkModal
        isOpen={showDashboardModal}
        onClose={() => setShowDashboardModal(false)}
        initialEmail={formData.owner_email.trim()}
      />
    </>
  );
}
