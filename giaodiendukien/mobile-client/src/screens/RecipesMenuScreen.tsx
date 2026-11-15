import { useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Users,
} from 'lucide-react';
import type {
  CookRecipeResult,
  RecipeMatchSuggestion,
  ServerResponse,
} from '@food-mgmt/shared-sim';
import { formatDaysRemainingLabel } from '../domain/food-lot-presentation';

interface RecipesMenuScreenProps {
  recipes: RecipeMatchSuggestion[];
  focusItemId?: number;
  isOfflineReadOnly: boolean;
  onClearFocus: () => void;
  onQuickUseIngredient: (
    itemId: number,
    foodName: string,
    availableQty: number,
    requiredQty: number,
    unitName: string,
    expiryDate: string,
    recipeName: string,
  ) => void;
  onCookRecipe: (recipeId: number) => Promise<ServerResponse<CookRecipeResult>>;
}

export function RecipesMenuScreen({
  recipes,
  focusItemId,
  isOfflineReadOnly,
  onClearFocus,
  onQuickUseIngredient,
  onCookRecipe,
}: RecipesMenuScreenProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'fefo'>('all');
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<number[]>([]);
  const [cookingRecipeId, setCookingRecipeId] = useState<number | null>(null);
  const [cookError, setCookError] = useState<string | null>(null);

  const toggleExpand = (recipeId: number) => {
    setExpandedRecipeIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId],
    );
  };

  const filteredRecipes = recipes.filter((suggestion) => {
    if (filterMode === 'ready') return suggestion.missing_count === 0;
    if (filterMode === 'fefo') return suggestion.matched_fefo_count > 0;
    return true;
  });

  const handleCookRecipe = async (suggestion: RecipeMatchSuggestion) => {
    if (isOfflineReadOnly || suggestion.ready_count === 0) return;

    setCookingRecipeId(suggestion.recipe.recipe_id);
    setCookError(null);

    try {
      const res = await onCookRecipe(suggestion.recipe.recipe_id);
      if (!res.ok) {
        setCookError(res.error.message);
      }
    } finally {
      setCookingRecipeId(null);
    }
  };

  return (
    <main className="mob-main-scroll-no-nav" data-testid="mob-screen-MOB-04">
      {/* Focus & Filter Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {focusItemId !== undefined && (
          <div className="mob-banner-alert mob-banner-alert-info">
            <span style={{ fontSize: 'var(--text-sm)' }}>
              Đang lọc công thức chứa nguyên liệu đang chọn
            </span>
            <button type="button" className="btn btn-secondary" onClick={onClearFocus}>
              Xem tất cả
            </button>
          </div>
        )}

        <div className="mob-chip-scroll">
          {(
            [
              { id: 'all', label: `Tất cả (${recipes.length})` },
              { id: 'fefo', label: 'Ưu tiên giải cứu FEFO' },
              { id: 'ready', label: 'Đủ 100% nguyên liệu' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mob-chip ${filterMode === tab.id ? 'mob-chip-active' : ''}`}
              onClick={() => setFilterMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {cookError && (
        <div className="mob-banner-alert mob-banner-alert-danger" role="alert">
          <span style={{ fontSize: 'var(--text-sm)' }}>{cookError}</span>
        </div>
      )}

      {filteredRecipes.length === 0 ? (
        <div className="mob-empty-box" data-testid="mob-recipes-empty">
          <ChefHat size={30} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h2 className="t-card-title">Chưa có món ăn phù hợp bộ lọc</h2>
          <p className="t-meta" style={{ margin: 0 }}>
            Thử chọn &ldquo;Tất cả&rdquo; hoặc bổ sung thêm nguyên liệu vào tủ lạnh.
          </p>
          {filterMode !== 'all' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFilterMode('all')}
            >
              Xem tất cả công thức
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {filteredRecipes.map((suggestion) => {
            const { recipe } = suggestion;
            const isExpanded = expandedRecipeIds.includes(recipe.recipe_id);
            const isCooking = cookingRecipeId === recipe.recipe_id;

            return (
              <article
                key={recipe.recipe_id}
                className="pantry-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
                data-testid={`mob-recipe-card-${recipe.recipe_id}`}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <h2 className="t-card-title" style={{ fontSize: 'var(--text-md)' }}>
                      {recipe.recipe_name}
                    </h2>
                    <span className="badge badge-info mono-num">
                      Điểm FEFO {suggestion.match_score}
                    </span>
                  </div>

                  <p className="t-meta" style={{ margin: '4px 0 0' }}>
                    {recipe.priority_hint}
                  </p>

                  <div className="mob-food-meta-row" style={{ marginTop: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={14} aria-hidden="true" />
                      {recipe.cook_time_minutes} phút
                    </span>
                    <span>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Users size={14} aria-hidden="true" />
                      {recipe.servings} người
                    </span>
                    <span>·</span>
                    <span>
                      Sẵn sàng{' '}
                      <strong className="mono-num">
                        {suggestion.ready_count}/{suggestion.ready_count + suggestion.missing_count}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Ingredient Availability List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="t-micro" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Nguyên liệu đối chiếu kho
                  </span>
                  {suggestion.ingredient_statuses.map((ing) => {
                    const badgeClass =
                      ing.availability === 'Có sẵn - Ưu tiên cao'
                        ? 'badge-urgent'
                        : ing.availability === 'Có sẵn'
                          ? 'badge-fresh'
                          : 'badge-empty';

                    const lotUnitName = ing.available_unit_name ?? ing.unit_name;
                    const quickDeductQty = ing.unit_compatible
                      ? (ing.deduct_quantity_in_lot_unit ?? ing.required_quantity)
                      : 1;
                    const canTapIngredient =
                      !isOfflineReadOnly &&
                      ing.matched_item_id !== null &&
                      ing.available_quantity > 0;

                    return (
                      <div
                        key={ing.ingredient_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                            {ing.ingredient_name}{' '}
                            <span className="mono-num t-micro">
                              ({ing.required_quantity} {ing.unit_name})
                            </span>
                          </div>
                          <div className="t-micro">
                            {ing.matched_item_id !== null ? (
                              <>
                                Trong tủ:{' '}
                                <span className="mono-num">
                                  {ing.available_quantity} {lotUnitName}
                                </span>
                                {ing.matched_days_remaining !== null &&
                                  ` · ${formatDaysRemainingLabel(ing.matched_days_remaining)}`}
                                {ing.unit_compatible === false &&
                                  ` · Khác đơn vị (${ing.unit_name}/${lotUnitName})`}
                              </>
                            ) : (
                              'Chưa có trong tủ lạnh'
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`badge ${badgeClass}`}>
                            {ing.availability === 'Có sẵn - Ưu tiên cao' ? (
                              <Flame size={11} aria-hidden="true" />
                            ) : ing.availability === 'Có sẵn' ? (
                              <CheckCircle2 size={11} aria-hidden="true" />
                            ) : null}
                            <span>{ing.availability}</span>
                          </span>
                          {canTapIngredient && ing.matched_item_id !== null && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ minHeight: 34, padding: '0 8px', fontSize: 12 }}
                              onClick={() =>
                                onQuickUseIngredient(
                                  ing.matched_item_id!,
                                  ing.matched_food_name ?? ing.ingredient_name,
                                  ing.available_quantity,
                                  quickDeductQty,
                                  lotUnitName,
                                  ing.matched_expiry_date ?? '',
                                  recipe.recipe_name,
                                )
                              }
                            >
                              Xuất
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expandable Instructions */}
                <div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'space-between', padding: '0 8px' }}
                    aria-expanded={isExpanded}
                    aria-controls={`mob-recipe-steps-${recipe.recipe_id}`}
                    onClick={() => toggleExpand(recipe.recipe_id)}
                  >
                    <span>{isExpanded ? 'Ẩn hướng dẫn chế biến' : 'Xem hướng dẫn chế biến'}</span>
                    {isExpanded ? (
                      <ChevronUp size={18} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={18} aria-hidden="true" />
                    )}
                  </button>

                  {isExpanded && (
                    <ol
                      id={`mob-recipe-steps-${recipe.recipe_id}`}
                      style={{
                        margin: '8px 0 0',
                        paddingLeft: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {recipe.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Cook Action */}
                <button
                  type="button"
                  className="btn btn-primary btn-fixed-full"
                  disabled={isOfflineReadOnly || suggestion.ready_count === 0 || isCooking}
                  data-testid={`mob-recipe-cook-${recipe.recipe_id}`}
                  onClick={() => handleCookRecipe(suggestion)}
                >
                  {isCooking ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true" />
                      <span>Đang trừ kho…</span>
                    </>
                  ) : (
                    <span>Đã nấu món này (Trừ nguyên liệu sẵn có)</span>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
