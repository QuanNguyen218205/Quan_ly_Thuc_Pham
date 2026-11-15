import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  QrCode,
  Server,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  ClientTransportSnapshot,
  HandshakeResult,
  ProtocolError,
  SavedServerEndpoint,
  ServerResponse,
} from '@food-mgmt/shared-sim';

interface ConnectServerScreenProps {
  snapshot: ClientTransportSnapshot;
  hasEnteredShell: boolean;
  qrModalOpen?: boolean;
  onQrModalOpenChange?: (open: boolean) => void;
  onConnect: (
    params: Partial<SavedServerEndpoint> & { device_name?: string },
  ) => Promise<ServerResponse<HandshakeResult>>;
  onEnterOfflineMode: () => void;
  onBackToApp: () => void;
}

interface QrPresetOption {
  id: string;
  label: string;
  note: string;
  ip: string;
  port: number;
  pin: string;
  badgeClass: string;
}

const QR_SCAN_PRESETS: QrPresetOption[] = [
  {
    id: 'qr-valid',
    label: 'QR Desktop Server DSK-07 (Chuẩn)',
    note: '192.168.1.10:8080 · PIN 4829',
    ip: '192.168.1.10',
    port: 8080,
    pin: '4829',
    badgeClass: 'badge-fresh',
  },
  {
    id: 'qr-wrong-pin',
    label: 'QR Sai mã ghép nối (Kiểm thử PIN)',
    note: '192.168.1.10:8080 · PIN 0000',
    ip: '192.168.1.10',
    port: 8080,
    pin: '0000',
    badgeClass: 'badge-urgent',
  },
  {
    id: 'qr-wrong-ip',
    label: 'QR Sai địa chỉ IP LAN (Kiểm thử không tới máy chủ)',
    note: '192.168.1.99:8080 · PIN 4829',
    ip: '192.168.1.99',
    port: 8080,
    pin: '4829',
    badgeClass: 'badge-expired',
  },
];

function classifyConnectionError(err: ProtocolError): { title: string; hint: string } {
  switch (err.code) {
    case 'INVALID_PAIRING_PIN':
      return {
        title: 'Sai mã ghép nối (PIN)',
        hint: 'Kiểm tra lại mã ghép nối 4 chữ số trên màn hình Desktop Server (DSK-07).',
      };
    case 'TIMEOUT':
      return {
        title: 'Timeout — Hết thời gian chờ',
        hint: 'Desktop Server phản hồi quá chậm hoặc gói tin bị nghẽn. Kiểm tra lại Wi-Fi LAN.',
      };
    case 'INVALID_ADDRESS':
    case 'SERVER_STOPPED':
    case 'NETWORK_DROP':
      return {
        title: 'Không tới được máy chủ',
        hint: 'Đảm bảo điện thoại dùng chung mạng LAN/Wi-Fi với Desktop Server và Server Listener đang BẬT.',
      };
    case 'DB_ERROR':
      return {
        title: 'Desktop Server gặp lỗi CSDL',
        hint: 'Server đang chạy nhưng không truy vấn được MySQL giả lập. Kiểm tra trạng thái DB trên Desktop.',
      };
    default:
      return {
        title: 'Không thể kết nối tới máy chủ',
        hint: 'Vui lòng kiểm tra thông số IP, Port và thử lại.',
      };
  }
}

export function ConnectServerScreen({
  snapshot,
  hasEnteredShell,
  qrModalOpen: controlledQrModalOpen,
  onQrModalOpenChange,
  onConnect,
  onEnterOfflineMode,
  onBackToApp,
}: ConnectServerScreenProps) {
  const [ip, setIp] = useState<string>(snapshot.active_endpoint.ip || '192.168.1.10');
  const [port, setPort] = useState<string>(String(snapshot.active_endpoint.port || 8080));
  const [pin, setPin] = useState<string>(snapshot.active_endpoint.pairing_pin || '4829');
  const [deviceName, setDeviceName] = useState<string>(
    snapshot.device_name || 'Điện thoại Gia đình',
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [connError, setConnError] = useState<ProtocolError | null>(null);
  const [successLatencyMs, setSuccessLatencyMs] = useState<number | null>(
    snapshot.connection_state === 'CONNECTED' ? snapshot.last_latency_ms : null,
  );

  // QR Scanner simulator state
  const [internalQrModalOpen, setInternalQrModalOpen] = useState(false);
  const qrModalOpen =
    controlledQrModalOpen !== undefined ? controlledQrModalOpen : internalQrModalOpen;
  const setQrModalOpen = (next: boolean) => {
    if (controlledQrModalOpen === undefined) {
      setInternalQrModalOpen(next);
    }
    onQrModalOpenChange?.(next);
  };
  const [qrRawJson, setQrRawJson] = useState('{"ip":"192.168.1.10","port":8080,"pin":"4829"}');
  const [qrParseError, setQrParseError] = useState<string | null>(null);

  const runConnect = async (targetIp: string, targetPort: number, targetPin: string) => {
    setIsConnecting(true);
    setConnError(null);
    setSuccessLatencyMs(null);

    try {
      const res = await onConnect({
        ip: targetIp,
        port: targetPort,
        pairing_pin: targetPin,
        device_name: deviceName,
      });
      if (res.ok) {
        setSuccessLatencyMs(res.latency_ms);
      } else {
        setConnError(res.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numericPort = Number(port);
    if (!ip.trim() || !Number.isFinite(numericPort) || numericPort <= 0) {
      setConnError({
        code: 'INVALID_ADDRESS',
        message: 'Vui lòng nhập Địa chỉ IP hợp lệ và Cổng (Port) lớn hơn 0.',
      });
      return;
    }
    void runConnect(ip.trim(), numericPort, pin.trim());
  };

  const handleApplyQrPreset = (preset: QrPresetOption, autoSubmit: boolean) => {
    setIp(preset.ip);
    setPort(String(preset.port));
    setPin(preset.pin);
    setQrModalOpen(false);
    setConnError(null);
    if (autoSubmit) {
      void runConnect(preset.ip, preset.port, preset.pin);
    }
  };

  const handleParseRawQr = () => {
    try {
      const parsed = JSON.parse(qrRawJson) as { ip?: string; port?: number; pin?: string };
      if (!parsed.ip || !parsed.port) {
        setQrParseError('Chuỗi QR thiếu trường ip hoặc port.');
        return;
      }
      setIp(String(parsed.ip));
      setPort(String(parsed.port));
      if (parsed.pin !== undefined) setPin(String(parsed.pin));
      setQrParseError(null);
      setQrModalOpen(false);
      void runConnect(String(parsed.ip), Number(parsed.port), String(parsed.pin ?? ''));
    } catch {
      setQrParseError('Không đọc được định dạng JSON từ mã QR.');
    }
  };

  const errorBanner = connError ? classifyConnectionError(connError) : null;

  return (
    <main className="mob-main-scroll-no-nav" data-testid="mob-screen-MOB-00">
      {/* Intro Pantry Server Card */}
      <section
        className="pantry-card"
        style={{
          backgroundColor: 'var(--accent-tint)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Server size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="t-card-title">Thiết lập & Kết nối Desktop Server</h2>
            <p className="t-meta" style={{ margin: '2px 0 0' }}>
              Đồng bộ kho thực phẩm, FEFO & cảnh báo thời gian thực qua mạng LAN.
            </p>
          </div>
        </div>
        {snapshot.simulated_network_offline && (
          <div className="mob-banner-alert mob-banner-alert-warning">
            <span style={{ fontSize: 'var(--text-xs)' }}>
              Lưu ý: Trình mô phỏng mất Wi-Fi trên thiết bị đang BẬT. Tắt ở tab Khác để kết nối lại.
            </span>
          </div>
        )}
      </section>

      {/* Connection Form */}
      <form
        className="pantry-card"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
      >
        <div className="mob-field-row-2">
          <div className="mob-field">
            <label htmlFor="mob-connect-ip" className="mob-field-label">
              Địa chỉ IP / Hostname
            </label>
            <input
              id="mob-connect-ip"
              type="text"
              className={`mob-input mono-num ${
                connError?.code === 'INVALID_ADDRESS' ? 'mob-input-error' : ''
              }`}
              data-testid="mob-connect-ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.10"
            />
          </div>

          <div className="mob-field">
            <label htmlFor="mob-connect-port" className="mob-field-label">
              Cổng (Port)
            </label>
            <input
              id="mob-connect-port"
              type="number"
              className={`mob-input mono-num ${
                connError?.code === 'INVALID_ADDRESS' ? 'mob-input-error' : ''
              }`}
              data-testid="mob-connect-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="8080"
            />
          </div>
        </div>

        <div className="mob-field-row-2">
          <div className="mob-field">
            <label htmlFor="mob-connect-pin" className="mob-field-label">
              Mã ghép nối (PIN)
            </label>
            <input
              id="mob-connect-pin"
              type="text"
              className={`mob-input mono-num ${
                connError?.code === 'INVALID_PAIRING_PIN' ? 'mob-input-error' : ''
              }`}
              data-testid="mob-connect-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4829"
            />
          </div>

          <div className="mob-field">
            <label htmlFor="mob-connect-device" className="mob-field-label">
              Tên thiết bị
            </label>
            <input
              id="mob-connect-device"
              type="text"
              className="mob-input"
              data-testid="mob-connect-device"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Điện thoại Gia đình"
            />
          </div>
        </div>

        {errorBanner && connError && (
          <div
            className="mob-banner-alert mob-banner-alert-danger"
            role="alert"
            data-testid="mob-connect-error"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  {errorBanner.title}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{connError.message}</div>
                <div className="t-micro" style={{ color: 'inherit', marginTop: 4 }}>
                  {errorBanner.hint}
                </div>
              </div>
            </div>
          </div>
        )}

        {successLatencyMs !== null && !connError && (
          <div className="mob-banner-alert mob-banner-alert-fresh" data-testid="mob-connect-success">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Handshake thành công · Độ trễ{' '}
                <span className="mono-num">{successLatencyMs} ms</span>
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-fixed-full"
          disabled={isConnecting}
          data-testid="mob-connect-submit"
        >
          {isConnecting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              <span>Đang Ping & Handshake…</span>
            </>
          ) : (
            <>
              <Wifi size={18} aria-hidden="true" />
              <span>Kiểm tra & Kết nối</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-fixed-full"
          disabled={isConnecting}
          data-testid="mob-connect-qr-btn"
          onClick={() => setQrModalOpen(true)}
        >
          <QrCode size={18} aria-hidden="true" />
          <span>Quét mã QR từ Desktop Server (DSK-07)</span>
        </button>
      </form>

      {/* Recent Server Endpoints */}
      <section
        className="pantry-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
      >
        <h3 className="t-card-title">Máy chủ đã kết nối gần đây</h3>
        {snapshot.recent_endpoints.map((ep) => (
          <button
            key={`${ep.ip}:${ep.port}`}
            type="button"
            className="pantry-card"
            style={{
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--sp-2)',
              backgroundColor: 'var(--bg-subtle)',
            }}
            data-testid={`mob-recent-server-${ep.ip}`}
            disabled={isConnecting}
            onClick={() => {
              setIp(ep.ip);
              setPort(String(ep.port));
              setPin(ep.pairing_pin);
              void runConnect(ep.ip, ep.port, ep.pairing_pin);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{ep.label}</div>
                <div className="t-micro mono-num">
                  {ep.ip}:{ep.port} · PIN {ep.pairing_pin}
                </div>
              </div>
            </div>
            <span className="badge badge-info">Kết nối nhanh</span>
          </button>
        ))}
      </section>

      {/* Offline Read-Only Mode Entry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <button
          type="button"
          className="btn btn-secondary btn-fixed-full"
          data-testid="mob-connect-offline-btn"
          onClick={onEnterOfflineMode}
        >
          <WifiOff size={18} aria-hidden="true" />
          <span>Dùng chế độ Offline Chỉ xem</span>
        </button>

        {hasEnteredShell && (
          <button type="button" className="btn btn-ghost btn-fixed-full" onClick={onBackToApp}>
            Quay lại màn hình trước
          </button>
        )}
      </div>

      {/* QR Simulator Modal */}
      {qrModalOpen && (
        <>
          <div className="mob-sheet-backdrop" onClick={() => setQrModalOpen(false)} />
          <section
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Mô phỏng quét mã QR kết nối từ Desktop Server"
            data-testid="mob-qr-simulator-modal"
          >
            <div className="mob-sheet-handle" />
            <div className="mob-sheet-header">
              <div>
                <h2 className="t-screen-title">Quét mã QR ghép nối</h2>
                <p className="t-meta" style={{ margin: '2px 0 0' }}>
                  Chọn mã QR mô phỏng từ Desktop Server (DSK-07) hoặc dán chuỗi QR
                </p>
              </div>
              <button
                type="button"
                className="mob-icon-btn"
                aria-label="Đóng"
                onClick={() => setQrModalOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {QR_SCAN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="pantry-card"
                  data-testid={`mob-qr-preset-${preset.id}`}
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--sp-2)',
                  }}
                  onClick={() => handleApplyQrPreset(preset, true)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {preset.label}
                    </div>
                    <div className="t-micro mono-num">{preset.note}</div>
                  </div>
                  <span className={`badge ${preset.badgeClass}`}>Quét</span>
                </button>
              ))}

              <div className="mob-field" style={{ marginTop: 6 }}>
                <label htmlFor="mob-qr-raw-json" className="mob-field-label">
                  Hoặc dán chuỗi QR JSON
                </label>
                <textarea
                  id="mob-qr-raw-json"
                  className="mob-textarea mono-num"
                  style={{ minHeight: 68, fontSize: 13 }}
                  value={qrRawJson}
                  onChange={(e) => setQrRawJson(e.target.value)}
                />
                {qrParseError && <span className="mob-field-error">{qrParseError}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setQrModalOpen(false)}
                >
                  Đóng
                </button>
                <button type="button" className="btn btn-primary" onClick={handleParseRawQr}>
                  Đọc mã QR & Kết nối
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
