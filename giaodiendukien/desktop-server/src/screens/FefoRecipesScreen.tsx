import { useState } from 'react';
import {
  AlertTriangle,
  ChefHat,
  Clock,
  Flame,
  Info,
  Layers,
  Utensils,
} from 'lucide-react';
import type {
  AreaType,
  CatalogBundle,
  FefoListResult,
  FefoPriorityLevel,
  FoodLotView,
  RecipeMatchSuggestion,
  SystemConfig,
} from '@food-mgmt/shared-sim';
import {
  formatDaysRemainingLabel,
  formatQuantity,
  getPriorityBadgeClass,
} from '../domain/pantry-formatters';

interface FefoRecipesScreenProps {
  fefo: FefoListResult | null;
  recipes: RecipeMatchSuggestion[];
  catalogs: CatalogBundle;
  systemConfig: SystemConfig;
  allLots: FoodLotView[];
  dbHealthy: boolean;
  filter: {
    area_type: AreaType | 'all';
    location_id: number | 'all';
    priority_level: FefoPriorityLevel | 'all';
  };
  onChangeFilter: (next: {
    area_type: AreaType | 'all';
    location_id: number | 'all';
    priority_level: FefoPriorityLevel | 'all';
  }) => void;
  onOpenUseModal: (lot: FoodLotView) => void;
  onOpenRecipeModal: (focusItemId?: number, initialRecipeId?: number) => void;
  onOpenDrawer: (itemId: number) => void;
  onGoToAlerts: () => void;
}

export function FefoRecipesScreen({
  fefo,
  recipes,
  catalogs,
  systemConfig,
  allLots,
  dbHealthy,
  filter,
  onChangeFilter,
  onOpenUseModal,
  onOpenRecipeModal,
  onOpenDrawer,
  onGoToAlerts,
}: FefoRecipesScreenProps) {
  const [showRuleExplain, setShowRuleExplain] = useState(false);

  const items = fefo?.items ?? [];
  const lotsById = new Map(allLots.map((l) => [l.item_id, l]));
  const availableLocations =
    filter.area_type === 'all'
      ? catalogs.storage_locations
      : catalogs.storage_locations.filter((l) => l.area_type === filter.area_type);

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-02">
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Đề xuất Thực phẩm Ưu tiên (FEFO) & Gợi ý Món ăn</h1>
          <p className="t-meta">
            Thuật toán First-Expired, First-Out kết hợp FIFO tie-breaker (ngày nhập cũ trước khi trùng hạn)
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowRuleExplain((v) => !v)}
          data-testid="dsk-fefo-explain-toggle"
        >
          <Info size={14} />
          <span>{showRuleExplain ? 'Ẩn giải trình quy tắc' : 'Xem giải trình quy tắc FEFO'}</span>
        </button>
      </div>

      {/* Time-Simulated State Reminder Banner */}
      {systemConfig.use_simulated_date ? (
        <div className="inline-alert inline-alert-info">
          <Clock size={15} />
          <span>
            Đang tính FEFO theo <strong>ngày mô phỏng {fefo?.reference_date ?? systemConfig.simulated_date}</strong>. Dùng thanh mô phỏng thời gian ở phía trên để kiểm thử độ trôi hạn sử dụng.
          </span>
        </div>
      ) : null}

      {/* Rule Explanation Panel */}
      {showRuleExplain ? (
        <section className="hairline-card rule-explain-box" aria-label="Giải trình quy tắc FEFO">
          <h2 className="t-card-title">Quy tắc phân mức & xếp hạng FEFO (D3)</h2>
          <div className="rule-explain-grid">
            <div>
              <strong>1. Điều kiện lọc hợp lệ:</strong> Chỉ xét các lô <code>status = &apos;Đang sử dụng&apos;</code> và{' '}
              <code>current_quantity &gt; 0</code>. Các lô có <span className="mono-num">DaysLeft &lt; 0</span> bị loại khỏi FEFO (quy tắc 1.2.4.4) và chuyển sang Cảnh báo.
            </div>
            <div>
              <strong>2. Phân 3 mức ưu tiên (so với ngày {fefo?.reference_date}):</strong>{' '}
              <span className="badge badge-expired">Cao</span> ≤ <span className="mono-num">{systemConfig.fefo_high_days}</span> ngày ·{' '}
              <span className="badge badge-urgent">Trung bình</span> ≤ <span className="mono-num">{systemConfig.fefo_medium_days}</span> ngày ·{' '}
              <span className="badge badge-fresh">Thấp</span> &gt; <span className="mono-num">{systemConfig.fefo_medium_days}</span> ngày.
            </div>
            <div>
              <strong>3. Thứ tự Tie-Breaker (FIFO):</strong> Khi nhiều lô trùng ngày hết hạn (<code>expiry_date</code>), hệ thống tự động xếp lô có <code>import_date</code> cũ hơn lên trước (gắn nhãn <span className="badge badge-info">Đồng hạn · FIFO</span>).
            </div>
          </div>
        </section>
      ) : null}

      {/* Summary Bar by 3 Priority Levels + Excluded Expired Link */}
      <div className="fefo-summary-strip">
        <button
          type="button"
          className={`hairline-card summary-pill-card ${filter.priority_level === 'Cao' ? 'is-selected' : ''}`}
          onClick={() =>
            onChangeFilter({
              ...filter,
              priority_level: filter.priority_level === 'Cao' ? 'all' : 'Cao',
            })
          }
        >
          <span className="badge badge-expired">Ưu tiên Cao</span>
          <strong className="kpi-num">{fefo?.counts_by_priority.Cao ?? 0}</strong>
          <span className="t-meta">Cần dùng ngay</span>
        </button>

        <button
          type="button"
          className={`hairline-card summary-pill-card ${filter.priority_level === 'Trung bình' ? 'is-selected' : ''}`}
          onClick={() =>
            onChangeFilter({
              ...filter,
              priority_level: filter.priority_level === 'Trung bình' ? 'all' : 'Trung bình',
            })
          }
        >
          <span className="badge badge-urgent">Ưu tiên Trung bình</span>
          <strong className="kpi-num">{fefo?.counts_by_priority['Trung bình'] ?? 0}</strong>
          <span className="t-meta">Dùng trong tuần</span>
        </button>

        <button
          type="button"
          className={`hairline-card summary-pill-card ${filter.priority_level === 'Thấp' ? 'is-selected' : ''}`}
          onClick={() =>
            onChangeFilter({
              ...filter,
              priority_level: filter.priority_level === 'Thấp' ? 'all' : 'Thấp',
            })
          }
        >
          <span className="badge badge-fresh">Ưu tiên Thấp</span>
          <strong className="kpi-num">{fefo?.counts_by_priority.Thấp ?? 0}</strong>
          <span className="t-meta">An toàn</span>
        </button>

        {(fefo?.expired_excluded_count ?? 0) > 0 ? (
          <button
            type="button"
            className="hairline-card summary-pill-card summary-pill-excluded"
            onClick={onGoToAlerts}
          >
            <span className="inline-icon-text text-danger-strong">
              <AlertTriangle size={14} />
              <strong>Đã loại khỏi FEFO</strong>
            </span>
            <strong className="kpi-num text-danger-strong">
              {fefo?.expired_excluded_count ?? 0}
            </strong>
            <span className="t-meta">Lô quá hạn → Xử lý tại DSK-04</span>
          </button>
        ) : null}
      </div>

      {/* Filter Bar */}
      <div className="hairline-card filter-bar">
        <div className="filter-group">
          <label htmlFor="fefo-priority-filter">Mức ưu tiên</label>
          <select
            id="fefo-priority-filter"
            value={filter.priority_level}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                priority_level: e.target.value as FefoPriorityLevel | 'all',
              })
            }
            data-testid="dsk-fefo-filter-priority"
          >
            <option value="all">Tất cả mức ưu tiên</option>
            <option value="Cao">Cao (≤ {systemConfig.fefo_high_days} ngày)</option>
            <option value="Trung bình">Trung bình (≤ {systemConfig.fefo_medium_days} ngày)</option>
            <option value="Thấp">Thấp (&gt; {systemConfig.fefo_medium_days} ngày)</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fefo-area-filter">Khu vực bảo quản</label>
          <select
            id="fefo-area-filter"
            value={filter.area_type}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                area_type: e.target.value as AreaType | 'all',
                location_id: 'all',
              })
            }
            data-testid="dsk-fefo-filter-area"
          >
            <option value="all">Tất cả khu vực</option>
            <option value="Trong tủ lạnh">Trong tủ lạnh</option>
            <option value="Ngoài tủ lạnh">Ngoài tủ lạnh</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fefo-location-filter">Vị trí chi tiết</label>
          <select
            id="fefo-location-filter"
            value={filter.location_id}
            onChange={(e) =>
              onChangeFilter({
                ...filter,
                location_id: e.target.value === 'all' ? 'all' : Number(e.target.value),
              })
            }
            data-testid="dsk-fefo-filter-location"
          >
            <option value="all">Tất cả vị trí</option>
            {availableLocations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            onChangeFilter({ area_type: 'all', location_id: 'all', priority_level: 'all' })
          }
        >
          Đặt lại bộ lọc
        </button>
      </div>

      {/* Main Split: FEFO Table + Recipe Suggestions */}
      <div className="fefo-main-grid">
        <section className="hairline-card panel-card">
          <div className="panel-header">
            <div className="inline-icon-text">
              <Flame size={15} className="text-accent" />
              <h2 className="t-card-title">Danh sách Lô Thực phẩm Xếp hạng FEFO ({items.length})</h2>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="empty-well">
              Không có lô thực phẩm nào đủ điều kiện FEFO khớp bộ lọc hiện tại.
            </div>
          ) : (
            <div className="table-scroll-x">
              <table className="table-dense">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Thực phẩm & Lô</th>
                    <th>Vị trí</th>
                    <th className="num-col">Tồn kho</th>
                    <th>Nhập / HSD</th>
                    <th>Mức độ & Giải trình</th>
                    <th className="num-col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const lot = lotsById.get(item.item_id);
                    return (
                      <tr key={item.item_id} data-testid={`dsk-fefo-row-${item.item_id}`}>
                        <td className="mono-num">
                          <strong>#{item.rank}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="table-link-btn"
                            onClick={() => onOpenDrawer(item.item_id)}
                          >
                            {item.food_name}
                          </button>
                          <div className="t-micro mono-num">
                            {item.food_code} · {item.item_code} · {item.category_name}
                          </div>
                        </td>
                        <td>
                          <div>{item.location_name}</div>
                          <div className="t-micro">{item.area_type}</div>
                        </td>
                        <td className="num-col mono-num">
                          <strong>{formatQuantity(item.current_quantity)}</strong> {item.unit_name}
                        </td>
                        <td>
                          <div className="mono-num">
                            HSD: <strong>{item.expiry_date}</strong>
                          </div>
                          <div className="t-micro mono-num">
                            Nhập: {item.import_date} · {formatDaysRemainingLabel(item.days_remaining)}
                          </div>
                        </td>
                        <td>
                          <div className="fefo-badges-cell">
                            <span className={getPriorityBadgeClass(item.priority_level)}>
                              {item.priority_level}
                            </span>
                            {item.fifo_tie_group_size > 1 ? (
                              <span
                                className="badge badge-info"
                                title="Trùng hạn sử dụng — sắp xếp FIFO theo ngày nhập cũ hơn"
                              >
                                <Layers size={11} />
                                <span>
                                  FIFO #{item.fifo_tie_position}/{item.fifo_tie_group_size}
                                </span>
                              </span>
                            ) : null}
                          </div>
                          <div className="t-meta">{item.priority_reason}</div>
                        </td>
                        <td className="num-col">
                          <div className="row-actions-inline">
                            {lot ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={!dbHealthy}
                                onClick={() => onOpenUseModal(lot)}
                                data-testid={`dsk-fefo-use-${item.item_id}`}
                              >
                                <Utensils size={12} />
                                <span>Dùng</span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                onOpenRecipeModal(item.item_id, item.matching_recipe_ids[0])
                              }
                              data-testid={`dsk-fefo-recipes-${item.item_id}`}
                            >
                              <ChefHat size={12} />
                              <span>Món ăn ({item.matching_recipe_ids.length})</span>
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

        {/* Right Panel: Aggregated Recipe Suggestions */}
        <aside className="hairline-card panel-card">
          <div className="panel-header">
            <div className="inline-icon-text">
              <ChefHat size={16} className="text-accent" />
              <h2 className="t-card-title">Gợi ý Món ăn Khớp Nguyên liệu</h2>
            </div>
          </div>

          {recipes.length === 0 ? (
            <div className="empty-well">Chưa có công thức món ăn nào phù hợp với kho hiện tại.</div>
          ) : (
            <div className="recipe-cards-stack">
              {recipes.map((s) => (
                <button
                  key={s.recipe.recipe_id}
                  type="button"
                  className="recipe-suggestion-card"
                  onClick={() => onOpenRecipeModal(undefined, s.recipe.recipe_id)}
                  data-testid={`dsk-recipe-card-${s.recipe.recipe_id}`}
                >
                  <div className="recipe-card-top">
                    <strong>{s.recipe.recipe_name}</strong>
                    <span className="t-micro mono-num">{s.recipe.cook_time_minutes}p</span>
                  </div>
                  <div className="recipe-card-badges">
                    {s.matched_high_priority_count > 0 ? (
                      <span className="badge badge-expired">
                        {s.matched_high_priority_count} nguyên liệu gấp
                      </span>
                    ) : null}
                    <span className="badge badge-fresh">
                      Đủ {s.ready_count}/{s.ingredient_statuses.length}
                    </span>
                    {s.missing_count > 0 ? (
                      <span className="badge badge-urgent">Thiếu {s.missing_count}</span>
                    ) : null}
                  </div>
                  <p className="t-meta">{s.recipe.priority_hint}</p>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
