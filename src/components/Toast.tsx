import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  text: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2500); // Auto-dismiss in 2.5s, as specified

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-success-dairy' : 'bg-danger-dairy';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className="fixed inset-x-0 top-4 z-[90] flex justify-center px-4">
      <div className={`w-full max-w-[398px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 ${bgColor} text-white animate-slide-down-alert`}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium leading-tight">{message}</span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 rounded-full hover:bg-white/10 transition-colors tap-feedback"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
