interface ContactPreferenceProps {
  formData: {
    secure_messaging_enabled: boolean;
  };
  onChange: (updates: Partial<ContactPreferenceProps['formData']>) => void;
  onNext: () => void;
  onBack: () => void;
  onContactPreferenceChange: (useSecureMessaging: boolean) => void;
}

export default function ContactPreference({
  formData,
  onNext,
  onBack,
  onContactPreferenceChange,
}: ContactPreferenceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Contact Preferences</h3>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">
          How would you like finders to contact you?
        </label>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="contact_preference"
              checked={formData.secure_messaging_enabled}
              onChange={() => onContactPreferenceChange(true)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-white">
                Secure messaging (recommended)
              </div>
              <div className="text-sm text-neutral-400 mt-1">
                • Protect your identity while messaging
                <br />• Email needed for dashboard access
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="contact_preference"
              checked={!formData.secure_messaging_enabled}
              onChange={() => onContactPreferenceChange(false)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-white">Direct contact only</div>
              <div className="text-sm text-neutral-400 mt-1">
                • Info is fully public for contact
                <br />
                • No email needed
                <br />• ⚠️{' '}
                <span className="text-amber-400">
                  View risks and requirements
                </span>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-neutral-400 hover:text-white"
        >
          ← Back
        </button>
        <button type="button" onClick={onNext} className="btn-primary">
          Next: Contact Details
        </button>
      </div>
    </div>
  );
}
