import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  shiftIsoDate,
  type AiScanPreset,
  type AiScanResult,
  type AreaType,
  type CatalogBundle,
  type DuplicateCheckResult,
  type Food,
  type FoodFormInput,
  type FoodLotView,
  type ProtocolError,
  type ServerResponse,
  type SimulatedServerNode,
  type SystemConfig,
} from '@food-mgmt/shared-sim';
import { formatQuantity } from '../domain/pantry-formatters';

interface FoodFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  lot?: FoodLotView;
  initialOpenAi?: boolean;
  catalogs: CatalogBundle;
  allFoods: Food[];
  systemConfig: SystemConfig;
  effectiveDate: string;
  aiPresets: AiScanPreset[];
  node: SimulatedServerNode;
  onClose: () => void;
  onSuccess: (message: string, itemId: number) => void;
  onSubmitCreate: (input: FoodFormInput) => Promise<ServerResponse<{ item: FoodLotView }>>;
  onSubmitUpdate: (
    itemId: number,
    input: FoodFormInput,
  ) => Promise<ServerResponse<{ item: FoodLotView }>>;
}

function generateNextFoodCode(allFoods: Food[]): string {
  let maxNum = allFoods.length;
  for (const food of allFoods) {
    const match = /^TP(\d+)$/i.exec(food.food_code.trim());
    if (match) {
      maxNum = Math.max(maxNum, Number(match[1]));
    }
  }
  return `TP${String(maxNum + 1).padStart(3, '0')}`;
}

export function FoodFormModal({
  open,
  mode,
  lot,
  initialOpenAi = false,
  catalogs,
  allFoods,
  systemConfig,
  effectiveDate,
  aiPresets,
  node,
  onClose,
  onSuccess,
  onSubmitCreate,
  onSubmitUpdate,
}: FoodFormModalProps) {
  const [foodCode, setFoodCode] = useState('');
  const [foodName, setFoodName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [areaType, setAreaType] = useState<AreaType>('Trong tủ lạnh');
  const [locationId, setLocationId] = useState<number>(1);
  const [unitId, setUnitId] = useState<number>(1);
  const [quantity, setQuantity] = useState('1');
  const [minThreshold, setMinThreshold] = useState('1');
  const [importDate, setImportDate] = useState(effectiveDate);
  const [expiryDate, setExpiryDate] = useState(effectiveDate);
  const [note, setNote] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [aiPanelOpen, setAiPanelOpen] = useState(initialOpenAi);
  const [selectedPresetId, setSelectedPresetId] = useState(aiPresets[0]?.preset_id ?? '');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [simulateBlur, setSimulateBlur] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<AiScanResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHighlightedFields, setAiHighlightedFields] = useState<Set<string>>(new Set());

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState<ProtocolError | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [mergeIntoFoodId, setMergeIntoFoodId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const locationsInArea = useMemo(
    () => catalogs.storage_locations.filter((loc) => loc.area_type === areaType),
    [catalogs.storage_locations, areaType],
  );

  // Initialize form cleanly whenever opened
  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setServerError(null);
    setDuplicateResult(null);
    setMergeIntoFoodId(undefined);
    setAiResult(null);
    setAiError(null);
    setAiHighlightedFields(new Set());
    setUploadedFileName('');
    setUploadedPreviewUrl(null);
    setSimulateBlur(false);
    setAiPanelOpen(initialOpenAi || mode === 'create');
    setSelectedPresetId(aiPresets[0]?.preset_id ?? '');

    if (mode === 'edit' && lot) {
      setFoodCode(lot.food_code);
      setFoodName(lot.food_name);
      setCategoryId(lot.category_id);
      setBrand(lot.brand ?? '');
      setDescription(lot.description ?? '');
      setImageUrl(lot.image_url ?? '');
      setAreaType(lot.area_type);
      setLocationId(lot.location_id);
      setUnitId(lot.unit_id);
      setQuantity(String(lot.current_quantity));
      setMinThreshold(String(lot.min_threshold));
      setImportDate(lot.import_date);
      setExpiryDate(lot.expiry_date);
      setNote(lot.note ?? '');
      setAdjustmentReason('');
    } else {
      const firstLoc = catalogs.storage_locations[0];
      setFoodCode(generateNextFoodCode(allFoods));
      setFoodName('');
      setCategoryId(catalogs.categories[0]?.category_id ?? 1);
      setBrand('');
      setDescription('');
      setImageUrl('');
      setAreaType(firstLoc?.area_type ?? 'Trong tủ lạnh');
      setLocationId(firstLoc?.location_id ?? 1);
      setUnitId(catalogs.units[0]?.unit_id ?? 1);
      setQuantity('1');
      setMinThreshold(String(systemConfig.min_quantity_default));
      setImportDate(effectiveDate);
      setExpiryDate(shiftIsoDate(effectiveDate, 5));
      setNote('');
      setAdjustmentReason('');
    }
  }, [open, mode, lot, initialOpenAi, catalogs, allFoods, systemConfig, effectiveDate, aiPresets]);

  // Keep locationId synced when areaType changes
  useEffect(() => {
    if (locationsInArea.length === 0) return;
    if (!locationsInArea.some((loc) => loc.location_id === locationId)) {
      setLocationId(locationsInArea[0].location_id);
    }
  }, [locationsInArea, locationId]);

  if (!open) return null;

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, target: 'ai' | 'product') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (target === 'ai') {
        setUploadedFileName(file.name);
        setUploadedPreviewUrl(dataUrl || null);
      } else if (dataUrl) {
        setImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiScan = async () => {
    setAiScanning(true);
    setAiError(null);
    setAiResult(null);

    const res = await node.executeDesktopAction('SCAN_FOOD_IMAGE', {
      preset_id: uploadedFileName ? undefined : selectedPresetId || undefined,
      file_name: uploadedFileName || undefined,
      simulated_blur: simulateBlur,
    });

    setAiScanning(false);
    if (!res.ok) {
      setAiError(res.error.message);
      return;
    }

    setAiResult(res.data);
    const fields = res.data.suggested_fields;
    if (fields) {
      setFoodName(fields.food_name);
      setCategoryId(fields.category_id);
      setBrand(fields.brand);
      setUnitId(fields.unit_id);
      setQuantity(String(fields.suggested_quantity));
      setExpiryDate(fields.expiry_date);
      setDescription(fields.description);

      const matchedLoc = catalogs.storage_locations.find(
        (l) => l.location_id === fields.suggested_location_id,
      );
      if (matchedLoc) {
        setAreaType(matchedLoc.area_type);
        setLocationId(matchedLoc.location_id);
      }
      setAiHighlightedFields(
        new Set(['food_name', 'category_id', 'brand', 'unit_id', 'quantity', 'expiry_date', 'location_id', 'description']),
      );
      setMergeIntoFoodId(undefined);
      setDuplicateResult(null);
    }
  };

  const handleCheckDuplicateLive = async () => {
    if (mode !== 'create') return;
    const res = await node.executeDesktopAction('CHECK_FOOD_DUPLICATE', {
      food_code: foodCode,
      food_name: foodName,
    });
    if (res.ok) {
      setDuplicateResult(
        res.data.has_code_conflict || res.data.has_name_conflict ? res.data : null,
      );
    }
  };

  const buildPayload = (
    overrides?: Partial<Pick<FoodFormInput, 'merge_into_food_id' | 'force_create_separate_food'>>,
  ): FoodFormInput => ({
    food_code: foodCode.trim(),
    food_name: foodName.trim(),
    category_id: categoryId,
    brand: brand.trim(),
    description: description.trim(),
    image_url: imageUrl.trim() || null,
    location_id: locationId,
    unit_id: unitId,
    quantity: Number(quantity),
    min_threshold: Number(minThreshold),
    import_date: importDate,
    expiry_date: expiryDate,
    note: note.trim(),
    merge_into_food_id: overrides?.merge_into_food_id ?? mergeIntoFoodId,
    force_create_separate_food: overrides?.force_create_separate_food,
    adjustment_reason: adjustmentReason.trim() || undefined,
    actor_device: 'Desktop Server',
  });

  const handleSubmit = async (
    e: FormEvent,
    overrides?: Partial<Pick<FoodFormInput, 'merge_into_food_id' | 'force_create_separate_food'>>,
  ) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setServerError(null);

    const payload = buildPayload(overrides);
    const res =
      mode === 'edit' && lot
        ? await onSubmitUpdate(lot.item_id, payload)
        : await onSubmitCreate(payload);

    setSubmitting(false);

    if (res.ok) {
      onSuccess(
        mode === 'edit'
          ? `Đã cập nhật hồ sơ "${res.data.item.food_name}"`
          : `Đã nhập lô mới "${res.data.item.food_name}" (${res.data.item.item_code})`,
        res.data.item.item_id,
      );
      return;
    }

    setServerError(res.error);
    if (res.error.field_errors) {
      setFieldErrors(res.error.field_errors);
    }
    if (res.error.duplicate_match) {
      setDuplicateResult(res.error.duplicate_match);
    }
  };

  const qtyChangedInEdit =
    mode === 'edit' && lot && Math.abs(Number(quantity) - lot.current_quantity) > 0.001;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-dialog modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dsk-m01-title"
        data-testid="dsk-modal-DSK-M01"
      >
        <div className="modal-header">
          <div>
            <span className="t-micro">DSK-M01 · BIỂU MẪU 12 TRƯỜNG (IN01–IN12)</span>
            <h2 id="dsk-m01-title" className="t-panel-title">
              {mode === 'edit' && lot ? `Chỉnh sửa: ${lot.food_name} (${lot.item_code})` : 'Thêm Thực phẩm & Lô hàng Mới'}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Đóng biểu mẫu"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-body modal-body-scroll">
            {/* Simulated AI Vision Assistant Strip */}
            {mode === 'create' ? (
              <section className="ai-assistant-box" aria-label="Trợ lý quét nhãn AI Vision">
                <div className="ai-assistant-header">
                  <div className="inline-icon-text">
                    <Sparkles size={15} className="text-accent" />
                    <strong>Trợ lý AI Vision Scan (FR-03 — Giả lập OCR Nhãn / Hóa đơn)</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setAiPanelOpen((v) => !v)}
                  >
                    {aiPanelOpen ? 'Thu gọn' : 'Mở quét AI'}
                  </button>
                </div>

                {aiPanelOpen ? (
                  <div className="ai-assistant-body">
                    <div className="ai-controls-row">
                      <div className="form-field" style={{ flex: 2 }}>
                        <label htmlFor="ai-preset-select">Chọn ảnh mẫu (Nhãn / Hóa đơn)</label>
                        <select
                          id="ai-preset-select"
                          value={selectedPresetId}
                          onChange={(e) => {
                            setSelectedPresetId(e.target.value);
                            setUploadedFileName('');
                            setUploadedPreviewUrl(null);
                          }}
                          data-testid="dsk-m01-ai-preset-select"
                        >
                          {aiPresets.map((preset) => (
                            <option key={preset.preset_id} value={preset.preset_id}>
                              {preset.label} ({preset.preview_badge})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field" style={{ flex: 1 }}>
                        <label htmlFor="ai-file-upload">Hoặc tải ảnh từ máy</label>
                        <label className="btn btn-secondary file-upload-label" htmlFor="ai-file-upload">
                          <Upload size={14} />
                          <span>{uploadedFileName ? uploadedFileName.slice(0, 16) : 'Chọn ảnh…'}</span>
                        </label>
                        <input
                          id="ai-file-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => handleImageUpload(e, 'ai')}
                          data-testid="dsk-m01-ai-file-input"
                        />
                      </div>

                      <div className="ai-action-col">
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={simulateBlur}
                            onChange={(e) => setSimulateBlur(e.target.checked)}
                          />
                          <span>Giả lập ảnh mờ</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-secondary btn-fixed-lg"
                          disabled={aiScanning}
                          onClick={() => void handleRunAiScan()}
                          data-testid="dsk-m01-ai-scan-btn"
                        >
                          {aiScanning ? (
                            <>
                              <span className="btn-spinner" aria-hidden="true" />
                              <span>Đang quét AI…</span>
                            </>
                          ) : (
                            <>
                              <Camera size={14} />
                              <span>Nhận diện AI & Điền</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {uploadedPreviewUrl ? (
                      <div className="ai-upload-preview">
                        <img src={uploadedPreviewUrl} alt="Ảnh nhãn đã tải" />
                        <span className="t-meta">Ảnh cục bộ: {uploadedFileName}</span>
                      </div>
                    ) : null}

                    {aiError ? (
                      <div className="inline-alert inline-alert-danger" role="alert">
                        <AlertCircle size={15} />
                        <div>
                          <strong>Không đọc được ảnh (AI_UNREADABLE):</strong> {aiError}
                        </div>
                      </div>
                    ) : null}

                    {aiResult && aiResult.recognized ? (
                      <div className="inline-alert inline-alert-fresh" role="status">
                        <Check size={15} />
                        <div>
                          <strong>
                            AI gợi ý ({Math.round(aiResult.confidence * 100)}% tin cậy):
                          </strong>{' '}
                          {aiResult.raw_ocr_lines.join(' · ')}. Các trường được tô viền xanh bên dưới — vui lòng kiểm tra lại trước khi lưu.
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Duplicate / Server Error Banners */}
            {serverError && serverError.code !== 'DUPLICATE_FOOD_NAME' ? (
              <div className="inline-alert inline-alert-danger" role="alert">
                <AlertCircle size={15} />
                <span>{serverError.message}</span>
              </div>
            ) : null}

            {duplicateResult?.has_name_conflict && !mergeIntoFoodId ? (
              <div className="inline-alert inline-alert-warn" role="alert" data-testid="dsk-m01-duplicate-banner">
                <AlertTriangle size={16} />
                <div className="duplicate-choice-body">
                  <div>
                    <strong>Phát hiện thực phẩm trùng tên:</strong> Món{' '}
                    <strong>{duplicateResult.name_conflict_food?.food_name}</strong> (mã{' '}
                    <span className="mono-num">{duplicateResult.name_conflict_food?.food_code}</span>) đã tồn tại với{' '}
                    <span className="mono-num">{duplicateResult.existing_active_lots.length}</span> lô đang sử dụng.
                  </div>
                  <div className="duplicate-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (duplicateResult.name_conflict_food) {
                          setMergeIntoFoodId(duplicateResult.name_conflict_food.food_id);
                          setFoodCode(duplicateResult.name_conflict_food.food_code);
                          setServerError(null);
                        }
                      }}
                      data-testid="dsk-m01-merge-btn"
                    >
                      Dùng lại thông tin món này để nhập lô mới
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={submitting}
                      onClick={(e) => void handleSubmit(e, { force_create_separate_food: true })}
                      data-testid="dsk-m01-separate-btn"
                    >
                      Tạo thực phẩm riêng biệt
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {mergeIntoFoodId ? (
              <div className="inline-alert inline-alert-info">
                <Check size={15} />
                <div className="duplicate-choice-body">
                  <span>
                    Đang nhập lô mới gắn vào thực phẩm có sẵn (<strong className="mono-num">{foodCode}</strong>).
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setMergeIntoFoodId(undefined)}
                  >
                    Bỏ ghép lô
                  </button>
                </div>
              </div>
            ) : null}

            {/* 2-Column 12-Field Form */}
            <div className="form-two-col">
              {/* Column 1: Food Identity (foods) */}
              <fieldset className="form-group-card">
                <legend>1. Định danh Thực phẩm (foods)</legend>

                <div className="form-row-2">
                  <div className="form-field">
                    <label htmlFor="m01-food-code">
                      Mã thực phẩm (IN01) <span className="req">*</span>
                    </label>
                    <input
                      id="m01-food-code"
                      type="text"
                      className={`mono-num ${fieldErrors.food_code ? 'is-invalid' : ''}`}
                      value={foodCode}
                      disabled={Boolean(mergeIntoFoodId)}
                      onChange={(e) => setFoodCode(e.target.value)}
                      onBlur={() => void handleCheckDuplicateLive()}
                      placeholder="VD: TP016"
                      data-testid="dsk-m01-food-code"
                    />
                    {fieldErrors.food_code ? <span className="field-error">{fieldErrors.food_code}</span> : null}
                  </div>

                  <div className="form-field">
                    <label htmlFor="m01-category">
                      Loại thực phẩm (IN03) <span className="req">*</span>
                    </label>
                    <select
                      id="m01-category"
                      className={aiHighlightedFields.has('category_id') ? 'ai-suggested-field' : ''}
                      value={categoryId}
                      disabled={Boolean(mergeIntoFoodId)}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      data-testid="dsk-m01-category"
                    >
                      {catalogs.categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="m01-food-name">
                    Tên thực phẩm (IN02) <span className="req">*</span>
                  </label>
                  <input
                    id="m01-food-name"
                    type="text"
                    className={`${fieldErrors.food_name ? 'is-invalid' : ''} ${aiHighlightedFields.has('food_name') ? 'ai-suggested-field' : ''}`}
                    value={foodName}
                    disabled={Boolean(mergeIntoFoodId)}
                    onChange={(e) => setFoodName(e.target.value)}
                    onBlur={() => void handleCheckDuplicateLive()}
                    placeholder="VD: Sữa tươi thanh trùng Vinamilk"
                    data-testid="dsk-m01-food-name"
                  />
                  {fieldErrors.food_name ? <span className="field-error">{fieldErrors.food_name}</span> : null}
                </div>

                <div className="form-field">
                  <label htmlFor="m01-brand">Thương hiệu / Nguồn (IN04)</label>
                  <input
                    id="m01-brand"
                    type="text"
                    className={aiHighlightedFields.has('brand') ? 'ai-suggested-field' : ''}
                    value={brand}
                    disabled={Boolean(mergeIntoFoodId)}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="VD: Vinamilk, MeatDeli, Chợ Sáng..."
                    data-testid="dsk-m01-brand"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="m01-description">Mô tả quy cách (IN05)</label>
                  <textarea
                    id="m01-description"
                    rows={2}
                    className={aiHighlightedFields.has('description') ? 'ai-suggested-field' : ''}
                    value={description}
                    disabled={Boolean(mergeIntoFoodId)}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Quy cách đóng gói, hướng dẫn bảo quản..."
                    data-testid="dsk-m01-description"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="m01-image-url">Ảnh sản phẩm (URL hoặc tải ảnh)</label>
                  <div className="inline-input-action">
                    <input
                      id="m01-image-url"
                      type="text"
                      value={imageUrl}
                      disabled={Boolean(mergeIntoFoodId)}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://... hoặc chọn file ảnh"
                      data-testid="dsk-m01-image-url"
                    />
                    <label className="btn btn-secondary btn-sm file-upload-label" htmlFor="m01-product-img-file">
                      <Upload size={13} />
                      <span>Tải ảnh</span>
                    </label>
                    <input
                      id="m01-product-img-file"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={Boolean(mergeIntoFoodId)}
                      onChange={(e) => handleImageUpload(e, 'product')}
                    />
                  </div>
                </div>
              </fieldset>

              {/* Column 2: Lot Stock & Expiry (food_items) */}
              <fieldset className="form-group-card">
                <legend>2. Lô tồn kho & Hạn sử dụng (food_items)</legend>

                <div className="form-row-2">
                  <div className="form-field">
                    <label htmlFor="m01-area">
                      Khu vực (IN06-1) <span className="req">*</span>
                    </label>
                    <select
                      id="m01-area"
                      value={areaType}
                      onChange={(e) => setAreaType(e.target.value as AreaType)}
                    >
                      <option value="Trong tủ lạnh">Trong tủ lạnh</option>
                      <option value="Ngoài tủ lạnh">Ngoài tủ lạnh</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="m01-location">
                      Vị trí chi tiết (IN06-2) <span className="req">*</span>
                    </label>
                    <select
                      id="m01-location"
                      className={aiHighlightedFields.has('location_id') ? 'ai-suggested-field' : ''}
                      value={locationId}
                      onChange={(e) => setLocationId(Number(e.target.value))}
                      data-testid="dsk-m01-location"
                    >
                      {locationsInArea.map((loc) => (
                        <option key={loc.location_id} value={loc.location_id}>
                          {loc.location_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-field">
                    <label htmlFor="m01-quantity">
                      {mode === 'edit' ? 'Số lượng tồn (IN08)' : 'SL nhập (IN08)'} <span className="req">*</span>
                    </label>
                    <input
                      id="m01-quantity"
                      type="number"
                      step="0.01"
                      min={mode === 'edit' ? '0' : '0.01'}
                      className={`mono-num ${fieldErrors.quantity ? 'is-invalid' : ''} ${aiHighlightedFields.has('quantity') ? 'ai-suggested-field' : ''}`}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      data-testid="dsk-m01-quantity"
                    />
                    {fieldErrors.quantity ? <span className="field-error">{fieldErrors.quantity}</span> : null}
                  </div>

                  <div className="form-field">
                    <label htmlFor="m01-unit">
                      Đơn vị (IN07) <span className="req">*</span>
                    </label>
                    <select
                      id="m01-unit"
                      className={aiHighlightedFields.has('unit_id') ? 'ai-suggested-field' : ''}
                      value={unitId}
                      onChange={(e) => setUnitId(Number(e.target.value))}
                      data-testid="dsk-m01-unit"
                    >
                      {catalogs.units.map((u) => (
                        <option key={u.unit_id} value={u.unit_id}>
                          {u.unit_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="m01-min">Tồn tối thiểu (IN09)</label>
                    <input
                      id="m01-min"
                      type="number"
                      step="0.01"
                      min="0"
                      className={`mono-num ${fieldErrors.min_threshold ? 'is-invalid' : ''}`}
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                      data-testid="dsk-m01-min-threshold"
                    />
                    {fieldErrors.min_threshold ? (
                      <span className="field-error">{fieldErrors.min_threshold}</span>
                    ) : null}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label htmlFor="m01-import-date">
                      Ngày nhập kho (IN10) <span className="req">*</span>
                    </label>
                    <input
                      id="m01-import-date"
                      type="date"
                      className={`mono-num ${fieldErrors.import_date ? 'is-invalid' : ''}`}
                      value={importDate}
                      onChange={(e) => setImportDate(e.target.value)}
                      data-testid="dsk-m01-import-date"
                    />
                    {fieldErrors.import_date ? (
                      <span className="field-error">{fieldErrors.import_date}</span>
                    ) : null}
                  </div>

                  <div className="form-field">
                    <label htmlFor="m01-expiry-date">
                      Hạn sử dụng (IN11) <span className="req">*</span>
                    </label>
                    <input
                      id="m01-expiry-date"
                      type="date"
                      className={`mono-num ${fieldErrors.expiry_date ? 'is-invalid' : ''} ${aiHighlightedFields.has('expiry_date') ? 'ai-suggested-field' : ''}`}
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      data-testid="dsk-m01-expiry-date"
                    />
                    {fieldErrors.expiry_date ? (
                      <span className="field-error">{fieldErrors.expiry_date}</span>
                    ) : null}
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="m01-note">Ghi chú lô hàng (IN12)</label>
                  <textarea
                    id="m01-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú riêng cho lô hàng này (VD: Ưu tiên nấu cuối tuần)..."
                    data-testid="dsk-m01-note"
                  />
                </div>

                {qtyChangedInEdit && lot ? (
                  <div className="form-field">
                    <label htmlFor="m01-adj-reason">
                      Lý do điều chỉnh số lượng ({formatQuantity(lot.current_quantity)} → {quantity})
                    </label>
                    <input
                      id="m01-adj-reason"
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="VD: Kiểm đếm lại khi chỉnh sửa hồ sơ lô"
                    />
                  </div>
                ) : null}
              </fieldset>
            </div>
          </div>

          <div className="modal-footer modal-footer-win">
            <button
              type="submit"
              className="btn btn-primary btn-fixed-lg"
              disabled={submitting}
              data-testid="dsk-m01-submit"
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Đang lưu…</span>
                </>
              ) : (
                <span>{mode === 'edit' ? 'Lưu cập nhật' : 'Lưu thực phẩm'}</span>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              data-testid="dsk-m01-cancel"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
