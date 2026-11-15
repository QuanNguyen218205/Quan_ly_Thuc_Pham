import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Flame,
  Package,
  Play,
  QrCode,
  Radio,
  Smartphone,
  Square,
  Terminal,
  Trash2,
  UserX,
  Utensils,
  WifiOff,
} from 'lucide-react';
import type {
  AlertsSummary,
  AnalyticsSnapshot,
  FaultInjectionMode,
  FefoListResult,
  FoodLotView,
  GetStatsPayload,
  ServerStatusSnapshot,
} from '@food-mgmt/shared-sim';
import type { DesktopScreenId } from '../state/useDesktopServer';
import {
  formatDaysRemainingLabel,
  formatQuantity,
  getPriorityBadgeClass,
} from '../domain/pantry-formatters';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { PairingQrCode } from '../components/PairingQrCode';

interface DashboardServerScreenProps {
  status: ServerStatusSnapshot;
  stats: AnalyticsSnapshot | null;
  statsQuery: GetStatsPayload;
  fefo: FefoListResult | null;
  alerts: AlertsSummary;
  allLots: FoodLotView[];
  isLoading: boolean;
  qrModalOpen: boolean;
  onToggleQrModal: () => void;
  onChangeStatsQuery: (next: GetStatsPayload) => void;
  onNavigate: (screen: DesktopScreenId) => void;
  onNavigateAlerts: (tab: 'expiry' | 'stock') => void;
  onOpenAddFood: () => void;
  onOpenUseFood: (lot: FoodLotView) => void;
  onOpenDrawer: (itemId: number) => void;
  onToggleServerRunning: () => void;
  onToggleDbHealthy: () => void;
  onSetFaultMode: (mode: FaultInjectionMode) => void;
  onClearPacketLogs: () => void;
  onKickClient: (clientId: string) => void;
  onSimulatePing: () => void;
  onSimulateUse: () => void;
}

export function DashboardServerScreen({
  status,
  stats,
  statsQuery,
  fefo,
  alerts,
  allLots,
  isLoading,
  qrModalOpen,
  onToggleQrModal,
  onChangeStatsQuery,
  onNavigate,
  onNavigateAlerts,
  onOpenAddFood,
  onOpenUseFood,
  onOpenDrawer,
  onToggleServerRunning,
  onToggleDbHealthy,
  onSetFaultMode,
  onClearPacketLogs,
  onKickClient,
  onSimulatePing,
  onSimulateUse,
}: DashboardServerScreenProps) {
  const [customStart, setCustomStart] = useState(
    stats?.start_date ?? status.effective_date,
  );
  const [customEnd, setCustomEnd] = useState(status.effective_date);
  const prevEffectiveDateRef = useRef(status.effective_date);

  useEffect(() => {
    const effectiveChanged = prevEffectiveDateRef.current !== status.effective_date;
    prevEffectiveDateRef.current = status.effective_date;

    if (effectiveChanged || statsQuery.range_days !== 'custom') {
      setCustomStart(stats?.start_date ?? status.effective_date);
      setCustomEnd(status.effective_date);
    }
  }, [status.effective_date, stats?.start_date, statsQuery.range_days]);

  const serverRunning = status.runtime.server_running;
  const dbHealthy = status.runtime.db_healthy;
  const activeClients = status.connected_clients.filter((c) => c.status === 'Connected');
  const urgentFefoTop = (fefo?.items ?? []).slice(0, 5);
  const lotsById = new Map(allLots.map((l) => [l.item_id, l]));

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-01">
      {/* Screen Header & Date Range Toolbar */}
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Tổng quan Kho Thực phẩm & Giám sát Server</h1>
          <p className="t-meta">
            Mốc thời gian hiệu lực: <strong className="mono-num">{status.effective_date}</strong> ·
            Ngưỡng cảnh báo: <strong className="mono-num">{status.system_config.warning_days_threshold}</strong> ngày
          </p>
        </div>

        <div className="toolbar-actions">
          <div className="segmented-toggle" role="group" aria-label="Khoảng thời gian thống kê">
            <button
              type="button"
              className={`segmented-btn ${statsQuery.range_days === 7 ? 'is-active' : ''}`}
              onClick={() => onChangeStatsQuery({ range_days: 7 })}
              data-testid="dsk-range-7d"
            >
              7 ngày
            </button>
            <button
              type="button"
              className={`segmented-btn ${statsQuery.range_days === 30 ? 'is-active' : ''}`}
              onClick={() => onChangeStatsQuery({ range_days: 30 })}
              data-testid="dsk-range-30d"
            >
              30 ngày
            </button>
            <button
              type="button"
              className={`segmented-btn ${statsQuery.range_days === 'custom' ? 'is-active' : ''}`}
              onClick={() =>
                onChangeStatsQuery({
                  range_days: 'custom',
                  start_date: customStart,
                  end_date: customEnd,
                })
              }
              data-testid="dsk-range-custom"
            >
              Tùy chọn
            </button>
          </div>

          {statsQuery.range_days === 'custom' ? (
            <div className="custom-range-inputs">
              <input
                type="date"
                aria-label="Từ ngày"
                className="mono-num"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  onChangeStatsQuery({
                    range_days: 'custom',
                    start_date: e.target.value,
                    end_date: customEnd,
                  });
                }}
              />
              <span>→</span>
              <input
                type="date"
                aria-label="Đến ngày"
                className="mono-num"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  onChangeStatsQuery({
                    range_days: 'custom',
                    start_date: customStart,
                    end_date: e.target.value,
                  });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Listener Stopped Warning */}
      {!serverRunning ? (
        <div className="inline-alert inline-alert-warn" role="alert">
          <WifiOff size={16} />
          <div className="duplicate-choice-body">
            <span>
              <strong>Server Listener đang tạm dừng:</strong> Các thiết bị Mobile Client sẽ không thể kết nối hoặc đồng bộ dữ liệu kho.
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onToggleServerRunning}
            >
              Khởi động lại Listener
            </button>
          </div>
        </div>
      ) : null}

      {/* Empty Inventory Onboarding Card */}
      {stats && stats.kpi.total_managed_lot_count === 0 ? (
        <div className="hairline-card empty-warehouse-banner">
          <div>
            <h2 className="t-card-title">Kho thực phẩm chưa có dữ liệu</h2>
            <p className="t-meta">Thêm lô thực phẩm đầu tiên hoặc quét AI nhãn sản phẩm để bắt đầu theo dõi FEFO.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onOpenAddFood}>
            + Thêm thực phẩm đầu tiên
          </button>
        </div>
      ) : null}

      {/* 4 KPI Stat Tiles */}
      <div className="kpi-grid">
        <button
          type="button"
          className="hairline-card kpi-tile"
          onClick={() => onNavigate('DSK-03')}
          data-testid="dsk-kpi-total-lots"
        >
          <div className="kpi-top">
            <span className="kpi-label">Tổng lô đang quản lý</span>
            <Package size={16} className="kpi-icon-teal" />
          </div>
          <div className="kpi-num kpi-value">{stats?.kpi.active_lot_count ?? 0}</div>
          <div className="kpi-sub">
            <ArrowUpRight size={13} />
            <span>
              Trong tổng <strong className="mono-num">{stats?.kpi.total_managed_lot_count ?? 0}</strong> lô (tổng SL:{' '}
              <span className="mono-num">{formatQuantity(stats?.kpi.total_active_quantity_sum ?? 0)}</span>)
            </span>
          </div>
        </button>

        <button
          type="button"
          className="hairline-card kpi-tile"
          onClick={() => onNavigate('DSK-02')}
          data-testid="dsk-kpi-fefo-urgent"
        >
          <div className="kpi-top">
            <span className="kpi-label">Cần dùng gấp (FEFO Cao)</span>
            <Flame size={16} className="kpi-icon-amber" />
          </div>
          <div className="kpi-num kpi-value">{fefo?.counts_by_priority.Cao ?? 0}</div>
          <div className="kpi-sub">
            <ArrowUpRight size={13} />
            <span>
              Trung bình: <strong className="mono-num">{fefo?.counts_by_priority['Trung bình'] ?? 0}</strong> · Loại quá hạn:{' '}
              <strong className="mono-num">{fefo?.expired_excluded_count ?? 0}</strong>
            </span>
          </div>
        </button>

        <button
          type="button"
          className="hairline-card kpi-tile"
          onClick={() => onNavigateAlerts('expiry')}
          data-testid="dsk-kpi-expiry-alerts"
        >
          <div className="kpi-top">
            <span className="kpi-label">Sắp hết hạn / Quá hạn</span>
            <AlertOctagon size={16} className="kpi-icon-red" />
          </div>
          <div className="kpi-num kpi-value text-danger-strong">{alerts.total_expiry_alerts}</div>
          <div className="kpi-sub">
            <AlertTriangle size={13} />
            <span>
              <strong className="mono-num">{alerts.expired_items.length}</strong> quá hạn ·{' '}
              <strong className="mono-num">{alerts.expiring_soon_items.length}</strong> cận hạn
            </span>
          </div>
        </button>

        <button
          type="button"
          className="hairline-card kpi-tile"
          onClick={() => onNavigateAlerts('stock')}
          data-testid="dsk-kpi-low-stock"
        >
          <div className="kpi-top">
            <span className="kpi-label">Dưới ngưỡng tồn min</span>
            <AlertTriangle size={16} className="kpi-icon-info" />
          </div>
          <div className="kpi-num kpi-value">{alerts.total_stock_alerts}</div>
          <div className="kpi-sub">
            <ArrowUpRight size={13} />
            <span>
              Đã dùng trong kỳ: <strong className="mono-num">{stats?.kpi.used_transactions_in_range ?? 0}</strong> GD
            </span>
          </div>
        </button>
      </div>

      {/* SVG Analytics Charts */}
      <AnalyticsCharts stats={stats} isLoading={isLoading} />

      {/* Top Urgent FEFO Preview + Server Monitor Console */}
      <div className="dashboard-bottom-grid">
        {/* Top Urgent FEFO Table */}
        <section className="hairline-card panel-card">
          <div className="panel-header">
            <div>
              <h2 className="t-card-title">Top Thực phẩm Cần dùng gấp hôm nay (FEFO)</h2>
              <p className="t-meta">Xếp ưu tiên theo Hạn sử dụng tăng dần, trùng hạn xếp FIFO</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('DSK-02')}
            >
              Xem toàn bộ FEFO
            </button>
          </div>

          {urgentFefoTop.length === 0 ? (
            <div className="empty-well">Không có lô thực phẩm nào đang cần dùng theo FEFO.</div>
          ) : (
            <table className="table-dense">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Thực phẩm</th>
                  <th>Vị trí</th>
                  <th className="num-col">Tồn</th>
                  <th>Hạn dùng</th>
                  <th>Mức</th>
                  <th className="num-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {urgentFefoTop.map((item) => {
                  const lot = lotsById.get(item.item_id);
                  return (
                    <tr key={item.item_id}>
                      <td className="mono-num">#{item.rank}</td>
                      <td>
                        <button
                          type="button"
                          className="table-link-btn"
                          onClick={() => onOpenDrawer(item.item_id)}
                        >
                          {item.food_name}
                        </button>
                        <div className="t-micro mono-num">{item.item_code}</div>
                      </td>
                      <td>
                        <div>{item.location_name}</div>
                        <div className="t-micro">{item.area_type}</div>
                      </td>
                      <td className="num-col mono-num">
                        {formatQuantity(item.current_quantity)} {item.unit_name}
                      </td>
                      <td>
                        <div className="mono-num">{item.expiry_date}</div>
                        <div className="t-micro">{formatDaysRemainingLabel(item.days_remaining)}</div>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(item.priority_level)}>
                          {item.priority_level}
                        </span>
                      </td>
                      <td className="num-col">
                        {lot ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={!dbHealthy}
                            onClick={() => onOpenUseFood(lot)}
                          >
                            <Utensils size={12} />
                            <span>Dùng</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Server Monitor Console */}
        <section className="hairline-card panel-card server-monitor-panel" aria-label="Bảng giám sát Server Listener">
          <div className="panel-header">
            <div>
              <div className="inline-icon-text">
                <Radio size={15} className={serverRunning ? 'text-accent' : 'text-danger-strong'} />
                <h2 className="t-card-title">Server Monitor Console</h2>
                <span className={`badge ${serverRunning ? 'badge-fresh' : 'badge-expired'}`}>
                  {serverRunning ? 'Đang chạy' : 'Đã dừng'}
                </span>
              </div>
              <p className="t-meta mono-num">
                Endpoint: {status.system_config.server_ip}:{status.system_config.server_port} · PIN:{' '}
                {status.system_config.pairing_pin} · Client online: {activeClients.length}
              </p>
            </div>

            <div className="toolbar-actions">
              <button
                type="button"
                className={`btn btn-sm ${serverRunning ? 'btn-danger' : 'btn-primary'}`}
                onClick={onToggleServerRunning}
                data-testid="dsk-server-toggle-listener"
              >
                {serverRunning ? <Square size={12} /> : <Play size={12} />}
                <span>{serverRunning ? 'Tạm dừng Server' : 'Bật Server'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onToggleQrModal}
                data-testid="dsk-server-show-qr"
              >
                <QrCode size={13} />
                <span>{qrModalOpen ? 'Ẩn QR' : 'QR kết nối'}</span>
              </button>
            </div>
          </div>

          {qrModalOpen ? (
            <div className="monitor-qr-panel">
              <PairingQrCode
                ip={status.system_config.server_ip}
                port={status.system_config.server_port}
                pin={status.system_config.pairing_pin}
                size={96}
              />
              <div className="qr-info-col">
                <div className="t-card-title">Thông tin ghép nối Mobile Client</div>
                <div className="t-meta">
                  Quét mã hoặc nhập thủ công trên ứng dụng Mobile (<span className="mono-num">MOB-00</span>):
                </div>
                <div className="qr-kv-list mono-num">
                  <span>IP: {status.system_config.server_ip}</span>
                  <span>Port: {status.system_config.server_port}</span>
                  <span>PIN: {status.system_config.pairing_pin}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Fault Injection & Demo Client Simulator Toolbar */}
          <div className="monitor-sim-bar">
            <div className="sim-control-inline">
              <label htmlFor="fault-mode-select" className="t-micro">
                Tiêm lỗi (Fault Injection):
              </label>
              <select
                id="fault-mode-select"
                value={status.runtime.force_next_error}
                onChange={(e) => onSetFaultMode(e.target.value as FaultInjectionMode)}
                data-testid="dsk-server-fault-select"
              >
                <option value="NONE">NONE (Bình thường)</option>
                <option value="TIMEOUT">TIMEOUT (Hết giờ chờ)</option>
                <option value="NETWORK_DROP">NETWORK_DROP (Rớt mạng LAN)</option>
                <option value="DB_ERROR">DB_ERROR (Lỗi MySQL)</option>
                <option value="CONFLICT_STALE_STOCK">CONFLICT_STALE_STOCK (Xung đột tồn kho)</option>
              </select>
            </div>

            <button
              type="button"
              className={`btn btn-sm ${dbHealthy ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onToggleDbHealthy}
              data-testid="dsk-server-toggle-db"
            >
              <Database size={12} />
              <span>{dbHealthy ? 'Giả lập mất DB' : 'Khôi phục DB'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSimulatePing}
              data-testid="dsk-server-demo-ping"
            >
              <Smartphone size={12} />
              <span>Demo Client Ping</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSimulateUse}
              data-testid="dsk-server-demo-use"
            >
              <Activity size={12} />
              <span>Demo Mobile Xuất dùng</span>
            </button>
          </div>

          {/* Connected Clients Table */}
          <div className="monitor-subsection">
            <h3 className="t-micro monitor-subheading">
              THIẾT BỊ MOBILE CLIENT ({status.connected_clients.length})
            </h3>
            {status.connected_clients.length === 0 ? (
              <div className="empty-well">Chưa có thiết bị Mobile Client nào kết nối.</div>
            ) : (
              <table className="table-dense">
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th>IP LAN</th>
                    <th>Hoạt động cuối</th>
                    <th>Trạng thái</th>
                    <th className="num-col">Quản trị</th>
                  </tr>
                </thead>
                <tbody>
                  {status.connected_clients.map((client) => (
                    <tr key={client.client_id}>
                      <td>
                        <strong>{client.device_name}</strong>
                        <div className="t-micro mono-num">{client.client_id}</div>
                      </td>
                      <td className="mono-num">{client.ip_address}</td>
                      <td className="mono-num">{client.last_seen_at.slice(11)}</td>
                      <td>
                        <span
                          className={`badge ${client.status === 'Connected' ? 'badge-fresh' : 'badge-empty'}`}
                        >
                          {client.status === 'Connected' ? 'Đang kết nối' : 'Đã ngắt'}
                        </span>
                      </td>
                      <td className="num-col">
                        {client.status === 'Connected' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => onKickClient(client.client_id)}
                            data-testid={`dsk-client-kick-${client.client_id}`}
                          >
                            <UserX size={12} />
                            <span>Ngắt</span>
                          </button>
                        ) : (
                          <span className="t-micro">Đã ngắt</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Packet Trace Console */}
          <div className="monitor-subsection">
            <div className="label-row-between" style={{ marginBottom: 6 }}>
              <span className="inline-icon-text t-micro monitor-subheading">
                <Terminal size={13} />
                <span>PACKET TRACE CONSOLE ({status.packet_logs.length})</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClearPacketLogs}
                data-testid="dsk-server-clear-logs"
              >
                <Trash2 size={12} />
                <span>Xóa log</span>
              </button>
            </div>
            <div className="packet-console" data-testid="dsk-packet-log-list">
              {status.packet_logs.length === 0 ? (
                <div className="packet-empty mono-num">-- Chưa có gói tin nào được ghi nhận --</div>
              ) : (
                status.packet_logs.slice(0, 20).map((pkt) => (
                  <div key={pkt.id} className="packet-line mono-num">
                    <span className="pkt-time">{pkt.timestamp.slice(11)}</span>
                    <span className={`pkt-dir dir-${pkt.status.toLowerCase()}`}>{pkt.direction}</span>
                    <span className={`pkt-status ${pkt.status === 'ERROR' ? 'is-err' : pkt.status === 'PUSH' ? 'is-push' : 'is-ok'}`}>
                      {pkt.status}
                    </span>
                    <span className="pkt-action">{pkt.action}</span>
                    <span className="pkt-latency">{pkt.latency_ms}ms</span>
                    <span className="pkt-summary">
                      [{pkt.device}] {pkt.payload_summary}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
