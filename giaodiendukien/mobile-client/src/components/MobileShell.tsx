import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Flame,
  Package,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  WifiOff,
  X,
} from 'lucide-react';
import type { ClientConnectionState } from '@food-mgmt/shared-sim';
import { formatIsoDateShort, type MobileScreenId } from '../domain/food-lot-presentation';

interface MobileShellProps {
  currentScreen: MobileScreenId;
  hasEnteredShell: boolean;
  canNavigateBack: boolean;
  connectionState: ClientConnectionState;
  simulatedOffline: boolean;
  effectiveDate: string;
  lastSyncedAt: string | null;
  lastErrorMessage: string | null;
  isSyncing: boolean;
  alertBadgeCount: number;
  toastMessage: string | null;
  fabMenuOpen?: boolean;
  onFabMenuOpenChange?: (open: boolean) => void;
  onDismissToast: () => void;
  onBack: () => void;
  onSync: () => void;
  onRetryConnection: () => void;
  onOpenConnectScreen: () => void;
  onSelectTab: (tab: 'MOB-01' | 'MOB-02' | 'MOB-05' | 'MOB-07') => void;
  onOpenManualAdd: () => void;
  onOpenAiScan: () => void;
  children: ReactNode;
}

const SCREEN_TITLES: Record<MobileScreenId, string> = {
  'MOB-00': 'Kết nối Máy chủ',
  'MOB-01': 'Hôm nay dùng gì?',
  'MOB-02': 'Kho Thực phẩm',
  'MOB-03': 'Chi tiết Lô hàng',
  'MOB-04': 'Thực đơn Gợi ý',
  'MOB-05': 'Cảnh báo & Cần mua',
  'MOB-06': 'Hồ sơ Thực phẩm',
  'MOB-07': 'Thống kê & Kết nối',
};

export function MobileShell({
  currentScreen,
  hasEnteredShell,
  canNavigateBack,
  connectionState,
  simulatedOffline,
  effectiveDate,
  lastSyncedAt,
  lastErrorMessage,
  isSyncing,
  alertBadgeCount,
  toastMessage,
  fabMenuOpen: controlledFabMenuOpen,
  onFabMenuOpenChange,
  onDismissToast,
  onBack,
  onSync,
  onRetryConnection,
  onOpenConnectScreen,
  onSelectTab,
  onOpenManualAdd,
  onOpenAiScan,
  children,
}: MobileShellProps) {
  const [internalFabMenuOpen, setInternalFabMenuOpen] = useState(false);
  const fabContainerRef = useRef<HTMLDivElement | null>(null);

  const fabMenuOpen =
    controlledFabMenuOpen !== undefined ? controlledFabMenuOpen : internalFabMenuOpen;
  const setFabMenuOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(fabMenuOpen) : next;
    if (controlledFabMenuOpen === undefined) {
      setInternalFabMenuOpen(resolved);
    }
    onFabMenuOpenChange?.(resolved);
  };

  useEffect(() => {
    if (!fabMenuOpen) return;
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (
        fabContainerRef.current &&
        !fabContainerRef.current.contains(event.target as Node)
      ) {
        if (controlledFabMenuOpen === undefined) {
          setInternalFabMenuOpen(false);
        }
        onFabMenuOpenChange?.(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [controlledFabMenuOpen, fabMenuOpen, onFabMenuOpenChange]);

  const isMainTab =
    currentScreen === 'MOB-01' ||
    currentScreen === 'MOB-02' ||
    currentScreen === 'MOB-05' ||
    currentScreen === 'MOB-07';

  const isConnected = connectionState === 'CONNECTED' && !simulatedOffline;
  const isConnecting = connectionState === 'CONNECTING';
  const showBackButton =
    canNavigateBack &&
    (currentScreen === 'MOB-03' ||
      currentScreen === 'MOB-04' ||
      currentScreen === 'MOB-06' ||
      (currentScreen === 'MOB-00' && hasEnteredShell));

  const showBottomNav = hasEnteredShell && isMainTab;
  const showFab = hasEnteredShell && (currentScreen === 'MOB-01' || currentScreen === 'MOB-02');
  const showOfflineBanner = hasEnteredShell && currentScreen !== 'MOB-00' && !isConnected;

  const connLabel = isConnecting
    ? 'Đang kết nối'
    : isConnected
      ? 'LAN OK'
      : 'Ngoại tuyến';

  const connClass = isConnecting
    ? 'mob-conn-pill mob-conn-pill-connecting'
    : isConnected
      ? 'mob-conn-pill mob-conn-pill-online'
      : 'mob-conn-pill mob-conn-pill-offline';

  return (
    <div className="mob-viewport-stage">
      <div className="mob-phone-frame">
        {/* Top App Bar */}
        <header className="mob-topbar">
          <div className="mob-topbar-left">
            {showBackButton && (
              <button
                type="button"
                className="mob-icon-btn"
                aria-label="Quay lại"
                data-testid="mob-topbar-back"
                onClick={() => {
                  setFabMenuOpen(false);
                  onBack();
                }}
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
            )}
            <div className="mob-topbar-title-wrap">
              <h1 className="mob-topbar-title">{SCREEN_TITLES[currentScreen]}</h1>
              <div className="mob-topbar-subrow">
                <span className="mob-proto-tag">Prototype · Giả lập</span>
                <span className="mob-date-pill mono-num" data-testid="mob-active-date">
                  {formatIsoDateShort(effectiveDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="mob-topbar-right">
            <button
              type="button"
              className={connClass}
              data-testid="mob-connection-pill"
              onClick={onOpenConnectScreen}
              title="Xem hoặc cấu hình kết nối Server"
            >
              <span className="mob-conn-dot" aria-hidden="true" />
              <span>{connLabel}</span>
            </button>

            {hasEnteredShell && currentScreen !== 'MOB-00' && (
              <button
                type="button"
                className="mob-icon-btn"
                aria-label="Đồng bộ dữ liệu từ Server"
                data-testid="mob-sync-btn"
                disabled={isSyncing}
                onClick={onSync}
              >
                <RefreshCw
                  size={18}
                  className={isSyncing ? 'mob-spin-icon' : undefined}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </header>

        {/* Contextual Offline Read-Only Banner (Section 6.4) */}
        {showOfflineBanner && (
          <div
            className="offline-banner mob-offline-banner-wrap"
            role="status"
            data-testid="mob-offline-banner"
          >
            <div className="mob-offline-banner-text">
              <WifiOff size={16} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700 }}>Chế độ Offline (Chỉ xem)</div>
                <div className="t-micro" style={{ color: 'inherit' }}>
                  {lastErrorMessage ??
                    'Mất kết nối Desktop Server — khóa các thao tác ghi để tránh sai số tồn kho.'}
                  {lastSyncedAt ? ` (Đồng bộ lúc ${lastSyncedAt.slice(11, 19)})` : ''}
                </div>
              </div>
            </div>
            <div className="mob-offline-banner-actions">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 36, padding: '0 10px', fontSize: 12 }}
                data-testid="mob-offline-retry-btn"
                onClick={onRetryConnection}
              >
                Thử lại
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 36, padding: '0 8px', fontSize: 12, color: 'inherit' }}
                data-testid="mob-offline-config-btn"
                onClick={onOpenConnectScreen}
              >
                Cấu hình
              </button>
            </div>
          </div>
        )}

        {/* Active Screen Content */}
        {children}

        {/* FAB + Quick Add Menu on MOB-01 & MOB-02 */}
        {showFab && (
          <div ref={fabContainerRef}>
            {fabMenuOpen && isConnected && (
              <div className="mob-fab-menu" role="menu" aria-label="Tác vụ thêm thực phẩm">
                <button
                  type="button"
                  role="menuitem"
                  className="mob-fab-menu-item"
                  data-testid="mob-fab-ai-scan"
                  onClick={() => {
                    setFabMenuOpen(false);
                    onOpenAiScan();
                  }}
                >
                  <Camera size={16} aria-hidden="true" />
                  <span>Quét nhãn / hóa đơn AI</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="mob-fab-menu-item"
                  data-testid="mob-fab-manual-add"
                  onClick={() => {
                    setFabMenuOpen(false);
                    onOpenManualAdd();
                  }}
                >
                  <Plus size={16} aria-hidden="true" />
                  <span>Nhập thực phẩm mới</span>
                </button>
              </div>
            )}

            <button
              type="button"
              className="fab-btn"
              aria-label={fabMenuOpen ? 'Đóng menu thêm' : 'Thêm thực phẩm mới'}
              aria-expanded={fabMenuOpen}
              disabled={!isConnected}
              data-testid="mob-fab-add"
              onClick={() => setFabMenuOpen((prev) => !prev)}
              title={
                isConnected
                  ? 'Thêm thực phẩm hoặc Quét AI'
                  : 'Cần kết nối Desktop Server để thêm mới'
              }
            >
              {fabMenuOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <Plus size={24} aria-hidden="true" />
              )}
            </button>
          </div>
        )}

        {/* Toast feedback */}
        {toastMessage && (
          <div className="mob-toast" role="status" data-testid="mob-toast">
            <span>{toastMessage}</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ minHeight: 32, padding: '0 8px', color: 'var(--text-inverse)' }}
              onClick={onDismissToast}
              aria-label="Đóng thông báo"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Fixed 4-Tab Bottom Navigation Bar */}
        {showBottomNav && (
          <nav
            className="mob-bottom-nav"
            aria-label="Điều hướng chính Mobile"
            data-testid="mob-bottom-nav"
          >
            <button
              type="button"
              className={`mob-nav-tab ${currentScreen === 'MOB-01' ? 'mob-nav-tab-active' : ''}`}
              data-testid="mob-tab-MOB-01"
              aria-current={currentScreen === 'MOB-01' ? 'page' : undefined}
              onClick={() => {
                setFabMenuOpen(false);
                onSelectTab('MOB-01');
              }}
            >
              <span className="mob-nav-icon-wrap">
                <Flame size={20} aria-hidden="true" />
              </span>
              <span>Hôm nay</span>
            </button>

            <button
              type="button"
              className={`mob-nav-tab ${currentScreen === 'MOB-02' ? 'mob-nav-tab-active' : ''}`}
              data-testid="mob-tab-MOB-02"
              aria-current={currentScreen === 'MOB-02' ? 'page' : undefined}
              onClick={() => {
                setFabMenuOpen(false);
                onSelectTab('MOB-02');
              }}
            >
              <span className="mob-nav-icon-wrap">
                <Package size={20} aria-hidden="true" />
              </span>
              <span>Kho</span>
            </button>

            <button
              type="button"
              className={`mob-nav-tab ${currentScreen === 'MOB-05' ? 'mob-nav-tab-active' : ''}`}
              data-testid="mob-tab-MOB-05"
              aria-current={currentScreen === 'MOB-05' ? 'page' : undefined}
              onClick={() => {
                setFabMenuOpen(false);
                onSelectTab('MOB-05');
              }}
            >
              <span className="mob-nav-icon-wrap">
                <AlertTriangle size={20} aria-hidden="true" />
                {alertBadgeCount > 0 && (
                  <span className="mob-nav-badge mono-num" data-testid="mob-alerts-badge">
                    {alertBadgeCount > 99 ? '99+' : alertBadgeCount}
                  </span>
                )}
              </span>
              <span>Cảnh báo</span>
            </button>

            <button
              type="button"
              className={`mob-nav-tab ${currentScreen === 'MOB-07' ? 'mob-nav-tab-active' : ''}`}
              data-testid="mob-tab-MOB-07"
              aria-current={currentScreen === 'MOB-07' ? 'page' : undefined}
              onClick={() => {
                setFabMenuOpen(false);
                onSelectTab('MOB-07');
              }}
            >
              <span className="mob-nav-icon-wrap">
                <SlidersHorizontal size={20} aria-hidden="true" />
              </span>
              <span>Khác</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
