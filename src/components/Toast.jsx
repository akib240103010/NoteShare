import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  const bgBorders = {
    success: 'border-emerald-200 dark:border-emerald-900/60 bg-white/95 dark:bg-gray-900/95 text-slate-800 dark:text-gray-100 shadow-emerald-500/10',
    error: 'border-rose-200 dark:border-rose-900/60 bg-white/95 dark:bg-gray-900/95 text-slate-800 dark:text-gray-100 shadow-rose-500/10',
    info: 'border-indigo-200 dark:border-indigo-900/60 bg-white/95 dark:bg-gray-900/95 text-slate-800 dark:text-gray-100 shadow-indigo-500/10',
  };

  return (
    <div className="fixed top-4 left-4 right-4 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm z-[60] pointer-events-none animate-bounce-in transition-all duration-300">
      <div
        className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
          bgBorders[toast.type] || bgBorders.info
        }`}
      >
        {icons[toast.type] || icons.info}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.title || 'Notification'}</p>
          {toast.message && <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5 leading-relaxed">{toast.message}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
