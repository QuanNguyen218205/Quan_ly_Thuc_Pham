import { History, RotateCcw, Search } from 'lucide-react';
import type {
  AuditLogFilter,
  GetAuditLogsResult,
  TransactionActionType,
} from '@food-mgmt/shared-sim';
import {
  formatQuantity,
  formatSignedQuantity,
  getTransactionBadgeClass,
} from '../domain/pantry-formatters';

interface AuditLogScreenProps {
  auditLogs: GetAuditLogsResult | null;
  filter: AuditLogFilter;
  selectedItemId: number | null;
  onChangeFilter: (next: AuditLogFilter) => void;
  onResetFilters: () => void;
  onSelectTransactionItem: (itemId: number) => void;
}

export function AuditLogScreen({
  auditLogs,
  filter,
  selectedItemId,
  onChangeFilter,
  onResetFilters,
  onSelectTransactionItem,
}: AuditLogScreenProps) {
  const rows = auditLogs?.transactions ?? [];
  const summary = auditLogs?.summary;

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-05">
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Nhật ký Biến động Kho (Audit Trail)</h1>
          <p className="t-meta">
            Lưu vết 100% giao dịch <code>inventory_transactions</code> — click dòng bất kỳ để mở hồ sơ lô (DSK-03-D)
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onResetFilters}
          data-testid="dsk-audit-clear-filters"
        >
          <RotateCcw size={13} />
          <span>Xóa bộ lọc</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <section className="hairline-card filter-bar-grid" aria-label="Bộ lọc nhật ký kho">
        <div className="filter-group filter-keyword">
          <label htmlFor="audit-search-input">Từ khóa (Tên, Mã, Lý do, Thiết bị)</label>
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              id="audit-search-input"
              type="search"
              value={filter.keyword ?? ''}
              onChange={(e) => onChangeFilter({ ...filter, keyword: e.target.value })}
              placeholder="Tìm tên món, LO-001, lý do..."
              data-testid="dsk-audit-search"
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="audit-action-filter">Loại biến động</label>
          <select
            id="audit-action-filter"
            value={filter.action_type ?? 'all'}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                action_type: e.target.value as TransactionActionType | 'all',
              })
            }
            data-testid="dsk-audit-filter-action"
          >
            <option value="all">Tất cả biến động</option>
            <option value="Nhập thêm">Nhập thêm</option>
            <option value="Sử dụng">Sử dụng</option>
            <option value="Điều chỉnh">Điều chỉnh</option>
            <option value="Vứt hủy">Vứt hủy</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="audit-device-filter">Nguồn thao tác</label>
          <select
            id="audit-device-filter"
            value={filter.actor_device ?? 'all'}
            onChange={(e) => onChangeFilter({ ...filter, actor_device: e.target.value })}
            data-testid="dsk-audit-filter-device"
          >
            <option value="all">Tất cả thiết bị</option>
            <option value="Desktop Server">Desktop Server</option>
            <option value="Mobile">Mobile Client</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="audit-start-date">Từ ngày</label>
          <input
            id="audit-start-date"
            type="date"
            className="mono-num"
            value={filter.start_date ?? ''}
            onChange={(e) => onChangeFilter({ ...filter, start_date: e.target.value })}
            data-testid="dsk-audit-start-date"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="audit-end-date">Đến ngày</label>
          <input
            id="audit-end-date"
            type="date"
            className="mono-num"
            value={filter.end_date ?? ''}
            onChange={(e) => onChangeFilter({ ...filter, end_date: e.target.value })}
            data-testid="dsk-audit-end-date"
          />
        </div>
      </section>

      {/* Summary Strip */}
      {summary ? (
        <div className="audit-summary-strip">
          <div className="hairline-card audit-stat-chip">
            <span className="t-micro">Tổng giao dịch khớp</span>
            <strong className="mono-num">{summary.total_count}</strong>
          </div>
          <div className="hairline-card audit-stat-chip">
            <span className="t-micro">Tổng lượng Nhập thêm</span>
            <strong className="mono-num text-fresh-strong">+{formatQuantity(summary.restock_total)}</strong>
          </div>
          <div className="hairline-card audit-stat-chip">
            <span className="t-micro">Tổng lượng Xuất dùng</span>
            <strong className="mono-num">-{formatQuantity(summary.use_total)}</strong>
          </div>
          <div className="hairline-card audit-stat-chip">
            <span className="t-micro">Tổng lượng Vứt hủy</span>
            <strong className="mono-num text-danger-strong">-{formatQuantity(summary.waste_total)}</strong>
          </div>
          <div className="hairline-card audit-stat-chip">
            <span className="t-micro">Số lần Điều chỉnh</span>
            <strong className="mono-num">{summary.adjust_count}</strong>
          </div>
        </div>
      ) : null}

      {/* Audit Transactions Table */}
      <section className="hairline-card panel-card">
        {rows.length === 0 ? (
          <div className="empty-well">
            <History size={22} />
            <p>Chưa có bản ghi giao dịch nào khớp bộ lọc thời gian và tiêu chí tìm kiếm.</p>
          </div>
        ) : (
          <div className="table-scroll-x">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Mã GD</th>
                  <th>Thời gian phát sinh</th>
                  <th>Thực phẩm & Lô</th>
                  <th>Loại biến động</th>
                  <th className="num-col">Trước GD</th>
                  <th className="num-col">Thay đổi</th>
                  <th className="num-col">Còn lại</th>
                  <th>Thiết bị</th>
                  <th>Lý do biến động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    tabIndex={0}
                    className={selectedItemId === tx.item_id ? 'row-selected' : ''}
                    onClick={() => onSelectTransactionItem(tx.item_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTransactionItem(tx.item_id);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    data-testid={`dsk-audit-row-${tx.transaction_id}`}
                  >
                    <td className="mono-num">#{tx.transaction_id}</td>
                    <td className="mono-num">{tx.transaction_date}</td>
                    <td>
                      <button
                        type="button"
                        className="table-link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTransactionItem(tx.item_id);
                        }}
                      >
                        {tx.food_name}
                      </button>
                      <div className="t-micro mono-num">
                        {tx.food_code} · {tx.item_code}
                      </div>
                    </td>
                    <td>
                      <span className={getTransactionBadgeClass(tx.action_type)}>
                        {tx.action_type}
                      </span>
                    </td>
                    <td className="num-col mono-num">
                      {formatQuantity(tx.previous_quantity)} {tx.unit_name}
                    </td>
                    <td
                      className={`num-col mono-num ${tx.change_quantity > 0 ? 'text-fresh-strong' : tx.action_type === 'Vứt hủy' ? 'text-danger-strong' : ''}`}
                    >
                      <strong>{formatSignedQuantity(tx.change_quantity)}</strong>
                    </td>
                    <td className="num-col mono-num">
                      {formatQuantity(tx.remaining_quantity)} {tx.unit_name}
                    </td>
                    <td className="t-meta">{tx.actor_device}</td>
                    <td>{tx.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
