import CharacterLimitInput from '../CharacterLimitInput.js';
import CharacterLimitTextArea from '../CharacterLimitTextArea.js';
import PrivacyWarning from '../PrivacyWarning.js';
import type { BasicInfoProps } from '../../types/index.js';

export default function BasicInfo({
  formData,
  onChange,
  onNext,
}: BasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-1 text-regal-navy-900">
          Basic Information
        </h3>
        <p className="text-sm text-regal-navy-600">Tell us about your item</p>
      </div>

      <div>
        <label
          htmlFor="owner_name"
          className="block text-sm font-medium mb-2 text-regal-navy-800"
        >
          Your name{' '}
          <span className="text-regal-navy-500 font-normal">(optional)</span>
        </label>
        <CharacterLimitInput
          value={formData.owner_name}
          onChange={(value) => onChange({ owner_name: value })}
          maxLength={30}
          placeholder="e.g., John"
          className="input-field"
        />
      </div>

      <div>
        <label
          htmlFor="bag_name"
          className="block text-sm font-medium mb-2 text-regal-navy-800"
        >
          Bag type{' '}
          <span className="text-regal-navy-500 font-normal">(optional)</span>
        </label>
        <CharacterLimitInput
          value={formData.bag_name}
          onChange={(value) => onChange({ bag_name: value })}
          maxLength={30}
          placeholder="e.g., Backpack, Laptop Bag"
          className="input-field"
        />
      </div>

      <div>
        <label
          htmlFor="owner_message"
          className="block text-sm font-medium mb-2 text-regal-navy-800"
        >
          Message for finder{' '}
          <span className="text-regal-navy-500 font-normal">(optional)</span>
        </label>
        <PrivacyWarning
          message="Avoid sharing personal contact details here."
          storageKey="create-bag-message-privacy-tip"
          variant="light"
          className="mb-3"
        />
        <CharacterLimitTextArea
          value={formData.owner_message}
          onChange={(value) => onChange({ owner_message: value })}
          maxLength={150}
          placeholder="e.g., Please text me and keep the bag somewhere safe."
          rows={3}
          className="input-field"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" onClick={onNext} className="btn-primary">
          Next: Contact Preferences
        </button>
      </div>
    </div>
  );
}
