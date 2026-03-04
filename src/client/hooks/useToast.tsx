import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { ToastContainer } from '../components/Toast.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (item: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {createPortal(
        <ToastContainer toasts={toasts} removeToast={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  const { addToast } = ctx;

  const toast = useMemo(
    () => ({
      success: (message: string, opts?: { duration?: number }) =>
        addToast({
          type: 'success',
          message,
          duration: opts?.duration ?? 5000,
        }),
      error: (message: string, opts?: { duration?: number }) =>
        addToast({ type: 'error', message, duration: opts?.duration ?? 5000 }),
      warning: (message: string, opts?: { duration?: number }) =>
        addToast({
          type: 'warning',
          message,
          duration: opts?.duration ?? 5000,
        }),
      info: (message: string, opts?: { duration?: number }) =>
        addToast({ type: 'info', message, duration: opts?.duration ?? 5000 }),
    }),
    [addToast]
  );

  return { toast };
}
