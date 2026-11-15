import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  MapPin,
  MinusCircle,
  PlusCircle,
  Sliders,
  X,
} from 'lucide-react';
import {
  roundStockQuantity,
  type AreaType,
  type CatalogBundle,
  type FoodLotView,
  type ProtocolAction,
  type ProtocolRequestMap,
  type ServerResponse,
} from '@food-mgmt/shared-sim';
import type { InventoryActionMode } from '../state/useDesktopServer';
import { formatQuantity, formatSignedQuantity } from '../domain/pantry-formatters';

interface InventoryActionModalProps {
  open: boolean;
  lot: FoodLotView | null;
  initialMode: InventoryActionMode;
  defaultQuantity?: number;
  defaultReason?: string;
  catalogs: CatalogBundle;
  onClose: () => void;
  onExecAction: <A extends ProtocolAction>(
    action: A,
    payload: ProtocolRequestMap[A]['req'],
  ) => Promise<ServerResponse<ProtocolRequestMap[A]['res']>>;
  onSuccess: (message: string) => void;
}

const USE_REASON_CHIPS = [
  'Nấu bữa sáng',
  'Nấu bữa trưa',
  'Nấu bữa tối',
  'Ăn trực tiếp',
  'Chia phần dự trữ',
];

export function InventoryActionModal({
  open,
  lot,
  initialMode,
  defaultQuantity,
  defaultReason,
  catalogs,
  onClose,
  onExecAction,
  onSuccess,
}: InventoryActionModalProps) {
  const [mode, setMode] = useState<InventoryActionMode>(initialMode);
  const [qtyInput, setQtyInput] = useState('1');
  const [reason, setReason] = useState('');
  const [targetArea, setTargetArea] = useState<AreaType>('Trong tủ lạnh');
  const [targetLocationId, setTargetLocationId] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locationsInArea = useMemo(
    () => catalogs.storage_locations.filter((l) => l.area_type === targetArea),
    [catalogs.storage_locations, targetArea],
  );

  useEffect(() => {
    if (!open || !lot) return;
    setMode(initialMode);
    setErrorMsg(null);

    if (initialMode === 'use') {
      const initialUse = defaultQuantity ?? Math.min(1, lot.current_quantity);
      setQtyInput(String(initialUse > 0 ? initialUse : lot.current_quantity));
      setReason(defaultReason ?? 'Nấu bữa tối');
    } else if (initialMode === 'restock') {
      setQtyInput(String(defaultQuantity ?? Math.max(1, lot.min_threshold)));
      setReason(defaultReason ?? 'Mua bổ sung');
    } else if (initialMode === 'adjust') {
      setQtyInput(String(lot.current_quantity));
      setReason(defaultReason ?? 'Kiểm kê tủ lạnh thực tế');
    } else {
      setReason(defaultReason ?? 'Sắp xếp lại vị trí bảo quản');
    }

    setTargetArea(lot.area_type);
    setTargetLocationId(lot.location_id);
  }, [open, lot, initialMode, defaultQuantity, defaultReason]);

  useEffect(() => {
    if (locationsInArea.length === 0) return;
    if (!locationsInArea.some((l) => l.location_id === targetLocationId)) {
      setTargetLocationId(locationsInArea[0].location_id);
    }
  }, [locationsInArea, targetLocationId]);

  if (!open || !lot) return null;

  const numericQty = Number(qtyInput);
  let projectedQty = lot.current_quantity;
  let deltaQty = 0;

  if (mode === 'use') {
    const val = Number.isFinite(numericQty) ? Math.max(0, numericQty) : 0;
    projectedQty = roundStockQuantity(Math.max(0, lot.current_quantity - val));
    deltaQty = roundStockQuantity(-val);
  } else if (mode === 'restock') {
    const val = Number.isFinite(numericQty) ? Math.max(0, numericQty) : 0;
    projectedQty = roundStockQuantity(lot.current_quantity + val);
    deltaQty = roundStockQuantity(val);
  } else if (mode === 'adjust') {
    const val = Number.isFinite(numericQty) ? Math.max(0, numericQty) : lot.current_quantity;
    projectedQty = roundStockQuantity(val);
    deltaQty = roundStockQuantity(projectedQty - lot.current_quantity);
  }

  const projectedStatus = projectedQty <= 0 ? 'Đã hết' : 'Đang sử dụng';
  const willBeLowStock = projectedQty > 0 && projectedQty <= lot.min_threshold;
  const targetLocObj = catalogs.storage_locations.find((l) => l.location_id === targetLocationId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    if (mode === 'use') {
      const res = await onExecAction('USE_FOOD', {
        item_id: lot.item_id,
        quantity_used: numericQty,
        reason: reason.trim() || 'Xuất dùng chế biến',
        actor_device: 'Desktop Server',
      });
      setSubmitting(false);
      if (res.ok) {
        onSuccess(
          `Đã xuất dùng ${formatQuantity(numericQty)} ${lot.unit_name} "${lot.food_name}" (còn ${formatQuantity(res.data.item.current_quantity)} ${lot.unit_name})`,
        );
      } else {
        setErrorMsg(res.error.message);
      }
      return;
    }

    if (mode === 'restock') {
      const res = await onExecAction('RESTOCK_FOOD', {
        item_id: lot.item_id,
        quantity_added: numericQty,
        reason: reason.trim() || 'Mua bổ sung vào lô hiện tại',
        actor_device: 'Desktop Server',
      });
      setSubmitting(false);
      if (res.ok) {
        onSuccess(
          `Đã nhập thêm +${formatQuantity(numericQty)} ${lot.unit_name} "${lot.food_name}" (tồn mới: ${formatQuantity(res.data.item.current_quantity)} ${lot.unit_name})`,
        );
      } else {
        setErrorMsg(res.error.message);
      }
      return;
    }

    if (mode === 'adjust') {
      if (!reason.trim()) {
        setSubmitting(false);
        setErrorMsg('Vui lòng nhập lý do kiểm kê điều chỉnh (FR-04).');
        return;
      }
      const res = await onExecAction('ADJUST_FOOD', {
        item_id: lot.item_id,
        new_quantity: numericQty,
        reason: reason.trim(),
        actor_device: 'Desktop Server',
      });
      setSubmitting(false);
      if (res.ok) {
        onSuccess(
          `Đã kiểm kê "${lot.food_name}" thành ${formatQuantity(res.data.item.current_quantity)} ${lot.unit_name}`,
        );
      } else {
        setErrorMsg(res.error.message);
      }
      return;
    }

    const res = await onExecAction('MOVE_LOCATION', {
      item_id: lot.item_id,
      new_location_id: targetLocationId,
      reason: reason.trim() || 'Điều chuyển vị trí bảo quản',
      actor_device: 'Desktop Server',
    });
    setSubmitting(false);
    if (res.ok) {
      onSuccess(
        `Đã chuyển "${lot.food_name}" tới ${res.data.item.area_type} · ${res.data.item.location_name}`,
      );
    } else {
      setErrorMsg(res.error.message);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog modal-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dsk-m02-title"
        data-testid="dsk-modal-DSK-M02"
      >
        <div className="modal-header">
          <div>
            <span className="t-micro mono-num">
              DSK-M02 · {lot.food_code} / {lot.item_code}
            </span>
            <h2 id="dsk-m02-title" className="t-panel-title">
              Biến động Kho: {lot.food_name}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Đóng hộp thoại biến động kho"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-body">
            {/* Lot Summary Strip */}
            <div className="lot-summary-strip">
              <div>
                <span className="t-micro">Tồn hiện tại</span>
                <div className="mono-num">
                  <strong>{formatQuantity(lot.current_quantity)}</strong> {lot.unit_name}
                </div>
              </div>
              <div>
                <span className="t-micro">Vị trí</span>
                <div>
                  {lot.area_type} · <strong>{lot.location_name}</strong>
                </div>
              </div>
              <div>
                <span className="t-micro">Hạn sử dụng</span>
                <div className="mono-num">{lot.expiry_date}</div>
              </div>
            </div>

            {/* 4 Segmented Business Modes */}
            <div className="mode-tabs" role="tablist" aria-label="Chế độ biến động kho">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'use'}
                className={`mode-tab ${mode === 'use' ? 'is-active' : ''}`}
                onClick={() => {
                  setMode('use');
                  setErrorMsg(null);
                  setQtyInput(String(Math.min(1, lot.current_quantity) || 0));
                  setReason('Nấu bữa tối');
                }}
                data-testid="dsk-m02-mode-use"
              >
                <MinusCircle size={14} />
                <span>Sử dụng</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'restock'}
                className={`mode-tab ${mode === 'restock' ? 'is-active' : ''}`}
                onClick={() => {
                  setMode('restock');
                  setErrorMsg(null);
                  setQtyInput('1');
                  setReason('Mua bổ sung');
                }}
                data-testid="dsk-m02-mode-restock"
              >
                <PlusCircle size={14} />
                <span>Nhập thêm</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'adjust'}
                className={`mode-tab ${mode === 'adjust' ? 'is-active' : ''}`}
                onClick={() => {
                  setMode('adjust');
                  setErrorMsg(null);
                  setQtyInput(String(lot.current_quantity));
                  setReason('Kiểm kê thực tế');
                }}
                data-testid="dsk-m02-mode-adjust"
              >
                <Sliders size={14} />
                <span>Điều chỉnh</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'move'}
                className={`mode-tab ${mode === 'move' ? 'is-active' : ''}`}
                onClick={() => {
                  setMode('move');
                  setErrorMsg(null);
                  setReason('Sắp xếp lại tủ/kệ');
                }}
                data-testid="dsk-m02-mode-move"
              >
                <MapPin size={14} />
                <span>Đổi vị trí</span>
              </button>
            </div>

            {errorMsg ? (
              <div className="inline-alert inline-alert-danger" role="alert" data-testid="dsk-m02-error">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            {mode !== 'move' ? (
              <div className="form-field">
                <div className="label-row-between">
                  <label htmlFor="m02-qty">
                    {mode === 'use'
                      ? `Số lượng xuất dùng (IN14 — ${lot.unit_name})`
                      : mode === 'restock'
                        ? `Số lượng nhập thêm (${lot.unit_name})`
                        : `Số lượng thực tế kiểm đếm (${lot.unit_name})`}
                  </label>
                  {mode === 'use' && lot.current_quantity > 0 ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setQtyInput(String(lot.current_quantity))}
                      data-testid="dsk-m02-use-all-btn"
                    >
                      Dùng hết ({formatQuantity(lot.current_quantity)})
                    </button>
                  ) : null}
                </div>
                <input
                  id="m02-qty"
                  type="number"
                  step="0.01"
                  min={mode === 'adjust' ? '0' : '0.01'}
                  className="mono-num"
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  data-testid="dsk-m02-qty-input"
                />
                {mode === 'use' && Number.isFinite(numericQty) && numericQty > lot.current_quantity ? (
                  <span className="field-error">
                    Số lượng dùng ({formatQuantity(numericQty)}) lớn hơn tồn kho ({formatQuantity(lot.current_quantity)} {lot.unit_name}). Server `sp_use_food` sẽ từ chối.
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="m02-area">Khu vực mới (Cấp 1)</label>
                  <select
                    id="m02-area"
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value as AreaType)}
                  >
                    <option value="Trong tủ lạnh">Trong tủ lạnh</option>
                    <option value="Ngoài tủ lạnh">Ngoài tủ lạnh</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="m02-location">Vị trí chi tiết mới (Cấp 2)</label>
                  <select
                    id="m02-location"
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(Number(e.target.value))}
                    data-testid="dsk-m02-location-select"
                  >
                    {locationsInArea.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="m02-reason">
                Lý do biến động {mode === 'adjust' ? <span className="req">*</span> : null}
              </label>
              {mode === 'use' ? (
                <div className="reason-chips-row">
                  {USE_REASON_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={`chip-btn ${reason === chip ? 'is-selected' : ''}`}
                      onClick={() => setReason(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : null}
              <input
                id="m02-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do ghi vào Audit Log..."
                data-testid="dsk-m02-reason-input"
              />
            </div>

            {/* Result Preview Box */}
            <div className="mutation-preview-box">
              <div className="preview-title">Xem trước kết quả sau xác nhận</div>
              {mode !== 'move' ? (
                <div className="preview-values">
                  <span className="mono-num">
                    {formatQuantity(lot.current_quantity)} {lot.unit_name}
                  </span>
                  <ArrowRight size={14} />
                  <strong className="mono-num">
                    {formatQuantity(projectedQty)} {lot.unit_name}
                  </strong>
                  <span className="mono-num text-muted">
                    ({formatSignedQuantity(deltaQty)} {lot.unit_name})
                  </span>
                  <span className={projectedStatus === 'Đã hết' ? 'badge badge-empty' : 'badge badge-fresh'}>
                    {projectedStatus}
                  </span>
                </div>
              ) : (
                <div className="preview-values">
                  <span>
                    {lot.area_type} · {lot.location_name}
                  </span>
                  <ArrowRight size={14} />
                  <strong>
                    {targetArea} · {targetLocObj?.location_name ?? ''}
                  </strong>
                </div>
              )}

              {mode !== 'move' && willBeLowStock ? (
                <div className="preview-low-warn">
                  <AlertTriangle size={13} />
                  <span>
                    Tồn dự kiến ({formatQuantity(projectedQty)}) ≤ ngưỡng tối thiểu ({formatQuantity(lot.min_threshold)}) — sẽ vào Danh sách Cần mua (DSK-04).
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="modal-footer modal-footer-win">
            <button
              type="submit"
              className="btn btn-primary btn-fixed-lg"
              disabled={submitting}
              data-testid="dsk-m02-submit"
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Đang xử lý…</span>
                </>
              ) : (
                <span>Xác nhận thực hiện</span>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              data-testid="dsk-m02-cancel"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
