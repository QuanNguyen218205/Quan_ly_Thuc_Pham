import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastItem } from '../state/useDesktopServer';

interface ToastBannerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastBanner({ toasts, onDismiss }: ToastBannerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-label="Thông báo hệ thống" aria-live="polite">
      {toasts.map((toast) => {
        const Icon =
          toast.kind === 'success'
            ? CheckCircle2
            : toast.kind === 'error'
              ? AlertCircle
              : toast.kind === 'warning'
                ? AlertTriangle
                : Info;

        return (
          <div
            key={toast.id}
            className={`toast-card toast-${toast.kind}`}
            role="status"
            data-testid={`dsk-toast-${toast.kind}`}
          >
            <span className="toast-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.detail ? <div className="toast-detail">{toast.detail}</div> : null}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
