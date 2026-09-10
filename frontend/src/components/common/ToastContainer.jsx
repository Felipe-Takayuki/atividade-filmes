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
            transform: toast.isExiting ? 'translateY(10px) scale(0.95)' : 'translateY(0) scale(1)',
            transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer'
          }}
          title="Clique para fechar"
          onClick={() => removeToast(toast.id)}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{getIcon(toast.type)}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <span style={{ opacity: 0.6, fontSize: '0.8rem', marginLeft: '0.4rem' }}>&times;</span>
        </div>
      ))}
    </div>
  );
}
