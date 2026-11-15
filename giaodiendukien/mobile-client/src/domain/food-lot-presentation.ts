import {
  filterFoodLotViews,
  formatDaysRemainingLabel,
  formatIsoDateShort,
  formatSignedQuantity,
  getFefoPriorityBadgeKind,
  getLotStatusBadgeKind,
  getStockStatusBadgeKind,
  getTransactionBadgeKind,
  type FefoPriorityLevel,
  type FoodItemStatus,
  type FoodLotView,
  type FoodSearchFilter,
  type TransactionActionType,
} from '@food-mgmt/shared-sim';

export type MobileScreenId =
  | 'MOB-00'
  | 'MOB-01'
  | 'MOB-02'
  | 'MOB-03'
  | 'MOB-04'
  | 'MOB-05'
  | 'MOB-06'
  | 'MOB-07';

export { formatDaysRemainingLabel, formatIsoDateShort, formatSignedQuantity };

export function getExpiryBadgeClass(daysRemaining: number, warningThreshold: number): string {
  return `badge-${getLotStatusBadgeKind('Đang sử dụng', daysRemaining, warningThreshold)}`;
}

export function getFefoBadgeClass(priority: FefoPriorityLevel): string {
  return `badge-${getFefoPriorityBadgeKind(priority)}`;
}

export function getStockStatusBadgeClass(status: FoodItemStatus, isLowStock: boolean): string {
  return `badge-${getStockStatusBadgeKind(status, isLowStock)}`;
}

export function getStockStatusLabel(status: FoodItemStatus, isLowStock: boolean): string {
  if (status === 'Đã hủy') return 'Đã hủy';
  if (status === 'Đã hết') return 'Đã hết';
  if (isLowStock) return 'Sắp hết';
  return 'Đang sử dụng';
}

export function getTransactionBadgeClass(actionType: TransactionActionType): string {
  return `badge-${getTransactionBadgeKind(actionType)}`;
}

export function buildNextFoodCodeSuggestion(existingCodes: string[]): string {
  let maxNumber = 15;
  for (const code of existingCodes) {
    const match = /^TP(\d+)$/i.exec(code.trim());
    if (match) {
      const val = Number(match[1]);
      if (Number.isFinite(val) && val > maxNumber) {
        maxNumber = val;
      }
    }
  }
  return `TP${String(maxNumber + 1).padStart(3, '0')}`;
}

export function filterCachedFoodLots(
  items: FoodLotView[],
  filter: FoodSearchFilter,
  warningDaysThreshold = 3,
): FoodLotView[] {
  return filterFoodLotViews(items, filter, warningDaysThreshold);
}
