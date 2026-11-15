import { describe, expect, it, vi } from 'vitest';
import {
  SimulatedClientTransport,
  SimulatedServerNode,
  adjustFood,
  aggregateAnalytics,
  calculateAlertsSummary,
  cancelFoodItem,
  cookRecipe,
  createFoodItem,
  createInitialDatabaseState,
  deleteCategory,
  deleteLocation,
  deleteUnit,
  generateFefoRecommendations,
  getAuditLogs,
  listAiScanPresets,
  moveFoodLocation,
  restockFood,
  runSimulatedAiScan,
  saveCategory,
  saveLocation,
  saveRecipe,
  saveUnit,
  searchFoodItems,
  shiftSimulatedDate,
  suggestRecipesForPantry,
  updateFoodItem,
  useFood,
  validateFoodForm,
  type FoodFormInput,
} from '@food-mgmt/shared-sim';

function makeValidFoodInput(overrides: Partial<FoodFormInput> = {}): FoodFormInput {
  return {
    food_code: 'TP099',
    food_name: 'Bơ lạt Anchor New Zealand',
    category_id: 2,
    brand: 'Anchor',
    description: 'Bơ lạt làm bánh hộp 227g',
    image_url: null,
    location_id: 1,
    unit_id: 6,
    quantity: 2,
    min_threshold: 1,
    import_date: '2026-11-11',
    expiry_date: '2026-11-25',
    note: 'Bảo quản ngăn mát',
    ...overrides,
  };
}

describe('FEFO + FIFO Engine & Time Simulation', () => {
  it('excludes expired, zero-stock, and cancelled lots, and sorts strictly by FEFO then FIFO with priority buckets', () => {
    const db = createInitialDatabaseState();
    const res = generateFefoRecommendations(db);

    expect(res.reference_date).toBe('2026-11-11');
    // LO-001 (-2d), LO-002 (-1d) are expired active lots -> excluded_count = 2
    // LO-015 (Đã hết, qty 0) and LO-016 (Đã hủy, qty 0) are also excluded
    expect(res.expired_excluded_count).toBe(2);
    expect(res.items.map((i) => i.item_code)).toEqual([
      'LO-003', // 2026-11-11 (0d) -> Cao
      'LO-004', // 2026-11-12 (+1d) -> Cao
      'LO-005', // 2026-11-13 (+2d, imported 2026-11-07) -> Cao (FIFO tie A #1)
      'LO-006', // 2026-11-13 (+2d, imported 2026-11-10) -> Cao (FIFO tie A #2)
      'LO-007', // 2026-11-14 (+3d) -> Trung bình
      'LO-008', // 2026-11-15 (+4d) -> Trung bình
      'LO-009', // 2026-11-16 (+5d, imported 2026-11-08) -> Trung bình (FIFO tie B #1)
      'LO-010', // 2026-11-16 (+5d, imported 2026-11-10) -> Trung bình (FIFO tie B #2)
      'LO-011', // 2026-11-17 (+6d) -> Trung bình
      'LO-012', // 2026-12-10 (+29d) -> Thấp
      'LO-013', // 2027-03-20 (+129d) -> Thấp
      'LO-014', // 2027-06-15 (+216d) -> Thấp
    ]);

    expect(res.counts_by_priority).toEqual({
      Cao: 4,
      'Trung bình': 5,
      Thấp: 3,
    });

    // Explicit FIFO tie-group assertions
    expect(res.items[2].item_code).toBe('LO-005');
    expect(res.items[2].fifo_tie_group_size).toBe(2);
    expect(res.items[2].fifo_tie_position).toBe(1);
    expect(res.items[3].item_code).toBe('LO-006');
    expect(res.items[3].fifo_tie_group_size).toBe(2);
    expect(res.items[3].fifo_tie_position).toBe(2);

    expect(res.items[6].item_code).toBe('LO-009');
    expect(res.items[6].fifo_tie_group_size).toBe(2);
    expect(res.items[6].fifo_tie_position).toBe(1);
    expect(res.items[7].item_code).toBe('LO-010');
    expect(res.items[7].fifo_tie_group_size).toBe(2);
    expect(res.items[7].fifo_tie_position).toBe(2);

    // Priority assignments
    expect(res.items[0].priority_level).toBe('Cao');
    expect(res.items[4].priority_level).toBe('Trung bình');
    expect(res.items[9].priority_level).toBe('Thấp');
  });

  it('recalculates FEFO priorities, exclusions, and recipe rankings dynamically across simulated date shifts', () => {
    const db = createInitialDatabaseState();

    // Baseline recipes on 2026-11-11: Recipe 4 (#1) has 2 Cao + 1 Trung binh, Recipe 6 (#7) has 0 Cao
    const initialRecipes = suggestRecipesForPantry(db);
    expect(initialRecipes.map((r) => r.recipe.recipe_id)).toEqual([4, 5, 2, 3, 1, 7, 6]);
    const recipe7Baseline = initialRecipes.find((r) => r.recipe.recipe_id === 7)!;
    expect(recipe7Baseline.missing_count).toBe(1);
    expect(recipe7Baseline.ingredient_statuses[0].availability).toBe('Thiếu');

    // Shift -1d -> 2026-11-10: LO-002 (2026-11-10) becomes 0d (Cao, un-expired!)
    const minus1 = shiftSimulatedDate(db, { delta_days: -1 });
    expect(minus1.ok).toBe(true);
    expect(db.system_config.simulated_date).toBe('2026-11-10');
    const fefoMinus1 = generateFefoRecommendations(db);
    expect(fefoMinus1.expired_excluded_count).toBe(1); // Only LO-001 (2026-11-09) expired
    expect(fefoMinus1.items[0].item_code).toBe('LO-002');
    expect(fefoMinus1.items[0].days_remaining).toBe(0);
    expect(fefoMinus1.items[0].priority_level).toBe('Cao');

    // Reset back to 2026-11-11, then shift +1d -> 2026-11-12
    shiftSimulatedDate(db, { reset_to_default: true });
    shiftSimulatedDate(db, { delta_days: 1 });
    expect(db.system_config.simulated_date).toBe('2026-11-12');
    const fefoPlus1 = generateFefoRecommendations(db);
    expect(fefoPlus1.expired_excluded_count).toBe(3); // LO-001, LO-002, LO-003 expired
    expect(fefoPlus1.items[0].item_code).toBe('LO-004');
    expect(fefoPlus1.items[0].days_remaining).toBe(0);
    expect(fefoPlus1.items[3].item_code).toBe('LO-007');
    expect(fefoPlus1.items[3].priority_level).toBe('Cao'); // +2d now

    // Shift another +2d (total +3d from default -> 2026-11-14)
    shiftSimulatedDate(db, { delta_days: 2 });
    expect(db.system_config.simulated_date).toBe('2026-11-14');
    const fefoPlus3 = generateFefoRecommendations(db);
    expect(fefoPlus3.expired_excluded_count).toBe(6); // LO-001..LO-006 expired
    expect(fefoPlus3.counts_by_priority).toEqual({
      Cao: 4, // LO-007 (0d), LO-008 (+1d), LO-009 (+2d), LO-010 (+2d)
      'Trung bình': 1, // LO-011 (+3d)
      Thấp: 3, // LO-012..014
    });
    expect(fefoPlus3.items.map((i) => i.item_code)).toEqual([
      'LO-007',
      'LO-008',
      'LO-009',
      'LO-010',
      'LO-011',
      'LO-012',
      'LO-013',
      'LO-014',
    ]);

    // Recipe 6 (Sữa chua nha đam trộn chuối) now jumps to #1 because both LO-009 & LO-010/LO-008 are Cao
    const plus3Recipes = suggestRecipesForPantry(db);
    expect(plus3Recipes[0].recipe.recipe_id).toBe(6);
    expect(plus3Recipes[0].matched_high_priority_count).toBe(2);
    expect(plus3Recipes[0].match_score).toBe(120);

    // Shift +4d more (total +7d from default -> 2026-11-18)
    shiftSimulatedDate(db, { delta_days: 4 });
    expect(db.system_config.simulated_date).toBe('2026-11-18');
    const fefoPlus7 = generateFefoRecommendations(db);
    expect(fefoPlus7.expired_excluded_count).toBe(11); // LO-001..LO-011 all expired
    expect(fefoPlus7.items.map((i) => i.item_code)).toEqual(['LO-012', 'LO-013', 'LO-014']);
    expect(fefoPlus7.counts_by_priority).toEqual({ Cao: 0, 'Trung bình': 0, Thấp: 3 });

    // Reset restores 2026-11-11
    shiftSimulatedDate(db, { reset_to_default: true });
    expect(db.system_config.simulated_date).toBe('2026-11-11');
  });
});

describe('Alerts Calculator & Inventory Ledger Mutations', () => {
  it('computes dual alert groups accurately while excluding cancelled lots', () => {
    const db = createInitialDatabaseState();
    const alerts = calculateAlertsSummary(db);

    expect(alerts.reference_date).toBe('2026-11-11');
    expect(alerts.expired_items.map((i) => i.item_code)).toEqual(['LO-001', 'LO-002']);
    expect(alerts.expiring_soon_items.map((i) => i.item_code)).toEqual([
      'LO-003',
      'LO-004',
      'LO-005',
      'LO-006',
      'LO-007',
    ]);
    expect(alerts.total_expiry_alerts).toBe(7);

    // Low stock sorted by current_quantity ASC then item_id ASC:
    // LO-015 (0, Đã hết), LO-014 (0.4 <= 0.5), LO-001 (1 <= 1), LO-007 (2 <= 4), LO-011 (50 <= 80)
    // LO-016 (Đã hủy) MUST be excluded
    expect(alerts.low_stock_items.map((i) => i.item_code)).toEqual([
      'LO-015',
      'LO-014',
      'LO-001',
      'LO-007',
      'LO-011',
    ]);
    expect(alerts.total_stock_alerts).toBe(5);
    expect(alerts.unique_alert_item_count).toBe(10);
    expect(alerts.low_stock_items.find((i) => i.item_code === 'LO-015')?.suggested_buy_quantity).toBe(1);
    expect(alerts.low_stock_items.some((i) => i.item_code === 'LO-016')).toBe(false);
  });

  it('enforces sp_use_food stock guards, exact depletion, restock, adjust, and location move', () => {
    const db = createInitialDatabaseState();

    // 1. Reject quantity <= 0
    const zeroUse = useFood(db, { item_id: 4, quantity_used: 0, reason: 'Invalid zero' });
    expect(zeroUse.ok).toBe(false);
    if (!zeroUse.ok) {
      expect(zeroUse.error.code).toBe('VALIDATION_ERROR');
      expect(zeroUse.error.message).toBe('Số lượng sử dụng phải lớn hơn 0.');
    }

    // 2. Reject quantity > current_quantity (LO-004 Thịt ba chỉ has 0.8 kg)
    const overUse = useFood(db, { item_id: 4, quantity_used: 1.5, reason: 'Dùng quá tồn' });
    expect(overUse.ok).toBe(false);
    if (!overUse.ok) {
      expect(overUse.error.code).toBe('ERR_INSUFFICIENT_STOCK');
      expect(overUse.error.sql_state).toBe('45000');
      expect(overUse.error.message).toBe('Lỗi: Số lượng sử dụng lớn hơn tồn kho thực tế!');
      expect(overUse.error.latest_quantity).toBe(0.8);
      expect(overUse.error.unit_name).toBe('kg');
    }

    // 3. Stale optimistic stock guard (expected_current_quantity mismatch)
    const staleUse = useFood(db, {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Stale test',
      expected_current_quantity: 1.0,
    });
    expect(staleUse.ok).toBe(false);
    if (!staleUse.ok) {
      expect(staleUse.error.code).toBe('CONFLICT_STALE_STOCK');
      expect(staleUse.error.latest_quantity).toBe(0.8);
    }

    // 4. Valid partial use + full depletion to 'Đã hết'
    const partialUse = useFood(db, {
      item_id: 4,
      quantity_used: 0.3,
      reason: 'Rang cháy cạnh',
      actor_device: 'Mobile QA',
    });
    expect(partialUse.ok).toBe(true);
    if (partialUse.ok) {
      expect(partialUse.data.item.current_quantity).toBe(0.5);
      expect(partialUse.data.item.status).toBe('Đang sử dụng');
      expect(partialUse.data.transaction.action_type).toBe('Sử dụng');
      expect(partialUse.data.transaction.change_quantity).toBe(-0.3);
    }

    const exhaustUse = useFood(db, {
      item_id: 4,
      quantity_used: 0.5,
      reason: 'Dùng nốt phần còn lại',
    });
    expect(exhaustUse.ok).toBe(true);
    if (exhaustUse.ok) {
      expect(exhaustUse.data.item.current_quantity).toBe(0);
      expect(exhaustUse.data.item.status).toBe('Đã hết');
    }

    // 5. Restock restores 'Đã hết' -> 'Đang sử dụng'
    const restock = restockFood(db, {
      item_id: 15, // LO-015 Tôm sú currently 'Đã hết', qty 0
      quantity_added: 1.2,
      reason: 'Mua thêm tôm sú',
    });
    expect(restock.ok).toBe(true);
    if (restock.ok) {
      expect(restock.data.item.current_quantity).toBe(1.2);
      expect(restock.data.item.status).toBe('Đang sử dụng');
      expect(restock.data.transaction.action_type).toBe('Nhập thêm');
      expect(restock.data.transaction.change_quantity).toBe(1.2);
    }

    // 6. Adjust to specific count (and adjust to 0 sets 'Đã hết')
    const adjust = adjustFood(db, {
      item_id: 7, // LO-007 Trứng gà currently 2 quả
      new_quantity: 5,
      reason: 'Kiểm kê lại khay trứng',
    });
    expect(adjust.ok).toBe(true);
    if (adjust.ok) {
      expect(adjust.data.item.current_quantity).toBe(5);
      expect(adjust.data.transaction.action_type).toBe('Điều chỉnh');
      expect(adjust.data.transaction.change_quantity).toBe(3);
    }

    // 7. Move location updates area_type & location_id and rejects same location
    const moveSame = moveFoodLocation(db, { item_id: 10, new_location_id: 1 });
    expect(moveSame.ok).toBe(false);
    if (!moveSame.ok) expect(moveSame.error.code).toBe('VALIDATION_ERROR');

    const moveOther = moveFoodLocation(db, {
      item_id: 10, // currently loc 1 ('Trong tủ lạnh')
      new_location_id: 6, // loc 6 ('Ngoài tủ lạnh')
      reason: 'Chuyển tạm để rã bớt lạnh',
    });
    expect(moveOther.ok).toBe(true);
    if (moveOther.ok) {
      expect(moveOther.data.item.location_id).toBe(6);
      expect(moveOther.data.item.area_type).toBe('Ngoài tủ lạnh');
      expect(moveOther.data.transaction.action_type).toBe('Điều chỉnh');
    }
  });

  it('validates all 12 form fields, blocks duplicate food_code, flags duplicate food_name, and merges new lots', () => {
    const db = createInitialDatabaseState();

    // Validation errors across core fields
    const invalidErrors = validateFoodForm(
      db,
      makeValidFoodInput({
        food_code: ' ',
        food_name: '',
        category_id: 999,
        location_id: 999,
        unit_id: 999,
        quantity: 0,
        min_threshold: -1,
        import_date: '2026-11-20',
        expiry_date: '2026-11-15',
      }),
      'create',
    );
    expect(invalidErrors.food_code).toBeDefined();
    expect(invalidErrors.food_name).toBeDefined();
    expect(invalidErrors.category_id).toBeDefined();
    expect(invalidErrors.location_id).toBeDefined();
    expect(invalidErrors.unit_id).toBeDefined();
    expect(invalidErrors.quantity).toBeDefined();
    expect(invalidErrors.min_threshold).toBeDefined();
    expect(invalidErrors.expiry_date).toBe('Hạn sử dụng phải lớn hơn hoặc bằng ngày nhập.');

    // Duplicate food_code blocked
    const dupCode = createFoodItem(db, makeValidFoodInput({ food_code: 'TP001', food_name: 'Tên mới khác' }));
    expect(dupCode.ok).toBe(false);
    if (!dupCode.ok) {
      expect(dupCode.error.code).toBe('DUPLICATE_FOOD_CODE');
      expect(dupCode.error.field_errors?.food_code).toBeDefined();
    }

    // Duplicate food_name flagged cleanly
    const dupName = createFoodItem(
      db,
      makeValidFoodInput({ food_code: 'TP088', food_name: 'thịt ba chỉ heo' }),
    );
    expect(dupName.ok).toBe(false);
    if (!dupName.ok) {
      expect(dupName.error.code).toBe('DUPLICATE_FOOD_NAME');
      expect(dupName.error.duplicate_match?.name_conflict_food?.food_id).toBe(2);
    }

    // Batch merge onto existing food_id: 2 creates LO-017 without adding a duplicate food row
    const foodsBeforeMerge = db.foods.length;
    const merged = createFoodItem(
      db,
      makeValidFoodInput({
        food_code: 'TP088',
        food_name: 'Thịt ba chỉ heo',
        merge_into_food_id: 2,
        quantity: 0.9,
        expiry_date: '2026-11-18',
      }),
    );
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.data.merged_existing_food).toBe(true);
      expect(merged.data.food.food_id).toBe(2);
      expect(merged.data.item.item_code).toBe('LO-017');
      expect(merged.data.item.current_quantity).toBe(0.9);
    }
    expect(db.foods.length).toBe(foodsBeforeMerge);

    // Separate creation with force_create_separate_food creates a new food record
    const forced = createFoodItem(
      db,
      makeValidFoodInput({
        food_code: 'TP089',
        food_name: 'Thịt ba chỉ heo',
        force_create_separate_food: true,
      }),
    );
    expect(forced.ok).toBe(true);
    if (forced.ok) {
      expect(forced.data.merged_existing_food).toBe(false);
      expect(forced.data.item.item_code).toBe('LO-018');
      expect(db.foods.length).toBe(foodsBeforeMerge + 1);
    }
  });

  it('soft-deletes to Đã hủy preserving audit log history, filters by 5 criteria, and enforces FK constraints', () => {
    const db = createInitialDatabaseState();

    // Soft-delete LO-001 (Sữa tươi hết hạn, item_id 1, existing 1 tx #1)
    const txCountBefore = getAuditLogs(db, { item_id: 1 }).transactions.length;
    expect(txCountBefore).toBe(1);

    const cancelled = cancelFoodItem(db, {
      item_id: 1,
      reason: 'Sữa đã quá hạn 2 ngày, đem bỏ',
      actor_device: 'Desktop QA',
    });
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) {
      expect(cancelled.data.item.status).toBe('Đã hủy');
      expect(cancelled.data.item.current_quantity).toBe(0);
      expect(cancelled.data.transaction.action_type).toBe('Vứt hủy');
      expect(cancelled.data.transaction.change_quantity).toBe(-1);
    }
    const txAfter = getAuditLogs(db, { item_id: 1 }).transactions;
    expect(txAfter.length).toBe(2);
    expect(txAfter.map((t) => t.action_type)).toEqual(['Vứt hủy', 'Sử dụng']);

    // 5-criteria searchFoodItems filter:
    // 1) Diacritic-insensitive keyword
    const kwSearch = searchFoodItems(db, { keyword: 'sua tuoi' });
    expect(kwSearch.items.map((i) => i.item_code)).toEqual(['LO-001', 'LO-010']);

    // 2) Category + Area + Location + Stock + Expiry combined filter
    const combined = searchFoodItems(db, {
      category_id: 1, // Rau củ quả
      area_type: 'Trong tủ lạnh',
      location_id: 3, // Ngăn rau củ quả
      stock_status: 'Đang sử dụng',
      expiry_status: 'expiring_soon',
    });
    expect(combined.items.map((i) => i.item_code)).toEqual(['LO-003', 'LO-005', 'LO-006']);

    // Low stock filter ('Sắp hết' covers active lots <= min_threshold; 'Đã hết' covers LO-015)
    const lowStockSearch = searchFoodItems(db, { stock_status: 'Sắp hết' });
    expect(lowStockSearch.items.map((i) => i.item_code)).toEqual([
      'LO-007', // 2026-11-14
      'LO-011', // 2026-11-17
      'LO-014', // 2027-06-15
    ]);
    const outOfStockSearch = searchFoodItems(db, { stock_status: 'Đã hết' });
    expect(outOfStockSearch.items.map((i) => i.item_code)).toEqual(['LO-015']);

    // Deleting in-use Category / Unit / Location throws CONSTRAINT_IN_USE
    const delCat = deleteCategory(db, 1);
    expect(delCat.ok).toBe(false);
    if (!delCat.ok) {
      expect(delCat.error.code).toBe('CONSTRAINT_IN_USE');
      expect(delCat.error.referencing_count).toBe(4);
    }

    const delUnit = deleteUnit(db, 1);
    expect(delUnit.ok).toBe(false);
    if (!delUnit.ok) expect(delUnit.error.code).toBe('CONSTRAINT_IN_USE');

    const delLoc = deleteLocation(db, 1);
    expect(delLoc.ok).toBe(false);
    if (!delLoc.ok) expect(delLoc.error.code).toBe('CONSTRAINT_IN_USE');

    // Unused catalog items can be created and deleted cleanly
    const newCat = saveCategory(db, { category_name: 'Đồ ăn vặt' });
    const newUnit = saveUnit(db, { unit_name: 'túi zip' });
    const newLoc = saveLocation(db, { area_type: 'Ngoài tủ lạnh', location_name: 'Kệ gia vị' });
    expect(newCat.ok && newUnit.ok && newLoc.ok).toBe(true);
    if (newCat.ok && newUnit.ok && newLoc.ok) {
      expect(deleteCategory(db, newCat.data.category_id).ok).toBe(true);
      expect(deleteUnit(db, newUnit.data.unit_id).ok).toBe(true);
      expect(deleteLocation(db, newLoc.data.location_id).ok).toBe(true);
    }
  });

  it('returns structured AI scan fields for valid presets and AI_UNREADABLE fallback for blurry scans', () => {
    const presets = listAiScanPresets('2026-11-11');
    expect(presets.map((p) => p.preset_id)).toEqual([
      'preset-thit-ba-roi',
      'preset-sua-vinamilk',
      'preset-hoa-don-winmart',
      'preset-blurry-receipt',
    ]);

    const porkScan = runSimulatedAiScan({ preset_id: 'preset-thit-ba-roi' }, '2026-11-11');
    expect(porkScan.recognized).toBe(true);
    expect(porkScan.suggested_fields?.food_name).toBe('Thịt ba rọi heo');
    expect(porkScan.suggested_fields?.expiry_date).toBe('2026-11-15');

    const milkScan = runSimulatedAiScan({ preset_id: 'preset-sua-vinamilk' }, '2026-11-11');
    expect(milkScan.recognized).toBe(true);
    expect(milkScan.suggested_fields?.food_name).toBe('Sữa tươi thanh trùng Vinamilk');

    const blurryScan = runSimulatedAiScan({ preset_id: 'preset-blurry-receipt' }, '2026-11-11');
    expect(blurryScan.recognized).toBe(false);
    expect(blurryScan.error_message).toBeDefined();
  });

  it('rejects editing Đã hủy lots in updateFoodItem with VALIDATION_ERROR without mutating state', () => {
    const db = createInitialDatabaseState();

    // Seed cancelled lot LO-016 (item_id 16, food_id 15 'Nước ép cam Vfresh')
    const editSeedCancelled = updateFoodItem(
      db,
      16,
      makeValidFoodInput({
        food_code: 'TP015',
        food_name: 'Nước ép cam sửa trái phép',
        quantity: 3,
      }),
    );
    expect(editSeedCancelled.ok).toBe(false);
    if (!editSeedCancelled.ok) {
      expect(editSeedCancelled.error.code).toBe('VALIDATION_ERROR');
      expect(editSeedCancelled.error.message).toBe(
        'Lô thực phẩm đã thanh lý/vứt hủy, không thể chỉnh sửa hồ sơ hoặc thay đổi số lượng.',
      );
    }
    expect(db.food_items.find((i) => i.item_id === 16)?.status).toBe('Đã hủy');
    expect(db.food_items.find((i) => i.item_id === 16)?.current_quantity).toBe(0);
    expect(db.foods.find((f) => f.food_id === 15)?.food_name).toBe('Nước ép cam Vfresh');
    expect(db.inventory_transactions.length).toBe(14);

    // Newly cancelled active lot LO-001 (item_id 1) is also locked against edits
    const cancelled = cancelFoodItem(db, {
      item_id: 1,
      reason: 'Hết hạn sử dụng',
      actor_device: 'Desktop QA',
    });
    expect(cancelled.ok).toBe(true);

    const editNewlyCancelled = updateFoodItem(
      db,
      1,
      makeValidFoodInput({
        food_code: 'TP001',
        food_name: 'Sữa tươi thanh trùng Vinamilk',
        quantity: 2,
      }),
    );
    expect(editNewlyCancelled.ok).toBe(false);
    if (!editNewlyCancelled.ok) {
      expect(editNewlyCancelled.error.code).toBe('VALIDATION_ERROR');
    }
    expect(db.food_items.find((i) => i.item_id === 1)?.status).toBe('Đã hủy');
    expect(db.food_items.find((i) => i.item_id === 1)?.current_quantity).toBe(0);
    expect(db.inventory_transactions.length).toBe(15);
  });

  it('converts compatible units (g <-> kg, ml <-> lít) in cookRecipe atomically and matches focusLot bidirectionally in suggestRecipesForPantry', () => {
    const db = createInitialDatabaseState();

    // Add liquid items in lít (unit_id 3) and ml (unit_id 4) to cover all 4 conversion directions
    const brothCreated = createFoodItem(
      db,
      makeValidFoodInput({
        food_code: 'TP090',
        food_name: 'Nước dùng gà hầm',
        category_id: 6,
        location_id: 1,
        unit_id: 3,
        quantity: 1.5,
        min_threshold: 0.5,
        expiry_date: '2026-11-15',
      }),
    );
    const honeyCreated = createFoodItem(
      db,
      makeValidFoodInput({
        food_code: 'TP091',
        food_name: 'Mật ong hoa nhãn',
        category_id: 6,
        location_id: 6,
        unit_id: 4,
        quantity: 600,
        min_threshold: 100,
        expiry_date: '2026-11-16',
      }),
    );
    expect(brothCreated.ok && honeyCreated.ok).toBe(true);

    const recipeCreated = saveRecipe(db, {
      recipe_name: 'Thịt kho mật ong nước dùng',
      cook_time_minutes: 30,
      servings: 2,
      priority_hint: 'Kiểm thử quy đổi 4 chiều',
      ingredients: [
        { ingredient_id: 1, food_id: 2, ingredient_name: 'Thịt ba chỉ heo', quantity: 250, unit_name: 'g', is_essential: true },
        { ingredient_id: 2, food_id: 11, ingredient_name: 'Hành lá & Ngò rí', quantity: 0.02, unit_name: 'kg', is_essential: true },
        { ingredient_id: 3, food_id: 16, ingredient_name: 'Nước dùng gà hầm', quantity: 250, unit_name: 'ml', is_essential: true },
        { ingredient_id: 4, food_id: 17, ingredient_name: 'Mật ong hoa nhãn', quantity: 0.2, unit_name: 'lít', is_essential: true },
      ],
      steps: ['Ướp thịt và nấu chín.'],
    });
    expect(recipeCreated.ok).toBe(true);

    const suggestionsBeforeCook = suggestRecipesForPantry(db);
    const customMatch = suggestionsBeforeCook.find((s) => s.recipe.recipe_id === 8)!;
    expect(customMatch.ingredient_statuses.map((ing) => ing.available_unit_name)).toEqual([
      'kg',
      'g',
      'lít',
      'ml',
    ]);
    expect(customMatch.ingredient_statuses.map((ing) => ing.deduct_quantity_in_lot_unit)).toEqual([
      0.25,
      20,
      0.25,
      200,
    ]);
    expect(customMatch.ingredient_statuses.every((ing) => ing.unit_compatible === true)).toBe(true);

    const recipe7Missing = suggestionsBeforeCook.find((s) => s.recipe.recipe_id === 7)!;
    expect(recipe7Missing.ingredient_statuses[0].available_unit_name).toBeNull();

    // Cook recipe 8 and verify exact converted deductions
    const cookRes = cookRecipe(db, { recipe_id: 8, actor_device: 'Desktop QA' });
    expect(cookRes.ok).toBe(true);
    if (cookRes.ok) {
      expect(cookRes.data.deducted_count).toBe(4);
      expect(cookRes.data.skipped_missing).toBe(0);
    }
    expect(db.food_items.find((i) => i.item_id === 4)?.current_quantity).toBe(0.55); // 0.8 kg - 0.25 kg
    expect(db.food_items.find((i) => i.item_id === 11)?.current_quantity).toBe(30); // 50 g - 20 g
    expect(db.food_items.find((i) => i.item_id === 17)?.current_quantity).toBe(1.25); // 1.5 lít - 0.25 lít
    expect(db.food_items.find((i) => i.item_id === 18)?.current_quantity).toBe(400); // 600 ml - 200 ml
    expect(db.inventory_transactions.slice(-4).map((t) => t.change_quantity)).toEqual([
      -0.25,
      -20,
      -0.25,
      -200,
    ]);

    // Atomicity: incompatible second ingredient aborts without partial deduction of first ingredient
    const atomicDb = createInitialDatabaseState();
    saveRecipe(atomicDb, {
      recipe_name: 'Công thức lỗi đơn vị giữa chừng',
      cook_time_minutes: 10,
      servings: 1,
      priority_hint: 'Atomic check',
      ingredients: [
        { ingredient_id: 1, food_id: 2, ingredient_name: 'Thịt ba chỉ heo', quantity: 300, unit_name: 'g', is_essential: true },
        { ingredient_id: 2, food_id: 3, ingredient_name: 'Rau xà lách mỡ Đà Lạt', quantity: 150, unit_name: 'ml', is_essential: true },
      ],
      steps: ['Trộn đều'],
    });
    const atomicFail = cookRecipe(atomicDb, { recipe_id: 8 });
    expect(atomicFail.ok).toBe(false);
    if (!atomicFail.ok) {
      expect(atomicFail.error.code).toBe('VALIDATION_ERROR');
    }
    expect(atomicDb.food_items.find((i) => i.item_id === 4)?.current_quantity).toBe(0.8);
    expect(atomicDb.food_items.find((i) => i.item_id === 3)?.current_quantity).toBe(0.5);
    expect(atomicDb.inventory_transactions.length).toBe(14);

    // Bidirectional focusLot matching when recipe ingredients use food_id = null
    const focusDb = createInitialDatabaseState();
    saveRecipe(focusDb, {
      recipe_name: 'Cá hồi sốt cà chua bi Đà Lạt',
      cook_time_minutes: 15,
      servings: 2,
      priority_hint: 'Bidirectional matching check',
      ingredients: [
        {
          ingredient_id: 1,
          food_id: null,
          ingredient_name: 'Cà chua bi hữu cơ Đà Lạt loại 1',
          quantity: 100,
          unit_name: 'g',
          is_essential: true,
        },
        {
          ingredient_id: 2,
          food_id: null,
          ingredient_name: 'Cá hồi',
          quantity: 200,
          unit_name: 'g',
          is_essential: true,
        },
      ],
      steps: ['Áp chảo cá hồi với cà chua bi.'],
    });

    // Direction 1: ingredient name ('Cà chua bi hữu cơ Đà Lạt loại 1') contains focusLot food_name ('Cà chua bi hữu cơ')
    const byTomatoFocus = suggestRecipesForPantry(focusDb, 5);
    expect(byTomatoFocus.some((s) => s.recipe.recipe_id === 8)).toBe(true);
    const tomatoSuggestion = byTomatoFocus.find((s) => s.recipe.recipe_id === 8)!;
    expect(tomatoSuggestion.ingredient_statuses[0].available_unit_name).toBe('kg');
    expect(tomatoSuggestion.ingredient_statuses[0].deduct_quantity_in_lot_unit).toBe(0.1);

    // Direction 2: focusLot food_name ('Cá hồi Na Uy phi lê') contains ingredient name ('Cá hồi')
    const bySalmonFocus = suggestRecipesForPantry(focusDb, 12);
    expect(bySalmonFocus.map((s) => s.recipe.recipe_id)).toEqual([2, 8]);
  });

  it('evaluates identical clamped 60-day windows for KPI and daily_trend in aggregateAnalytics on > 60 day spans', () => {
    const db = createInitialDatabaseState();

    // Span 2026-08-01 .. 2026-11-11 is 103 days -> clamped to 60 days [2026-09-13 .. 2026-11-11].
    // Transactions before 2026-09-13 MUST be excluded from both KPI and daily_trend.
    db.inventory_transactions.push(
      {
        transaction_id: 15,
        item_id: 4,
        action_type: 'Sử dụng',
        change_quantity: -5,
        remaining_quantity: 0.8,
        reason: 'Ngoài cửa sổ 60 ngày',
        transaction_date: '2026-08-15 10:00:00',
        actor_device: 'Desktop Server',
      },
      {
        transaction_id: 16,
        item_id: 1,
        action_type: 'Vứt hủy',
        change_quantity: -10,
        remaining_quantity: 0,
        reason: 'Ngay trước mốc biên 2026-09-13',
        transaction_date: '2026-09-12 23:59:59',
        actor_device: 'Desktop Server',
      },
      {
        transaction_id: 17,
        item_id: 3,
        action_type: 'Sử dụng',
        change_quantity: -1.5,
        remaining_quantity: 0.5,
        reason: 'Đúng ngày biên đầu cửa sổ 60 ngày',
        transaction_date: '2026-09-13 08:00:00',
        actor_device: 'Mobile QA',
      },
    );

    const snapshot = aggregateAnalytics(db, {
      range_days: 'custom',
      start_date: '2026-08-01',
      end_date: '2026-11-11',
    });

    expect(snapshot.range_days).toBe(60);
    expect(snapshot.start_date).toBe('2026-09-13');
    expect(snapshot.end_date).toBe('2026-11-11');
    expect(snapshot.daily_trend.length).toBe(60);
    expect(snapshot.daily_trend[0].date).toBe('2026-09-13');
    expect(snapshot.daily_trend[0].used_quantity).toBe(1.5);
    expect(snapshot.daily_trend[59].date).toBe('2026-11-11');

    // Seed has 10 Sử dụng (37.5) + 1 Vứt hủy (1) + 2 Nhập thêm (3.5) + 1 Điều chỉnh = 14 tx inside window.
    // Plus 1 boundary Sử dụng (1.5) on 2026-09-13 -> 11 Sử dụng (39), 1 Vứt hủy (1), total 15 tx.
    expect(snapshot.kpi.used_transactions_in_range).toBe(11);
    expect(snapshot.kpi.wasted_transactions_in_range).toBe(1);
    expect(snapshot.kpi.consumption_efficiency_pct).toBe(98);

    const trendUsedSum = snapshot.daily_trend.reduce((sum, pt) => sum + pt.used_quantity, 0);
    const trendWasteSum = snapshot.daily_trend.reduce((sum, pt) => sum + pt.wasted_quantity, 0);
    const trendTxCount = snapshot.daily_trend.reduce((sum, pt) => sum + pt.transaction_count, 0);
    expect(trendUsedSum).toBe(39);
    expect(trendWasteSum).toBe(1);
    expect(trendTxCount).toBe(15);
  });
});

describe('Simulated Client–Server Protocol, Fault Injection & Offline Cache', () => {
  function createIsolatedPair(): {
    server: SimulatedServerNode;
    client: SimulatedClientTransport;
  } {
    const server = new SimulatedServerNode({
      persistToStorage: false,
      enableBroadcastChannel: false,
    });
    server.setSimulatedLatencyMs(0);
    const client = new SimulatedClientTransport({
      localServer: server,
      persistToStorage: false,
      enableBroadcastChannel: false,
      clientId: 'qa-mobile-1',
      deviceName: 'Mobile QA',
    });
    client.setSimulatedLatencyMs(0);
    return { server, client };
  }

  it('validates PING_HANDSHAKE address, PIN, and server-stopped states', async () => {
    const { server, client } = createIsolatedPair();

    // Wrong PIN
    const badPin = await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '0000' });
    expect(badPin.ok).toBe(false);
    if (!badPin.ok) {
      expect(badPin.error.code).toBe('INVALID_PAIRING_PIN');
      expect(badPin.error.message).toBe('Mã ghép nối (Pairing PIN) không chính xác.');
    }

    // Wrong IP/Port
    const badAddr = await client.connect({ ip: '10.0.0.99', port: 9999, pairing_pin: '4829' });
    expect(badAddr.ok).toBe(false);
    if (!badAddr.ok) expect(badAddr.error.code).toBe('INVALID_ADDRESS');

    // Server stopped
    server.setServerRunning(false);
    const stopped = await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });
    expect(stopped.ok).toBe(false);
    if (!stopped.ok) expect(stopped.error.code).toBe('SERVER_STOPPED');

    // Valid reconnect registers session
    server.setServerRunning(true);
    const ok = await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.effective_date).toBe('2026-11-11');
      expect(ok.data.client_session.status).toBe('Connected');
    }
    expect(server.getStatusSnapshot().connected_clients.some((c) => c.client_id === 'qa-mobile-1')).toBe(
      true,
    );

    client.dispose();
    server.dispose();
  });

  it('handles TIMEOUT, NETWORK_DROP, DB_ERROR, CONFLICT_STALE_STOCK, and AI_UNREADABLE without corrupting DB', async () => {
    const { server, client } = createIsolatedPair();
    await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });

    const beforeQty = (): number =>
      server.getDatabaseSnapshot().food_items.find((i) => i.item_id === 4)!.current_quantity;

    server.setForceNextError('TIMEOUT');
    const timeoutRes = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Timeout test',
    });
    expect(timeoutRes.ok).toBe(false);
    if (!timeoutRes.ok) expect(timeoutRes.error.code).toBe('TIMEOUT');
    expect(beforeQty()).toBe(0.8);

    server.setForceNextError('NETWORK_DROP');
    const dropRes = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Drop test',
    });
    expect(dropRes.ok).toBe(false);
    if (!dropRes.ok) expect(dropRes.error.code).toBe('NETWORK_DROP');
    expect(beforeQty()).toBe(0.8);

    server.setForceNextError('DB_ERROR');
    const dbErrRes = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'DB fault test',
    });
    expect(dbErrRes.ok).toBe(false);
    if (!dbErrRes.ok) expect(dbErrRes.error.code).toBe('DB_ERROR');
    expect(beforeQty()).toBe(0.8);

    // Sticky DB health outage blocks all client reads/writes until recovered
    server.setDbHealthy(false);
    const dbDownRead = await client.request('GET_FEFO_LIST', {});
    expect(dbDownRead.ok).toBe(false);
    if (!dbDownRead.ok) expect(dbDownRead.error.code).toBe('DB_ERROR');
    server.setDbHealthy(true);

    // Stale conflict injection
    server.setForceNextError('CONFLICT_STALE_STOCK');
    const conflictRes = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Conflict test',
    });
    expect(conflictRes.ok).toBe(false);
    if (!conflictRes.ok) {
      expect(conflictRes.error.code).toBe('CONFLICT_STALE_STOCK');
      expect(conflictRes.error.latest_quantity).toBe(0.8);
    }

    // Blurry AI image scan returns AI_UNREADABLE
    const aiFail = await client.request('SCAN_FOOD_IMAGE', { preset_id: 'preset-blurry-receipt' });
    expect(aiFail.ok).toBe(false);
    if (!aiFail.ok) expect(aiFail.error.code).toBe('AI_UNREADABLE');

    client.dispose();
    server.dispose();
  });

  it('preserves synced OFFLINE_CACHED read snapshots while blocking mutating actions offline', async () => {
    const { server, client } = createIsolatedPair();
    await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });

    const fefoSync = await client.request('GET_FEFO_LIST', {});
    const invSync = await client.request('SEARCH_FOOD_ITEMS', {});
    const recipesSync = await client.request('GET_RECIPES', {});
    expect(fefoSync.ok && invSync.ok && recipesSync.ok).toBe(true);

    // Drop network -> OFFLINE_CACHED preserves read cache
    client.setSimulatedNetworkOffline(true);
    const offlineSnap = client.getSnapshot();
    expect(offlineSnap.connection_state).toBe('OFFLINE_CACHED');
    expect(offlineSnap.cache.fefo_items.length).toBe(12);
    expect(offlineSnap.cache.inventory_items.length).toBe(16);
    expect(offlineSnap.cache.recipes.length).toBe(7);

    // Writes fail cleanly and never mutate the server database
    const itemsBefore = server.getDatabaseSnapshot().food_items.length;
    const offlineUse = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Offline write attempt',
    });
    expect(offlineUse.ok).toBe(false);
    if (!offlineUse.ok) expect(offlineUse.error.code).toBe('NETWORK_DROP');

    const offlineCreate = await client.request('CREATE_FOOD_ITEM', makeValidFoodInput());
    expect(offlineCreate.ok).toBe(false);
    expect(server.getDatabaseSnapshot().food_items.length).toBe(itemsBefore);
    expect(server.getDatabaseSnapshot().food_items.find((i) => i.item_id === 4)!.current_quantity).toBe(
      0.8,
    );

    client.dispose();
    server.dispose();
  });

  it('keeps CONFLICT_STALE_STOCK armed across read RPCs until USE_FOOD arrives and keeps COOK_RECIPE atomic on fault', async () => {
    const { server, client } = createIsolatedPair();
    await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });

    // 1. Server-armed CONFLICT_STALE_STOCK stays armed across read RPCs
    server.setForceNextError('CONFLICT_STALE_STOCK');

    const fefoRead = await client.request('GET_FEFO_LIST', {});
    expect(fefoRead.ok).toBe(true);
    expect(server.getStatusSnapshot().runtime.force_next_error).toBe('CONFLICT_STALE_STOCK');

    const detailRead = await client.request('GET_ITEM_DETAIL', { item_id: 4 });
    expect(detailRead.ok).toBe(true);
    expect(server.getStatusSnapshot().runtime.force_next_error).toBe('CONFLICT_STALE_STOCK');

    const searchRead = await client.request('SEARCH_FOOD_ITEMS', {});
    expect(searchRead.ok).toBe(true);
    expect(server.getStatusSnapshot().runtime.force_next_error).toBe('CONFLICT_STALE_STOCK');

    const useConflict = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Server conflict after reads',
    });
    expect(useConflict.ok).toBe(false);
    if (!useConflict.ok) {
      expect(useConflict.error.code).toBe('CONFLICT_STALE_STOCK');
      expect(useConflict.error.latest_quantity).toBe(0.8);
      expect(useConflict.error.unit_name).toBe('kg');
    }
    expect(server.getStatusSnapshot().runtime.force_next_error).toBe('NONE');
    expect(server.getDatabaseSnapshot().food_items.find((i) => i.item_id === 4)?.current_quantity).toBe(0.8);

    // 2. Client-override CONFLICT_STALE_STOCK also stays armed across read RPCs until USE_FOOD
    client.setClientFaultOverride('CONFLICT_STALE_STOCK');

    const clientFefo = await client.request('GET_FEFO_LIST', {});
    expect(clientFefo.ok).toBe(true);
    expect(client.getSnapshot().client_fault_override).toBe('CONFLICT_STALE_STOCK');

    const clientDetail = await client.request('GET_ITEM_DETAIL', { item_id: 4 });
    expect(clientDetail.ok).toBe(true);
    expect(client.getSnapshot().client_fault_override).toBe('CONFLICT_STALE_STOCK');

    const clientSearch = await client.request('SEARCH_FOOD_ITEMS', {});
    expect(clientSearch.ok).toBe(true);
    expect(client.getSnapshot().client_fault_override).toBe('CONFLICT_STALE_STOCK');

    const clientConflict = await client.request('USE_FOOD', {
      item_id: 4,
      quantity_used: 0.2,
      reason: 'Client override conflict after reads',
    });
    expect(clientConflict.ok).toBe(false);
    if (!clientConflict.ok) {
      expect(clientConflict.error.code).toBe('CONFLICT_STALE_STOCK');
      expect(clientConflict.error.latest_quantity).toBe(0.8);
      expect(clientConflict.error.unit_name).toBe('kg');
    }
    expect(client.getSnapshot().client_fault_override).toBe('NONE');
    expect(server.getDatabaseSnapshot().food_items.find((i) => i.item_id === 4)?.current_quantity).toBe(0.8);

    // 3. Faulted COOK_RECIPE leaves all ingredients and transactions untouched
    server.setForceNextError('DB_ERROR');
    const faultCook = await client.request('COOK_RECIPE', { recipe_id: 1 });
    expect(faultCook.ok).toBe(false);
    if (!faultCook.ok) {
      expect(faultCook.error.code).toBe('DB_ERROR');
    }
    expect(server.getDatabaseSnapshot().food_items.find((i) => i.item_id === 4)?.current_quantity).toBe(0.8);
    expect(server.getDatabaseSnapshot().food_items.find((i) => i.item_id === 11)?.current_quantity).toBe(50);
    expect(server.getDatabaseSnapshot().inventory_transactions.length).toBe(14);

    client.dispose();
    server.dispose();
  });

  it('caches audit_logs in ClientCachedReadSnapshot and formats packet timestamps using configured timezone', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T17:30:45.000Z'));

    const { server, client } = createIsolatedPair();
    try {
      await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });

      const auditRes = await client.request('GET_AUDIT_LOGS', {});
      expect(auditRes.ok).toBe(true);
      if (auditRes.ok) {
        expect(auditRes.data.transactions.length).toBe(14);
      }

      // 2026-11-11T17:30:45Z -> 2026-11-12 00:30:45 in Asia/Ho_Chi_Minh (UTC+7), not UTC
      const snapAfterAudit = client.getSnapshot();
      expect(snapAfterAudit.packet_logs[0].action).toBe('GET_AUDIT_LOGS');
      expect(snapAfterAudit.packet_logs[0].timestamp).toBe('2026-11-12 00:30:45');
      expect(snapAfterAudit.cache.audit_logs.length).toBe(14);
      expect(snapAfterAudit.cache.audit_logs[0].transaction_id).toBe(14);
      expect(snapAfterAudit.cache.audit_logs[0].item_code).toBe('LO-011');

      // Reconfiguring timezone to Asia/Tokyo (UTC+9) updates subsequent packet timestamps
      const tzUpdate = await client.request('UPDATE_SYSTEM_CONFIG', { timezone: 'Asia/Tokyo' });
      expect(tzUpdate.ok).toBe(true);
      await client.request('GET_FEFO_LIST', {});
      expect(client.getSnapshot().packet_logs[0].timestamp).toBe('2026-11-12 02:30:45');

      // Offline snapshot preserves cached audit_logs
      client.setSimulatedNetworkOffline(true);
      const offlineSnap = client.getSnapshot();
      expect(offlineSnap.connection_state).toBe('OFFLINE_CACHED');
      expect(offlineSnap.cache.audit_logs.length).toBe(14);
      expect(offlineSnap.cache.audit_logs[0].transaction_id).toBe(14);
    } finally {
      client.dispose();
      server.dispose();
      vi.useRealTimers();
    }
  });

  it('preserves full inventory_items and fefo_items offline cache when filtered SEARCH_FOOD_ITEMS or GET_FEFO_LIST queries run', async () => {
    const { server, client } = createIsolatedPair();
    try {
      await client.connect({ ip: '192.168.1.10', port: 8080, pairing_pin: '4829' });

      const fullFefo = await client.request('GET_FEFO_LIST', {});
      const fullSearch = await client.request('SEARCH_FOOD_ITEMS', {});
      expect(fullFefo.ok && fullSearch.ok).toBe(true);
      expect(client.getSnapshot().cache.fefo_items.length).toBe(12);
      expect(client.getSnapshot().cache.inventory_items.length).toBe(16);

      // Filtered keyword search returns only the 4 'Sữa' / 'Trứng & Sữa' lots, leaving full 16-item cache intact
      const filteredSearch = await client.request('SEARCH_FOOD_ITEMS', { keyword: 'Sữa' });
      expect(filteredSearch.ok).toBe(true);
      if (filteredSearch.ok) {
        expect(filteredSearch.data.items.length).toBe(4);
        expect(filteredSearch.data.items.map((item) => item.item_code).sort()).toEqual([
          'LO-001',
          'LO-007',
          'LO-009',
          'LO-010',
        ]);
      }
      expect(client.getSnapshot().cache.inventory_items.length).toBe(16);

      // Filtered priority FEFO returns only the 4 'Cao' lots, leaving full 12-item FEFO cache intact
      const filteredFefo = await client.request('GET_FEFO_LIST', { priority_level: 'Cao' });
      expect(filteredFefo.ok).toBe(true);
      if (filteredFefo.ok) {
        expect(filteredFefo.data.items.map((item) => item.item_code)).toEqual([
          'LO-003',
          'LO-004',
          'LO-005',
          'LO-006',
        ]);
      }
      expect(client.getSnapshot().cache.fefo_items.length).toBe(12);

      // Going offline still exposes the complete unfiltered inventory and FEFO caches
      client.setSimulatedNetworkOffline(true);
      const offlineSnap = client.getSnapshot();
      expect(offlineSnap.connection_state).toBe('OFFLINE_CACHED');
      expect(offlineSnap.cache.inventory_items.length).toBe(16);
      expect(offlineSnap.cache.inventory_items.some((item) => item.item_code === 'LO-003')).toBe(true);
      expect(offlineSnap.cache.inventory_items.some((item) => item.item_code === 'LO-016')).toBe(true);
      expect(offlineSnap.cache.fefo_items.length).toBe(12);
      expect(offlineSnap.cache.fefo_items.some((item) => item.item_code === 'LO-014')).toBe(true);
    } finally {
      client.dispose();
      server.dispose();
    }
  });
});
