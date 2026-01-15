import type { ContactPreferenceProps } from '../../types/index.js';

export default function ContactPreference({
  formData,
  onNext,
  onBack,
  onContactPreferenceChange,
}: ContactPreferenceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1 text-regal-navy-900">
          Contact Preferences
        </h3>
        <p className="text-sm text-regal-navy-600">
          Choose how finders can reach you
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4 text-regal-navy-800">
          How would you like finders to contact you?
        </label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-regal-navy-200 rounded-lg hover:border-regal-navy-400 hover:bg-regal-navy-50 transition-all duration-150">
            <input
              type="radio"
              name="contact_preference"
              checked={formData.secure_messaging_enabled}
              onChange={() => onContactPreferenceChange(true)}
              className="mt-1 text-regal-navy-600 focus:ring-regal-navy-500"
            />
            <div className="flex-1">
              <div className="font-medium text-regal-navy-900">
                Secure Messaging{' '}
                <span className="text-regal-navy-600 font-normal text-sm">
                  (Recommended)
                </span>
              </div>
              <div className="text-sm text-regal-navy-600 mt-2 space-y-1">
                <div>
                  • Message privately without revealing personal contact details
                </div>
                <div>• Option to share public contact info if you choose</div>
                <div>• Email required for inbox access</div>
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-regal-navy-200 rounded-lg hover:border-regal-navy-400 hover:bg-regal-navy-50 transition-all duration-150">
            <input
              type="radio"
              name="contact_preference"
              checked={!formData.secure_messaging_enabled}
              onChange={() => onContactPreferenceChange(false)}
              className="mt-1 text-regal-navy-600 focus:ring-regal-navy-500"
            />
            <div className="flex-1">
              <div className="font-medium text-regal-navy-900">
                Direct Contact Only
              </div>
              <div className="text-sm text-regal-navy-600 mt-2 space-y-1">
                <div>• Public contact details only</div>
                <div>• No secure inbox</div>
                <div>• No email required</div>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="btn-ghost">
          ← Back
        </button>
        <button type="button" onClick={onNext} className="btn-primary">
          Next: Contact Details
        </button>
      </div>
    </div>
  );
}
