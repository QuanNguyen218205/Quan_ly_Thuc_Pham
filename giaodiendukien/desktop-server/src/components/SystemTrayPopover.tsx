import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AppWindow,
  Bell,
  Play,
  Power,
  Radio,
  Smartphone,
  Square,
  X,
} from 'lucide-react';
import type { ServerStatusSnapshot } from '@food-mgmt/shared-sim';
import type { DesktopScreenId } from '../state/useDesktopServer';

interface SystemTrayPopoverProps {
  open: boolean;
  minimizedToTray: boolean;
  serverFullyExited: boolean;
  status: ServerStatusSnapshot;
  onClosePopover: () => void;
  onRestoreWindow: (screen?: DesktopScreenId) => void;
  onToggleServer: () => void;
  onExitServer: () => void;
  onReopenAfterExit: () => void;
  onSimulateMobileUse: () => void;
}

export function SystemTrayPopover({
  open,
  minimizedToTray,
  serverFullyExited,
  status,
  onClosePopover,
  onRestoreWindow,
  onToggleServer,
  onExitServer,
  onReopenAfterExit,
  onSimulateMobileUse,
}: SystemTrayPopoverProps) {
  const [confirmExit, setConfirmExit] = useState(false);

  const activeClients = status.connected_clients.filter((c) => c.status === 'Connected');
  const alertCount = status.alerts_summary.total_alert_badge_count;
  const serverRunning = status.runtime.server_running;

  const popoverCard = (
    <section
      className="tray-popover"
      role="dialog"
      aria-label="Menu Khay hệ thống Desktop Server (DSK-M06)"
      data-testid="dsk-popover-DSK-M06"
    >
      <div className="tray-popover-header">
        <div className="tray-brand">
          <span
            className={`status-dot ${serverRunning ? 'dot-live' : 'dot-stopped'}`}
            aria-hidden="true"
          />
          <div>
            <div className="tray-title">Quản lý Thực phẩm — Server</div>
            <div className="tray-subtitle mono-num">
              {serverRunning
                ? `Đang chạy · ${status.system_config.server_ip}:${status.system_config.server_port}`
                : 'Dịch vụ Listener đã tạm dừng'}
            </div>
          </div>
        </div>
        {!minimizedToTray ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClosePopover}
            aria-label="Đóng menu khay hệ thống"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="tray-metrics-grid">
        <div className="tray-metric">
          <span className="t-micro">Client kết nối</span>
          <strong className="mono-num">{activeClients.length} thiết bị</strong>
        </div>
        <div className="tray-metric">
          <span className="t-micro">Cảnh báo khẩn</span>
          <strong className={`mono-num ${alertCount > 0 ? 'text-danger-strong' : ''}`}>
            {alertCount} mục
          </strong>
        </div>
      </div>

      <div className="tray-menu-actions">
        <button
          type="button"
          className="tray-menu-item"
          onClick={() => onRestoreWindow('DSK-01')}
          data-testid="dsk-m06-open-window"
        >
          <AppWindow size={15} />
          <span>Mở cửa sổ Quản trị Desktop</span>
        </button>

        <button
          type="button"
          className="tray-menu-item"
          onClick={() => onRestoreWindow('DSK-04')}
          data-testid="dsk-m06-open-alerts"
        >
          <Bell size={15} />
          <span>Xem Trung tâm Cảnh báo</span>
          {alertCount > 0 ? <span className="badge badge-expired mono-num">{alertCount}</span> : null}
        </button>

        <button
          type="button"
          className="tray-menu-item"
          onClick={onToggleServer}
          data-testid="dsk-m06-toggle-server"
        >
          {serverRunning ? <Square size={15} /> : <Play size={15} />}
          <span>{serverRunning ? 'Tạm dừng Server Listener' : 'Khởi động Server Listener'}</span>
        </button>

        {!confirmExit ? (
          <button
            type="button"
            className="tray-menu-item tray-item-danger"
            onClick={() => {
              if (activeClients.length > 0 && serverRunning) {
                setConfirmExit(true);
              } else {
                onExitServer();
              }
            }}
            data-testid="dsk-m06-exit-server"
          >
            <Power size={15} />
            <span>Thoát hoàn toàn Server</span>
          </button>
        ) : (
          <div className="tray-exit-confirm">
            <div className="tray-exit-warn">
              <AlertTriangle size={14} />
              <span>
                Đang có {activeClients.length} Mobile Client kết nối. Thoát sẽ ngắt đồng bộ LAN.
              </span>
            </div>
            <div className="tray-exit-btns">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setConfirmExit(false);
                  onExitServer();
                }}
              >
                Xác nhận thoát
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmExit(false)}
              >
                Giữ lại
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  // Full Minimized-to-Tray Background View (PH-04 / Section 6.1 verification)
  if (minimizedToTray) {
    return (
      <div className="tray-desktop-stage" data-testid="dsk-tray-minimized-view">
        <div className="tray-background-card hairline-card">
          <div className="tray-bg-badge">
            <Radio size={15} />
            <span>
              {serverFullyExited
                ? 'Server đã dừng hoàn toàn'
                : 'Cửa sổ chính đã thu gọn về Khay hệ thống — Server chạy nền 24/7'}
            </span>
          </div>
          <h1 className="t-view-title">
            {serverFullyExited
              ? 'Desktop Server đã thoát'
              : 'Dịch vụ Nền Desktop Server đang hoạt động độc lập'}
          </h1>
          <p className="t-body">
            {serverFullyExited
              ? 'Dịch vụ Server Listener đã tắt theo yêu cầu. Các thiết bị Mobile Client không thể kết nối cho đến khi khởi chạy lại ứng dụng.'
              : 'Mọi yêu cầu từ Mobile Client (Thêm mới, Xuất dùng sp_use_food, FEFO, Quét cảnh báo D4) vẫn được tiếp nhận và ghi vào CSDL giả lập MySQL mà không cần mở cửa sổ giao diện quản trị.'}
          </p>

          <div className="tray-live-console-mini">
            <div className="mini-console-header">
              <span className="inline-icon-text">
                <Activity size={13} />
                <span>Log gói tin nền gần nhất ({status.packet_logs.length})</span>
              </span>
              <span className="mono-num">
                {status.system_config.server_ip}:{status.system_config.server_port}
              </span>
            </div>
            <ul className="mini-packet-list">
              {status.packet_logs.slice(0, 4).map((pkt) => (
                <li key={pkt.id} className="mono-num">
                  <span className={`pkt-status ${pkt.status === 'ERROR' ? 'is-err' : 'is-ok'}`}>
                    [{pkt.status}]
                  </span>{' '}
                  {pkt.timestamp.slice(11)} · {pkt.action} — {pkt.payload_summary}
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-stage-actions">
            {serverFullyExited ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onReopenAfterExit}
                data-testid="dsk-restore-window-btn"
              >
                <AppWindow size={15} />
                <span>Khởi chạy lại Desktop Server</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onRestoreWindow('DSK-01')}
                  data-testid="dsk-restore-window-btn"
                >
                  <AppWindow size={15} />
                  <span>Khôi phục Cửa sổ Quản trị</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!serverRunning}
                  onClick={onSimulateMobileUse}
                >
                  <Smartphone size={15} />
                  <span>Giả lập Mobile gửi yêu cầu khi thu gọn Tray</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Simulated OS Taskbar & Tray Popover anchor */}
        {!serverFullyExited ? <div className="tray-stage-popover-anchor">{popoverCard}</div> : null}

        <div className="os-taskbar-sim">
          <span className="t-micro">Windows System Tray (Mô phỏng chạy nền)</span>
          <div className="os-tray-icons">
            <span className="tray-os-pill mono-num">
              <span className={`status-dot ${serverRunning ? 'dot-live' : 'dot-stopped'}`} />
              <span>{serverRunning ? 'Server ON' : 'Server OFF'}</span>
            </span>
            {alertCount > 0 ? (
              <span className="badge badge-expired mono-num">{alertCount} cảnh báo</span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return <div className="tray-floating-anchor">{popoverCard}</div>;
}
