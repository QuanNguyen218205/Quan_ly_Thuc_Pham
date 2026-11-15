import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock,
  Database,
  Flame,
  FolderCog,
  History,
  LayoutDashboard,
  Menu,
  Minus,
  Package,
  Radio,
  RotateCcw,
  Settings,
  Users,
  PanelBottomClose,
} from 'lucide-react';
import type { ServerStatusSnapshot } from '@food-mgmt/shared-sim';
import type { DesktopScreenId } from '../state/useDesktopServer';

interface WindowShellProps {
  status: ServerStatusSnapshot;
  activeScreen: DesktopScreenId;
  sidebarCollapsed: boolean;
  trayPopoverOpen: boolean;
  dbErrorMessage: string | null;
  onToggleSidebar: () => void;
  onNavigate: (screen: DesktopScreenId) => void;
  onShiftDate: (deltaDays?: number, targetDate?: string | null, reset?: boolean) => void;
  onMinimizeToTray: () => void;
  onToggleTrayPopover: () => void;
  onRecoverDb: () => void;
  drawer?: ReactNode;
  children: ReactNode;
}

interface NavItemDef {
  id: DesktopScreenId;
  label: string;
  group: 'main' | 'admin';
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'DSK-01', label: 'Tổng quan & Server', group: 'main', icon: LayoutDashboard },
  { id: 'DSK-02', label: 'Đề xuất FEFO', group: 'main', icon: Flame },
  { id: 'DSK-03', label: 'Kho thực phẩm', group: 'main', icon: Package },
  { id: 'DSK-04', label: 'Trung tâm Cảnh báo', group: 'main', icon: Bell },
  { id: 'DSK-05', label: 'Nhật ký kho', group: 'main', icon: History },
  { id: 'DSK-06', label: 'Danh mục & Công thức', group: 'admin', icon: FolderCog },
  { id: 'DSK-07', label: 'Cài đặt hệ thống', group: 'admin', icon: Settings },
];

export function WindowShell({
  status,
  activeScreen,
  sidebarCollapsed,
  trayPopoverOpen,
  dbErrorMessage,
  onToggleSidebar,
  onNavigate,
  onShiftDate,
  onMinimizeToTray,
  onToggleTrayPopover,
  onRecoverDb,
  drawer,
  children,
}: WindowShellProps) {
  const activeClients = status.connected_clients.filter((c) => c.status === 'Connected').length;
  const alertCount = status.alerts_summary.total_alert_badge_count;
  const serverRunning = status.runtime.server_running;
  const dbHealthy = status.runtime.db_healthy;
  const isSimulated = status.system_config.use_simulated_date;

  const mainNav = NAV_ITEMS.filter((i) => i.group === 'main');
  const adminNav = NAV_ITEMS.filter((i) => i.group === 'admin');

  return (
    <div className="desktop-window-frame">
      {/* 1. Title Bar (36px) */}
      <header className="wb-titlebar">
        <div className="wb-titlebar-left">
          <button
            type="button"
            className="wb-chrome-icon-btn"
            onClick={onToggleSidebar}
            title="Thu gọn / Mở rộng Sidebar (Ctrl+B)"
            aria-label="Thu gọn hoặc mở rộng thanh điều hướng"
            data-testid="dsk-sidebar-toggle"
          >
            <Menu size={16} />
          </button>
          <span className="wb-app-name">Quản lý Thực phẩm Gia đình — SERVER</span>
          <span className="wb-prototype-pill" data-testid="dsk-prototype-badge">
            Prototype Giả lập Client–Server • CSDL Giả lập MySQL Schema
          </span>
        </div>

        <div className="wb-titlebar-right">
          <button
            type="button"
            className={`wb-listener-pill ${serverRunning ? 'is-running' : 'is-stopped'}`}
            onClick={() => onNavigate('DSK-01')}
            title="Đi tới bảng giám sát Server Listener"
            data-testid="dsk-listener-pill"
          >
            <span className={`status-dot ${serverRunning ? 'dot-live' : 'dot-stopped'}`} />
            <span className="mono-num">
              {serverRunning
                ? `Listening :${status.system_config.server_port} | ${activeClients} Clients`
                : 'Server Stopped'}
            </span>
          </button>

          <button
            type="button"
            className="wb-chrome-icon-btn"
            onClick={() => onNavigate('DSK-07')}
            title="Cài đặt hệ thống (Ctrl+,)"
            aria-label="Mở cài đặt hệ thống"
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            className="wb-chrome-icon-btn"
            onClick={onMinimizeToTray}
            title="Thu gọn xuống Khay hệ thống (chạy nền)"
            aria-label="Thu gọn cửa sổ xuống khay hệ thống"
            data-testid="dsk-minimize-tray-btn"
          >
            <Minus size={15} />
          </button>
        </div>
      </header>

      {/* 2. System Time & Simulation Bar (38px) */}
      <div className="wb-simbar" role="region" aria-label="Thanh thời gian hệ thống và mô phỏng FEFO">
        <div className="simbar-left">
          <span className="inline-icon-text t-meta">
            <Clock size={14} />
            <span>Múi giờ:</span>
            <strong className="mono-num">{status.system_config.timezone}</strong>
          </span>
          <span className="simbar-divider" aria-hidden="true" />
          <span className="inline-icon-text">
            <span className="t-meta">Ngày HT:</span>
            <strong className="mono-num sim-date-value" data-testid="dsk-sim-effective-date">
              {status.effective_date}
            </strong>
            <span className={`badge ${isSimulated ? 'badge-urgent' : 'badge-fresh'}`}>
              {isSimulated ? 'Đang mô phỏng' : 'Ngày thực tế'}
            </span>
          </span>
        </div>

        <div className="simbar-controls">
          <span className="t-micro">Mô phỏng thời gian:</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm mono-num"
            onClick={() => onShiftDate(-1)}
            data-testid="dsk-sim-minus-1d"
          >
            -1d
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm mono-num"
            onClick={() => onShiftDate(1)}
            data-testid="dsk-sim-plus-1d"
          >
            +1d
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm mono-num"
            onClick={() => onShiftDate(3)}
            data-testid="dsk-sim-plus-3d"
          >
            +3d
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm mono-num"
            onClick={() => onShiftDate(7)}
            data-testid="dsk-sim-plus-7d"
          >
            +7d
          </button>
          <input
            type="date"
            aria-label="Chọn ngày mô phỏng tùy chỉnh"
            className="sim-date-input mono-num"
            value={status.effective_date}
            onChange={(e) => {
              if (e.target.value) {
                onShiftDate(undefined, e.target.value, false);
              }
            }}
            data-testid="dsk-sim-date-input"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onShiftDate(undefined, undefined, true)}
            title="Khôi phục mốc ngày demo mặc định (2026-11-11)"
            data-testid="dsk-sim-reset"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${!isSimulated ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() =>
              isSimulated
                ? onShiftDate(undefined, null, false)
                : onShiftDate(undefined, status.system_config.simulated_date, false)
            }
            data-testid="dsk-sim-realtime-toggle"
          >
            {isSimulated ? 'Dùng ngày thực' : 'Bật giả lập'}
          </button>
        </div>
      </div>

      {/* 3. Main Body Split: Sidebar | Workspace | Drawer */}
      <div className="wb-body">
        <nav
          className={`wb-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}
          aria-label="Điều hướng màn hình Desktop Server"
        >
          <div className="sidebar-section">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  data-testid={`dsk-nav-${item.id}`}
                >
                  <Icon size={18} className="nav-icon" />
                  {!sidebarCollapsed ? <span className="nav-label">{item.label}</span> : null}
                  {item.id === 'DSK-04' && alertCount > 0 ? (
                    <span
                      className="nav-alert-badge mono-num"
                      data-testid="dsk-nav-alert-badge"
                    >
                      {alertCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="sidebar-group-heading">
            {!sidebarCollapsed ? <span>Quản trị</span> : <span aria-hidden="true">•••</span>}
          </div>

          <div className="sidebar-section">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  data-testid={`dsk-nav-${item.id}`}
                >
                  <Icon size={18} className="nav-icon" />
                  {!sidebarCollapsed ? <span className="nav-label">{item.label}</span> : null}
                </button>
              );
            })}
          </div>

          {!sidebarCollapsed ? (
            <div className="sidebar-footer-hints">
              <div className="hint-line">
                <kbd>Ctrl+N</kbd> <span>Thêm thực phẩm</span>
              </div>
              <div className="hint-line">
                <kbd>F5</kbd> <span>Làm mới dữ liệu</span>
              </div>
              <div className="hint-line">
                <kbd>Ctrl+B</kbd> <span>Ẩn/Hiện Sidebar</span>
              </div>
            </div>
          ) : null}
        </nav>

        <main className="wb-workspace">
          {!dbHealthy || dbErrorMessage ? (
            <div className="global-db-error-banner" role="alert" data-testid="dsk-db-error-banner">
              <div className="inline-icon-text">
                <AlertTriangle size={16} />
                <div>
                  <strong>Lỗi kết nối CSDL MySQL (food_management):</strong>{' '}
                  {dbErrorMessage || 'Dịch vụ CSDL giả lập đang ngoại tuyến — mọi thao tác kho bị khóa.'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onRecoverDb}
              >
                Kết nối lại CSDL
              </button>
            </div>
          ) : null}
          {children}
        </main>

        {drawer}
      </div>

      {/* 4. Bottom Status Bar (26px) */}
      <footer className="wb-statusbar">
        <div className="statusbar-left">
          <span
            className={`statusbar-item ${dbHealthy ? 'is-healthy' : 'is-error'}`}
            data-testid="dsk-statusbar-db"
          >
            <Database size={12} />
            <span>DB: {dbHealthy ? 'MySQL Connected (Sim)' : 'MySQL Disconnected'}</span>
          </span>
          <span className="statusbar-sep" aria-hidden="true" />
          <span className="statusbar-item" data-testid="dsk-statusbar-clients">
            <Users size={12} />
            <span className="mono-num">Active Clients: {activeClients}</span>
          </span>
          <span className="statusbar-sep" aria-hidden="true" />
          <button
            type="button"
            className={`statusbar-btn ${alertCount > 0 ? 'has-alerts' : ''}`}
            onClick={() => onNavigate('DSK-04')}
            data-testid="dsk-statusbar-alerts"
          >
            <Bell size={12} />
            <span className="mono-num">Cảnh báo: {alertCount}</span>
          </button>
        </div>

        <div className="statusbar-right">
          <button
            type="button"
            className={`statusbar-btn ${trayPopoverOpen ? 'is-active' : ''}`}
            onClick={onToggleTrayPopover}
            data-testid="dsk-tray-toggle-btn"
          >
            <Radio size={12} />
            <span>Khay hệ thống (DSK-M06)</span>
          </button>
          <span className="statusbar-sep" aria-hidden="true" />
          <button
            type="button"
            className="statusbar-btn"
            onClick={onMinimizeToTray}
          >
            <PanelBottomClose size={12} />
            <span>Thu gọn Tray</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
