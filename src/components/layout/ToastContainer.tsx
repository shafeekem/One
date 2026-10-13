import React from 'react';
import { useApp } from '../../context/AppContext.js';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-18 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl transition-all duration-200 text-sm ${
            toast.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/20'
              : toast.type === 'error'
              ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/20'
              : 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-slate-950/40'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
          <p className="flex-1 text-xs leading-relaxed font-mono">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};
