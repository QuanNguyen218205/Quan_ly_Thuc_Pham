import { normalizeVietnameseSearchText, roundConvertedQuantity } from './calendar-date';
import type {
  AreaType,
  FefoPriorityLevel,
  FoodItemStatus,
  FoodLotView,
  FoodSearchFilter,
  TransactionActionType,
} from './food-entities';

export type PantryBadgeKind = 'fresh' | 'urgent' | 'expired' | 'empty' | 'cancelled' | 'info';

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = roundConvertedQuantity(value);
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(rounded);
}

export function formatDaysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `Quá hạn ${Math.abs(daysRemaining)} ngày`;
  }
  if (daysRemaining === 0) {
    return 'Hết hạn hôm nay';
  }
  if (daysRemaining === 1) {
    return 'Còn 1 ngày';
  }
  return `Còn ${daysRemaining} ngày`;
}

export function formatSignedQuantity(change: number, unitName?: string): string {
  const formatted = formatQuantity(Math.abs(change));
  const signed = change > 0 ? `+${formatted}` : change < 0 ? `-${formatted}` : '0';
  return unitName ? `${signed} ${unitName}` : signed;
}

export function formatIsoDateShort(isoDate: string): string {
  const clean = isoDate.trim();
  if (clean.length < 10) return clean;
  const parts = clean.slice(0, 10).split('-');
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getLotStatusBadgeKind(
  status: FoodItemStatus,
  daysRemaining?: number,
  warningDaysThreshold = 3,
): PantryBadgeKind {
  if (status === 'Đã hủy') return 'cancelled';
  if (status === 'Đã hết') return 'empty';
  if (daysRemaining !== undefined) {
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= warningDaysThreshold) return 'urgent';
  }
  return 'fresh';
}

export function getStockStatusBadgeKind(
  status: FoodItemStatus,
  isLowStock: boolean,
): PantryBadgeKind {
  if (status === 'Đã hủy') return 'cancelled';
  if (status === 'Đã hết') return 'empty';
  if (isLowStock) return 'urgent';
  return 'fresh';
}

export function getFefoPriorityBadgeKind(priority: FefoPriorityLevel | null): PantryBadgeKind {
  if (priority === 'Cao') return 'expired';
  if (priority === 'Trung bình') return 'urgent';
  if (priority === 'Thấp') return 'fresh';
  return 'empty';
}

export function getTransactionBadgeKind(actionType: TransactionActionType): PantryBadgeKind {
  switch (actionType) {
    case 'Nhập thêm':
      return 'fresh';
    case 'Sử dụng':
      return 'info';
    case 'Điều chỉnh':
      return 'urgent';
    case 'Vứt hủy':
      return 'expired';
  }
}

export function getAreaShortLabel(area: AreaType): string {
  return area === 'Trong tủ lạnh' ? 'Tủ lạnh' : 'Ngoài tủ';
}

export function getFoodInitials(foodName: string): string {
  const words = foodName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function filterFoodLotViews(
  lots: FoodLotView[],
  filter?: FoodSearchFilter,
  warningDaysThreshold = 3,
): FoodLotView[] {
  let items = [...lots];

  const keywordNormalized = filter?.keyword ? normalizeVietnameseSearchText(filter.keyword) : '';
  if (keywordNormalized) {
    items = items.filter((lot) => {
      const haystacks = [
        lot.food_name,
        lot.food_code,
        lot.item_code,
        lot.category_name,
        lot.brand ?? '',
        lot.location_name,
      ];
      return haystacks.some((text) =>
        normalizeVietnameseSearchText(text).includes(keywordNormalized),
      );
    });
  }

  if (filter?.category_id !== undefined && filter.category_id !== 'all') {
    items = items.filter((lot) => lot.category_id === filter.category_id);
  }

  if (filter?.area_type !== undefined && filter.area_type !== 'all') {
    items = items.filter((lot) => lot.area_type === filter.area_type);
  }

  if (filter?.location_id !== undefined && filter.location_id !== 'all') {
    items = items.filter((lot) => lot.location_id === filter.location_id);
  }

  if (filter?.stock_status !== undefined && filter.stock_status !== 'all') {
    if (filter.stock_status === 'Sắp hết') {
      items = items.filter((lot) => lot.is_low_stock);
    } else {
      items = items.filter((lot) => lot.status === filter.stock_status);
    }
  }

  if (filter?.expiry_status !== undefined && filter.expiry_status !== 'all') {
    if (filter.expiry_status === 'expired') {
      items = items.filter((lot) => lot.status === 'Đang sử dụng' && lot.days_remaining < 0);
    } else if (filter.expiry_status === 'expiring_soon') {
      items = items.filter(
        (lot) =>
          lot.status === 'Đang sử dụng' &&
          lot.days_remaining >= 0 &&
          lot.days_remaining <= warningDaysThreshold,
      );
    } else if (filter.expiry_status === 'fresh') {
      items = items.filter(
        (lot) => lot.status === 'Đang sử dụng' && lot.days_remaining > warningDaysThreshold,
      );
    }
  }

  const sortBy = filter?.sort_by ?? 'expiry_date';
  const sortDir = filter?.sort_dir ?? 'asc';
  const direction = sortDir === 'desc' ? -1 : 1;

  items.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'food_name':
        cmp = a.food_name.localeCompare(b.food_name, 'vi');
        break;
      case 'current_quantity':
        cmp = a.current_quantity - b.current_quantity;
        break;
      case 'import_date':
        cmp = a.import_date.localeCompare(b.import_date);
        break;
      case 'updated_at':
        cmp = a.updated_at.localeCompare(b.updated_at);
        break;
      case 'expiry_date':
      default:
        cmp = a.expiry_date.localeCompare(b.expiry_date);
        break;
    }
    if (cmp !== 0) return cmp * direction;
    return a.item_id - b.item_id;
  });

  return items;
}
