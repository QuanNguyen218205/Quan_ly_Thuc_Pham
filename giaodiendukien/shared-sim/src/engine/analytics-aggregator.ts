import {
  diffCalendarDays,
  extractDatePart,
  isValidIsoDate,
  roundStockQuantity,
  shiftIsoDate,
} from '../domain/calendar-date';
import type {
  AnalyticsSnapshot,
  AreaDistributionItem,
  AreaType,
  CategoryDistributionItem,
  DailyConsumptionPoint,
  HouseholdDatabaseState,
  LocationDistributionItem,
} from '../domain/food-entities';
import type { GetStatsPayload } from '../domain/protocol-contracts';
import { calculateAlertsSummary } from './alerts-calculator';
import { buildFoodLotViews, resolveEffectiveDate } from './fefo-recommender';

export function aggregateAnalytics(
  state: HouseholdDatabaseState,
  payload?: GetStatsPayload,
): AnalyticsSnapshot {
  const referenceDate = resolveEffectiveDate(state.system_config);

  let startDate: string;
  let endDate: string;
  let rangeDays: number;

  if (
    payload?.range_days === 'custom' &&
    payload.start_date &&
    payload.end_date &&
    isValidIsoDate(payload.start_date) &&
    isValidIsoDate(payload.end_date) &&
    payload.start_date <= payload.end_date
  ) {
    endDate = payload.end_date;
    const spanDays = diffCalendarDays(endDate, payload.start_date) + 1;
    rangeDays = Math.min(60, Math.max(1, spanDays));
    startDate = shiftIsoDate(endDate, -(rangeDays - 1));
  } else {
    rangeDays = payload?.range_days === 30 ? 30 : 7;
    endDate = referenceDate;
    startDate = shiftIsoDate(endDate, -(rangeDays - 1));
  }

  const allLots = buildFoodLotViews(state);
  const activeLots = allLots.filter((l) => l.status === 'Đang sử dụng');
  const alerts = calculateAlertsSummary(state);

  const totalActiveQty = roundStockQuantity(
    activeLots.reduce((sum, lot) => sum + lot.current_quantity, 0),
  );

  // Build daily trend buckets across [startDate .. endDate]
  const buckets = new Map<string, DailyConsumptionPoint>();
  for (let i = 0; i < rangeDays; i += 1) {
    const dateStr = shiftIsoDate(startDate, i);
    buckets.set(dateStr, {
      date: dateStr,
      label: `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`,
      used_quantity: 0,
      restocked_quantity: 0,
      wasted_quantity: 0,
      transaction_count: 0,
    });
  }

  let usedTxInRange = 0;
  let wastedTxInRange = 0;
  let totalUsedQtyInRange = 0;
  let totalWastedQtyInRange = 0;

  for (const tx of state.inventory_transactions) {
    const txDate = extractDatePart(tx.transaction_date);
    if (txDate < startDate || txDate > endDate) {
      continue;
    }

    const bucket = buckets.get(txDate);
    if (bucket) {
      bucket.transaction_count += 1;
      if (tx.action_type === 'Sử dụng') {
        const qty = Math.abs(tx.change_quantity);
        bucket.used_quantity = roundStockQuantity(bucket.used_quantity + qty);
      } else if (tx.action_type === 'Nhập thêm') {
        const qty = Math.abs(tx.change_quantity);
        bucket.restocked_quantity = roundStockQuantity(bucket.restocked_quantity + qty);
      } else if (tx.action_type === 'Vứt hủy') {
        const qty = Math.abs(tx.change_quantity);
        bucket.wasted_quantity = roundStockQuantity(bucket.wasted_quantity + qty);
      }
    }

    if (tx.action_type === 'Sử dụng') {
      usedTxInRange += 1;
      totalUsedQtyInRange += Math.abs(tx.change_quantity);
    } else if (tx.action_type === 'Vứt hủy') {
      wastedTxInRange += 1;
      totalWastedQtyInRange += Math.abs(tx.change_quantity);
    }
  }

  const totalConsumedPlusWaste = totalUsedQtyInRange + totalWastedQtyInRange;
  const consumptionEfficiencyPct =
    totalConsumedPlusWaste > 0
      ? Math.round((totalUsedQtyInRange / totalConsumedPlusWaste) * 100)
      : 100;

  // Area distribution (Trong tủ lạnh vs Ngoài tủ lạnh)
  const areas: AreaType[] = ['Trong tủ lạnh', 'Ngoài tủ lạnh'];
  const activeLotTotal = activeLots.length;
  const areaDistribution: AreaDistributionItem[] = areas.map((area) => {
    const matching = activeLots.filter((l) => l.area_type === area);
    return {
      area_type: area,
      lot_count: matching.length,
      percentage: activeLotTotal > 0 ? Math.round((matching.length / activeLotTotal) * 100) : 0,
      expiring_or_expired_count: matching.filter((l) => l.is_expired || l.is_expiring_soon).length,
      low_stock_count: matching.filter((l) => l.is_low_stock).length,
    };
  });

  // Location distribution
  const locationDistribution: LocationDistributionItem[] = state.storage_locations.map((loc) => {
    const matching = activeLots.filter((l) => l.location_id === loc.location_id);
    return {
      location_id: loc.location_id,
      area_type: loc.area_type,
      location_name: loc.location_name,
      lot_count: matching.length,
      expiring_or_expired_count: matching.filter((l) => l.is_expired || l.is_expiring_soon).length,
    };
  });

  // Category distribution
  const categoryDistribution: CategoryDistributionItem[] = state.categories.map((cat) => {
    const count = activeLots.filter((l) => l.category_id === cat.category_id).length;
    return {
      category_id: cat.category_id,
      category_name: cat.category_name,
      lot_count: count,
      percentage: activeLotTotal > 0 ? Math.round((count / activeLotTotal) * 100) : 0,
    };
  });

  return {
    range_days: rangeDays,
    start_date: startDate,
    end_date: endDate,
    reference_date: referenceDate,
    kpi: {
      active_lot_count: activeLots.length,
      total_managed_lot_count: allLots.length,
      total_active_quantity_sum: totalActiveQty,
      urgent_expiring_count: alerts.total_expiry_alerts,
      expired_count: alerts.expired_items.length,
      low_stock_count: alerts.total_stock_alerts,
      used_transactions_in_range: usedTxInRange,
      wasted_transactions_in_range: wastedTxInRange,
      consumption_efficiency_pct: consumptionEfficiencyPct,
    },
    daily_trend: Array.from(buckets.values()),
    area_distribution: areaDistribution,
    location_distribution: locationDistribution,
    category_distribution: categoryDistribution,
  };
}
