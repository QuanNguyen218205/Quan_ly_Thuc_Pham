import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ServerResponse, StockMutationResult } from '@food-mgmt/shared-sim';
import type { LiquidateTarget } from '../state/useMobileClient';
import { formatIsoDateShort } from '../domain/food-lot-presentation';

interface LiquidateDialogProps {
  target: LiquidateTarget | null;
  isOfflineReadOnly: boolean;
  onClose: () => void;
  onConfirm: (itemId: number, reason: string) => Promise<ServerResponse<StockMutationResult>>;
}

const LIQUIDATE_REASONS = ['Hết hạn sử dụng', 'Hư hỏng / ôi thiu', 'Nhập sai lô'];

export function LiquidateDialog({
  target,
  isOfflineReadOnly,
  onClose,
  onConfirm,
}: LiquidateDialogProps) {
  const [reason, setReason] = useState('Hết hạn sử dụng');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setReason(target.defaultReason ?? 'Hết hạn sử dụng');
    setIsSubmitting(false);
    setErrorMessage(null);
  }, [target]);

  if (!target) return null;

  const handleConfirm = async () => {
    if (isOfflineReadOnly) {
      setErrorMessage('Đang ngoại tuyến — không thể thực hiện thanh lý khi mất kết nối Server.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await onConfirm(target.item_id, reason);
      if (res.ok) {
        onClose();
      } else {
        setErrorMessage(res.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="mob-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận thanh lý hoặc vứt hủy thực phẩm"
      data-testid="mob-sheet-MOB-S05"
    >
      <div className="mob-dialog-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle
            size={22}
            style={{ color: 'var(--status-expired-base)', flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <div>
            <h2 className="t-screen-title">Xác nhận Thanh lý / Hủy lô</h2>
            <p className="t-meta" style={{ margin: '4px 0 0' }}>
              <strong>{target.food_name}</strong> · HSD{' '}
              <span className="mono-num">{formatIsoDateShort(target.expiry_date)}</span>
            </p>
          </div>
        </div>

        {target.current_quantity > 0 && (
          <div className="mob-banner-alert mob-banner-alert-warning" data-testid="mob-liquidate-warning">
            <span style={{ fontSize: 'var(--text-sm)' }}>
              Cảnh báo: Lô này vẫn còn{' '}
              <strong className="mono-num">
                {target.current_quantity} {target.unit_name}
              </strong>
              . Xác nhận hủy sẽ trừ tồn về <strong className="mono-num">0</strong>, chuyển trạng thái
              thành <strong>&ldquo;Đã hủy&rdquo;</strong> và vẫn giữ nguyên lịch sử giao dịch.
            </span>
          </div>
        )}

        <div className="mob-field">
          <span className="mob-field-label">Lý do thanh lý / vứt hủy</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {LIQUIDATE_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`mob-chip ${reason === preset ? 'mob-chip-active' : ''}`}
                style={{ minHeight: 38 }}
                onClick={() => setReason(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="mob-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do khác..."
          />
        </div>

        {errorMessage && (
          <div className="mob-banner-alert mob-banner-alert-danger" role="alert">
            <span style={{ fontSize: 'var(--text-sm)' }}>{errorMessage}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
          {/* Quiet ghost back-out button per ui-tokens-contract.md */}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isSubmitting}
            data-testid="mob-liquidate-keep"
            onClick={onClose}
          >
            Giữ lại
          </button>
          <button
            type="button"
            className="btn btn-danger btn-fixed-md"
            disabled={isSubmitting || isOfflineReadOnly}
            data-testid="mob-liquidate-confirm"
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Đang hủy…</span>
              </>
            ) : (
              <span>Xác nhận hủy</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
