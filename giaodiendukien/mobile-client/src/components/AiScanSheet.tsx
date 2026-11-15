import { useEffect, useState, type ChangeEvent } from 'react';
import { AlertCircle, Camera, CheckCircle2, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import type {
  AiScanPreset,
  AiScanResult,
  CatalogBundle,
  ServerResponse,
} from '@food-mgmt/shared-sim';
import { formatIsoDateShort } from '../domain/food-lot-presentation';

interface AiScanSheetProps {
  open: boolean;
  presets: AiScanPreset[];
  catalogs: CatalogBundle;
  isOfflineReadOnly: boolean;
  onClose: () => void;
  onScan: (payload: {
    preset_id?: string;
    file_name?: string;
    simulated_blur?: boolean;
  }) => Promise<ServerResponse<AiScanResult>>;
  onApplyResult: (result: AiScanResult) => void;
  onFallbackManual: () => void;
}

export function AiScanSheet({
  open,
  presets,
  catalogs,
  isOfflineReadOnly,
  onClose,
  onScan,
  onApplyResult,
  onFallbackManual,
}: AiScanSheetProps) {
  const [captureSource, setCaptureSource] = useState<'camera' | 'gallery'>('camera');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    () => presets[0]?.preset_id ?? 'preset-thit-ba-roi',
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AiScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPresetId(presets[0]?.preset_id ?? 'preset-thit-ba-roi');
      setUploadedFileName('');
      setScanResult(null);
      setScanError(null);
      setIsScanning(false);
    }
  }, [open, presets]);

  if (!open) return null;

  const activePreset = presets.find((p) => p.preset_id === selectedPresetId) ?? presets[0];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setScanResult(null);
      setScanError(null);
    }
  };

  const handleRunScan = async () => {
    if (isOfflineReadOnly) {
      setScanError('Cần kết nối Desktop Server để gửi ảnh nhận diện AI Vision.');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const payload = uploadedFileName
        ? { file_name: uploadedFileName }
        : {
            preset_id: selectedPresetId,
            simulated_blur: activePreset?.source_type === 'blurry',
          };

      const res = await onScan(payload);
      if (res.ok) {
        setScanResult(res.data);
      } else {
        setScanError(res.error.message);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const resolveCategoryName = (id: number) =>
    catalogs.categories.find((c) => c.category_id === id)?.category_name ?? `Loại #${id}`;
  const resolveUnitName = (id: number) =>
    catalogs.units.find((u) => u.unit_id === id)?.unit_name ?? 'đơn vị';
  const resolveLocName = (id: number) =>
    catalogs.storage_locations.find((l) => l.location_id === id)?.location_name ?? `Vị trí #${id}`;

  return (
    <>
      <div className="mob-sheet-backdrop" onClick={() => !isScanning && onClose()} />
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Quét nhãn thực phẩm hoặc hóa đơn bằng AI Vision"
        data-testid="mob-sheet-MOB-S04"
      >
        <div className="mob-sheet-handle" />
        <div className="mob-sheet-header">
          <div>
            <h2 className="t-screen-title">Quét nhãn & Hóa đơn AI</h2>
            <p className="t-meta" style={{ margin: '2px 0 0' }}>
              Trích xuất thông tin thực phẩm điền sẵn vào biểu mẫu MOB-06
            </p>
          </div>
          <button
            type="button"
            className="mob-icon-btn"
            aria-label="Đóng"
            disabled={isScanning}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {/* Source Switch */}
          <div className="mob-segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={captureSource === 'camera'}
              className="mob-segment-btn"
              onClick={() => setCaptureSource('camera')}
            >
              <Camera size={16} aria-hidden="true" />
              <span>Chụp ảnh (Mô phỏng)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={captureSource === 'gallery'}
              className="mob-segment-btn"
              onClick={() => setCaptureSource('gallery')}
            >
              <ImageIcon size={16} aria-hidden="true" />
              <span>Chọn từ Thư viện</span>
            </button>
          </div>

          {/* Preset selector (4 presets including blurry receipt failure case) */}
          <div className="mob-field">
            <span className="mob-field-label">Chọn mẫu ảnh quét thử nghiệm (4 kịch bản)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {presets.map((preset) => {
                const isSelected = !uploadedFileName && selectedPresetId === preset.preset_id;
                return (
                  <button
                    key={preset.preset_id}
                    type="button"
                    className="pantry-card"
                    data-testid={`mob-ai-preset-${preset.preset_id}`}
                    style={{
                      textAlign: 'left',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid transparent',
                      backgroundColor: isSelected ? 'var(--bg-selected)' : 'var(--bg-surface)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'var(--sp-2)',
                    }}
                    onClick={() => {
                      setUploadedFileName('');
                      setSelectedPresetId(preset.preset_id);
                      setScanResult(null);
                      setScanError(null);
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {preset.label}
                      </div>
                      <div className="t-micro">{preset.description}</div>
                    </div>
                    <span
                      className={`badge ${preset.recognized ? 'badge-fresh' : 'badge-expired'}`}
                    >
                      {preset.preview_badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional real file picker when in gallery mode or anytime */}
          {captureSource === 'gallery' && (
            <div className="mob-field">
              <label htmlFor="mob-ai-file-input" className="mob-field-label">
                Hoặc chọn tệp ảnh từ thiết bị
              </label>
              <input
                id="mob-ai-file-input"
                type="file"
                accept="image/*"
                className="mob-input"
                style={{ padding: 8 }}
                onChange={handleFileChange}
              />
              {uploadedFileName && (
                <span className="t-micro">Tệp đã chọn: {uploadedFileName}</span>
              )}
            </div>
          )}

          {/* Simulated Preview & Trigger */}
          <button
            type="button"
            className="btn btn-primary btn-fixed-full"
            disabled={isScanning || isOfflineReadOnly}
            data-testid="mob-ai-scan-submit"
            onClick={handleRunScan}
          >
            {isScanning ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Đang phân tích AI Vision…</span>
              </>
            ) : (
              <>
                <Sparkles size={18} aria-hidden="true" />
                <span>Gửi nhận diện AI</span>
              </>
            )}
          </button>

          {/* Recognized Result */}
          {scanResult?.recognized && scanResult.suggested_fields && (
            <div
              className="pantry-card"
              style={{
                backgroundColor: 'var(--accent-tint)',
                border: '1px solid var(--accent-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-2)',
              }}
              data-testid="mob-ai-result-success"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    color: 'var(--status-fresh-ink)',
                  }}
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                  Nhận diện thành công ({Math.round(scanResult.confidence * 100)}%)
                </span>
              </div>

              <div
                className="mono-num"
                style={{
                  fontSize: 11,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-muted)',
                }}
              >
                {scanResult.raw_ocr_lines.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>

              <div className="mob-kv-grid">
                <div className="mob-kv-item">
                  <span className="mob-kv-label">Tên thực phẩm</span>
                  <span className="mob-kv-val">{scanResult.suggested_fields.food_name}</span>
                </div>
                <div className="mob-kv-item">
                  <span className="mob-kv-label">Thương hiệu</span>
                  <span className="mob-kv-val">{scanResult.suggested_fields.brand}</span>
                </div>
                <div className="mob-kv-item">
                  <span className="mob-kv-label">Loại & Số lượng</span>
                  <span className="mob-kv-val">
                    {resolveCategoryName(scanResult.suggested_fields.category_id)} ·{' '}
                    {scanResult.suggested_fields.suggested_quantity}{' '}
                    {resolveUnitName(scanResult.suggested_fields.unit_id)}
                  </span>
                </div>
                <div className="mob-kv-item">
                  <span className="mob-kv-label">HSD & Vị trí gợi ý</span>
                  <span className="mob-kv-val">
                    {formatIsoDateShort(scanResult.suggested_fields.expiry_date)} ·{' '}
                    {resolveLocName(scanResult.suggested_fields.suggested_location_id)}
                  </span>
                </div>
              </div>

              <p className="t-micro" style={{ margin: 0, color: 'var(--status-urgent-ink)' }}>
                Lưu ý: Hãy kiểm tra lại Hạn sử dụng và Ngăn bảo quản trước khi bấm Lưu vào kho.
              </p>

              <button
                type="button"
                className="btn btn-primary btn-fixed-full"
                data-testid="mob-ai-apply-btn"
                onClick={() => onApplyResult(scanResult)}
              >
                Áp dụng vào biểu mẫu (MOB-06)
              </button>
            </div>
          )}

          {/* Unreadable / Failure Case */}
          {scanError && (
            <div
              className="mob-banner-alert mob-banner-alert-danger"
              style={{ flexDirection: 'column', alignItems: 'stretch' }}
              role="alert"
              data-testid="mob-ai-result-error"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight: 700 }}>Không thể nhận diện hình ảnh</div>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{scanError}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setScanError(null)}
                >
                  Chụp / Chọn lại
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="mob-ai-fallback-manual"
                  onClick={onFallbackManual}
                >
                  Nhập tay trên biểu mẫu
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isScanning}
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
