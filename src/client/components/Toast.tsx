import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ToastItem } from '../hooks/useToast.js';

const STRIPE_COLORS = {
  success: '#34cb5a',
  error: '#f0220f',
  warning: '#e7ba18',
  info: '#4279bd',
} as const;

function SuccessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#34cb5a" strokeWidth="1.5" />
      <path
        d="M5 8l2 2 4-4"
        stroke="#34cb5a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#f0220f" strokeWidth="1.5" />
      <path
        d="M5.5 5.5l5 5M10.5 5.5l-5 5"
        stroke="#f0220f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2L14.5 13.5H1.5L8 2Z"
        stroke="#e7ba18"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5V9"
        stroke="#e7ba18"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="0.75" fill="#e7ba18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#4279bd" strokeWidth="1.5" />
      <path
        d="M8 7.5V11"
        stroke="#4279bd"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="5" r="0.75" fill="#4279bd" />
    </svg>
  );
}

const ICONS = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
} as const;

interface ToastCardProps {
  toast: ToastItem;
  removeToast: (id: string) => void;
}

function ToastCard({ toast, removeToast }: ToastCardProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  const animate = useCallback(() => {
    if (pausedRef.current) return;
    const now = performance.now();
    const total = elapsedRef.current + (now - startRef.current);
    const remaining = Math.max(0, toast.duration - total);
    const pct = (remaining / toast.duration) * 100;
    if (barRef.current) {
      barRef.current.style.width = `${pct}%`;
    }
    if (remaining <= 0) {
      removeToast(toast.id);
      return;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [toast.id, toast.duration, removeToast]);

  const startTimer = useCallback(() => {
    startRef.current = performance.now();
    pausedRef.current = false;
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const pauseTimer = useCallback(() => {
    pausedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    elapsedRef.current += performance.now() - startRef.current;
  }, []);

  useEffect(() => {
    startTimer();
    return () => cancelAnimationFrame(rafRef.current);
  }, [startTimer]);

  const Icon = ICONS[toast.type] ?? InfoIcon;
  const stripeColor = STRIPE_COLORS[toast.type] ?? STRIPE_COLORS.info;

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 380, damping: 28 },
      }}
      exit={{
        x: 480,
        opacity: 0,
        transition: { duration: 0.22, ease: 'easeIn' },
      }}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className="pointer-events-auto w-[480px] bg-white rounded-xl shadow-soft-lg border border-regal-navy-100 overflow-hidden flex relative"
      role="alert"
    >
      <div
        className="w-1.5 shrink-0"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex items-start gap-4 px-5 py-4 flex-1 min-w-0">
        <div className="shrink-0 mt-0.5">
          <Icon />
        </div>
        <p className="text-[1.05rem] leading-snug text-regal-navy-800 break-words min-w-0 flex-1">
          {toast.message}
        </p>
        <button
          onClick={() => removeToast(toast.id)}
          className="shrink-0 text-regal-navy-400 hover:text-regal-navy-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="21" height="21" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div
        ref={barRef}
        className="absolute bottom-0 left-0 h-[3px]"
        style={{ width: '100%', backgroundColor: stripeColor, opacity: 0.5 }}
      />
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
