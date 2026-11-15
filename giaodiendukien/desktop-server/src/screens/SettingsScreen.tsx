import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Database,
  RotateCcw,
  Save,
  Server,
  Sliders,
} from 'lucide-react';
import {
  DEFAULT_SYSTEM_CONFIG,
  type FaultInjectionMode,
  type ServerResponse,
  type ServerStatusSnapshot,
  type SystemConfig,
} from '@food-mgmt/shared-sim';
import type { SettingsTabId } from '../state/useDesktopServer';
import { PairingQrCode } from '../components/PairingQrCode';

interface SettingsScreenProps {
  activeTab: SettingsTabId;
  status: ServerStatusSnapshot;
  isDirty: boolean;
  onChangeTab: (tab: SettingsTabId) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaveConfig: (patch: Partial<SystemConfig>) => Promise<ServerResponse<SystemConfig>>;
  onToggleServerRunning: () => void;
  onToggleDbHealthy: () => void;
  onSetFaultMode: (mode: FaultInjectionMode) => void;
  onResetDemoData: () => Promise<void>;
  onNotify: (kind: 'success' | 'error' | 'info', title: string, detail?: string) => void;
}

export function SettingsScreen({
  activeTab,
  status,
  isDirty,
  onChangeTab,
  onDirtyChange,
  onSaveConfig,
  onToggleServerRunning,
  onToggleDbHealthy,
  onSetFaultMode,
  onResetDemoData,
  onNotify,
}: SettingsScreenProps) {
  const [draft, setDraft] = useState<SystemConfig>(status.system_config);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmResetDemo, setConfirmResetDemo] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setDraft(status.system_config);
    }
  }, [status.system_config, isDirty]);

  const updateDraft = (patch: Partial<SystemConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    onDirtyChange(true);
    setErrorMsg(null);
    setFieldErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setFieldErrors({});

    const res = await onSaveConfig(draft);
    setSaving(false);

    if (res.ok) {
      onDirtyChange(false);
      onNotify(
        'success',
        'Đã lưu cấu hình & đồng bộ Mobile Client',
        'Hệ thống đã tự động tính lại FEFO (D3) và quét cảnh báo (D4).',
      );
    } else {
      setErrorMsg(res.error.message);
      if (res.error.field_errors) {
        setFieldErrors(res.error.field_errors);
      }
    }
  };

  const handleRestoreDefaults = () => {
    setDraft({ ...DEFAULT_SYSTEM_CONFIG });
    onDirtyChange(true);
    onNotify('info', 'Đã nạp cấu hình mặc định vào biểu mẫu', 'Nhấn "Lưu cấu hình" để áp dụng.');
  };

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-07">
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Cài đặt Hệ thống & Cấu hình Kết nối Server</h1>
          <p className="t-meta">
            Quản trị tham số <code>system_settings</code>, quy tắc FEFO và cấu hình mạng LAN cho Mobile Client
          </p>
        </div>

        {isDirty ? (
          <span className="badge badge-urgent">Có thay đổi chưa lưu</span>
        ) : (
          <span className="badge badge-fresh">Đã đồng bộ</span>
        )}
      </div>

      {/* 2 Tabs */}
      <div className="workbench-tabs" role="tablist" aria-label="Nhóm cấu hình hệ thống">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'business'}
          className={`wb-tab-btn ${activeTab === 'business' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('business')}
          data-testid="dsk-settings-tab-business"
        >
          <Sliders size={14} />
          <span>Tab 1: Tham số Nghiệp vụ & Thời gian</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'network'}
          className={`wb-tab-btn ${activeTab === 'network' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('network')}
          data-testid="dsk-settings-tab-network"
        >
          <Server size={14} />
          <span>Tab 2: Kết nối Server & Vận hành nền</span>
        </button>
      </div>

      {errorMsg ? (
        <div className="inline-alert inline-alert-danger" role="alert">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSave(e)}>
        {activeTab === 'business' ? (
          <div className="settings-grid">
            <section className="hairline-card panel-card">
              <h2 className="t-card-title">Múi giờ & Mô phỏng Ngày Hệ thống</h2>
              <p className="t-meta">Xác định mốc ngày hiện tại để tính DaysRemaining cho FEFO và Cảnh báo.</p>

              <div className="form-field">
                <label htmlFor="cfg-timezone">Múi giờ chuẩn (timezone)</label>
                <select
                  id="cfg-timezone"
                  value={draft.timezone}
                  onChange={(e) => updateDraft({ timezone: e.target.value })}
                >
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>

              <label className="checkbox-inline" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.use_simulated_date}
                  onChange={(e) => updateDraft({ use_simulated_date: e.target.checked })}
                />
                <span>Bật chế độ ngày giả lập (phục vụ kiểm thử FEFO)</span>
              </label>

              <div className="form-field">
                <label htmlFor="cfg-sim-date">Ngày giả lập (YYYY-MM-DD)</label>
                <input
                  id="cfg-sim-date"
                  type="date"
                  className={`mono-num ${fieldErrors.simulated_date ? 'is-invalid' : ''}`}
                  disabled={!draft.use_simulated_date}
                  value={draft.simulated_date}
                  onChange={(e) => updateDraft({ simulated_date: e.target.value })}
                />
                {fieldErrors.simulated_date ? (
                  <span className="field-error">{fieldErrors.simulated_date}</span>
                ) : null}
              </div>
            </section>

            <section className="hairline-card panel-card">
              <h2 className="t-card-title">Ngưỡng Cảnh báo & Phân mức FEFO</h2>
              <p className="t-meta">Cấu hình đồng bộ với bảng system_settings trong MySQL.</p>

              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="cfg-warn-days">Ngưỡng sắp hết hạn (ngày)</label>
                  <input
                    id="cfg-warn-days"
                    type="number"
                    min="0"
                    className={`mono-num ${fieldErrors.warning_days_threshold ? 'is-invalid' : ''}`}
                    value={draft.warning_days_threshold}
                    onChange={(e) => updateDraft({ warning_days_threshold: Number(e.target.value) })}
                  />
                  {fieldErrors.warning_days_threshold ? (
                    <span className="field-error">{fieldErrors.warning_days_threshold}</span>
                  ) : null}
                </div>

                <div className="form-field">
                  <label htmlFor="cfg-min-qty">Mức tồn tối thiểu mặc định</label>
                  <input
                    id="cfg-min-qty"
                    type="number"
                    step="0.1"
                    min="0"
                    className={`mono-num ${fieldErrors.min_quantity_default ? 'is-invalid' : ''}`}
                    value={draft.min_quantity_default}
                    onChange={(e) => updateDraft({ min_quantity_default: Number(e.target.value) })}
                  />
                  {fieldErrors.min_quantity_default ? (
                    <span className="field-error">{fieldErrors.min_quantity_default}</span>
                  ) : null}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="cfg-fefo-high">Ngưỡng FEFO Ưu tiên Cao (≤ ngày)</label>
                  <input
                    id="cfg-fefo-high"
                    type="number"
                    min="0"
                    className={`mono-num ${fieldErrors.fefo_high_days ? 'is-invalid' : ''}`}
                    value={draft.fefo_high_days}
                    onChange={(e) => updateDraft({ fefo_high_days: Number(e.target.value) })}
                  />
                  {fieldErrors.fefo_high_days ? (
                    <span className="field-error">{fieldErrors.fefo_high_days}</span>
                  ) : null}
                </div>

                <div className="form-field">
                  <label htmlFor="cfg-fefo-med">Ngưỡng FEFO Trung bình (≤ ngày)</label>
                  <input
                    id="cfg-fefo-med"
                    type="number"
                    min="0"
                    className={`mono-num ${fieldErrors.fefo_medium_days ? 'is-invalid' : ''}`}
                    value={draft.fefo_medium_days}
                    onChange={(e) => updateDraft({ fefo_medium_days: Number(e.target.value) })}
                  />
                  {fieldErrors.fefo_medium_days ? (
                    <span className="field-error">{fieldErrors.fefo_medium_days}</span>
                  ) : null}
                </div>
              </div>

              <div className="fefo-tier-preview">
                <span className="badge badge-expired">Cao: 0..{draft.fefo_high_days}d</span>
                <span className="badge badge-urgent">
                  Trung bình: {draft.fefo_high_days + 1}..{draft.fefo_medium_days}d
                </span>
                <span className="badge badge-fresh">Thấp: &gt; {draft.fefo_medium_days}d</span>
              </div>
            </section>
          </div>
        ) : (
          <div className="settings-grid">
            <section className="hairline-card panel-card">
              <h2 className="t-card-title">Cấu hình Mạng LAN & Mã Ghép nối QR</h2>
              <p className="t-meta">Địa chỉ để Mobile Client (MOB-00) kết nối và đồng bộ qua mạng nội bộ.</p>

              <div className="settings-network-split">
                <div style={{ flex: 1 }}>
                  <div className="form-row-2">
                    <div className="form-field">
                      <label htmlFor="cfg-ip">Địa chỉ IP LAN Server</label>
                      <input
                        id="cfg-ip"
                        type="text"
                        className={`mono-num ${fieldErrors.server_ip ? 'is-invalid' : ''}`}
                        value={draft.server_ip}
                        onChange={(e) => updateDraft({ server_ip: e.target.value })}
                      />
                      {fieldErrors.server_ip ? (
                        <span className="field-error">{fieldErrors.server_ip}</span>
                      ) : null}
                    </div>
                    <div className="form-field">
                      <label htmlFor="cfg-port">Cổng lắng nghe (Port)</label>
                      <input
                        id="cfg-port"
                        type="number"
                        className={`mono-num ${fieldErrors.server_port ? 'is-invalid' : ''}`}
                        value={draft.server_port}
                        onChange={(e) => updateDraft({ server_port: Number(e.target.value) })}
                      />
                      {fieldErrors.server_port ? (
                        <span className="field-error">{fieldErrors.server_port}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="cfg-pin">Mã ghép nối (Pairing PIN)</label>
                    <input
                      id="cfg-pin"
                      type="text"
                      className="mono-num"
                      value={draft.pairing_pin}
                      onChange={(e) => updateDraft({ pairing_pin: e.target.value })}
                    />
                  </div>

                  <div className="checkbox-stack">
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={draft.auto_start_listener}
                        onChange={(e) => updateDraft({ auto_start_listener: e.target.checked })}
                      />
                      <span>Tự khởi động Server Listener khi mở ứng dụng</span>
                    </label>
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={draft.minimize_to_tray_on_close}
                        onChange={(e) =>
                          updateDraft({ minimize_to_tray_on_close: e.target.checked })
                        }
                      />
                      <span>Thu gọn về Khay hệ thống khi bấm đóng cửa sổ (giữ Server chạy nền)</span>
                    </label>
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={draft.enable_os_alert_notifications}
                        onChange={(e) =>
                          updateDraft({ enable_os_alert_notifications: e.target.checked })
                        }
                      />
                      <span>Thông báo hệ thống khi phát hiện thực phẩm quá hạn / sắp hết</span>
                    </label>
                  </div>
                </div>

                <PairingQrCode
                  ip={draft.server_ip}
                  port={draft.server_port}
                  pin={draft.pairing_pin}
                  size={120}
                />
              </div>
            </section>

            <section className="hairline-card panel-card">
              <h2 className="t-card-title">Trạng thái CSDL & Công cụ Kiểm thử Prototype</h2>
              <p className="t-meta">Điều khiển trạng thái dịch vụ và đặt lại dữ liệu hạt giống SQL.</p>

              <dl className="drawer-kv-grid">
                <div>
                  <dt>CSDL mục tiêu</dt>
                  <dd className="mono-num">food_management (Sim)</dd>
                </div>
                <div>
                  <dt>Trạng thái Listener</dt>
                  <dd>
                    <span
                      className={`badge ${status.runtime.server_running ? 'badge-fresh' : 'badge-expired'}`}
                    >
                      {status.runtime.server_running ? 'Listening' : 'Stopped'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Kết nối DB</dt>
                  <dd>
                    <span
                      className={`badge ${status.runtime.db_healthy ? 'badge-fresh' : 'badge-expired'}`}
                    >
                      {status.runtime.db_healthy ? 'Connected' : 'Disconnected'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Tiêm lỗi hiện tại</dt>
                  <dd className="mono-num">{status.runtime.force_next_error}</dd>
                </div>
              </dl>

              <div className="settings-tools-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onToggleServerRunning}
                >
                  {status.runtime.server_running ? 'Tạm dừng Listener' : 'Bật Listener'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onToggleDbHealthy}
                >
                  <Database size={13} />
                  <span>{status.runtime.db_healthy ? 'Giả lập mất DB' : 'Khôi phục DB'}</span>
                </button>
                <select
                  aria-label="Chọn chế độ tiêm lỗi"
                  value={status.runtime.force_next_error}
                  onChange={(e) => onSetFaultMode(e.target.value as FaultInjectionMode)}
                >
                  <option value="NONE">Fault: NONE</option>
                  <option value="TIMEOUT">Fault: TIMEOUT</option>
                  <option value="NETWORK_DROP">Fault: NETWORK_DROP</option>
                  <option value="DB_ERROR">Fault: DB_ERROR</option>
                  <option value="CONFLICT_STALE_STOCK">Fault: CONFLICT_STALE_STOCK</option>
                </select>
              </div>

              <div className="reset-demo-box">
                {!confirmResetDemo ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setConfirmResetDemo(true)}
                    data-testid="dsk-settings-reset-demo-btn"
                  >
                    <RotateCcw size={13} />
                    <span>Khôi phục dữ liệu mẫu (Reset Demo Data)</span>
                  </button>
                ) : (
                  <div className="inline-alert inline-alert-warn">
                    <AlertTriangle size={15} />
                    <div className="duplicate-choice-body">
                      <span>Xóa toàn bộ chỉnh sửa hiện tại và nạp lại 16 lô mẫu SQL ban đầu?</span>
                      <div className="duplicate-actions">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setConfirmResetDemo(false);
                            void onResetDemoData();
                          }}
                        >
                          Xác nhận Reset
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmResetDemo(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        <div className="settings-footer-bar">
          <button
            type="submit"
            className="btn btn-primary btn-fixed-lg"
            disabled={saving}
            data-testid="dsk-settings-save-btn"
          >
            {saving ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Đang lưu…</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRestoreDefaults}
            data-testid="dsk-settings-reset-btn"
          >
            Khôi phục mặc định
          </button>
        </div>
      </form>
    </div>
  );
}
