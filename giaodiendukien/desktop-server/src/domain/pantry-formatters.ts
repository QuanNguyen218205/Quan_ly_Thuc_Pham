import {
  formatDaysRemainingLabel,
  formatQuantity,
  formatSignedQuantity,
  getAreaShortLabel,
  getFefoPriorityBadgeKind,
  getFoodInitials,
  getLotStatusBadgeKind,
  getTransactionBadgeKind,
  type FefoPriorityLevel,
  type FoodItemStatus,
  type PantryBadgeKind,
  type TransactionActionType,
} from '@food-mgmt/shared-sim';

export {
  formatDaysRemainingLabel,
  formatQuantity,
  formatSignedQuantity,
  getAreaShortLabel,
  getFoodInitials,
};

function badgeClassFromKind(kind: PantryBadgeKind): string {
  return `badge badge-${kind}`;
}

export function getStatusBadgeClass(
  status: FoodItemStatus,
  daysRemaining?: number,
  warningDays = 3,
): string {
  return badgeClassFromKind(getLotStatusBadgeKind(status, daysRemaining, warningDays));
}

export function getPriorityBadgeClass(priority: FefoPriorityLevel | null): string {
  return badgeClassFromKind(getFefoPriorityBadgeKind(priority));
}

export function getTransactionBadgeClass(actionType: TransactionActionType): string {
  return badgeClassFromKind(getTransactionBadgeKind(actionType));
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
