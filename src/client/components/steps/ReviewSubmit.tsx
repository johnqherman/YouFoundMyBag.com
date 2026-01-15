import { useState, useEffect } from 'react';
import type {
  ContactWithId,
  ReviewSubmitProps,
  SortableContactItemProps,
} from '../../types/index.js';
import {
  formatContactValue,
  formatPhoneNumber,
  formatContactTypeName,
} from '../../../infrastructure/utils/formatting.js';
import { getContactMethodIcon } from '../icons/AppIcons.js';
import Twemoji from '../Twemoji.js';
import {
  SignalIcon,
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  GripVerticalIcon,
} from '../icons/BrandIcons.js';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableContactItem({
  contact,
  index: _index,
  isDragDisabled,
}: SortableContactItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getBrandIconForType = (type: string) => {
    switch (type) {
      case 'signal':
        return <SignalIcon size={18} className="brand-icon-signal" />;
      case 'whatsapp':
        return <WhatsAppIcon size={18} className="brand-icon-whatsapp" />;
      case 'telegram':
        return <TelegramIcon size={18} className="brand-icon-telegram" />;
      case 'instagram':
        return <InstagramIcon size={18} className="brand-icon-instagram" />;
      default: {
        const ContactIcon = getContactMethodIcon(type);
        return <ContactIcon color="currentColor" />;
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-white border border-regal-navy-100 hover:border-regal-navy-200 transition-all duration-200"
    >
      {!isDragDisabled && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-regal-navy-400 hover:text-regal-navy-600 transition-colors flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon size={16} />
        </button>
      )}
      <div className="flex items-center justify-between gap-4 flex-1">
        <span className="text-regal-navy-700 flex items-center gap-2.5">
          <span className="brand-icon flex-shrink-0">
            {getBrandIconForType(contact.type)}
          </span>
          <span className="font-medium">
            {contact.label || formatContactTypeName(contact.type)}
          </span>
          {contact.is_primary && (
            <span className="badge badge-neutral text-xs">Primary</span>
          )}
        </span>
        <span className="text-regal-navy-900 font-medium text-right break-all">
          {contact.type === 'sms' ||
          contact.type === 'whatsapp' ||
          contact.type === 'signal' ||
          (contact.type === 'telegram' && contact.value.startsWith('+'))
            ? formatPhoneNumber(contact.value)
            : formatContactValue(contact.type, contact.value)}
        </span>
      </div>
    </div>
  );
}

export default function ReviewSubmit({
  formData,
  onBack,
  onSubmit,
  onContactsReorder,
  loading,
  error,
}: ReviewSubmitProps) {
  const [contacts, setContacts] = useState<ContactWithId[]>(() => {
    const sorted = [...formData.contacts];
    sorted.sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return 0;
    });
    return sorted;
  });

  useEffect(() => {
    const sorted = [...formData.contacts];
    sorted.sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return 0;
    });
    setContacts(sorted);

    if (
      onContactsReorder &&
      JSON.stringify(sorted) !== JSON.stringify(formData.contacts)
    ) {
      onContactsReorder(sorted);
    }
  }, [formData.contacts, onContactsReorder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const validContacts = contacts.filter((c) => c.value.trim());
      const emptyContacts = contacts.filter((c) => !c.value.trim());

      const oldIndex = validContacts.findIndex((c) => c.id === active.id);
      const newIndex = validContacts.findIndex((c) => c.id === over.id);

      const reorderedValidContacts = arrayMove(
        validContacts,
        oldIndex,
        newIndex
      );
      const newContacts = [...reorderedValidContacts, ...emptyContacts];

      setContacts(newContacts);

      if (onContactsReorder) {
        onContactsReorder(newContacts);
      }
    }
  };

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
            <Twemoji className="text-regal-navy-900 font-medium text-right">
              {formData.owner_name || 'Not provided'}
            </Twemoji>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-regal-navy-600">Bag type:</span>
            <Twemoji className="text-regal-navy-900 font-medium text-right">
              {formData.bag_name || 'Not provided'}
            </Twemoji>
          </div>
          {formData.owner_message && (
            <div className="flex justify-between gap-4 items-start">
              <span className="text-regal-navy-600 shrink-0">Message:</span>
              <Twemoji className="text-regal-navy-900 font-medium text-right">
                &quot;{formData.owner_message}&quot;
              </Twemoji>
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

      {contacts.length > 0 && (
        <div className="bg-regal-navy-50 border border-regal-navy-100 rounded-lg p-5">
          <h4 className="font-medium text-regal-navy-900 mb-3 text-sm">
            Contact Methods
          </h4>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={contacts.filter((c) => c.value.trim()).map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {(() => {
                  const validContacts = contacts.filter((contact) =>
                    contact.value.trim()
                  );
                  const isDragDisabled = validContacts.length <= 1;

                  return validContacts.map((contact, index) => (
                    <SortableContactItem
                      key={contact.id}
                      contact={contact}
                      index={index}
                      isDragDisabled={isDragDisabled}
                    />
                  ));
                })()}
              </div>
            </SortableContext>
          </DndContext>
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
