import CharacterLimitInput from '../CharacterLimitInput';
import CharacterLimitTextArea from '../CharacterLimitTextArea';
import PrivacyWarning from '../PrivacyWarning';

interface Step1Props {
  formData: {
    owner_name: string;
    bag_name: string;
    owner_message: string;
  };
  onChange: (updates: Partial<Step1Props['formData']>) => void;
  onNext: () => void;
}

export default function Step1BasicInfo({
  formData,
  onChange,
  onNext,
}: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
      </div>

      <div>
        <label htmlFor="owner_name" className="block text-sm font-medium mb-2">
          Your name (optional)
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
        <label htmlFor="bag_name" className="block text-sm font-medium mb-2">
          Bag type (optional)
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
          onChange={(value) => onChange({ owner_message: value })}
          maxLength={150}
          placeholder="e.g., Please text me and keep the bag somewhere safe."
          rows={3}
          className="input-field"
        />
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onNext} className="btn-primary">
          Next: Contact Preferences
        </button>
      </div>
    </div>
  );
}
