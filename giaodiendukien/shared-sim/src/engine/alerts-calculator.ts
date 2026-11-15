import { formatIsoTimestampInTimezone, roundStockQuantity } from '../domain/calendar-date';
import type {
  AlertsSummary,
  ExpiryAlertItem,
  HouseholdDatabaseState,
  StockAlertItem,
} from '../domain/food-entities';
import { buildFoodLotViews, resolveEffectiveDate } from './fefo-recommender';

export function calculateAlertsSummary(state: HouseholdDatabaseState): AlertsSummary {
  const referenceDate = resolveEffectiveDate(state.system_config);
  const lots = buildFoodLotViews(state);

  const expiredItems: ExpiryAlertItem[] = [];
  const expiringSoonItems: ExpiryAlertItem[] = [];
  const lowStockItems: StockAlertItem[] = [];

  // Track foods that already have a healthy active batch above min_threshold
  const foodHasHealthyActiveLot = new Set<number>();
  for (const lot of lots) {
    if (lot.status === 'Đang sử dụng' && lot.current_quantity > lot.min_threshold) {
      foodHasHealthyActiveLot.add(lot.food_id);
    }
  }

  for (const lot of lots) {
    if (lot.status === 'Đang sử dụng') {
      if (lot.days_remaining < 0) {
        expiredItems.push({
          item_id: lot.item_id,
          food_id: lot.food_id,
          food_code: lot.food_code,
          item_code: lot.item_code,
          food_name: lot.food_name,
          category_name: lot.category_name,
          area_type: lot.area_type,
          location_name: lot.location_name,
          current_quantity: lot.current_quantity,
          min_threshold: lot.min_threshold,
          unit_name: lot.unit_name,
          expiry_date: lot.expiry_date,
          days_remaining: lot.days_remaining,
          alert_type: 'CẢNH BÁO: ĐÃ HẾT HẠN',
          is_expired: true,
        });
      } else if (lot.days_remaining <= state.system_config.warning_days_threshold) {
        expiringSoonItems.push({
          item_id: lot.item_id,
          food_id: lot.food_id,
          food_code: lot.food_code,
          item_code: lot.item_code,
          food_name: lot.food_name,
          category_name: lot.category_name,
          area_type: lot.area_type,
          location_name: lot.location_name,
          current_quantity: lot.current_quantity,
          min_threshold: lot.min_threshold,
          unit_name: lot.unit_name,
          expiry_date: lot.expiry_date,
          days_remaining: lot.days_remaining,
          alert_type: 'CẢNH BÁO: SẮP HẾT HẠN',
          is_expired: false,
        });
      }

      if (lot.current_quantity <= lot.min_threshold) {
        const targetStock = Math.max(lot.min_threshold * 2, lot.min_threshold + 1);
        lowStockItems.push({
          item_id: lot.item_id,
          food_id: lot.food_id,
          food_code: lot.food_code,
          item_code: lot.item_code,
          food_name: lot.food_name,
          category_name: lot.category_name,
          area_type: lot.area_type,
          location_name: lot.location_name,
          current_quantity: lot.current_quantity,
          min_threshold: lot.min_threshold,
          suggested_buy_quantity: Math.max(1, roundStockQuantity(targetStock - lot.current_quantity)),
          unit_name: lot.unit_name,
          status: lot.status,
          expiry_date: lot.expiry_date,
          alert_type: 'CẢNH BÁO: SẮP HẾT TỒN KHO',
        });
      }
    } else if (lot.status === 'Đã hết' && !foodHasHealthyActiveLot.has(lot.food_id)) {
      const targetStock = Math.max(lot.min_threshold * 2, lot.min_threshold);
      lowStockItems.push({
        item_id: lot.item_id,
        food_id: lot.food_id,
        food_code: lot.food_code,
        item_code: lot.item_code,
        food_name: lot.food_name,
        category_name: lot.category_name,
        area_type: lot.area_type,
        location_name: lot.location_name,
        current_quantity: lot.current_quantity,
        min_threshold: lot.min_threshold,
        suggested_buy_quantity: Math.max(1, roundStockQuantity(targetStock)),
        unit_name: lot.unit_name,
        status: lot.status,
        expiry_date: lot.expiry_date,
        alert_type: 'CẢNH BÁO: SẮP HẾT TỒN KHO',
      });
    }
  }

  expiredItems.sort((a, b) => a.days_remaining - b.days_remaining || a.item_id - b.item_id);
  expiringSoonItems.sort((a, b) => a.days_remaining - b.days_remaining || a.item_id - b.item_id);
  lowStockItems.sort((a, b) => a.current_quantity - b.current_quantity || a.item_id - b.item_id);

  const uniqueItemIds = new Set<number>([
    ...expiredItems.map((i) => i.item_id),
    ...expiringSoonItems.map((i) => i.item_id),
    ...lowStockItems.map((i) => i.item_id),
  ]);

  const totalExpiryAlerts = expiredItems.length + expiringSoonItems.length;
  const totalStockAlerts = lowStockItems.length;

  return {
    expired_items: expiredItems,
    expiring_soon_items: expiringSoonItems,
    low_stock_items: lowStockItems,
    total_expiry_alerts: totalExpiryAlerts,
    total_stock_alerts: totalStockAlerts,
    unique_alert_item_count: uniqueItemIds.size,
    total_alert_badge_count: uniqueItemIds.size,
    reference_date: referenceDate,
    scanned_at: formatIsoTimestampInTimezone(new Date(), state.system_config.timezone),
  };
}
