import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, AlertTriangle, Trash2, X } from 'lucide-react';
import type {
  FoodLotView,
  ProtocolAction,
  ProtocolRequestMap,
  ServerResponse,
} from '@food-mgmt/shared-sim';
import { formatDaysRemainingLabel, formatQuantity } from '../domain/pantry-formatters';

interface LiquidateConfirmModalProps {
  open: boolean;
  lot: FoodLotView | null;
  onClose: () => void;
  onExecAction: <A extends ProtocolAction>(
    action: A,
    payload: ProtocolRequestMap[A]['req'],
  ) => Promise<ServerResponse<ProtocolRequestMap[A]['res']>>;
  onSuccess: (message: string) => void;
}

const LIQUIDATE_REASONS = [
  'Hết hạn sử dụng',
  'Hư hỏng / Ôi thiu',
  'Nhập nhầm cần hủy',
  'Khác',
];

export function LiquidateConfirmModal({
  open,
  lot,
  onClose,
  onExecAction,
  onSuccess,
}: LiquidateConfirmModalProps) {
  const [reasonPreset, setReasonPreset] = useState('Hết hạn sử dụng');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lot) return;
    setErrorMsg(null);
    setReasonPreset(lot.is_expired ? 'Hết hạn sử dụng' : 'Hư hỏng / Ôi thiu');
    setCustomReason('');
  }, [open, lot]);

  if (!open || !lot) return null;

  const finalReason =
    reasonPreset === 'Khác'
      ? customReason.trim() || 'Thanh lý thực phẩm không còn sử dụng'
      : customReason.trim()
        ? `${reasonPreset}: ${customReason.trim()}`
        : reasonPreset;

  const hasRemainingQty = lot.current_quantity > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const res = await onExecAction('CANCEL_FOOD_ITEM', {
      item_id: lot.item_id,
      reason: finalReason,
      actor_device: 'Desktop Server',
    });

    setSubmitting(false);
    if (res.ok) {
      onSuccess(`Đã thanh lý (Đã hủy) lô "${lot.food_name}" (${lot.item_code}) — lịch sử giao dịch được giữ nguyên.`);
    } else {
      setErrorMsg(res.error.message);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dsk-m04-title"
        data-testid="dsk-modal-DSK-M04"
      >
        <div className="modal-header">
          <div>
            <span className="t-micro mono-num">
              DSK-M04 · XÓA MỀM / THANH LÝ ({lot.item_code})
            </span>
            <h2 id="dsk-m04-title" className="t-panel-title">
              Xác nhận Thanh lý Thực phẩm
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Đóng xác nhận thanh lý"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-body">
            <div className="lot-summary-strip">
              <div>
                <span className="t-micro">Thực phẩm</span>
                <div>
                  <strong>{lot.food_name}</strong> ({lot.food_code})
                </div>
              </div>
              <div>
                <span className="t-micro">Tồn hiện còn</span>
                <div className="mono-num">
                  <strong>{formatQuantity(lot.current_quantity)}</strong> {lot.unit_name}
                </div>
              </div>
              <div>
                <span className="t-micro">Hạn sử dụng</span>
                <div className="mono-num">
                  {lot.expiry_date} ({formatDaysRemainingLabel(lot.days_remaining)})
                </div>
              </div>
            </div>

            {hasRemainingQty ? (
              <div className="inline-alert inline-alert-warn" role="alert">
                <AlertTriangle size={16} />
                <div>
                  <strong>Cảnh báo còn tồn kho:</strong> Lô này vẫn còn{' '}
                  <span className="mono-num">
                    {formatQuantity(lot.current_quantity)} {lot.unit_name}
                  </span>
                  {!lot.is_expired ? ' và vẫn còn hạn sử dụng' : ''}. Thao tác này sẽ đưa tồn về{' '}
                  <span className="mono-num">0</span> và ghi nhận giao dịch <strong>Vứt hủy</strong>.
                </div>
              </div>
            ) : null}

            <div className="inline-alert inline-alert-info">
              <span>
                Lô hàng sẽ chuyển sang trạng thái <strong>Đã hủy</strong> (loại khỏi FEFO), nhưng{' '}
                <strong>100% lịch sử trong inventory_transactions vẫn được giữ nguyên</strong> để đối chiếu kiểm toán.
              </span>
            </div>

            {errorMsg ? (
              <div className="inline-alert inline-alert-danger" role="alert">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <div className="form-field">
              <label htmlFor="m04-reason-select">Lý do thanh lý / xóa mềm</label>
              <select
                id="m04-reason-select"
                value={reasonPreset}
                onChange={(e) => setReasonPreset(e.target.value)}
                data-testid="dsk-m04-reason-select"
              >
                {LIQUIDATE_REASONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="m04-reason-note">Ghi chú bổ sung</label>
              <input
                id="m04-reason-note"
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Chi tiết lý do vứt hủy / thanh lý (tùy chọn)..."
                data-testid="dsk-m04-reason-input"
              />
            </div>
          </div>

          <div className="modal-footer modal-footer-win">
            <button
              type="submit"
              className="btn btn-danger btn-fixed-lg"
              disabled={submitting}
              data-testid="dsk-m04-submit"
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Đang hủy…</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Xác nhận thanh lý</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              data-testid="dsk-m04-cancel"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
