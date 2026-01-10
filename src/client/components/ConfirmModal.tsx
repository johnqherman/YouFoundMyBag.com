interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'primary';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          button: 'bg-cinnabar-600 hover:bg-cinnabar-700 text-white',
          icon: 'text-cinnabar-600',
        };
      case 'warning':
        return {
          button: 'bg-saffron-600 hover:bg-saffron-700 text-white',
          icon: 'text-saffron-600',
        };
      default:
        return {
          button: 'btn-primary',
          icon: 'text-regal-navy-600',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-regal-navy-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-soft-lg">
        <h2 className={`text-xl font-semibold mb-3 ${styles.icon}`}>{title}</h2>
        <p className="text-regal-navy-700 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary px-6 py-2 rounded-lg"
            autoFocus
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.button} px-6 py-2 rounded-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
