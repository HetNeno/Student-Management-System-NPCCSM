import { useEffect, useRef, useState } from 'react';

const TOAST_LIMIT = 4;

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

export const TOAST_TYPES = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'fas fa-check-circle', iconColor: 'text-emerald-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'fas fa-triangle-exclamation', iconColor: 'text-amber-500' },
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'fas fa-circle-xmark', iconColor: 'text-red-500' },
  info: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', icon: 'fas fa-circle-info', iconColor: 'text-indigo-500' },
};

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          onAnimationEnd={(e) => { if (e.animationName === 'toastOut') onDismiss(t.id); }}
          className={`toast flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg max-w-sm ${TOAST_TYPES[t.type]?.bg || 'bg-white'} ${TOAST_TYPES[t.type]?.border || 'border-slate-200'} ${TOAST_TYPES[t.type]?.text || 'text-slate-800'}`}
        >
          <i className={`${TOAST_TYPES[t.type]?.icon || 'fas fa-info-circle'} ${TOAST_TYPES[t.type]?.iconColor || 'text-indigo-500'} mt-0.5`} />
          <div className="flex-1 min-w-0">
            {t.title && <p className="text-xs font-bold">{t.title}</p>}
            <p className="text-xs font-medium opacity-90">{t.message}</p>
          </div>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
            <i className="fas fa-xmark text-xs" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const addToast = (type, message, { title, duration = 4500 } = {}) => {
    const id = nextId();
    setToasts((prev) => [...prev, { id, type, message, title }].slice(-TOAST_LIMIT));
    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismissToast(id), duration);
    }
    return id;
  };

  const dismissToast = (id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message, opts) => addToast('success', message, opts);
  const warning = (message, opts) => addToast('warning', message, opts);
  const error   = (message, opts) => addToast('error', message, opts);
  const info    = (message, opts) => addToast('info', message, opts);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return { toasts, dismissToast, success, warning, error, info };
}
