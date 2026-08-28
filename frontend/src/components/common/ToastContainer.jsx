import React from 'react';
import { useToast } from '../../context/ToastContext';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div id="toast-container" className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{
            opacity: toast.isExiting ? 0 : 1,
            transform: toast.isExiting ? 'translateY(10px)' : 'translateY(0)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onClick={() => removeToast(toast.id)}
        >
          <span>{getIcon(toast.type)}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
