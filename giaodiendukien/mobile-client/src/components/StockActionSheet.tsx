import { useEffect, useState } from 'react';
import { AlertTriangle, Minus, Plus, X } from 'lucide-react';
import {
  roundStockQuantity,
  type ServerResponse,
  type StockMutationResult,
} from '@food-mgmt/shared-sim';
import type { StockActionTarget } from '../state/useMobileClient';
import { formatIsoDateShort } from '../domain/food-lot-presentation';

interface StockActionSheetProps {
  target: StockActionTarget | null;
  isOfflineReadOnly: boolean;
  onClose: () => void;
  onUseFood: (
    itemId: number,
    quantityUsed: number,
    reason: string,
    expectedCurrentQty?: number,
  ) => Promise<ServerResponse<StockMutationResult>>;
  onRestockFood: (
    itemId: number,
    quantityAdded: number,
    reason: string,
  ) => Promise<ServerResponse<StockMutationResult>>;
  onAdjustFood: (
    itemId: number,
    newQuantity: number,
    reason: string,
  ) => Promise<ServerResponse<StockMutationResult>>;
}

type StockMode = 'use' | 'restock' | 'adjust';

function getStepForUnit(unitName: string): number {
  const lower = unitName.toLowerCase();
  if (lower === 'kg' || lower === 'lít' || lower === 'l') return 0.1;
  if (lower === 'g' || lower === 'ml') return 10;
  return 1;
}

const USE_REASONS = ['Nấu bữa sáng', 'Nấu bữa trưa', 'Nấu bữa tối', 'Ăn trực tiếp'];
const RESTOCK_REASONS = ['Mua bổ sung', 'Đi chợ cuối tuần', 'Bù lượng đã dùng'];
const ADJUST_REASONS = ['Kiểm kê thực tế', 'Cân đo lại trong tủ', 'Điều chỉnh sai số'];

export function StockActionSheet({
  target,
  isOfflineReadOnly,
  onClose,
  onUseFood,
  onRestockFood,
  onAdjustFood,
}: StockActionSheetProps) {
  const [mode, setMode] = useState<StockMode>('use');
  const [displayedCurrentQty, setDisplayedCurrentQty] = useState<number>(0);
  const [amountInput, setAmountInput] = useState<string>('1');
  const [reason, setReason] = useState<string>('Nấu bữa tối');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const initialMode = target.initialMode;
    const current = target.item.current_quantity;
    setMode(initialMode);
    setDisplayedCurrentQty(current);
    setErrorMessage(null);
    setErrorCode(null);
    setIsSubmitting(false);

    if (target.initialQuantity !== undefined) {
      setAmountInput(String(target.initialQuantity));
    } else if (initialMode === 'use') {
      const step = getStepForUnit(target.item.unit_name);
      const suggested =
        current > 0 ? Math.min(current, roundStockQuantity(Math.max(step, current * 0.5))) : step;
      setAmountInput(String(suggested));
    } else if (initialMode === 'restock') {
      setAmountInput('1');
    } else {
      setAmountInput(String(current));
    }

    if (target.defaultReason) {
      setReason(target.defaultReason);
    } else if (initialMode === 'use') {
      setReason('Nấu bữa tối');
    } else if (initialMode === 'restock') {
      setReason('Mua bổ sung');
    } else {
      setReason('Kiểm kê thực tế');
    }
  }, [target]);

  if (!target) return null;

  const { item } = target;
  const step = getStepForUnit(item.unit_name);
  const numericAmount = Number(amountInput);
  const validNumber = Number.isFinite(numericAmount);

  const projectedQuantity = (() => {
    if (!validNumber) return displayedCurrentQty;
    if (mode === 'use') return roundStockQuantity(displayedCurrentQty - numericAmount);
    if (mode === 'restock') return roundStockQuantity(displayedCurrentQty + numericAmount);
    return roundStockQuantity(numericAmount);
  })();

  const handleModeSwitch = (nextMode: StockMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setErrorCode(null);
    if (nextMode === 'use') {
      const suggested =
        displayedCurrentQty > 0
          ? Math.min(displayedCurrentQty, roundStockQuantity(Math.max(step, displayedCurrentQty * 0.5)))
          : step;
      setAmountInput(String(suggested));
      setReason('Nấu bữa tối');
    } else if (nextMode === 'restock') {
      setAmountInput('1');
      setReason('Mua bổ sung');
    } else {
      setAmountInput(String(displayedCurrentQty));
      setReason('Kiểm kê thực tế');
    }
  };

  const handleStep = (deltaSign: -1 | 1) => {
    const base = Number.isFinite(numericAmount) ? numericAmount : 0;
    const minVal = mode === 'adjust' ? 0 : step;
    const nextVal = Math.max(minVal, roundStockQuantity(base + deltaSign * step));
    setAmountInput(String(nextVal));
    setErrorMessage(null);
  };

  const handleFraction = (ratio: number) => {
    const computed =
      ratio >= 1
        ? displayedCurrentQty
        : Math.max(step, roundStockQuantity(displayedCurrentQty * ratio));
    setAmountInput(String(Math.min(displayedCurrentQty, computed)));
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (isOfflineReadOnly) {
      setErrorMessage('Đang ở chế độ Offline (Chỉ xem). Kết nối lại Server để cập nhật kho.');
      return;
    }
    if (!validNumber || (mode !== 'adjust' && numericAmount <= 0) || (mode === 'adjust' && numericAmount < 0)) {
      setErrorMessage(
        mode === 'adjust'
          ? 'Số lượng kiểm kê thực tế phải lớn hơn hoặc bằng 0.'
          : 'Số lượng thao tác phải lớn hơn 0.',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      let res: ServerResponse<StockMutationResult>;
      if (mode === 'use') {
        res = await onUseFood(item.item_id, numericAmount, reason, displayedCurrentQty);
      } else if (mode === 'restock') {
        res = await onRestockFood(item.item_id, numericAmount, reason);
      } else {
        res = await onAdjustFood(item.item_id, numericAmount, reason);
      }

      if (res.ok) {
        onClose();
      } else {
        setErrorCode(res.error.code);
        setErrorMessage(res.error.message);
        if (res.error.latest_quantity !== undefined) {
          setDisplayedCurrentQty(res.error.latest_quantity);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonSuggestions =
    mode === 'use' ? USE_REASONS : mode === 'restock' ? RESTOCK_REASONS : ADJUST_REASONS;

  return (
    <>
      <div className="mob-sheet-backdrop" onClick={() => !isSubmitting && onClose()} />
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Cập nhật số lượng thực phẩm"
        data-testid="mob-sheet-MOB-S01"
      >
        <div className="mob-sheet-handle" />
        <div className="mob-sheet-header">
          <div>
            <h2 className="t-screen-title">{item.food_name}</h2>
            <p className="t-meta" style={{ margin: '4px 0 0' }}>
              Tồn hiện tại:{' '}
              <strong className="mono-num" data-testid="mob-stock-current-qty">
                {displayedCurrentQty} {item.unit_name}
              </strong>{' '}
              · HSD <span className="mono-num">{formatIsoDateShort(item.expiry_date)}</span>
            </p>
          </div>
          <button
            type="button"
            className="mob-icon-btn"
            aria-label="Đóng"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {/* Mode Segmented Control */}
          <div className="mob-segmented" role="tablist" aria-label="Loại cập nhật tồn kho">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'use'}
              disabled={item.status === 'Đã hủy'}
              className="mob-segment-btn"
              data-testid="mob-stock-tab-use"
              onClick={() => handleModeSwitch('use')}
            >
              Xuất dùng
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'restock'}
              disabled={item.status === 'Đã hủy'}
              className="mob-segment-btn"
              data-testid="mob-stock-tab-restock"
              onClick={() => handleModeSwitch('restock')}
            >
              Nhập thêm
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'adjust'}
              disabled={item.status === 'Đã hủy'}
              className="mob-segment-btn"
              data-testid="mob-stock-tab-adjust"
              onClick={() => handleModeSwitch('adjust')}
            >
              Kiểm kê
            </button>
          </div>

          {/* Quick fraction / increment chips */}
          {mode === 'use' && (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="mob-chip"
                data-testid="mob-stock-frac-25"
                onClick={() => handleFraction(0.25)}
              >
                25%
              </button>
              <button
                type="button"
                className="mob-chip"
                data-testid="mob-stock-frac-50"
                onClick={() => handleFraction(0.5)}
              >
                50%
              </button>
              <button
                type="button"
                className="mob-chip"
                data-testid="mob-stock-frac-100"
                onClick={() => handleFraction(1)}
              >
                Dùng hết ({displayedCurrentQty})
              </button>
            </div>
          )}

          {mode === 'restock' && (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {[1, 2, 5].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  className="mob-chip"
                  onClick={() => {
                    setAmountInput(String(inc));
                    setErrorMessage(null);
                  }}
                >
                  +{inc} {item.unit_name}
                </button>
              ))}
            </div>
          )}

          {/* Stepper & Direct Numeric Input */}
          <div className="mob-stepper-row">
            <label htmlFor="mob-stock-qty-input" className="t-body" style={{ fontWeight: 600 }}>
              {mode === 'use'
                ? 'Số lượng dùng'
                : mode === 'restock'
                  ? 'Số lượng nhập thêm'
                  : 'Tồn thực tế sau kiểm kê'}
            </label>
            <div className="stepper-control">
              <button
                type="button"
                className="stepper-btn"
                aria-label="Giảm số lượng"
                data-testid="mob-stock-step-minus"
                onClick={() => handleStep(-1)}
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <input
                id="mob-stock-qty-input"
                type="number"
                step="any"
                min="0"
                className="mob-stepper-input"
                data-testid="mob-stock-qty-input"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setErrorMessage(null);
                }}
              />
              <button
                type="button"
                className="stepper-btn"
                aria-label="Tăng số lượng"
                data-testid="mob-stock-step-plus"
                onClick={() => handleStep(1)}
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Reason Quick Chips & Input */}
          <div className="mob-field">
            <span className="mob-field-label">Lý do giao dịch</span>
            <div className="mob-chip-scroll">
              {reasonSuggestions.map((preset) => (
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
              placeholder="Nhập lý do chi tiết..."
              data-testid="mob-stock-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Projected Balance Preview */}
          <div
            className={`mob-banner-alert ${
              projectedQuantity < 0
                ? 'mob-banner-alert-danger'
                : projectedQuantity <= item.min_threshold
                  ? 'mob-banner-alert-warning'
                  : 'mob-banner-alert-info'
            }`}
            data-testid="mob-stock-preview"
          >
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Tồn còn lại dự kiến:{' '}
                <span className="mono-num">
                  {projectedQuantity} {item.unit_name}
                </span>
              </div>
              {projectedQuantity < 0 && (
                <div className="t-micro" style={{ color: 'inherit', marginTop: 2 }}>
                  Cảnh báo: Số lượng dùng vượt quá tồn kho hiện tại ({displayedCurrentQty}{' '}
                  {item.unit_name}).
                </div>
              )}
              {projectedQuantity >= 0 && projectedQuantity === 0 && (
                <div className="t-micro" style={{ color: 'inherit', marginTop: 2 }}>
                  Lô hàng sẽ tự động chuyển sang trạng thái &ldquo;Đã hết&rdquo; sau khi lưu.
                </div>
              )}
              {projectedQuantity > 0 && projectedQuantity <= item.min_threshold && (
                <div className="t-micro" style={{ color: 'inherit', marginTop: 2 }}>
                  Dưới hoặc bằng ngưỡng min ({item.min_threshold} {item.unit_name}) — sẽ thêm vào Cần
                  mua bổ sung.
                </div>
              )}
            </div>
          </div>

          {/* Honest Server / Validation Error Feedback */}
          {errorMessage && (
            <div
              className="mob-banner-alert mob-banner-alert-danger"
              role="alert"
              data-testid="mob-stock-error"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    {errorCode ? `Lỗi Server (${errorCode})` : 'Không thể thực hiện'}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{errorMessage}</div>
                </div>
              </div>
            </div>
          )}

          {/* Sheet Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', paddingTop: 4 }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isSubmitting}
              data-testid="mob-stock-cancel"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary btn-fixed-md"
              disabled={isSubmitting || isOfflineReadOnly || item.status === 'Đã hủy'}
              data-testid="mob-stock-confirm"
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Đang gửi…</span>
                </>
              ) : (
                <span>Xác nhận</span>
              )}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
