import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Camera,
  Edit3,
  Eye,
  MapPin,
  MinusCircle,
  Package,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  AreaType,
  CatalogBundle,
  ExpiryConditionFilter,
  FoodLotView,
  FoodSearchFilter,
  SearchFoodItemsResult,
  StockConditionFilter,
  SystemConfig,
} from '@food-mgmt/shared-sim';
import type { InventoryActionMode } from '../state/useDesktopServer';
import {
  formatDaysRemainingLabel,
  formatQuantity,
  getFoodInitials,
  getPriorityBadgeClass,
  getStatusBadgeClass,
} from '../domain/pantry-formatters';

interface InventoryScreenProps {
  inventory: SearchFoodItemsResult | null;
  totalWarehouseCount: number;
  catalogs: CatalogBundle;
  systemConfig: SystemConfig;
  filter: FoodSearchFilter;
  selectedItemId: number | null;
  isLoading: boolean;
  dbError: string | null;
  dbHealthy: boolean;
  onChangeFilter: (next: FoodSearchFilter) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onOpenAddFood: (openAiHelper?: boolean) => void;
  onOpenEditFood: (lot: FoodLotView) => void;
  onOpenActionModal: (lot: FoodLotView, mode: InventoryActionMode) => void;
  onOpenLiquidate: (lot: FoodLotView) => void;
  onSelectRow: (itemId: number) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  lot: FoodLotView;
}

export function InventoryScreen({
  inventory,
  totalWarehouseCount,
  catalogs,
  systemConfig,
  filter,
  selectedItemId,
  isLoading,
  dbError,
  dbHealthy,
  onChangeFilter,
  onResetFilters,
  onRefresh,
  onOpenAddFood,
  onOpenEditFood,
  onOpenActionModal,
  onOpenLiquidate,
  onSelectRow,
}: InventoryScreenProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const items = inventory?.items ?? [];
  const locationsForFilter =
    filter.area_type && filter.area_type !== 'all'
      ? catalogs.storage_locations.filter((l) => l.area_type === filter.area_type)
      : catalogs.storage_locations;

  const hasActiveFilters = Boolean(
    filter.keyword?.trim() ||
      (filter.category_id && filter.category_id !== 'all') ||
      (filter.area_type && filter.area_type !== 'all') ||
      (filter.location_id && filter.location_id !== 'all') ||
      (filter.stock_status && filter.stock_status !== 'all') ||
      (filter.expiry_status && filter.expiry_status !== 'all'),
  );

  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    window.addEventListener('click', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('click', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [contextMenu]);

  const toggleSort = (col: NonNullable<FoodSearchFilter['sort_by']>) => {
    const isSame = (filter.sort_by ?? 'expiry_date') === col;
    onChangeFilter({
      ...filter,
      sort_by: col,
      sort_dir: isSame && filter.sort_dir === 'asc' ? 'desc' : 'asc',
    });
  };

  const renderSortIcon = (col: NonNullable<FoodSearchFilter['sort_by']>) => {
    if ((filter.sort_by ?? 'expiry_date') !== col) {
      return <ArrowUpDown size={12} className="sort-icon-muted" />;
    }
    return filter.sort_dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />;
  };

  const handleRowContextMenu = (e: MouseEvent, lot: FoodLotView) => {
    e.preventDefault();
    onSelectRow(lot.item_id);
    const maxX = Math.max(16, window.innerWidth - 220);
    const maxY = Math.max(16, window.innerHeight - 280);
    setContextMenu({
      x: Math.min(e.clientX, maxX),
      y: Math.min(e.clientY, maxY),
      lot,
    });
  };

  const handleTableKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    if (items.length === 0) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const curIndex = items.findIndex((i) => i.item_id === selectedItemId);
    const nextIndex =
      e.key === 'ArrowDown'
        ? Math.min(items.length - 1, curIndex + 1)
        : Math.max(0, curIndex <= 0 ? 0 : curIndex - 1);
    onSelectRow(items[nextIndex].item_id);
  };

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-03">
      {/* Top Header & Command Toolbar */}
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Kho Thực phẩm & Tìm kiếm Đa chiều</h1>
          <p className="t-meta">
            Hiển thị <strong className="mono-num">{items.length}</strong> /{' '}
            <strong className="mono-num">{totalWarehouseCount}</strong> lô thực phẩm · Click dòng hoặc nhấn <kbd>↑</kbd>/<kbd>↓</kbd> để xem chi tiết
          </p>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dbHealthy}
            onClick={() => onOpenAddFood(false)}
            data-testid="dsk-inv-add-btn"
          >
            <Plus size={15} />
            <span>Thêm thực phẩm mới</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!dbHealthy}
            onClick={() => onOpenAddFood(true)}
            data-testid="dsk-inv-ai-btn"
          >
            <Camera size={14} />
            <span>Quét AI từ ảnh</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!hasActiveFilters}
            onClick={onResetFilters}
            data-testid="dsk-inv-clear-filters"
          >
            <RotateCcw size={13} />
            <span>Xóa bộ lọc</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            title="Làm mới danh sách (F5)"
            data-testid="dsk-inv-refresh-btn"
          >
            <RefreshCw size={13} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 5-Criteria Search & Filter Bar (IN15) */}
      <section className="hairline-card filter-bar-grid" aria-label="Tìm kiếm và lọc 5 tiêu chí">
        <div className="filter-group filter-keyword">
          <label htmlFor="inv-search-input">1. Từ khóa (Tên, Mã, Thương hiệu)</label>
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              id="inv-search-input"
              type="search"
              value={filter.keyword ?? ''}
              onChange={(e) => onChangeFilter({ ...filter, keyword: e.target.value })}
              placeholder="Tìm tên món, TP001, LO-002..."
              data-testid="dsk-inv-search"
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="inv-cat-filter">2. Loại thực phẩm</label>
          <select
            id="inv-cat-filter"
            value={filter.category_id ?? 'all'}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                category_id: e.target.value === 'all' ? 'all' : Number(e.target.value),
              })
            }
            data-testid="dsk-inv-filter-category"
          >
            <option value="all">Tất cả loại</option>
            {catalogs.categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="inv-area-filter">3a. Khu vực bảo quản</label>
          <select
            id="inv-area-filter"
            value={filter.area_type ?? 'all'}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                area_type: e.target.value as AreaType | 'all',
                location_id: 'all',
              })
            }
            data-testid="dsk-inv-filter-area"
          >
            <option value="all">Tất cả khu vực</option>
            <option value="Trong tủ lạnh">Trong tủ lạnh</option>
            <option value="Ngoài tủ lạnh">Ngoài tủ lạnh</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="inv-loc-filter">3b. Vị trí chi tiết</label>
          <select
            id="inv-loc-filter"
            value={filter.location_id ?? 'all'}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                location_id: e.target.value === 'all' ? 'all' : Number(e.target.value),
              })
            }
            data-testid="dsk-inv-filter-location"
          >
            <option value="all">Tất cả vị trí</option>
            {locationsForFilter.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="inv-stock-filter">4. Trạng thái tồn</label>
          <select
            id="inv-stock-filter"
            value={filter.stock_status ?? 'all'}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                stock_status: e.target.value as StockConditionFilter,
              })
            }
            data-testid="dsk-inv-filter-stock"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Đang sử dụng">Đang sử dụng</option>
            <option value="Sắp hết">Sắp hết (≤ tồn min)</option>
            <option value="Đã hết">Đã hết</option>
            <option value="Đã hủy">Đã hủy (xóa mềm)</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="inv-expiry-filter">5. Tình trạng hạn dùng</label>
          <select
            id="inv-expiry-filter"
            value={filter.expiry_status ?? 'all'}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                expiry_status: e.target.value as ExpiryConditionFilter,
              })
            }
            data-testid="dsk-inv-filter-expiry"
          >
            <option value="all">Tất cả hạn dùng</option>
            <option value="expired">Đã hết hạn (&lt; 0 ngày)</option>
            <option value="expiring_soon">
              Sắp hết hạn (≤ {systemConfig.warning_days_threshold} ngày)
            </option>
            <option value="fresh">Còn hạn an toàn</option>
          </select>
        </div>
      </section>

      {/* Inventory Data Grid */}
      <section className="hairline-card panel-card">
        {dbError ? (
          <div className="empty-well error-well">
            <AlertCircle size={20} />
            <p>{dbError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>
              Thử tải lại
            </button>
          </div>
        ) : isLoading && !inventory ? (
          <div style={{ padding: 16 }}>
            <div className="skeleton-box" style={{ height: 34, marginBottom: 8 }} />
            <div className="skeleton-box" style={{ height: 34, marginBottom: 8 }} />
            <div className="skeleton-box" style={{ height: 34 }} />
          </div>
        ) : totalWarehouseCount === 0 ? (
          <div className="empty-well">
            <Package size={24} />
            <p>Kho thực phẩm đang trống. Hãy nhập lô thực phẩm đầu tiên để quản lý.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenAddFood(false)}>
              + Thêm thực phẩm mới
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-well" data-testid="dsk-inv-empty-filter">
            <Search size={22} />
            <p>Không tìm thấy lô thực phẩm nào khớp các bộ lọc đang chọn.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onResetFilters}>
              Xóa tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="table-scroll-x">
            <table
              className="table-dense"
              tabIndex={0}
              onKeyDown={handleTableKeyDown}
              aria-label="Bảng danh sách lô thực phẩm trong kho"
            >
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort('food_name')}
                    >
                      <span>Thực phẩm & Mã</span>
                      {renderSortIcon('food_name')}
                    </button>
                  </th>
                  <th>Loại</th>
                  <th>Khu vực & Vị trí</th>
                  <th className="num-col">
                    <button
                      type="button"
                      className="th-sort-btn th-sort-right"
                      onClick={() => toggleSort('current_quantity')}
                    >
                      <span>Số lượng tồn</span>
                      {renderSortIcon('current_quantity')}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort('import_date')}
                    >
                      <span>Ngày nhập</span>
                      {renderSortIcon('import_date')}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort('expiry_date')}
                    >
                      <span>Hạn sử dụng</span>
                      {renderSortIcon('expiry_date')}
                    </button>
                  </th>
                  <th>FEFO & Trạng thái</th>
                  <th className="num-col">Thao tác nhanh</th>
                </tr>
              </thead>
              <tbody>
                {items.map((lot) => {
                  const isSelected = selectedItemId === lot.item_id;
                  const isCancelled = lot.status === 'Đã hủy';
                  return (
                    <tr
                      key={lot.item_id}
                      className={`${isSelected ? 'row-selected' : ''} ${lot.is_expired ? 'row-expired-tint' : ''}`}
                      onClick={() => onSelectRow(lot.item_id)}
                      onContextMenu={(e) => handleRowContextMenu(e, lot)}
                      data-testid={`dsk-inv-row-${lot.item_id}`}
                    >
                      <td>
                        <div className="food-cell-flex">
                          {lot.image_url ? (
                            <img src={lot.image_url} alt="" className="row-thumb" />
                          ) : (
                            <span className="row-avatar" aria-hidden="true">
                              {getFoodInitials(lot.food_name)}
                            </span>
                          )}
                          <div>
                            <div className="row-food-name">{lot.food_name}</div>
                            <div className="t-micro mono-num">
                              {lot.food_code} · {lot.item_code}
                              {lot.brand ? ` · ${lot.brand}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{lot.category_name}</td>
                      <td>
                        <div>{lot.location_name}</div>
                        <div className="t-micro">{lot.area_type}</div>
                      </td>
                      <td className="num-col mono-num">
                        <div>
                          <strong>{formatQuantity(lot.current_quantity)}</strong> {lot.unit_name}
                        </div>
                        {lot.is_low_stock ? (
                          <span className="low-stock-flag">
                            <AlertTriangle size={11} />
                            <span>≤ min ({formatQuantity(lot.min_threshold)})</span>
                          </span>
                        ) : null}
                      </td>
                      <td className="mono-num">{lot.import_date}</td>
                      <td>
                        <div className="mono-num">
                          <strong>{lot.expiry_date}</strong>
                        </div>
                        <div
                          className={`t-micro ${lot.is_expired ? 'text-danger-strong' : lot.is_expiring_soon ? 'text-warn-strong' : ''}`}
                        >
                          {formatDaysRemainingLabel(lot.days_remaining)}
                        </div>
                      </td>
                      <td>
                        <div className="fefo-badges-cell">
                          <span
                            className={getStatusBadgeClass(
                              lot.status,
                              lot.days_remaining,
                              systemConfig.warning_days_threshold,
                            )}
                          >
                            {lot.status === 'Đang sử dụng' && lot.is_expired
                              ? 'Quá hạn'
                              : lot.status === 'Đang sử dụng' && lot.is_expiring_soon
                                ? 'Cận hạn'
                                : lot.status}
                          </span>
                          {lot.fefo_priority ? (
                            <span className={getPriorityBadgeClass(lot.fefo_priority)}>
                              {lot.fefo_priority}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="num-col" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions-inline">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Xem chi tiết (DSK-03-D)"
                            onClick={() => onSelectRow(lot.item_id)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={!dbHealthy || isCancelled}
                            onClick={() =>
                              onOpenActionModal(lot, lot.current_quantity > 0 ? 'use' : 'restock')
                            }
                            data-testid={`dsk-inv-act-use-${lot.item_id}`}
                          >
                            {lot.current_quantity > 0 ? 'Dùng/Kho' : 'Nhập thêm'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={!dbHealthy || isCancelled}
                            onClick={() => onOpenEditFood(lot)}
                            title={isCancelled ? 'Không thể sửa lô đã thanh lý (Đã hủy)' : 'Sửa hồ sơ (DSK-M01)'}
                            data-testid={`dsk-inv-act-edit-${lot.item_id}`}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={!dbHealthy || isCancelled}
                            onClick={() => onOpenLiquidate(lot)}
                            title="Thanh lý / Xóa mềm (DSK-M04)"
                            data-testid={`dsk-inv-act-delete-${lot.item_id}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Desktop Right-Click Context Menu */}
      {contextMenu ? (
        <div
          className="desktop-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            onClick={() => {
              onSelectRow(contextMenu.lot.item_id);
              setContextMenu(null);
            }}
          >
            <Eye size={14} />
            <span>Xem chi tiết (DSK-03-D)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            disabled={!dbHealthy || contextMenu.lot.status === 'Đã hủy' || contextMenu.lot.current_quantity <= 0}
            onClick={() => {
              onOpenActionModal(contextMenu.lot, 'use');
              setContextMenu(null);
            }}
          >
            <MinusCircle size={14} />
            <span>Xuất dùng thực phẩm</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            disabled={!dbHealthy || contextMenu.lot.status === 'Đã hủy'}
            onClick={() => {
              onOpenActionModal(contextMenu.lot, 'restock');
              setContextMenu(null);
            }}
          >
            <PlusCircle size={14} />
            <span>Nhập thêm số lượng</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            disabled={!dbHealthy || contextMenu.lot.status === 'Đã hủy'}
            onClick={() => {
              onOpenActionModal(contextMenu.lot, 'adjust');
              setContextMenu(null);
            }}
          >
            <Sliders size={14} />
            <span>Kiểm kê điều chỉnh</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            disabled={!dbHealthy || contextMenu.lot.status === 'Đã hủy'}
            onClick={() => {
              onOpenActionModal(contextMenu.lot, 'move');
              setContextMenu(null);
            }}
          >
            <MapPin size={14} />
            <span>Đổi vị trí bảo quản</span>
          </button>
          <div className="context-menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            disabled={!dbHealthy || contextMenu.lot.status === 'Đã hủy'}
            onClick={() => {
              onOpenEditFood(contextMenu.lot);
              setContextMenu(null);
            }}
          >
            <Edit3 size={14} />
            <span>Sửa hồ sơ (DSK-M01)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="context-menu-item is-danger"
            disabled={!dbHealthy || contextMenu.lot.status === 'Đã hủy'}
            onClick={() => {
              onOpenLiquidate(contextMenu.lot);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            <span>Thanh lý / Xóa mềm (DSK-M04)</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
