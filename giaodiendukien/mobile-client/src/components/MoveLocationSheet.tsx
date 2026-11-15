import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type {
  AreaType,
  ServerResponse,
  StockMutationResult,
  StorageLocation,
} from '@food-mgmt/shared-sim';
import type { MoveLocationTarget } from '../state/useMobileClient';

interface MoveLocationSheetProps {
  target: MoveLocationTarget | null;
  locations: StorageLocation[];
  isOfflineReadOnly: boolean;
  onClose: () => void;
  onSubmit: (
    itemId: number,
    newLocationId: number,
    reason?: string,
  ) => Promise<ServerResponse<StockMutationResult>>;
}

export function MoveLocationSheet({
  target,
  locations,
  isOfflineReadOnly,
  onClose,
  onSubmit,
}: MoveLocationSheetProps) {
  const [areaType, setAreaType] = useState<AreaType>('Trong tủ lạnh');
  const [selectedLocId, setSelectedLocId] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setAreaType(target.area_type);
    setSelectedLocId(target.location_id);
    setReason('');
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [target]);

  if (!target) return null;

  const filteredLocations = locations.filter((l) => l.area_type === areaType);
  const isUnchanged = selectedLocId === target.location_id;

  const handleAreaSwitch = (nextArea: AreaType) => {
    setAreaType(nextArea);
    setErrorMessage(null);
    const matches = locations.filter((l) => l.area_type === nextArea);
    if (!matches.some((l) => l.location_id === selectedLocId) && matches.length > 0) {
      setSelectedLocId(matches[0].location_id);
    }
  };

  const handleConfirm = async () => {
    if (isOfflineReadOnly || isUnchanged) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await onSubmit(target.item_id, selectedLocId, reason.trim() || undefined);
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
    <>
      <div className="mob-sheet-backdrop" onClick={() => !isSubmitting && onClose()} />
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Đổi vị trí bảo quản 2 cấp"
        data-testid="mob-sheet-MOB-S03"
      >
        <div className="mob-sheet-handle" />
        <div className="mob-sheet-header">
          <div>
            <h2 className="t-screen-title">Đổi vị trí bảo quản</h2>
            <p className="t-meta" style={{ margin: '4px 0 0' }}>
              {target.food_name} · Hiện tại:{' '}
              <strong>
                {target.area_type} · {target.location_name}
              </strong>
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
          {/* Level 1: Area */}
          <div className="mob-field">
            <span className="mob-field-label">Cấp 1 — Khu vực bảo quản</span>
            <div className="mob-segmented" role="tablist">
              {(['Trong tủ lạnh', 'Ngoài tủ lạnh'] as const).map((area) => (
                <button
                  key={area}
                  type="button"
                  role="tab"
                  aria-selected={areaType === area}
                  className="mob-segment-btn"
                  data-testid={`mob-move-area-${area}`}
                  onClick={() => handleAreaSwitch(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Level 2: Compartment */}
          <div className="mob-field">
            <span className="mob-field-label">Cấp 2 — Ngăn / Kệ chi tiết</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {filteredLocations.map((loc) => {
                const isSelected = selectedLocId === loc.location_id;
                const isCurrent = target.location_id === loc.location_id;
                return (
                  <button
                    key={loc.location_id}
                    type="button"
                    className={`pantry-card`}
                    data-testid={`mob-move-loc-${loc.location_id}`}
                    style={{
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--sp-2)',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid transparent',
                      backgroundColor: isSelected ? 'var(--bg-selected)' : 'var(--bg-surface)',
                    }}
                    onClick={() => {
                      setSelectedLocId(loc.location_id);
                      setErrorMessage(null);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <MapPin
                        size={18}
                        style={{
                          marginTop: 2,
                          color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
                          {loc.location_name}{' '}
                          {isCurrent && (
                            <span className="t-micro" style={{ color: 'var(--accent-hover)' }}>
                              (Hiện tại)
                            </span>
                          )}
                        </div>
                        {loc.description && <div className="t-meta">{loc.description}</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Reason */}
          <div className="mob-field">
            <label htmlFor="mob-move-reason" className="mob-field-label">
              Ghi chú lý do chuyển (tùy chọn)
            </label>
            <input
              id="mob-move-reason"
              type="text"
              className="mob-input"
              placeholder="Ví dụ: Dọn xuống ngăn mát để rã đông"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="mob-banner-alert mob-banner-alert-danger" role="alert">
              <span style={{ fontSize: 'var(--text-sm)' }}>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary btn-fixed-md"
              disabled={isSubmitting || isUnchanged || isOfflineReadOnly}
              data-testid="mob-move-confirm"
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Đang lưu…</span>
                </>
              ) : (
                <span>Cập nhật vị trí</span>
              )}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
