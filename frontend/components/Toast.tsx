import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration?: number; // Custom duration in ms
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  
  // Default duration: 5s for action toasts (undo), 3s for regular toasts
  const duration = toast.duration || (toast.action ? 5000 : 3000);

  useEffect(() => {
    const startTime = Date.now();
    
    // Update progress bar for action toasts
    if (toast.action) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
          onRemove();
        }
      }, 50);

      return () => clearInterval(interval);
    } else {
      // Regular toast - just auto-close after duration
      const timer = setTimeout(onRemove, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onRemove, toast.action]);

  const handleActionClick = () => {
    if (toast.action) {
      toast.action.onClick();
      onRemove();
    }
  };

  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const bgColors = {
    success: 'bg-white/90 dark:bg-gray-900/90 border-green-100 dark:border-green-900/30',
    error: 'bg-white/90 dark:bg-gray-900/90 border-red-100 dark:border-red-900/30',
    warning: 'bg-white/90 dark:bg-gray-900/90 border-amber-100 dark:border-amber-900/30',
    info: 'bg-white/90 dark:bg-gray-900/90 border-blue-100 dark:border-blue-900/30',
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <div 
      className={`pointer-events-auto flex flex-col rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-right-8 duration-300 overflow-hidden ${bgColors[toast.type]}`}
      role="alert"
    >
      <div className="flex items-center gap-4 p-4">
        <div className="shrink-0">{icons[toast.type]}</div>
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex-1">{toast.message}</p>
        
        {/* Action button (e.g., Undo) */}
        {toast.action && (
          <button 
            onClick={handleActionClick}
            className="px-3 py-1.5 bg-gray-900/10 dark:bg-white/10 hover:bg-gray-900/20 dark:hover:bg-white/20 rounded-lg font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-200 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
        
        {/* Close button */}
        <button onClick={onRemove} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Progress bar for action toasts */}
      {toast.action && (
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className={`h-full transition-all duration-100 ease-linear ${progressColors[toast.type]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default Toast;
