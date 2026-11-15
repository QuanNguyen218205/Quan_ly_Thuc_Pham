import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  ClipboardCopy,
  PlusCircle,
  Printer,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { AlertsSummary, FoodLotView } from '@food-mgmt/shared-sim';
import type { AlertsTabId } from '../state/useDesktopServer';
import {
  copyTextToClipboard,
  formatDaysRemainingLabel,
  formatQuantity,
} from '../domain/pantry-formatters';

interface AlertsCenterScreenProps {
  alerts: AlertsSummary;
  activeTab: AlertsTabId;
  allLots: FoodLotView[];
  dbHealthy: boolean;
  onChangeTab: (tab: AlertsTabId) => void;
  onManualScan: () => Promise<unknown>;
  onOpenUseModal: (lot: FoodLotView) => void;
  onOpenRestockModal: (lot: FoodLotView, suggestedQty: number) => void;
  onOpenCreateLot: () => void;
  onOpenLiquidateModal: (lot: FoodLotView) => void;
  onOpenRecipeModal: (itemId: number) => void;
  onOpenDrawer: (itemId: number) => void;
  onNotify: (kind: 'success' | 'error' | 'info', title: string, detail?: string) => void;
}

interface ShoppingGroup {
  food_id: number;
  food_code: string;
  food_name: string;
  category_name: string;
  unit_name: string;
  current_total: number;
  min_target: number;
  suggested_buy_total: number;
}

export function AlertsCenterScreen({
  alerts,
  activeTab,
  allLots,
  dbHealthy,
  onChangeTab,
  onManualScan,
  onOpenUseModal,
  onOpenRestockModal,
  onOpenCreateLot,
  onOpenLiquidateModal,
  onOpenRecipeModal,
  onOpenDrawer,
  onNotify,
}: AlertsCenterScreenProps) {
  const [scanning, setScanning] = useState(false);

  const lotsById = useMemo(() => new Map(allLots.map((l) => [l.item_id, l])), [allLots]);

  // Aggregate shopping list by Food (food_id)
  const shoppingList = useMemo<ShoppingGroup[]>(() => {
    const map = new Map<number, ShoppingGroup>();
    for (const item of alerts.low_stock_items) {
      const existing = map.get(item.food_id);
      if (!existing) {
        map.set(item.food_id, {
          food_id: item.food_id,
          food_code: item.food_code,
          food_name: item.food_name,
          category_name: item.category_name,
          unit_name: item.unit_name,
          current_total: item.current_quantity,
          min_target: item.min_threshold,
          suggested_buy_total: item.suggested_buy_quantity,
        });
      } else {
        existing.current_total += item.current_quantity;
        existing.min_target = Math.max(existing.min_target, item.min_threshold);
        existing.suggested_buy_total = Math.max(
          existing.suggested_buy_total,
          item.suggested_buy_quantity,
        );
      }
    }
    return Array.from(map.values());
  }, [alerts.low_stock_items]);

  const handleScan = async () => {
    setScanning(true);
    await onManualScan();
    setScanning(false);
  };

  const handleCopyShoppingList = async () => {
    if (shoppingList.length === 0) return;
    const lines = [
      `DANH SÁCH CẦN MUA BỔ SUNG (Ngày ${alerts.reference_date})`,
      ...shoppingList.map(
        (g, idx) =>
          `${idx + 1}. ${g.food_name} (${g.food_code}): Mua ~${formatQuantity(g.suggested_buy_total)} ${g.unit_name} (tồn hiện tại: ${formatQuantity(g.current_total)} ${g.unit_name})`,
      ),
    ];
    const ok = await copyTextToClipboard(lines.join('\n'));
    if (ok) {
      onNotify('success', 'Đã sao chép danh sách đi chợ', `${shoppingList.length} mặt hàng vào clipboard.`);
    } else {
      onNotify('info', 'Không thể truy cập clipboard tự động', 'Bạn có thể bôi đen trực tiếp bảng cần mua bên dưới.');
    }
  };

  const totalAlertsAll =
    alerts.expired_items.length +
    alerts.expiring_soon_items.length +
    alerts.low_stock_items.length;

  return (
    <div className="screen-stack" data-testid="dsk-screen-DSK-04">
      <div className="screen-header-bar">
        <div>
          <h1 className="t-view-title">Trung tâm Cảnh báo Hạn dùng & Tồn kho</h1>
          <p className="t-meta">
            Quét tự động theo mốc <strong className="mono-num">{alerts.reference_date}</strong> · Lần quét cuối:{' '}
            <span className="mono-num">{alerts.scanned_at}</span>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-fixed-lg"
          disabled={scanning || !dbHealthy}
          onClick={() => void handleScan()}
          data-testid="dsk-alerts-scan-btn"
        >
          {scanning ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              <span>Đang quét…</span>
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              <span>Quét kiểm tra ngay</span>
            </>
          )}
        </button>
      </div>

      {/* 3 Group Summary Tiles */}
      <div className="alerts-summary-grid">
        <button
          type="button"
          className={`hairline-card summary-pill-card ${activeTab === 'expiry' ? 'is-selected' : ''}`}
          onClick={() => onChangeTab('expiry')}
        >
          <span className="badge badge-expired">
            <AlertOctagon size={12} />
            <span>Đã hết hạn</span>
          </span>
          <strong className="kpi-num text-danger-strong">{alerts.expired_items.length}</strong>
          <span className="t-meta">Loại khỏi FEFO — Cần thanh lý</span>
        </button>

        <button
          type="button"
          className={`hairline-card summary-pill-card ${activeTab === 'expiry' ? 'is-selected' : ''}`}
          onClick={() => onChangeTab('expiry')}
        >
          <span className="badge badge-urgent">
            <AlertTriangle size={12} />
            <span>Sắp hết hạn</span>
          </span>
          <strong className="kpi-num">{alerts.expiring_soon_items.length}</strong>
          <span className="t-meta">Ưu tiên nấu hoặc dùng ngay</span>
        </button>

        <button
          type="button"
          className={`hairline-card summary-pill-card ${activeTab === 'stock' ? 'is-selected' : ''}`}
          onClick={() => onChangeTab('stock')}
        >
          <span className="badge badge-info">
            <ShoppingCart size={12} />
            <span>Sắp hết tồn kho</span>
          </span>
          <strong className="kpi-num">{alerts.low_stock_items.length}</strong>
          <span className="t-meta">
            Gom thành <strong className="mono-num">{shoppingList.length}</strong> món cần mua
          </span>
        </button>
      </div>

      {/* All Clear State */}
      {totalAlertsAll === 0 ? (
        <div className="hairline-card all-clear-card">
          <CheckCircle2 size={28} className="text-fresh-strong" />
          <div>
            <h2 className="t-panel-title">Kho thực phẩm an toàn — Không có cảnh báo</h2>
            <p className="t-body">
              Tất cả các lô hàng đang sử dụng đều còn hạn an toàn và có số lượng trên ngưỡng tồn tối thiểu.
            </p>
          </div>
        </div>
      ) : null}

      {/* 2 Main Tabs */}
      <div className="workbench-tabs" role="tablist" aria-label="Phân nhóm cảnh báo">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'expiry'}
          className={`wb-tab-btn ${activeTab === 'expiry' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('expiry')}
          data-testid="dsk-alerts-tab-expiry"
        >
          <span>Tab 1: Cảnh báo Hạn sử dụng</span>
          <span className="badge badge-expired mono-num">{alerts.total_expiry_alerts}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          className={`wb-tab-btn ${activeTab === 'stock' ? 'is-active' : ''}`}
          onClick={() => onChangeTab('stock')}
          data-testid="dsk-alerts-tab-stock"
        >
          <span>Tab 2: Thiếu hụt & Cần mua bổ sung</span>
          <span className="badge badge-info mono-num">{alerts.total_stock_alerts}</span>
        </button>
      </div>

      {activeTab === 'expiry' ? (
        <div className="screen-stack">
          {/* Group 1: Expired Items */}
          <section className="hairline-card panel-card">
            <div className="panel-header">
              <div>
                <h2 className="t-card-title text-danger-strong">
                  Nhóm 1: Thực phẩm Đã hết hạn ({alerts.expired_items.length})
                </h2>
                <p className="t-meta">
                  Đã loại khỏi danh sách FEFO & Gợi ý món ăn (1.2.4.4). Cần kiểm tra và thanh lý/vứt hủy khỏi tủ.
                </p>
              </div>
            </div>

            {alerts.expired_items.length === 0 ? (
              <div className="empty-well">Không có thực phẩm nào đã quá hạn sử dụng.</div>
            ) : (
              <table className="table-dense">
                <thead>
                  <tr>
                    <th>Thực phẩm & Lô</th>
                    <th>Vị trí</th>
                    <th className="num-col">Tồn kho</th>
                    <th>Hạn dùng</th>
                    <th>Cảnh báo</th>
                    <th className="num-col">Xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.expired_items.map((item) => {
                    const lot = lotsById.get(item.item_id);
                    return (
                      <tr key={item.item_id} className="row-expired-tint">
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
                          <div className="mono-num text-danger-strong">
                            <strong>{item.expiry_date}</strong>
                          </div>
                          <div className="t-micro text-danger-strong">
                            {formatDaysRemainingLabel(item.days_remaining)}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-expired">{item.alert_type}</span>
                        </td>
                        <td className="num-col">
                          {lot ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={!dbHealthy}
                              onClick={() => onOpenLiquidateModal(lot)}
                            >
                              <Trash2 size={12} />
                              <span>Vứt hủy / Thanh lý</span>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Group 2: Expiring Soon */}
          <section className="hairline-card panel-card">
            <div className="panel-header">
              <div>
                <h2 className="t-card-title">
                  Nhóm 2: Thực phẩm Sắp hết hạn ({alerts.expiring_soon_items.length})
                </h2>
                <p className="t-meta">Cần ưu tiên xuất dùng hoặc chế biến thành món ăn trước khi hỏng.</p>
              </div>
            </div>

            {alerts.expiring_soon_items.length === 0 ? (
              <div className="empty-well">Không có thực phẩm nào trong ngưỡng cận hạn.</div>
            ) : (
              <table className="table-dense">
                <thead>
                  <tr>
                    <th>Thực phẩm & Lô</th>
                    <th>Vị trí</th>
                    <th className="num-col">Tồn kho</th>
                    <th>Hạn dùng</th>
                    <th>Cảnh báo</th>
                    <th className="num-col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.expiring_soon_items.map((item) => {
                    const lot = lotsById.get(item.item_id);
                    return (
                      <tr key={item.item_id}>
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
                            <strong>{item.expiry_date}</strong>
                          </div>
                          <div className="t-micro text-warn-strong">
                            {formatDaysRemainingLabel(item.days_remaining)}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-urgent">{item.alert_type}</span>
                        </td>
                        <td className="num-col">
                          <div className="row-actions-inline">
                            {lot ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={!dbHealthy || lot.current_quantity <= 0}
                                onClick={() => onOpenUseModal(lot)}
                              >
                                <Utensils size={12} />
                                <span>Dùng ngay</span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenRecipeModal(item.item_id)}
                            >
                              <ChefHat size={12} />
                              <span>Món gợi ý</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : (
        <div className="alerts-stock-grid">
          {/* Left: Low stock lots */}
          <section className="hairline-card panel-card">
            <div className="panel-header">
              <div>
                <h2 className="t-card-title">
                  Cảnh báo Thiếu hụt Tồn kho ({alerts.low_stock_items.length} lô)
                </h2>
                <p className="t-meta">Các lô có tồn hiện tại ≤ ngưỡng min hoặc món đã hết chưa nhập lô mới</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!dbHealthy}
                onClick={onOpenCreateLot}
              >
                <PlusCircle size={13} />
                <span>Tạo lô mới</span>
              </button>
            </div>

            {alerts.low_stock_items.length === 0 ? (
              <div className="empty-well">Không có mặt hàng nào dưới ngưỡng tồn tối thiểu.</div>
            ) : (
              <table className="table-dense">
                <thead>
                  <tr>
                    <th>Thực phẩm & Lô</th>
                    <th className="num-col">Tồn / Min</th>
                    <th>Trạng thái</th>
                    <th className="num-col">Gợi ý bù</th>
                    <th className="num-col">Nhập kho</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.low_stock_items.map((item) => {
                    const lot = lotsById.get(item.item_id);
                    return (
                      <tr key={item.item_id}>
                        <td>
                          <button
                            type="button"
                            className="table-link-btn"
                            onClick={() => onOpenDrawer(item.item_id)}
                          >
                            {item.food_name}
                          </button>
                          <div className="t-micro mono-num">
                            {item.food_code} · {item.item_code} · {item.location_name}
                          </div>
                        </td>
                        <td className="num-col mono-num">
                          <strong>{formatQuantity(item.current_quantity)}</strong> /{' '}
                          {formatQuantity(item.min_threshold)} {item.unit_name}
                        </td>
                        <td>
                          <span
                            className={`badge ${item.status === 'Đã hết' ? 'badge-empty' : 'badge-urgent'}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="num-col mono-num">
                          +{formatQuantity(item.suggested_buy_quantity)} {item.unit_name}
                        </td>
                        <td className="num-col">
                          {lot ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!dbHealthy}
                              onClick={() => onOpenRestockModal(lot, item.suggested_buy_quantity)}
                            >
                              <PlusCircle size={12} />
                              <span>Nhập thêm</span>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Right: Aggregated Shopping Summary */}
          <aside className="hairline-card panel-card">
            <div className="panel-header">
              <div>
                <h2 className="t-card-title">Danh sách Cần mua (Gom theo Món)</h2>
                <p className="t-meta">Sẵn sàng sao chép hoặc in khi đi siêu thị / chợ</p>
              </div>
              <div className="toolbar-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={shoppingList.length === 0}
                  onClick={() => void handleCopyShoppingList()}
                  data-testid="dsk-alerts-copy-shopping"
                >
                  <ClipboardCopy size={13} />
                  <span>Sao chép</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={shoppingList.length === 0}
                  onClick={() => window.print()}
                  data-testid="dsk-alerts-print-shopping"
                >
                  <Printer size={13} />
                  <span>In</span>
                </button>
              </div>
            </div>

            {shoppingList.length === 0 ? (
              <div className="empty-well">Chưa có mặt hàng nào cần mua bổ sung.</div>
            ) : (
              <ul className="shopping-summary-list">
                {shoppingList.map((group) => (
                  <li key={group.food_id} className="shopping-summary-item">
                    <div>
                      <strong>{group.food_name}</strong>
                      <div className="t-micro mono-num">
                        {group.food_code} · {group.category_name} · Tồn hiện tại:{' '}
                        {formatQuantity(group.current_total)} {group.unit_name}
                      </div>
                    </div>
                    <span className="badge badge-info mono-num">
                      Mua ~{formatQuantity(group.suggested_buy_total)} {group.unit_name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
