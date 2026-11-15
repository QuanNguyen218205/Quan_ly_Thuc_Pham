import {
  AlertTriangle,
  Calendar,
  Edit3,
  History,
  MapPin,
  Package,
  RefreshCw,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import type { ItemDetailResult } from '@food-mgmt/shared-sim';
import {
  formatDaysRemainingLabel,
  formatQuantity,
  formatSignedQuantity,
  getFoodInitials,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  getTransactionBadgeClass,
} from '../domain/pantry-formatters';

interface FoodDetailDrawerProps {
  open: boolean;
  loading: boolean;
  detail: ItemDetailResult | null;
  warningDaysThreshold: number;
  dbHealthy: boolean;
  onClose: () => void;
  onUseFood: () => void;
  onRestockOrAdjust: () => void;
  onEdit: () => void;
  onLiquidate: () => void;
  onOpenFullAuditLog: (itemCode: string) => void;
}

export function FoodDetailDrawer({
  open,
  loading,
  detail,
  warningDaysThreshold,
  dbHealthy,
  onClose,
  onUseFood,
  onRestockOrAdjust,
  onEdit,
  onLiquidate,
  onOpenFullAuditLog,
}: FoodDetailDrawerProps) {
  if (!open) return null;

  const item = detail?.item ?? null;
  const transactions = detail?.transactions ?? [];
  const isCancelled = item?.status === 'Đã hủy';

  return (
    <aside
      className="detail-drawer"
      aria-label="Chi tiết hồ sơ thực phẩm và lịch sử lô"
      data-testid="dsk-drawer-DSK-03-D"
    >
      <div className="drawer-header">
        <div className="drawer-title-group">
          <span className="t-micro mono-num">
            {item ? `${item.food_code} · ${item.item_code}` : 'HỒ SƠ LÔ HÀNG'}
          </span>
          <h2 className="t-panel-title drawer-title">
            {item ? item.food_name : 'Đang tải hồ sơ...'}
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Đóng bảng chi tiết (Esc)"
          data-testid="dsk-drawer-close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="drawer-body">
        {loading && !item ? (
          <div className="drawer-loading">
            <div className="skeleton-box" style={{ height: 72, marginBottom: 12 }} />
            <div className="skeleton-box" style={{ height: 140, marginBottom: 12 }} />
            <div className="skeleton-box" style={{ height: 160 }} />
          </div>
        ) : item ? (
          <>
            {/* Status & Priority Badges */}
            <div className="drawer-badges-row">
              <span className={getStatusBadgeClass(item.status, item.days_remaining, warningDaysThreshold)}>
                {item.status === 'Đang sử dụng' && item.is_expired
                  ? 'Quá hạn'
                  : item.status === 'Đang sử dụng' && item.is_expiring_soon
                    ? 'Sắp hết hạn'
                    : item.status}
              </span>
              {item.fefo_priority ? (
                <span className={getPriorityBadgeClass(item.fefo_priority)}>
                  FEFO: {item.fefo_priority}
                </span>
              ) : null}
              {item.is_low_stock ? (
                <span className="badge badge-urgent">
                  <AlertTriangle size={11} />
                  <span>Dưới tồn min</span>
                </span>
              ) : null}
            </div>

            {/* Product Visual & Food Entity Info */}
            <section className="drawer-section">
              <div className="drawer-product-hero">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.food_name}
                    className="drawer-product-img"
                  />
                ) : (
                  <div className="drawer-product-avatar" aria-hidden="true">
                    {getFoodInitials(item.food_name)}
                  </div>
                )}
                <div className="drawer-product-meta">
                  <div className="meta-line">
                    <span className="meta-label">Loại:</span>
                    <strong>{item.category_name}</strong>
                  </div>
                  <div className="meta-line">
                    <span className="meta-label">Thương hiệu:</span>
                    <span>{item.brand || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="meta-line">
                    <span className="meta-label">Mã định danh:</span>
                    <span className="mono-num">
                      {item.food_code} / {item.item_code}
                    </span>
                  </div>
                </div>
              </div>
              {item.description ? <p className="t-body drawer-desc">{item.description}</p> : null}
            </section>

            {/* Lot Inventory Properties (12+ fields) */}
            <section className="drawer-section">
              <h3 className="drawer-section-heading">
                <Package size={14} />
                <span>Thông tin Lô tồn kho</span>
              </h3>
              <dl className="drawer-kv-grid">
                <div>
                  <dt>Tồn hiện tại / Nhập</dt>
                  <dd className="mono-num">
                    <strong>{formatQuantity(item.current_quantity)}</strong> /{' '}
                    {formatQuantity(item.initial_quantity)} {item.unit_name}
                  </dd>
                </div>
                <div>
                  <dt>Ngưỡng tối thiểu</dt>
                  <dd className="mono-num">
                    {formatQuantity(item.min_threshold)} {item.unit_name}
                  </dd>
                </div>
                <div>
                  <dt>Khu vực bảo quản</dt>
                  <dd>{item.area_type}</dd>
                </div>
                <div>
                  <dt>Vị trí chi tiết</dt>
                  <dd>
                    <span className="inline-icon-text">
                      <MapPin size={12} />
                      <span>{item.location_name}</span>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Ngày nhập kho</dt>
                  <dd className="mono-num">{item.import_date}</dd>
                </div>
                <div>
                  <dt>Hạn sử dụng</dt>
                  <dd className="mono-num">
                    <span className="inline-icon-text">
                      <Calendar size={12} />
                      <span>{item.expiry_date}</span>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Thời gian còn lại</dt>
                  <dd className={item.is_expired ? 'text-danger-strong' : item.is_expiring_soon ? 'text-warn-strong' : ''}>
                    {formatDaysRemainingLabel(item.days_remaining)}
                  </dd>
                </div>
                <div>
                  <dt>Cập nhật cuối</dt>
                  <dd className="mono-num">{item.updated_at}</dd>
                </div>
              </dl>
              <div className="drawer-note-box">
                <span className="t-micro">Ghi chú lô:</span>{' '}
                <span className="t-body">{item.note || 'Không có ghi chú'}</span>
              </div>
            </section>

            {/* Per-lot Transaction Audit Trail */}
            <section className="drawer-section">
              <div className="drawer-section-header-row">
                <h3 className="drawer-section-heading">
                  <History size={14} />
                  <span>Nhật ký lô ({transactions.length})</span>
                </h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onOpenFullAuditLog(item.item_code)}
                  data-testid="dsk-drawer-open-audit"
                >
                  Mở Audit Log
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="empty-well">Chưa ghi nhận giao dịch biến động nào cho lô này.</div>
              ) : (
                <ul className="drawer-tx-list">
                  {transactions.map((tx) => (
                    <li key={tx.transaction_id} className="drawer-tx-item">
                      <div className="tx-top-row">
                        <span className={getTransactionBadgeClass(tx.action_type)}>
                          {tx.action_type}
                        </span>
                        <span className="mono-num tx-delta">
                          {formatSignedQuantity(tx.change_quantity)} → {formatQuantity(tx.remaining_quantity)}{' '}
                          {tx.unit_name}
                        </span>
                      </div>
                      <div className="tx-reason">{tx.reason || 'Không có lý do'}</div>
                      <div className="tx-meta mono-num">
                        {tx.transaction_date} · {tx.actor_device}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <div className="empty-well">Không tìm thấy thông tin lô hàng.</div>
        )}
      </div>

      {item ? (
        <div className="drawer-footer">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!dbHealthy || isCancelled || item.current_quantity <= 0}
            onClick={onUseFood}
            data-testid="dsk-drawer-use"
          >
            <Utensils size={14} />
            <span>Xuất dùng</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!dbHealthy || isCancelled}
            onClick={onRestockOrAdjust}
            data-testid="dsk-drawer-restock"
          >
            <RefreshCw size={14} />
            <span>Nhập / Kiểm kê</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!dbHealthy || isCancelled}
            onClick={onEdit}
            title={isCancelled ? 'Không thể sửa lô đã thanh lý (Đã hủy)' : 'Sửa hồ sơ (DSK-M01)'}
            data-testid="dsk-drawer-edit"
          >
            <Edit3 size={14} />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={!dbHealthy || isCancelled}
            onClick={onLiquidate}
            data-testid="dsk-drawer-delete"
          >
            <Trash2 size={14} />
            <span>Thanh lý</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
