import { useRef } from 'react';

export function useModalBackdrop(onClose: () => void) {
  const mouseDownOnBackdrop = useRef(false);

  return {
    onMouseDown: (e: React.MouseEvent) => {
      mouseDownOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: () => {
      if (mouseDownOnBackdrop.current) onClose();
    },
  };
}
