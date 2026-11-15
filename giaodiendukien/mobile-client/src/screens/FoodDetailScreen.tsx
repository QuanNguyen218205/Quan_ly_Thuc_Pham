import {
  AlertCircle,
  ChefHat,
  Edit3,
  History,
  MapPin,
  PackagePlus,
  Trash2,
} from 'lucide-react';
import type { FoodLotView, ItemDetailResult } from '@food-mgmt/shared-sim';
import {
  formatDaysRemainingLabel,
  formatIsoDateShort,
  formatSignedQuantity,
  getExpiryBadgeClass,
  getFefoBadgeClass,
  getStockStatusBadgeClass,
  getStockStatusLabel,
  getTransactionBadgeClass,
} from '../domain/food-lot-presentation';
import { FoodCategoryIcon } from '../components/FoodCategoryIcon';

interface FoodDetailScreenProps {
  detail: ItemDetailResult | null;
  errorMessage: string | null;
  warningDaysThreshold: number;
  isOfflineReadOnly: boolean;
  onBack: () => void;
  onOpenStockSheet: (lot: FoodLotView, mode: 'use' | 'restock' | 'adjust') => void;
  onOpenMoveSheet: (lot: FoodLotView) => void;
  onOpenEditForm: (lot: FoodLotView) => void;
  onOpenLiquidateDialog: (lot: FoodLotView) => void;
  onOpenRecipes: (itemId: number) => void;
  onCreateNewBatch: (lot: FoodLotView) => void;
}

export function FoodDetailScreen({
  detail,
  errorMessage,
  warningDaysThreshold,
  isOfflineReadOnly,
  onBack,
  onOpenStockSheet,
  onOpenMoveSheet,
  onOpenEditForm,
  onOpenLiquidateDialog,
  onOpenRecipes,
  onCreateNewBatch,
}: FoodDetailScreenProps) {
  if (errorMessage) {
    return (
      <main className="mob-main-scroll-no-nav" data-testid="mob-screen-MOB-03">
        <div className="mob-empty-box" data-testid="mob-detail-not-found">
          <AlertCircle size={32} style={{ color: 'var(--status-expired-base)' }} aria-hidden="true" />
          <h2 className="t-card-title">Không tìm thấy lô thực phẩm</h2>
          <p className="t-meta" style={{ margin: 0 }}>
            {errorMessage}
          </p>
          <button type="button" className="btn btn-primary" onClick={onBack}>
            Quay lại danh sách
          </button>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mob-main-scroll-no-nav" data-testid="mob-screen-MOB-03">
        <div className="mob-skeleton" style={{ height: 120 }} />
        <div className="mob-skeleton" style={{ height: 220 }} />
        <div className="mob-skeleton" style={{ height: 180 }} />
      </main>
    );
  }

  const { item, transactions, matching_recipes } = detail;
  const isCancelled = item.status === 'Đã hủy';
  const stockBadgeClass = getStockStatusBadgeClass(item.status, item.is_low_stock);
  const stockLabel = getStockStatusLabel(item.status, item.is_low_stock);
  const expiryBadgeClass = getExpiryBadgeClass(item.days_remaining, warningDaysThreshold);

  return (
    <main className="mob-main-scroll-sticky-actions" data-testid="mob-screen-MOB-03">
      {/* Header Profile Card */}
      <section className="pantry-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
          <div className="mob-food-thumb" style={{ width: 56, height: 56 }}>
            <FoodCategoryIcon categoryId={item.category_id} categoryName={item.category_name} size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <h2 className="t-section-title" style={{ fontSize: 'var(--text-lg)' }}>
                {item.food_name}
              </h2>
              <span className={`badge ${stockBadgeClass}`}>{stockLabel}</span>
            </div>
            <div className="mob-food-meta-row" style={{ marginTop: 4 }}>
              <span className="mono-num">
                {item.food_code} · {item.item_code}
              </span>
              <span>·</span>
              <span>{item.category_name}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {!isCancelled && (
                <span className={`badge ${expiryBadgeClass} mono-num`}>
                  {formatDaysRemainingLabel(item.days_remaining)}
                </span>
              )}
              {item.fefo_priority && (
                <span className={`badge ${getFefoBadgeClass(item.fefo_priority)}`}>
                  Ưu tiên FEFO: {item.fefo_priority}
                </span>
              )}
            </div>
          </div>
        </div>

        {isCancelled && (
          <div className="mob-banner-alert mob-banner-alert-warning" style={{ marginTop: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>
              Lô hàng này đã thanh lý (&ldquo;Đã hủy&rdquo;) — chỉ xem lịch sử giao dịch hoặc nhập
              lô mới cùng thực phẩm.
            </span>
          </div>
        )}
      </section>

      {/* Complete 12+ Field Profile */}
      <section
        className="pantry-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
        data-testid="mob-detail-profile"
      >
        <div className="mob-section-head">
          <h3 className="t-card-title">Hồ sơ chi tiết Lô thực phẩm</h3>
          {!isCancelled && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 38, padding: '0 10px', fontSize: 13 }}
              disabled={isOfflineReadOnly}
              data-testid="mob-detail-edit-btn"
              onClick={() => onOpenEditForm(item)}
            >
              <Edit3 size={15} aria-hidden="true" />
              <span>Sửa</span>
            </button>
          )}
        </div>

        <div className="mob-kv-grid">
          <div className="mob-kv-item">
            <span className="mob-kv-label">Tồn kho hiện tại</span>
            <span className="mob-kv-val mono-num" style={{ fontSize: 'var(--text-md)' }}>
              {item.current_quantity} / {item.initial_quantity} {item.unit_name}
            </span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Ngưỡng tồn tối thiểu</span>
            <span className="mob-kv-val mono-num">
              {item.min_threshold} {item.unit_name}
            </span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Ngày nhập (IN10)</span>
            <span className="mob-kv-val mono-num">{formatIsoDateShort(item.import_date)}</span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Hạn sử dụng (IN11)</span>
            <span className="mob-kv-val mono-num">{formatIsoDateShort(item.expiry_date)}</span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Thương hiệu (IN04)</span>
            <span className="mob-kv-val">{item.brand || 'Chưa ghi'}</span>
          </div>
          <div className="mob-kv-item">
            <span className="mob-kv-label">Cập nhật gần nhất</span>
            <span className="mob-kv-val mono-num">{item.updated_at}</span>
          </div>
        </div>

        {/* Storage Location with Quick Change Button */}
        <div
          style={{
            padding: 'var(--sp-2) var(--sp-3)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sp-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
            <div>
              <div className="t-micro">Vị trí bảo quản (IN06)</div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {item.area_type} · {item.location_name}
              </div>
            </div>
          </div>
          {!isCancelled && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 38, padding: '0 10px', fontSize: 13 }}
              disabled={isOfflineReadOnly}
              data-testid="mob-detail-move-btn"
              onClick={() => onOpenMoveSheet(item)}
            >
              Đổi vị trí
            </button>
          )}
        </div>

        <div>
          <div className="mob-kv-label">Mô tả thực phẩm (IN05)</div>
          <div className="t-body" style={{ fontSize: 'var(--text-sm)' }}>
            {item.description || 'Không có mô tả bổ sung.'}
          </div>
        </div>

        <div>
          <div className="mob-kv-label">Ghi chú lô hàng (IN12)</div>
          <div className="t-body" style={{ fontSize: 'var(--text-sm)' }}>
            {item.note || 'Không có ghi chú.'}
          </div>
        </div>

        {/* Secondary Action Row: Recipe & Liquidate */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', paddingTop: 4 }}>
          {matching_recipes.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 40, fontSize: 13 }}
              onClick={() => onOpenRecipes(item.item_id)}
            >
              <ChefHat size={16} aria-hidden="true" />
              <span>Xem {matching_recipes.length} món ăn gợi ý</span>
            </button>
          )}

          {!isCancelled ? (
            <button
              type="button"
              className="btn btn-danger"
              style={{ minHeight: 40, fontSize: 13 }}
              disabled={isOfflineReadOnly}
              data-testid="mob-detail-cancel-btn"
              onClick={() => onOpenLiquidateDialog(item)}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>Thanh lý / Vứt hủy</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: 40, fontSize: 13 }}
              disabled={isOfflineReadOnly}
              onClick={() => onCreateNewBatch(item)}
            >
              <PackagePlus size={16} aria-hidden="true" />
              <span>Nhập lô mới cùng món</span>
            </button>
          )}
        </div>
      </section>

      {/* Per-Lot Audit Log Timeline */}
      <section
        className="pantry-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
        data-testid="mob-detail-transactions"
      >
        <div className="mob-section-head">
          <h3 className="t-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span>Nhật ký biến động lô ({transactions.length})</span>
          </h3>
        </div>

        {transactions.length === 0 ? (
          <p className="t-meta" style={{ margin: 0 }}>
            Chưa có giao dịch kho nào ghi nhận cho lô này.
          </p>
        ) : (
          <div>
            {transactions.map((tx) => (
              <div key={tx.transaction_id} className="mob-timeline-item">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className={`badge ${getTransactionBadgeClass(tx.action_type)}`}>
                    {tx.action_type}
                  </span>
                  <span className="mono-num" style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    {formatSignedQuantity(tx.change_quantity, tx.unit_name)} →{' '}
                    {tx.remaining_quantity} {tx.unit_name}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {tx.reason || 'Không ghi lý do'}
                </div>
                <div className="t-micro mono-num">
                  {tx.transaction_date} · {tx.actor_device}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sticky Bottom Stock Action Bar */}
      {!isCancelled && (
        <div className="mob-sticky-footer">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={isOfflineReadOnly}
            data-testid="mob-detail-restock-btn"
            onClick={() => onOpenStockSheet(item, 'restock')}
          >
            Nhập / Kiểm kê
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={isOfflineReadOnly || item.current_quantity <= 0}
            data-testid="mob-detail-stock-btn"
            onClick={() => onOpenStockSheet(item, 'use')}
          >
            Xuất dùng
          </button>
        </div>
      )}
    </main>
  );
}
