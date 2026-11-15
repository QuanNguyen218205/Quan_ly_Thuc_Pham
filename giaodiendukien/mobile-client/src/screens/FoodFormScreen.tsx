import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  diffCalendarDays,
  isValidIsoDate,
  type AreaType,
  type CatalogBundle,
  type CreateFoodItemResult,
  type DuplicateCheckResult,
  type ServerResponse,
  type StockMutationResult,
} from '@food-mgmt/shared-sim';
import type { FoodFormDraftState, FoodFormValues } from '../state/useMobileClient';
import { buildNextFoodCodeSuggestion } from '../domain/food-lot-presentation';

interface FoodFormScreenProps {
  draft: FoodFormDraftState;
  catalogs: CatalogBundle;
  existingFoodCodes: string[];
  isOfflineReadOnly: boolean;
  onUpdateValues: (patch: Partial<FoodFormValues>) => void;
  onOpenAiScan: () => void;
  onSubmit: (options?: {
    merge_into_food_id?: number;
    force_create_separate_food?: boolean;
  }) => Promise<ServerResponse<CreateFoodItemResult | StockMutationResult>>;
  onCancel: () => void;
}

export function FoodFormScreen({
  draft,
  catalogs,
  existingFoodCodes,
  isOfflineReadOnly,
  onUpdateValues,
  onOpenAiScan,
  onSubmit,
  onCancel,
}: FoodFormScreenProps) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateCheckResult | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { values, mode, aiSourceLabel, aiFilledFields, mergeIntoFoodId, mergeTargetName } = draft;
  const areaLocations = catalogs.storage_locations.filter(
    (loc) => loc.area_type === values.area_type,
  );

  const isAiField = (fieldKey: string) => aiFilledFields.includes(fieldKey);

  const handleAreaChange = (nextArea: AreaType) => {
    const matches = catalogs.storage_locations.filter((loc) => loc.area_type === nextArea);
    const keepLoc = matches.some((loc) => loc.location_id === values.location_id);
    onUpdateValues({
      area_type: nextArea,
      location_id: keepLoc ? values.location_id : (matches[0]?.location_id ?? values.location_id),
    });
  };

  const validateClient = (): Partial<Record<string, string>> => {
    const errs: Partial<Record<string, string>> = {};
    if (!mergeIntoFoodId) {
      if (!values.food_code.trim()) {
        errs.food_code = 'Vui lòng nhập mã thực phẩm (ví dụ TP016).';
      }
      if (!values.food_name.trim()) {
        errs.food_name = 'Vui lòng nhập tên thực phẩm.';
      }
    }
    const qty = Number(values.quantity);
    if (!Number.isFinite(qty) || (mode === 'create' ? qty <= 0 : qty < 0)) {
      errs.quantity =
        mode === 'create'
          ? 'Số lượng nhập ban đầu phải lớn hơn 0.'
          : 'Số lượng tồn kho không thể âm.';
    }
    const minQty = Number(values.min_threshold);
    if (!Number.isFinite(minQty) || minQty < 0) {
      errs.min_threshold = 'Ngưỡng tồn tối thiểu phải lớn hơn hoặc bằng 0.';
    }
    if (!isValidIsoDate(values.import_date)) {
      errs.import_date = 'Ngày nhập không hợp lệ.';
    }
    if (!isValidIsoDate(values.expiry_date)) {
      errs.expiry_date = 'Hạn sử dụng không hợp lệ.';
    } else if (
      isValidIsoDate(values.import_date) &&
      diffCalendarDays(values.expiry_date, values.import_date) < 0
    ) {
      errs.expiry_date = 'Hạn sử dụng phải lớn hơn hoặc bằng ngày nhập.';
    }
    return errs;
  };

  const executeSave = async (submitOptions?: {
    merge_into_food_id?: number;
    force_create_separate_food?: boolean;
  }) => {
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setNetworkError(null);

    try {
      const res = await onSubmit(submitOptions);
      if (!res.ok) {
        if (res.error.code === 'VALIDATION_ERROR' || res.error.code === 'DUPLICATE_FOOD_CODE') {
          setFieldErrors(res.error.field_errors ?? {});
          if (res.error.duplicate_match) {
            setDuplicateMatch(res.error.duplicate_match);
          }
          setNetworkError(res.error.message);
        } else if (res.error.code === 'DUPLICATE_FOOD_NAME') {
          setDuplicateMatch(res.error.duplicate_match ?? null);
          setNetworkError(null);
        } else {
          // Network drop / Timeout / Server stopped / DB error -> strict Form Preservation!
          setNetworkError(res.error.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void executeSave();
  };

  return (
    <main className="mob-main-scroll-sticky-actions" data-testid="mob-screen-MOB-06">
      <form
        id="mob-food-form"
        onSubmit={handleFormSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
      >
        {/* Top AI Scan Trigger Banner (Create Mode) */}
        {mode === 'create' && !mergeIntoFoodId && (
          <button
            type="button"
            className="mob-banner-alert mob-banner-alert-info"
            data-testid="mob-form-ai-btn"
            disabled={isOfflineReadOnly}
            onClick={onOpenAiScan}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Camera size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  Chụp / Quét nhãn & hóa đơn bằng AI (MOB-S04)
                </div>
                <div className="t-micro" style={{ color: 'inherit' }}>
                  Tự động nhận diện tên, thương hiệu, loại và hạn sử dụng
                </div>
              </div>
            </div>
            <Sparkles size={18} aria-hidden="true" />
          </button>
        )}

        {/* AI Pre-filled Notice */}
        {aiSourceLabel && (
          <div className="mob-banner-alert mob-banner-alert-fresh" data-testid="mob-form-ai-banner">
            <span style={{ fontSize: 'var(--text-xs)' }}>
              <strong>AI Pre-filled ({aiSourceLabel}):</strong> Các trường có nhãn{' '}
              <span className="badge badge-info">AI</span> vừa được gợi ý. Hãy kiểm tra lại Hạn sử
              dụng trước khi lưu.
            </span>
          </div>
        )}

        {/* Merge Batch Notice */}
        {mergeIntoFoodId && (
          <div className="mob-banner-alert mob-banner-alert-info">
            <span style={{ fontSize: 'var(--text-sm)' }}>
              Đang tạo <strong>lô mới</strong> dùng chung thực phẩm:{' '}
              <strong>{mergeTargetName}</strong>
            </span>
          </div>
        )}

        {/* Duplicate Name Prompt */}
        {duplicateMatch?.has_name_conflict && duplicateMatch.name_conflict_food && (
          <div
            className="pantry-card"
            style={{
              backgroundColor: 'var(--banner-offline-bg)',
              border: '1px solid var(--banner-offline-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-2)',
            }}
            data-testid="mob-form-duplicate-prompt"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle
                size={18}
                style={{ color: 'var(--status-urgent-ink)', flexShrink: 0, marginTop: 2 }}
                aria-hidden="true"
              />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--status-urgent-ink)' }}>
                  Phát hiện trùng tên: {duplicateMatch.name_conflict_food.food_name}
                </div>
                <div className="t-micro" style={{ color: 'var(--status-urgent-ink)' }}>
                  Mã sẵn có:{' '}
                  <span className="mono-num">{duplicateMatch.name_conflict_food.food_code}</span> ·
                  Đang có {duplicateMatch.existing_active_lots.length} lô hoạt động. Bạn muốn ghép
                  thêm lô mới hay tạo riêng?
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: 40, fontSize: 13 }}
                disabled={isSubmitting}
                data-testid="mob-form-merge-lot-btn"
                onClick={() => {
                  const target = duplicateMatch.name_conflict_food!;
                  setDuplicateMatch(null);
                  void executeSave({ merge_into_food_id: target.food_id });
                }}
              >
                Ghép thành lô mới
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 40, fontSize: 13 }}
                disabled={isSubmitting}
                data-testid="mob-form-force-separate-btn"
                onClick={() => {
                  setDuplicateMatch(null);
                  void executeSave({ force_create_separate_food: true });
                }}
              >
                Tạo món riêng biệt
              </button>
            </div>
          </div>
        )}

        {/* Preserved Form Network Error Alert with Retry */}
        {networkError && (
          <div
            className="mob-banner-alert mob-banner-alert-danger"
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
            role="alert"
            data-testid="mob-form-network-error"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700 }}>Chưa lưu được — Dữ liệu biểu mẫu đã được giữ nguyên</div>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{networkError}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary btn-fixed-md"
                disabled={isSubmitting}
                data-testid="mob-form-retry-btn"
                onClick={() => void executeSave()}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    <span>Đang thử…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} aria-hidden="true" />
                    <span>Thử lại lưu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Group 1: Food Definition (IN01 - IN05) */}
        <section
          className="pantry-card"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
        >
          <h2 className="t-card-title">Nhóm 1 — Thông tin cơ bản (foods)</h2>

          {/* IN01: food_code */}
          <div className="mob-field">
            <label htmlFor="mob-form-food-code" className="mob-field-label">
              <span>Mã thực phẩm (IN01) *</span>
              {mode === 'create' && !mergeIntoFoodId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 32, padding: '0 8px', fontSize: 12, color: 'var(--accent-hover)' }}
                  onClick={() => {
                    onUpdateValues({ food_code: buildNextFoodCodeSuggestion(existingFoodCodes) });
                    setFieldErrors((prev) => ({ ...prev, food_code: undefined }));
                  }}
                >
                  <Wand2 size={13} aria-hidden="true" />
                  <span>Gợi ý mã</span>
                </button>
              )}
            </label>
            <input
              id="mob-form-food-code"
              type="text"
              className={`mob-input mono-num ${fieldErrors.food_code ? 'mob-input-error' : ''}`}
              disabled={Boolean(mergeIntoFoodId)}
              data-testid="mob-form-food-code"
              value={values.food_code}
              onChange={(e) => {
                onUpdateValues({ food_code: e.target.value });
                setFieldErrors((prev) => ({ ...prev, food_code: undefined }));
              }}
              placeholder="TP016"
            />
            {fieldErrors.food_code && (
              <span className="mob-field-error" data-testid="mob-form-error-food_code">
                {fieldErrors.food_code}
              </span>
            )}
          </div>

          {/* IN02: food_name */}
          <div className="mob-field">
            <label htmlFor="mob-form-food-name" className="mob-field-label">
              <span>Tên thực phẩm (IN02) *</span>
              {isAiField('food_name') && <span className="badge badge-info">AI</span>}
            </label>
            <input
              id="mob-form-food-name"
              type="text"
              className={`mob-input ${fieldErrors.food_name ? 'mob-input-error' : ''}`}
              disabled={Boolean(mergeIntoFoodId)}
              data-testid="mob-form-food-name"
              value={values.food_name}
              onChange={(e) => {
                onUpdateValues({ food_name: e.target.value });
                setFieldErrors((prev) => ({ ...prev, food_name: undefined }));
              }}
              placeholder="Ví dụ: Thịt ba rọi heo"
            />
            {fieldErrors.food_name && (
              <span className="mob-field-error" data-testid="mob-form-error-food_name">
                {fieldErrors.food_name}
              </span>
            )}
          </div>

          <div className="mob-field-row-2">
            {/* IN03: category_id */}
            <div className="mob-field">
              <label htmlFor="mob-form-category" className="mob-field-label">
                <span>Loại (IN03) *</span>
                {isAiField('category_id') && <span className="badge badge-info">AI</span>}
              </label>
              <select
                id="mob-form-category"
                className="mob-select"
                disabled={Boolean(mergeIntoFoodId)}
                data-testid="mob-form-category"
                value={values.category_id}
                onChange={(e) => onUpdateValues({ category_id: Number(e.target.value) })}
              >
                {catalogs.categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* IN04: brand */}
            <div className="mob-field">
              <label htmlFor="mob-form-brand" className="mob-field-label">
                <span>Thương hiệu (IN04)</span>
                {isAiField('brand') && <span className="badge badge-info">AI</span>}
              </label>
              <input
                id="mob-form-brand"
                type="text"
                className="mob-input"
                disabled={Boolean(mergeIntoFoodId)}
                data-testid="mob-form-brand"
                value={values.brand}
                onChange={(e) => onUpdateValues({ brand: e.target.value })}
                placeholder="Vinamilk, MeatDeli..."
              />
            </div>
          </div>

          {/* IN05: description */}
          <div className="mob-field">
            <label htmlFor="mob-form-description" className="mob-field-label">
              <span>Mô tả (IN05)</span>
              {isAiField('description') && <span className="badge badge-info">AI</span>}
            </label>
            <input
              id="mob-form-description"
              type="text"
              className="mob-input"
              disabled={Boolean(mergeIntoFoodId)}
              data-testid="mob-form-description"
              value={values.description}
              onChange={(e) => onUpdateValues({ description: e.target.value })}
              placeholder="Quy cách đóng gói, hướng dẫn bảo quản..."
            />
          </div>
        </section>

        {/* Group 2: Storage & Batch Details (IN06 - IN12) */}
        <section
          className="pantry-card"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
        >
          <h2 className="t-card-title">Nhóm 2 — Bảo quản & Lô hàng (food_items)</h2>

          {/* IN06: 2-level Storage Location */}
          <div className="mob-field">
            <span className="mob-field-label">
              <span>Khu vực & Ngăn bảo quản (IN06) *</span>
              {isAiField('location_id') && <span className="badge badge-info">AI</span>}
            </span>
            <div className="mob-segmented" role="tablist">
              {(['Trong tủ lạnh', 'Ngoài tủ lạnh'] as const).map((area) => (
                <button
                  key={area}
                  type="button"
                  role="tab"
                  aria-selected={values.area_type === area}
                  className="mob-segment-btn"
                  data-testid={`mob-form-area-${area}`}
                  onClick={() => handleAreaChange(area)}
                >
                  {area}
                </button>
              ))}
            </div>
            <select
              aria-label="Ngăn hoặc kệ bảo quản chi tiết"
              className="mob-select"
              data-testid="mob-form-location"
              value={values.location_id}
              onChange={(e) => onUpdateValues({ location_id: Number(e.target.value) })}
            >
              {areaLocations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mob-field-row-2">
            {/* IN08: quantity */}
            <div className="mob-field">
              <label htmlFor="mob-form-quantity" className="mob-field-label">
                <span>Số lượng (IN08) *</span>
                {isAiField('quantity') && <span className="badge badge-info">AI</span>}
              </label>
              <input
                id="mob-form-quantity"
                type="number"
                step="any"
                className={`mob-input mono-num ${fieldErrors.quantity ? 'mob-input-error' : ''}`}
                data-testid="mob-form-quantity"
                value={values.quantity}
                onChange={(e) => {
                  onUpdateValues({ quantity: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
                }}
              />
              {fieldErrors.quantity && (
                <span className="mob-field-error" data-testid="mob-form-error-quantity">
                  {fieldErrors.quantity}
                </span>
              )}
            </div>

            {/* IN07: unit_id */}
            <div className="mob-field">
              <label htmlFor="mob-form-unit" className="mob-field-label">
                <span>Đơn vị (IN07) *</span>
                {isAiField('unit_id') && <span className="badge badge-info">AI</span>}
              </label>
              <select
                id="mob-form-unit"
                className="mob-select"
                data-testid="mob-form-unit"
                value={values.unit_id}
                onChange={(e) => onUpdateValues({ unit_id: Number(e.target.value) })}
              >
                {catalogs.units.map((u) => (
                  <option key={u.unit_id} value={u.unit_id}>
                    {u.unit_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* IN09: min_threshold */}
          <div className="mob-field">
            <label htmlFor="mob-form-min-threshold" className="mob-field-label">
              Ngưỡng tồn tối thiểu cảnh báo cần mua (IN09)
            </label>
            <input
              id="mob-form-min-threshold"
              type="number"
              step="any"
              className={`mob-input mono-num ${fieldErrors.min_threshold ? 'mob-input-error' : ''}`}
              data-testid="mob-form-min-threshold"
              value={values.min_threshold}
              onChange={(e) => {
                onUpdateValues({ min_threshold: e.target.value });
                setFieldErrors((prev) => ({ ...prev, min_threshold: undefined }));
              }}
            />
            {fieldErrors.min_threshold && (
              <span className="mob-field-error">{fieldErrors.min_threshold}</span>
            )}
          </div>

          <div className="mob-field-row-2">
            {/* IN10: import_date */}
            <div className="mob-field">
              <label htmlFor="mob-form-import-date" className="mob-field-label">
                Ngày nhập (IN10) *
              </label>
              <input
                id="mob-form-import-date"
                type="date"
                className={`mob-input mono-num ${fieldErrors.import_date ? 'mob-input-error' : ''}`}
                data-testid="mob-form-import-date"
                value={values.import_date}
                onChange={(e) => {
                  onUpdateValues({ import_date: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, import_date: undefined }));
                }}
              />
              {fieldErrors.import_date && (
                <span className="mob-field-error">{fieldErrors.import_date}</span>
              )}
            </div>

            {/* IN11: expiry_date */}
            <div className="mob-field">
              <label htmlFor="mob-form-expiry-date" className="mob-field-label">
                <span>Hạn sử dụng (IN11) *</span>
                {isAiField('expiry_date') && <span className="badge badge-info">AI</span>}
              </label>
              <input
                id="mob-form-expiry-date"
                type="date"
                className={`mob-input mono-num ${fieldErrors.expiry_date ? 'mob-input-error' : ''}`}
                data-testid="mob-form-expiry-date"
                value={values.expiry_date}
                onChange={(e) => {
                  onUpdateValues({ expiry_date: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, expiry_date: undefined }));
                }}
              />
              {fieldErrors.expiry_date && (
                <span className="mob-field-error" data-testid="mob-form-error-expiry_date">
                  {fieldErrors.expiry_date}
                </span>
              )}
            </div>
          </div>

          {/* IN12: note */}
          <div className="mob-field">
            <label htmlFor="mob-form-note" className="mob-field-label">
              Ghi chú lô hàng (IN12)
            </label>
            <textarea
              id="mob-form-note"
              className="mob-textarea"
              data-testid="mob-form-note"
              value={values.note}
              onChange={(e) => onUpdateValues({ note: e.target.value })}
              placeholder="Ghi chú mở nắp, vị trí đặc biệt..."
            />
          </div>
        </section>
      </form>

      {/* Sticky Footer Action Bar */}
      <div className="mob-sticky-footer">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={isSubmitting}
          data-testid="mob-form-cancel-btn"
          onClick={onCancel}
        >
          Hủy
        </button>
        <button
          type="submit"
          form="mob-food-form"
          className="btn btn-primary btn-fixed-md"
          style={{ flex: 1 }}
          disabled={isSubmitting || (isOfflineReadOnly && !networkError)}
          data-testid="mob-form-submit-btn"
        >
          {isSubmitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              <span>Đang lưu…</span>
            </>
          ) : (
            <span>{mode === 'edit' ? 'Cập nhật hồ sơ' : 'Lưu vào kho'}</span>
          )}
        </button>
      </div>
    </main>
  );
}
