import { useState } from 'react';
import {
  AlertCircle,
  ChefHat,
  Edit3,
  FolderCog,
  MapPin,
  Plus,
  Ruler,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  CatalogBundle,
  Category,
  Recipe,
  ServerResponse,
  StorageLocation,
  Unit,
} from '@food-mgmt/shared-sim';
import type { CatalogFormModalState, CatalogTabId, ReferenceCounts } from '../state/useDesktopServer';

interface CatalogsScreenProps {
  activeTab: CatalogTabId;
  catalogs: CatalogBundle;
  referenceCounts: ReferenceCounts;
  dbHealthy: boolean;
  onChangeTab: (tab: CatalogTabId) => void;
  onOpenModal: (state: CatalogFormModalState) => void;
  onDeleteCategory: (id: number) => Promise<ServerResponse<{ deleted_id: number }>>;
  onDeleteUnit: (id: number) => Promise<ServerResponse<{ deleted_id: number }>>;
  onDeleteLocation: (id: number) => Promise<ServerResponse<{ deleted_id: number }>>;
  onDeleteRecipe: (id: number) => Promise<ServerResponse<{ deleted_id: number }>>;
  onNotify: (kind: 'success' | 'error', title: string, detail?: string) => void;
}

export function CatalogsScreen({
  activeTab,
  catalogs,
  referenceCounts,
  dbHealthy,
  onChangeTab,
  onOpenModal,
  onDeleteCategory,
  onDeleteUnit,
  onDeleteLocation,
  onDeleteRecipe,
  onNotify,
}: CatalogsScreenProps) {
  const [keyword, setKeyword] = useState('');
  const [constraintError, setConstraintError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ entity: CatalogTabId; id: number } | null>(
    null,
  );

  const q = keyword.trim().toLowerCase();

  const filteredCategories = catalogs.categories.filter(
    (c) =>
      !q ||
      c.category_name.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q),
  );
  const filteredUnits = catalogs.units.filter(
    (u) =>
      !q ||
      u.unit_name.toLowerCase().includes(q) ||
      (u.description ?? '').toLowerCase().includes(q),
  );
  const filteredLocations = catalogs.storage_locations.filter(
    (l) =>
      !q ||
      l.location_name.toLowerCase().includes(q) ||
      l.area_type.toLowerCase().includes(q) ||
      (l.description ?? '').toLowerCase().includes(q),
  );
  const filteredRecipes = catalogs.recipes.filter(
    (r) =>
      !q ||
      r.recipe_name.toLowerCase().includes(q) ||
      r.priority_hint.toLowerCase().includes(q),
  );

  const handleDelete = async (
    entity: CatalogTabId,
    id: number,
    label: string,
  ) => {
    setConstraintError(null);
    setPendingDelete(null);
    let res: ServerResponse<{ deleted_id: number }>;
    if (entity === 'categories') res = await onDeleteCategory(id);
    else if (entity === 'units') res = await onDeleteUnit(id);
    else if (entity === 'locations') res = await onDeleteLocation(id);
    else res = await onDeleteRecipe(id);

    if (res.ok) {
      onNotify('success', `Đã xóa "${label}"`, 'Danh mục mới đã sẵn sàng đồng bộ sang Mobile Client.');
    } else {
      setConstraintError(res.error.message);
      onNotify('error', 'Không thể xóa mục đang được tham chiếu', res.error.message);
    }
  };

  const renderRowActions = (
    entity: CatalogTabId,
    id: number,
    label: string,
    onEdit: () => void,
  ) => {
    const isConfirming = pendingDelete?.entity === entity && pendingDelete?.id === id;
    return (
      <div className="row-actions-inline">
        {isConfirming ? (
          <>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={!dbHealthy}
              onClick={() => void handleDelete(entity, id, label)}
              data-testid={`dsk-catalog-confirm-delete-${id}`}
            >
              <Trash2 size={12} />
              <span>Xác nhận xóa</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPendingDelete(null)}
              data-testid={`dsk-catalog-cancel-delete-${id}`}
            >
              Hủy
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!dbHealthy}
              onClick={() => {
                setPendingDelete(null);
                onEdit();
              }}
              data-testid={`dsk-catalog-edit-${id}`}
            >
              <Edit3 size={12} />
              <span>Sửa</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={!dbHealthy}
              onClick={() => {
                setConstraintError(null);
                setPendingDelete({ entity, id });
              }}
              data-testid={`dsk-catalog-delete-${id}`}
            >
              <Trash2 size={12} />
              <span>Xóa</span>
            </button>
          </>
        )}
      </div>
    );
  };

  const handleOpenAdd = () => {
    setConstraintError(null);
    setPendingDelete(null);
    if (activeTab === 'categories') onOpenModal({ open: true, entity: 'category' });
    else if (activeTab === 'units') onOpenModal({ open: true, entity: 'unit' });
    else if (activeTab === 'locations') onOpenModal({ open: true, entity: 'location' });
    else onOpenModal({ open: true, entity: 'recipe' });
  };

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-06">
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Quản trị Danh mục Nền tảng & Kho Công thức</h1>
          <p className="t-meta">
            Chuẩn hóa Loại thực phẩm, Đơn vị tính, Vị trí bảo quản 2 cấp và Công thức nấu đồng bộ sang Mobile
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!dbHealthy}
          onClick={handleOpenAdd}
          data-testid="dsk-catalog-add-btn"
        >
          <Plus size={15} />
          <span>Thêm mới</span>
        </button>
      </div>

      {/* 4 Tabs */}
      <div className="workbench-tabs" role="tablist" aria-label="Nhóm danh mục quản trị">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          className={`wb-tab-btn ${activeTab === 'categories' ? 'is-active' : ''}`}
          onClick={() => {
            setConstraintError(null);
            setPendingDelete(null);
            onChangeTab('categories');
          }}
          data-testid="dsk-catalog-tab-categories"
        >
          <FolderCog size={14} />
          <span>Loại thực phẩm ({catalogs.categories.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'units'}
          className={`wb-tab-btn ${activeTab === 'units' ? 'is-active' : ''}`}
          onClick={() => {
            setConstraintError(null);
            setPendingDelete(null);
            onChangeTab('units');
          }}
          data-testid="dsk-catalog-tab-units"
        >
          <Ruler size={14} />
          <span>Đơn vị tính ({catalogs.units.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'locations'}
          className={`wb-tab-btn ${activeTab === 'locations' ? 'is-active' : ''}`}
          onClick={() => {
            setConstraintError(null);
            setPendingDelete(null);
            onChangeTab('locations');
          }}
          data-testid="dsk-catalog-tab-locations"
        >
          <MapPin size={14} />
          <span>Vị trí bảo quản ({catalogs.storage_locations.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'recipes'}
          className={`wb-tab-btn ${activeTab === 'recipes' ? 'is-active' : ''}`}
          onClick={() => {
            setConstraintError(null);
            setPendingDelete(null);
            onChangeTab('recipes');
          }}
          data-testid="dsk-catalog-tab-recipes"
        >
          <ChefHat size={14} />
          <span>Công thức món ăn ({catalogs.recipes.length})</span>
        </button>
      </div>

      {/* Constraint Blocked Banner */}
      {constraintError ? (
        <div className="inline-alert inline-alert-danger" role="alert" data-testid="dsk-catalog-constraint-error">
          <AlertCircle size={16} />
          <span>
            <strong>Chặn xóa do ràng buộc dữ liệu (CONSTRAINT_IN_USE):</strong> {constraintError}
          </span>
        </div>
      ) : null}

      {/* Search Bar */}
      <div className="hairline-card filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label htmlFor="catalog-search-input">Tìm nhanh trong tab hiện tại</label>
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              id="catalog-search-input"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên hoặc mô tả để lọc..."
              data-testid="dsk-catalog-search"
            />
          </div>
        </div>
      </div>

      {/* Active Tab Table */}
      <section className="hairline-card panel-card">
        {activeTab === 'categories' ? (
          <table className="table-dense">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên loại thực phẩm</th>
                <th>Mô tả</th>
                <th className="num-col">Đang tham chiếu</th>
                <th className="num-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat: Category) => {
                const refs = referenceCounts.categories[cat.category_id] ?? 0;
                return (
                  <tr key={cat.category_id}>
                    <td className="mono-num">#{cat.category_id}</td>
                    <td>
                      <strong>{cat.category_name}</strong>
                    </td>
                    <td>{cat.description || '—'}</td>
                    <td className="num-col mono-num">
                      <span className={`badge ${refs > 0 ? 'badge-info' : 'badge-empty'}`}>
                        {refs} thực phẩm
                      </span>
                    </td>
                    <td className="num-col">
                      {renderRowActions('categories', cat.category_id, cat.category_name, () =>
                        onOpenModal({ open: true, entity: 'category', record: cat }),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {activeTab === 'units' ? (
          <table className="table-dense">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên đơn vị tính</th>
                <th>Mô tả / Quy đổi</th>
                <th className="num-col">Đang tham chiếu</th>
                <th className="num-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((unit: Unit) => {
                const refs = referenceCounts.units[unit.unit_id] ?? 0;
                return (
                  <tr key={unit.unit_id}>
                    <td className="mono-num">#{unit.unit_id}</td>
                    <td>
                      <strong>{unit.unit_name}</strong>
                    </td>
                    <td>{unit.description || '—'}</td>
                    <td className="num-col mono-num">
                      <span className={`badge ${refs > 0 ? 'badge-info' : 'badge-empty'}`}>
                        {refs} bản ghi
                      </span>
                    </td>
                    <td className="num-col">
                      {renderRowActions('units', unit.unit_id, unit.unit_name, () =>
                        onOpenModal({ open: true, entity: 'unit', record: unit }),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {activeTab === 'locations' ? (
          <table className="table-dense">
            <thead>
              <tr>
                <th>ID</th>
                <th>Khu vực (Cấp 1)</th>
                <th>Vị trí chi tiết (Cấp 2)</th>
                <th>Mô tả nhiệt độ / lưu trữ</th>
                <th className="num-col">Lô đang cất</th>
                <th className="num-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map((loc: StorageLocation) => {
                const refs = referenceCounts.locations[loc.location_id] ?? 0;
                return (
                  <tr key={loc.location_id}>
                    <td className="mono-num">#{loc.location_id}</td>
                    <td>
                      <span
                        className={`badge ${loc.area_type === 'Trong tủ lạnh' ? 'badge-info' : 'badge-urgent'}`}
                      >
                        {loc.area_type}
                      </span>
                    </td>
                    <td>
                      <strong>{loc.location_name}</strong>
                    </td>
                    <td>{loc.description || '—'}</td>
                    <td className="num-col mono-num">
                      <span className={`badge ${refs > 0 ? 'badge-fresh' : 'badge-empty'}`}>
                        {refs} lô
                      </span>
                    </td>
                    <td className="num-col">
                      {renderRowActions('locations', loc.location_id, loc.location_name, () =>
                        onOpenModal({ open: true, entity: 'location', record: loc }),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {activeTab === 'recipes' ? (
          filteredRecipes.length === 0 ? (
            <div className="empty-well">
              <ChefHat size={22} />
              <p>Chưa có công thức món ăn nào phù hợp.</p>
            </div>
          ) : (
            <table className="table-dense">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên món ăn</th>
                  <th>Nguyên liệu yêu cầu</th>
                  <th>Thời gian / Khẩu phần</th>
                  <th className="num-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((recipe: Recipe) => (
                  <tr key={recipe.recipe_id}>
                    <td className="mono-num">#{recipe.recipe_id}</td>
                    <td>
                      <strong>{recipe.recipe_name}</strong>
                      <div className="t-micro">{recipe.priority_hint}</div>
                    </td>
                    <td>
                      {recipe.ingredients.map((i) => `${i.ingredient_name} (${i.quantity} ${i.unit_name})`).join(', ')}
                    </td>
                    <td className="mono-num">
                      {recipe.cook_time_minutes}p · {recipe.servings} phần
                    </td>
                    <td className="num-col">
                      {renderRowActions('recipes', recipe.recipe_id, recipe.recipe_name, () =>
                        onOpenModal({ open: true, entity: 'recipe', record: recipe }),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </section>
    </div>
  );
}
