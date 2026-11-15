import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type {
  AreaType,
  CatalogBundle,
  ExpiryConditionFilter,
  FoodSearchFilter,
  StockConditionFilter,
} from '@food-mgmt/shared-sim';

interface FilterBottomSheetProps {
  open: boolean;
  initialFilter: FoodSearchFilter;
  catalogs: CatalogBundle;
  onClose: () => void;
  onApply: (nextFilter: FoodSearchFilter) => void;
}

const STOCK_STATUS_OPTIONS: Array<{ value: StockConditionFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Đang sử dụng', label: 'Đang sử dụng' },
  { value: 'Sắp hết', label: 'Sắp hết' },
  { value: 'Đã hết', label: 'Đã hết' },
  { value: 'Đã hủy', label: 'Đã hủy' },
];

const EXPIRY_STATUS_OPTIONS: Array<{ value: ExpiryConditionFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'fresh', label: 'Còn hạn an toàn' },
  { value: 'expiring_soon', label: 'Sắp hết hạn' },
  { value: 'expired', label: 'Đã hết hạn' },
];

export function FilterBottomSheet({
  open,
  initialFilter,
  catalogs,
  onClose,
  onApply,
}: FilterBottomSheetProps) {
  const [draft, setDraft] = useState<FoodSearchFilter>(initialFilter);

  useEffect(() => {
    if (open) {
      setDraft({ ...initialFilter });
    }
  }, [initialFilter, open]);

  if (!open) return null;

  const selectedArea = draft.area_type ?? 'all';
  const availableLocations =
    selectedArea === 'all'
      ? catalogs.storage_locations
      : catalogs.storage_locations.filter((loc) => loc.area_type === selectedArea);

  const handleSelectArea = (area: AreaType | 'all') => {
    const validLoc =
      area === 'all' ||
      draft.location_id === 'all' ||
      draft.location_id === undefined ||
      catalogs.storage_locations.some(
        (loc) => loc.location_id === draft.location_id && loc.area_type === area,
      );

    setDraft((prev) => ({
      ...prev,
      area_type: area,
      location_id: validLoc ? prev.location_id : 'all',
    }));
  };

  const handleResetAll = () => {
    setDraft((prev) => ({
      ...prev,
      category_id: 'all',
      area_type: 'all',
      location_id: 'all',
      stock_status: 'all',
      expiry_status: 'all',
    }));
  };

  return (
    <>
      <div className="mob-sheet-backdrop" onClick={onClose} />
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Bộ lọc kho thực phẩm 5 tiêu chí"
        data-testid="mob-sheet-MOB-S02"
      >
        <div className="mob-sheet-handle" />
        <div className="mob-sheet-header">
          <div>
            <h2 className="t-screen-title">Bộ lọc Kho Đa chiều</h2>
            <p className="t-meta" style={{ margin: '2px 0 0' }}>
              Kết hợp tối đa 5 tiêu chí tra cứu từ Server
            </p>
          </div>
          <button type="button" className="mob-icon-btn" aria-label="Đóng" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {/* 1. Category */}
          <div className="mob-field">
            <span className="mob-field-label">1. Loại thực phẩm</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <button
                type="button"
                className={`mob-chip ${(draft.category_id ?? 'all') === 'all' ? 'mob-chip-active' : ''}`}
                data-testid="mob-filter-cat-all"
                onClick={() => setDraft((prev) => ({ ...prev, category_id: 'all' }))}
              >
                Tất cả
              </button>
              {catalogs.categories.map((cat) => (
                <button
                  key={cat.category_id}
                  type="button"
                  className={`mob-chip ${draft.category_id === cat.category_id ? 'mob-chip-active' : ''}`}
                  data-testid={`mob-filter-cat-${cat.category_id}`}
                  onClick={() => setDraft((prev) => ({ ...prev, category_id: cat.category_id }))}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Area Type */}
          <div className="mob-field">
            <span className="mob-field-label">2. Khu vực bảo quản</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {(['all', 'Trong tủ lạnh', 'Ngoài tủ lạnh'] as const).map((area) => (
                <button
                  key={area}
                  type="button"
                  className={`mob-chip ${selectedArea === area ? 'mob-chip-active' : ''}`}
                  data-testid={`mob-filter-area-${area}`}
                  onClick={() => handleSelectArea(area)}
                >
                  {area === 'all' ? 'Tất cả khu vực' : area}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Cascading Detailed Storage Location */}
          <div className="mob-field">
            <span className="mob-field-label">3. Ngăn / Vị trí chi tiết</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <button
                type="button"
                className={`mob-chip ${(draft.location_id ?? 'all') === 'all' ? 'mob-chip-active' : ''}`}
                data-testid="mob-filter-loc-all"
                onClick={() => setDraft((prev) => ({ ...prev, location_id: 'all' }))}
              >
                Tất cả ngăn
              </button>
              {availableLocations.map((loc) => (
                <button
                  key={loc.location_id}
                  type="button"
                  className={`mob-chip ${draft.location_id === loc.location_id ? 'mob-chip-active' : ''}`}
                  data-testid={`mob-filter-loc-${loc.location_id}`}
                  onClick={() => setDraft((prev) => ({ ...prev, location_id: loc.location_id }))}
                >
                  {loc.location_name}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Stock Status */}
          <div className="mob-field">
            <span className="mob-field-label">4. Trạng thái tồn kho</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {STOCK_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`mob-chip ${(draft.stock_status ?? 'all') === opt.value ? 'mob-chip-active' : ''}`}
                  data-testid={`mob-filter-stock-${opt.value}`}
                  onClick={() => setDraft((prev) => ({ ...prev, stock_status: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Expiry Condition */}
          <div className="mob-field">
            <span className="mob-field-label">5. Tình trạng hạn sử dụng</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {EXPIRY_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`mob-chip ${(draft.expiry_status ?? 'all') === opt.value ? 'mob-chip-active' : ''}`}
                  data-testid={`mob-filter-expiry-${opt.value}`}
                  onClick={() => setDraft((prev) => ({ ...prev, expiry_status: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--sp-2)',
              paddingTop: 'var(--sp-2)',
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              data-testid="mob-filter-reset"
              onClick={handleResetAll}
            >
              Đặt lại
            </button>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="mob-filter-apply"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
