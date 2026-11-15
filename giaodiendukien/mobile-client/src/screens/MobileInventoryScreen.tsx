import { Package, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import type {
  AreaType,
  CatalogBundle,
  FoodLotView,
  FoodSearchFilter,
} from '@food-mgmt/shared-sim';
import {
  formatDaysRemainingLabel,
  formatIsoDateShort,
  getExpiryBadgeClass,
  getStockStatusBadgeClass,
  getStockStatusLabel,
} from '../domain/food-lot-presentation';
import { FoodCategoryIcon } from '../components/FoodCategoryIcon';

interface MobileInventoryScreenProps {
  items: FoodLotView[];
  filter: FoodSearchFilter;
  activeFilterCount: number;
  catalogs: CatalogBundle;
  warningDaysThreshold: number;
  isLoading: boolean;
  errorMessage: string | null;
  isOfflineReadOnly: boolean;
  onUpdateFilter: (nextFilter: FoodSearchFilter) => void;
  onOpenFilterSheet: () => void;
  onRetryLoad: () => void;
  onOpenItemDetail: (itemId: number) => void;
  onQuickStockAction: (lot: FoodLotView, mode: 'use' | 'restock') => void;
  onOpenCreateFood: () => void;
}

export function MobileInventoryScreen({
  items,
  filter,
  activeFilterCount,
  catalogs,
  warningDaysThreshold,
  isLoading,
  errorMessage,
  isOfflineReadOnly,
  onUpdateFilter,
  onOpenFilterSheet,
  onRetryLoad,
  onOpenItemDetail,
  onQuickStockAction,
  onOpenCreateFood,
}: MobileInventoryScreenProps) {
  const keyword = filter.keyword ?? '';

  const resetAllFilters = () => {
    onUpdateFilter({
      ...filter,
      keyword: '',
      category_id: 'all',
      area_type: 'all',
      location_id: 'all',
      stock_status: 'all',
      expiry_status: 'all',
    });
  };

  const categoryLabel =
    filter.category_id && filter.category_id !== 'all'
      ? catalogs.categories.find((c) => c.category_id === filter.category_id)?.category_name
      : null;

  const locationLabel =
    filter.location_id && filter.location_id !== 'all'
      ? catalogs.storage_locations.find((l) => l.location_id === filter.location_id)?.location_name
      : null;

  const hasAnySearchOrFilter = Boolean(keyword.trim()) || activeFilterCount > 0;

  // Client-side backup filter so offline cached view also responds to quick taps cleanly
  const displayedItems = items.filter((lot) => {
    if (filter.area_type && filter.area_type !== 'all' && lot.area_type !== filter.area_type) {
      return false;
    }
    return true;
  });

  return (
    <main className="mob-main-scroll" data-testid="mob-screen-MOB-02">
      {/* Search Bar & 5-Criteria Filter Trigger */}
      <div className="mob-search-row">
        <div className="mob-search-well">
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm tên món, mã TP, loại..."
            aria-label="Tìm kiếm thực phẩm"
            data-testid="mob-inventory-search"
            value={keyword}
            onChange={(e) => onUpdateFilter({ ...filter, keyword: e.target.value })}
          />
          {keyword && (
            <button
              type="button"
              className="mob-icon-btn"
              style={{ minWidth: 32, minHeight: 32 }}
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => onUpdateFilter({ ...filter, keyword: '' })}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          className={`btn ${activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0 12px', flexShrink: 0 }}
          data-testid="mob-open-filter-btn"
          onClick={onOpenFilterSheet}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>Lọc</span>
          {activeFilterCount > 0 && (
            <span
              className="badge mono-num"
              style={{
                minHeight: 20,
                padding: '0 6px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--accent-hover)',
              }}
              data-testid="mob-active-filter-count"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick Area Chips */}
      <div className="mob-chip-scroll">
        {(['all', 'Trong tủ lạnh', 'Ngoài tủ lạnh'] as Array<AreaType | 'all'>).map((area) => (
          <button
            key={area}
            type="button"
            className={`mob-chip ${(filter.area_type ?? 'all') === area ? 'mob-chip-active' : ''}`}
            data-testid={`mob-inv-area-${area}`}
            onClick={() =>
              onUpdateFilter({
                ...filter,
                area_type: area,
                location_id: 'all',
              })
            }
          >
            {area === 'all' ? 'Tất cả khu vực' : area}
          </button>
        ))}
      </div>

      {/* Active Removable Filter Chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categoryLabel && (
            <button
              type="button"
              className="mob-chip-filter-removable"
              onClick={() => onUpdateFilter({ ...filter, category_id: 'all' })}
            >
              <span>Loại: {categoryLabel}</span>
              <X size={12} aria-hidden="true" />
            </button>
          )}
          {locationLabel && (
            <button
              type="button"
              className="mob-chip-filter-removable"
              onClick={() => onUpdateFilter({ ...filter, location_id: 'all' })}
            >
              <span>Ngăn: {locationLabel}</span>
              <X size={12} aria-hidden="true" />
            </button>
          )}
          {filter.stock_status && filter.stock_status !== 'all' && (
            <button
              type="button"
              className="mob-chip-filter-removable"
              onClick={() => onUpdateFilter({ ...filter, stock_status: 'all' })}
            >
              <span>Trạng thái: {filter.stock_status}</span>
              <X size={12} aria-hidden="true" />
            </button>
          )}
          {filter.expiry_status && filter.expiry_status !== 'all' && (
            <button
              type="button"
              className="mob-chip-filter-removable"
              onClick={() => onUpdateFilter({ ...filter, expiry_status: 'all' })}
            >
              <span>
                HSD:{' '}
                {filter.expiry_status === 'expired'
                  ? 'Quá hạn'
                  : filter.expiry_status === 'expiring_soon'
                    ? 'Sắp hết hạn'
                    : 'Còn tươi'}
              </span>
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Result Count & Sort Selector */}
      <div className="mob-section-head">
        <span className="t-meta" data-testid="mob-inventory-count">
          Hiển thị <strong className="mono-num">{displayedItems.length}</strong> lô thực phẩm
        </span>
        <select
          aria-label="Sắp xếp danh sách kho"
          className="mob-select"
          style={{ width: 'auto', minHeight: 38, padding: '4px 10px', fontSize: 13 }}
          value={filter.sort_by ?? 'expiry_date'}
          onChange={(e) =>
            onUpdateFilter({
              ...filter,
              sort_by: e.target.value as FoodSearchFilter['sort_by'],
            })
          }
        >
          <option value="expiry_date">Sắp xếp: Hạn sử dụng</option>
          <option value="food_name">Sắp xếp: Tên A–Z</option>
          <option value="current_quantity">Sắp xếp: Tồn kho</option>
          <option value="import_date">Sắp xếp: Ngày nhập</option>
        </select>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div
          className="mob-banner-alert mob-banner-alert-danger"
          role="alert"
          data-testid="mob-inventory-error"
        >
          <span style={{ fontSize: 'var(--text-sm)' }}>{errorMessage}</span>
          <button type="button" className="btn btn-secondary" onClick={onRetryLoad}>
            Tải lại
          </button>
        </div>
      )}

      {/* Loading / Empty / List */}
      {isLoading && displayedItems.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="mob-skeleton" style={{ height: 104 }} />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="mob-empty-box" data-testid="mob-inventory-empty">
          <Package size={28} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="t-card-title">
            {hasAnySearchOrFilter ? 'Không tìm thấy thực phẩm phù hợp' : 'Kho thực phẩm đang trống'}
          </h3>
          <p className="t-meta" style={{ margin: 0 }}>
            {hasAnySearchOrFilter
              ? 'Thử thay đổi từ khóa hoặc xóa bớt các điều kiện lọc.'
              : 'Nhấn nút + bên dưới để nhập thực phẩm hoặc quét ảnh AI.'}
          </p>
          {hasAnySearchOrFilter ? (
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="mob-inventory-clear-filters"
              onClick={resetAllFilters}
            >
              Xóa bộ lọc
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isOfflineReadOnly}
              onClick={onOpenCreateFood}
            >
              <Plus size={18} aria-hidden="true" />
              <span>Nhập thực phẩm mới</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {displayedItems.map((lot) => {
            const stockBadgeClass = getStockStatusBadgeClass(lot.status, lot.is_low_stock);
            const stockLabel = getStockStatusLabel(lot.status, lot.is_low_stock);
            const expiryBadgeClass = getExpiryBadgeClass(lot.days_remaining, warningDaysThreshold);

            return (
              <article
                key={lot.item_id}
                className="mob-food-card"
                data-testid={`mob-inventory-card-${lot.item_id}`}
              >
                <button
                  type="button"
                  className="mob-food-card-main"
                  onClick={() => onOpenItemDetail(lot.item_id)}
                >
                  <div className="mob-food-thumb">
                    <FoodCategoryIcon categoryId={lot.category_id} categoryName={lot.category_name} />
                  </div>
                  <div className="mob-food-card-body">
                    <div className="mob-food-card-top">
                      <h3 className="mob-food-card-title">{lot.food_name}</h3>
                      <span className={`badge ${stockBadgeClass}`}>{stockLabel}</span>
                    </div>

                    <div className="mob-food-meta-row">
                      <span className="mono-num">
                        {lot.food_code} · {lot.item_code}
                      </span>
                      <span>·</span>
                      <span>{lot.category_name}</span>
                    </div>

                    <div className="mob-food-meta-row">
                      <span>
                        {lot.area_type} · {lot.location_name}
                      </span>
                    </div>

                    <div className="mob-food-meta-row" style={{ justifyContent: 'space-between', width: '100%' }}>
                      <span>
                        <strong className="mono-num" style={{ color: 'var(--text-primary)' }}>
                          {lot.current_quantity} {lot.unit_name}
                        </strong>{' '}
                        <span className="t-micro">(min {lot.min_threshold})</span>
                      </span>

                      {lot.status !== 'Đã hủy' && (
                        <span className={`badge ${expiryBadgeClass} mono-num`}>
                          {formatIsoDateShort(lot.expiry_date)} ·{' '}
                          {formatDaysRemainingLabel(lot.days_remaining)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="mob-food-card-actions">
                  <span className="t-micro">
                    {lot.brand ? `Hãng: ${lot.brand}` : `Nhập: ${formatIsoDateShort(lot.import_date)}`}
                  </span>

                  {lot.status === 'Đang sử dụng' && lot.current_quantity > 0 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ minHeight: 38, padding: '0 14px', fontSize: 13 }}
                      disabled={isOfflineReadOnly}
                      data-testid={`mob-inv-quick-action-${lot.item_id}`}
                      onClick={() => onQuickStockAction(lot, 'use')}
                    >
                      Dùng
                    </button>
                  ) : lot.status === 'Đã hết' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }}
                      disabled={isOfflineReadOnly}
                      data-testid={`mob-inv-quick-action-${lot.item_id}`}
                      onClick={() => onQuickStockAction(lot, 'restock')}
                    >
                      Nhập thêm
                    </button>
                  ) : (
                    <span className="t-micro">Chỉ xem lịch sử</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
