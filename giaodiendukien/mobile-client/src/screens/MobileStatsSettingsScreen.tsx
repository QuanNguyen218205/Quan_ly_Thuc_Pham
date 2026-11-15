import { useState } from 'react';
import {
  Activity,
  History,
  Layers,
  Power,
  RefreshCw,
  Server,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type {
  AnalyticsSnapshot,
  CatalogBundle,
  ClientTransportSnapshot,
  FaultInjectionMode,
  GetAuditLogsResult,
  SystemConfig,
  TransactionActionType,
} from '@food-mgmt/shared-sim';
import {
  formatIsoDateShort,
  formatSignedQuantity,
  getTransactionBadgeClass,
} from '../domain/food-lot-presentation';
import { MobileCharts } from '../components/MobileCharts';

interface MobileStatsSettingsScreenProps {
  snapshot: ClientTransportSnapshot;
  systemConfig: SystemConfig;
  effectiveDate: string;
  catalogs: CatalogBundle;
  statsRange: 7 | 30;
  stats: AnalyticsSnapshot | null;
  auditActionFilter: TransactionActionType | 'all';
  auditLogs: GetAuditLogsResult | null;
  isLoadingStats: boolean;
  isSyncing: boolean;
  isOfflineReadOnly: boolean;
  onChangeStatsRange: (range: 7 | 30) => void;
  onChangeAuditFilter: (action: TransactionActionType | 'all') => void;
  onOpenItemDetail: (itemId: number) => void;
  onSyncNow: () => void;
  onOpenConnectScreen: () => void;
  onDisconnect: () => void;
  onToggleSimulatedOffline: (offline: boolean) => void;
  onSetFaultOverride: (mode: FaultInjectionMode) => void;
}

export function MobileStatsSettingsScreen({
  snapshot,
  systemConfig,
  effectiveDate,
  catalogs,
  statsRange,
  stats,
  auditActionFilter,
  auditLogs,
  isLoadingStats,
  isSyncing,
  isOfflineReadOnly,
  onChangeStatsRange,
  onChangeAuditFilter,
  onOpenItemDetail,
  onSyncNow,
  onOpenConnectScreen,
  onDisconnect,
  onToggleSimulatedOffline,
  onSetFaultOverride,
}: MobileStatsSettingsScreenProps) {
  const [catalogTab, setCatalogTab] = useState<'categories' | 'units' | 'locations'>('categories');

  const recentTransactions = (auditLogs?.transactions ?? []).slice(0, 15);

  return (
    <main className="mob-main-scroll" data-testid="mob-screen-MOB-07">
      {/* SECTION 1: Compact Stats & SVG Charts */}
      <section aria-label="Thống kê nhanh kho thực phẩm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div className="mob-section-head">
          <h2 className="mob-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span>Thống kê & Tiêu thụ</span>
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`mob-chip ${statsRange === 7 ? 'mob-chip-active' : ''}`}
              style={{ minHeight: 36, padding: '0 10px' }}
              data-testid="mob-stats-range-7"
              onClick={() => onChangeStatsRange(7)}
            >
              7 ngày
            </button>
            <button
              type="button"
              className={`mob-chip ${statsRange === 30 ? 'mob-chip-active' : ''}`}
              style={{ minHeight: 36, padding: '0 10px' }}
              data-testid="mob-stats-range-30"
              onClick={() => onChangeStatsRange(30)}
            >
              30 ngày
            </button>
          </div>
        </div>

        {stats && (
          <div className="mob-kpi-grid-3">
            <div className="pantry-card" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
              <div className="t-micro">Lô hoạt động</div>
              <div className="kpi-num" style={{ fontSize: 'var(--text-xl)' }}>
                {stats.kpi.active_lot_count}
              </div>
            </div>
            <div className="pantry-card" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
              <div className="t-micro">Hiệu suất dùng</div>
              <div className="kpi-num" style={{ fontSize: 'var(--text-xl)', color: 'var(--accent-hover)' }}>
                {stats.kpi.consumption_efficiency_pct}%
              </div>
            </div>
            <div className="pantry-card" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
              <div className="t-micro">Cảnh báo HSD</div>
              <div
                className="kpi-num"
                style={{
                  fontSize: 'var(--text-xl)',
                  color:
                    stats.kpi.urgent_expiring_count > 0
                      ? 'var(--status-expired-ink)'
                      : 'var(--text-primary)',
                }}
              >
                {stats.kpi.urgent_expiring_count}
              </div>
            </div>
          </div>
        )}

        <MobileCharts stats={stats} isLoading={isLoadingStats} />
      </section>

      {/* SECTION 2: Recent Audit Logs */}
      <section
        className="pantry-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
        aria-label="Lịch sử biến động gần đây"
      >
        <div className="mob-section-head">
          <h2 className="t-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span>Nhật ký biến động gần đây</span>
          </h2>
          <span className="t-micro mono-num">{recentTransactions.length} dòng</span>
        </div>

        <div className="mob-chip-scroll">
          {(['all', 'Sử dụng', 'Nhập thêm', 'Điều chỉnh', 'Vứt hủy'] as const).map((action) => (
            <button
              key={action}
              type="button"
              className={`mob-chip ${auditActionFilter === action ? 'mob-chip-active' : ''}`}
              style={{ minHeight: 36 }}
              data-testid={`mob-audit-filter-${action}`}
              onClick={() => onChangeAuditFilter(action)}
            >
              {action === 'all' ? 'Tất cả' : action}
            </button>
          ))}
        </div>

        {recentTransactions.length === 0 ? (
          <p className="t-meta" style={{ margin: '6px 0 0' }}>
            Chưa có giao dịch kho phù hợp bộ lọc.
          </p>
        ) : (
          <div>
            {recentTransactions.map((tx) => (
              <button
                key={tx.transaction_id}
                type="button"
                className="mob-timeline-item"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                }}
                onClick={() => onOpenItemDetail(tx.item_id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    {tx.food_name}
                  </span>
                  <span className={`badge ${getTransactionBadgeClass(tx.action_type)}`}>
                    {tx.action_type}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span className="t-meta">{tx.reason || 'Không ghi lý do'}</span>
                  <strong className="mono-num">
                    {formatSignedQuantity(tx.change_quantity, tx.unit_name)}
                  </strong>
                </div>
                <div className="t-micro mono-num">
                  {tx.transaction_date} · {tx.actor_device}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Read-Only Synced Catalogs */}
      <section
        className="pantry-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
        aria-label="Danh mục đồng bộ từ Server"
      >
        <div className="mob-section-head">
          <h2 className="t-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span>Danh mục đồng bộ (Chỉ xem)</span>
          </h2>
        </div>
        <p className="t-micro" style={{ margin: 0 }}>
          Quản trị thêm/sửa/xóa danh mục tại Desktop Server (DSK-06).
        </p>

        <div className="mob-segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={catalogTab === 'categories'}
            className="mob-segment-btn"
            style={{ minHeight: 38 }}
            data-testid="mob-catalog-tab-categories"
            onClick={() => setCatalogTab('categories')}
          >
            Loại ({catalogs.categories.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={catalogTab === 'units'}
            className="mob-segment-btn"
            style={{ minHeight: 38 }}
            data-testid="mob-catalog-tab-units"
            onClick={() => setCatalogTab('units')}
          >
            Đơn vị ({catalogs.units.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={catalogTab === 'locations'}
            className="mob-segment-btn"
            style={{ minHeight: 38 }}
            data-testid="mob-catalog-tab-locations"
            onClick={() => setCatalogTab('locations')}
          >
            Vị trí ({catalogs.storage_locations.length})
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {catalogTab === 'categories' &&
            catalogs.categories.map((cat) => (
              <div
                key={cat.category_id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  {cat.category_name}
                </div>
                {cat.description && <div className="t-micro">{cat.description}</div>}
              </div>
            ))}

          {catalogTab === 'units' &&
            catalogs.units.map((u) => (
              <div
                key={u.unit_id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <strong style={{ fontSize: 'var(--text-sm)' }}>{u.unit_name}</strong>
                <span className="t-micro">{u.description || '—'}</span>
              </div>
            ))}

          {catalogTab === 'locations' &&
            catalogs.storage_locations.map((loc) => (
              <div
                key={loc.location_id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{loc.location_name}</strong>
                  <span className="badge badge-info">{loc.area_type}</span>
                </div>
                {loc.description && <div className="t-micro">{loc.description}</div>}
              </div>
            ))}
        </div>
      </section>

      {/* SECTION 4: Connection & Prototype Network Simulator */}
      <section
        className="pantry-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
        aria-label="Quản lý kết nối và mô phỏng mạng"
      >
        <div className="mob-section-head">
          <h2 className="t-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span>Kết nối Desktop Server</span>
          </h2>
          <span
            className={`badge ${isOfflineReadOnly ? 'badge-urgent' : 'badge-fresh'}`}
            data-testid="mob-settings-conn-status"
          >
            {isOfflineReadOnly ? 'Ngoại tuyến' : 'Đã kết nối'}
          </span>
        </div>

        <div className="mob-kv-grid">
          <div className="mob-kv-item">
            <span className="mob-kv-label">Máy chủ LAN</span>
            <span className="mob-kv-val mono-num">
              {snapshot.active_endpoint.ip}:{snapshot.active_endpoint.port}
            </span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Độ trễ gần nhất</span>
            <span className="mob-kv-val mono-num">
              {snapshot.last_latency_ms !== null ? `${snapshot.last_latency_ms} ms` : '—'}
            </span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Ngày hệ thống Server</span>
            <span className="mob-kv-val mono-num">{formatIsoDateShort(effectiveDate)}</span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Ngưỡng cảnh báo HSD</span>
            <span className="mob-kv-val mono-num">
              &lt;= {systemConfig.warning_days_threshold} ngày
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <button
            type="button"
            className="btn btn-primary btn-fixed-full"
            disabled={isSyncing}
            data-testid="mob-settings-sync-btn"
            onClick={onSyncNow}
          >
            <RefreshCw
              size={17}
              className={isSyncing ? 'mob-spin-icon' : undefined}
              aria-hidden="true"
            />
            <span>Đồng bộ ngay từ Server</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-fixed-full"
            data-testid="mob-settings-goto-connect"
            onClick={onOpenConnectScreen}
          >
            <Wifi size={17} aria-hidden="true" />
            <span>Đổi / Cấu hình Server (MOB-00)</span>
          </button>

          {!isOfflineReadOnly && (
            <button
              type="button"
              className="btn btn-danger btn-fixed-full"
              data-testid="mob-settings-disconnect"
              onClick={onDisconnect}
            >
              <Power size={17} aria-hidden="true" />
              <span>Ngắt kết nối</span>
            </button>
          )}
        </div>

        {/* Prototype Network & Fault Simulator */}
        <div
          style={{
            marginTop: 4,
            padding: 'var(--sp-3)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px dashed var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-2)',
          }}
          data-testid="mob-network-simulator"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
            <ShieldAlert size={16} style={{ color: 'var(--status-urgent-base)' }} aria-hidden="true" />
            <span>Trình mô phỏng Mạng & Sự cố (Prototype Demo)</span>
          </div>

          <button
            type="button"
            className={`btn ${snapshot.simulated_network_offline ? 'btn-primary' : 'btn-secondary'} btn-fixed-full`}
            data-testid="mob-sim-offline-toggle"
            onClick={() => onToggleSimulatedOffline(!snapshot.simulated_network_offline)}
          >
            <WifiOff size={16} aria-hidden="true" />
            <span>
              {snapshot.simulated_network_offline
                ? 'Đang mất Wi-Fi (Bấm để khôi phục mạng)'
                : 'Bật mô phỏng mất Wi-Fi / Offline'}
            </span>
          </button>

          <div className="t-micro">
            Tiêm lỗi 1 lần vào yêu cầu kế tiếp (kiểm thử Form Preservation & Xung đột):
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              className={`mob-chip ${snapshot.client_fault_override === 'TIMEOUT' ? 'mob-chip-active' : ''}`}
              style={{ minHeight: 38 }}
              data-testid="mob-sim-fault-timeout"
              onClick={() => onSetFaultOverride('TIMEOUT')}
            >
              Timeout
            </button>
            <button
              type="button"
              className={`mob-chip ${snapshot.client_fault_override === 'NETWORK_DROP' ? 'mob-chip-active' : ''}`}
              style={{ minHeight: 38 }}
              data-testid="mob-sim-fault-drop"
              onClick={() => onSetFaultOverride('NETWORK_DROP')}
            >
              Rớt mạng
            </button>
            <button
              type="button"
              className={`mob-chip ${snapshot.client_fault_override === 'CONFLICT_STALE_STOCK' ? 'mob-chip-active' : ''}`}
              style={{ minHeight: 38 }}
              data-testid="mob-sim-fault-conflict"
              onClick={() => onSetFaultOverride('CONFLICT_STALE_STOCK')}
            >
              Xung đột tồn kho
            </button>
            {snapshot.client_fault_override !== 'NONE' && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 38, padding: '0 8px', fontSize: 12 }}
                onClick={() => onSetFaultOverride('NONE')}
              >
                Xóa bẫy lỗi
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
