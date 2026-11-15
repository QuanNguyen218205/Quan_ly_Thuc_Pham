import { useMemo, useState } from 'react';
import type { AnalyticsSnapshot } from '@food-mgmt/shared-sim';
import { formatIsoDateShort } from '../domain/food-lot-presentation';

interface MobileChartsProps {
  stats: AnalyticsSnapshot | null;
  isLoading: boolean;
}

const ORDINAL_TEAL_TOKENS = [
  'var(--viz-ordinal-5)',
  'var(--viz-ordinal-4)',
  'var(--viz-ordinal-3)',
  'var(--viz-ordinal-2)',
  'var(--viz-ordinal-1)',
];

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
}

export function MobileCharts({ stats, isLoading }: MobileChartsProps) {
  const [trendView, setTrendView] = useState<'chart' | 'table'>('chart');
  const [areaView, setAreaView] = useState<'chart' | 'table'>('chart');
  const [activeTrendIndex, setActiveTrendIndex] = useState<number | null>(null);
  const [activeLocId, setActiveLocId] = useState<number | null>(null);

  const dailyPoints = stats?.daily_trend ?? [];
  const selectedIndex =
    activeTrendIndex !== null && activeTrendIndex < dailyPoints.length
      ? activeTrendIndex
      : dailyPoints.length > 0
        ? dailyPoints.length - 1
        : 0;

  const trendGeometry = useMemo(() => {
    const plotLeft = 34;
    const plotRight = 326;
    const plotTop = 16;
    const plotBottom = 152;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const maxVal = Math.max(
      1,
      ...dailyPoints.flatMap((d) => [d.restocked_quantity, d.used_quantity, d.wasted_quantity]),
    );
    const niceMax = maxVal <= 2 ? 2 : Math.ceil(maxVal * 1.15);

    const xFor = (idx: number) => {
      if (dailyPoints.length <= 1) return plotLeft + plotW / 2;
      return plotLeft + (idx / (dailyPoints.length - 1)) * plotW;
    };

    const yFor = (val: number) => plotBottom - (val / niceMax) * plotH;

    const restockCoords = dailyPoints.map((d, i) => ({ x: xFor(i), y: yFor(d.restocked_quantity) }));
    const usedCoords = dailyPoints.map((d, i) => ({ x: xFor(i), y: yFor(d.used_quantity) }));
    const wastedCoords = dailyPoints.map((d, i) => ({ x: xFor(i), y: yFor(d.wasted_quantity) }));

    // Show at most 4-5 cleanly spaced date ticks
    const tickIndices: number[] = [];
    if (dailyPoints.length > 0) {
      const step = Math.max(1, Math.floor((dailyPoints.length - 1) / 3));
      for (let i = 0; i < dailyPoints.length; i += step) {
        tickIndices.push(i);
      }
      const last = dailyPoints.length - 1;
      if (!tickIndices.includes(last)) {
        if (tickIndices.length >= 4) {
          tickIndices[tickIndices.length - 1] = last;
        } else {
          tickIndices.push(last);
        }
      }
    }

    const yTicks = [0, Math.round((niceMax / 2) * 10) / 10, niceMax];

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      niceMax,
      yTicks,
      tickIndices,
      restockCoords,
      usedCoords,
      wastedCoords,
      xFor,
      yFor,
    };
  }, [dailyPoints]);

  if (isLoading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div className="mob-skeleton" style={{ height: 220 }} />
        <div className="mob-skeleton" style={{ height: 190 }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mob-empty-box" data-testid="mob-charts-empty">
        <p className="t-body" style={{ margin: 0 }}>
          Chưa có dữ liệu thống kê. Kết nối Desktop Server để tải biểu đồ.
        </p>
      </div>
    );
  }

  const activePoint = dailyPoints[selectedIndex];
  const fridgeArea = stats.area_distribution.find((a) => a.area_type === 'Trong tủ lạnh');
  const outsideArea = stats.area_distribution.find((a) => a.area_type === 'Ngoài tủ lạnh');
  const totalAreaLots = Math.max(
    1,
    (fridgeArea?.lot_count ?? 0) + (outsideArea?.lot_count ?? 0),
  );
  const fridgePct = fridgeArea ? fridgeArea.percentage : 0;
  const outsidePct = outsideArea ? outsideArea.percentage : 0;

  // Compute stacked proportional bar geometry (viewBox 0 0 340 160)
  const stackX = 12;
  const stackW = 316;
  const gapPx = (fridgeArea?.lot_count ?? 0) > 0 && (outsideArea?.lot_count ?? 0) > 0 ? 2 : 0;
  const fridgeBarW =
    (fridgeArea?.lot_count ?? 0) > 0
      ? Math.max(8, ((fridgeArea?.lot_count ?? 0) / totalAreaLots) * (stackW - gapPx))
      : 0;
  const outsideBarW =
    (outsideArea?.lot_count ?? 0) > 0 ? Math.max(8, stackW - gapPx - fridgeBarW) : 0;

  const topLocations = [...stats.location_distribution]
    .sort((a, b) => b.lot_count - a.lot_count || a.location_id - b.location_id)
    .slice(0, 4);
  const maxLocCount = Math.max(1, ...topLocations.map((l) => l.lot_count));
  const selectedLoc =
    topLocations.find((l) => l.location_id === activeLocId) ?? topLocations[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {/* Chart 1: Consumption & Stock In/Out Trend */}
      <section className="mob-viz-card" aria-label="Biểu đồ xu hướng nhập xuất tiêu thụ">
        <div className="mob-section-head">
          <div>
            <h3 className="t-card-title">Xu hướng Nhập · Xuất · Hủy</h3>
            <span className="t-micro">
              {formatIsoDateShort(stats.start_date)} – {formatIsoDateShort(stats.end_date)} (
              {stats.range_days} ngày)
            </span>
          </div>
          <div className="mob-segmented" role="tablist" aria-label="Chế độ xem xu hướng">
            <button
              type="button"
              role="tab"
              aria-selected={trendView === 'chart'}
              className="mob-segment-btn"
              style={{ minHeight: 36, padding: '4px 10px', fontSize: 12 }}
              data-testid="mob-chart-trend-toggle-chart"
              onClick={() => setTrendView('chart')}
            >
              Biểu đồ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={trendView === 'table'}
              className="mob-segment-btn"
              style={{ minHeight: 36, padding: '4px 10px', fontSize: 12 }}
              data-testid="mob-chart-trend-toggle-table"
              onClick={() => setTrendView('table')}
            >
              Bảng số liệu
            </button>
          </div>
        </div>

        <div className="mob-viz-legend">
          <span className="mob-viz-legend-item">
            <span className="mob-viz-swatch" style={{ backgroundColor: 'var(--viz-series-1)' }} />
            Nhập thêm
          </span>
          <span className="mob-viz-legend-item">
            <span className="mob-viz-swatch" style={{ backgroundColor: 'var(--viz-series-2)' }} />
            Xuất dùng
          </span>
          <span className="mob-viz-legend-item">
            <span className="mob-viz-swatch" style={{ backgroundColor: 'var(--viz-series-4)' }} />
            Vứt hủy
          </span>
        </div>

        {trendView === 'chart' ? (
          <>
            <svg
              viewBox="0 0 340 190"
              style={{ display: 'block', width: '100%', height: 'auto' }}
              role="img"
              aria-label="Biểu đồ đường xu hướng nhập thêm, xuất dùng và vứt hủy theo ngày"
              data-testid="mob-chart-trend-svg"
            >
              {/* Solid 1px horizontal gridlines (never dashed) */}
              {trendGeometry.yTicks.map((tickVal) => {
                const y = trendGeometry.yFor(tickVal);
                return (
                  <g key={tickVal}>
                    <line
                      x1={trendGeometry.plotLeft}
                      y1={y}
                      x2={trendGeometry.plotRight}
                      y2={y}
                      stroke={tickVal === 0 ? 'var(--viz-axis)' : 'var(--viz-gridline)'}
                      strokeWidth="1"
                    />
                    <text
                      x={trendGeometry.plotLeft - 6}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* Vertical crosshair hairline for active date */}
              {dailyPoints.length > 0 && (
                <line
                  x1={trendGeometry.xFor(selectedIndex)}
                  y1={trendGeometry.plotTop}
                  x2={trendGeometry.xFor(selectedIndex)}
                  y2={trendGeometry.plotBottom}
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                />
              )}

              {/* Series paths */}
              <path
                d={buildLinePath(trendGeometry.restockCoords)}
                fill="none"
                stroke="var(--viz-series-1)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildLinePath(trendGeometry.usedCoords)}
                fill="none"
                stroke="var(--viz-series-2)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildLinePath(trendGeometry.wastedCoords)}
                fill="none"
                stroke="var(--viz-series-4)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive points with 2px white surface ring */}
              {dailyPoints.map((pt, idx) => {
                const isSelected = idx === selectedIndex;
                const x = trendGeometry.xFor(idx);
                return (
                  <g key={pt.date}>
                    <circle
                      cx={x}
                      cy={trendGeometry.restockCoords[idx].y}
                      r={isSelected ? 4.5 : 3.5}
                      fill="var(--viz-series-1)"
                      stroke="var(--viz-surface)"
                      strokeWidth="2"
                    />
                    <circle
                      cx={x}
                      cy={trendGeometry.usedCoords[idx].y}
                      r={isSelected ? 4.5 : 3.5}
                      fill="var(--viz-series-2)"
                      stroke="var(--viz-surface)"
                      strokeWidth="2"
                    />
                    <circle
                      cx={x}
                      cy={trendGeometry.wastedCoords[idx].y}
                      r={isSelected ? 4.5 : 3.5}
                      fill="var(--viz-series-4)"
                      stroke="var(--viz-surface)"
                      strokeWidth="2"
                    />
                    <rect
                      x={Math.max(0, x - 14)}
                      y={trendGeometry.plotTop}
                      width={28}
                      height={trendGeometry.plotBottom - trendGeometry.plotTop + 20}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActiveTrendIndex(idx)}
                      onMouseEnter={() => setActiveTrendIndex(idx)}
                    />
                  </g>
                );
              })}

              {/* X-axis clean date ticks (max 4 ticks) */}
              {trendGeometry.tickIndices.map((idx) => (
                <text
                  key={dailyPoints[idx].date}
                  x={trendGeometry.xFor(idx)}
                  y={174}
                  textAnchor={
                    idx === 0
                      ? 'start'
                      : idx === dailyPoints.length - 1
                        ? 'end'
                        : 'middle'
                  }
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {dailyPoints[idx].label}
                </text>
              ))}
            </svg>

            {activePoint && (
              <div className="mob-viz-tooltip" data-testid="mob-chart-trend-tooltip">
                <span className="mono-num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatIsoDateShort(activePoint.date)}
                </span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>
                    <span
                      className="mob-viz-swatch"
                      style={{ backgroundColor: 'var(--viz-series-1)', marginRight: 4 }}
                    />
                    <span className="mono-num">{activePoint.restocked_quantity}</span> nhập
                  </span>
                  <span>
                    <span
                      className="mob-viz-swatch"
                      style={{ backgroundColor: 'var(--viz-series-2)', marginRight: 4 }}
                    />
                    <span className="mono-num">{activePoint.used_quantity}</span> dùng
                  </span>
                  <span>
                    <span
                      className="mob-viz-swatch"
                      style={{ backgroundColor: 'var(--viz-series-4)', marginRight: 4 }}
                    />
                    <span className="mono-num">{activePoint.wasted_quantity}</span> hủy
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ overflowX: 'auto' }} data-testid="mob-chart-trend-table">
            <table className="mob-viz-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th className="num">Nhập thêm</th>
                  <th className="num">Xuất dùng</th>
                  <th className="num">Vứt hủy</th>
                </tr>
              </thead>
              <tbody>
                {dailyPoints.map((pt) => (
                  <tr key={pt.date}>
                    <td className="mono-num">{pt.label}</td>
                    <td className="num mono-num">{pt.restocked_quantity}</td>
                    <td className="num mono-num">{pt.used_quantity}</td>
                    <td className="num mono-num">{pt.wasted_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Chart 2: Fridge vs Outside Distribution + Sub-locations */}
      <section className="mob-viz-card" aria-label="Biểu đồ phân bổ theo vị trí bảo quản">
        <div className="mob-section-head">
          <div>
            <h3 className="t-card-title">Phân bổ vị trí bảo quản</h3>
            <span className="t-micro">
              Trong tủ ({fridgeArea?.lot_count ?? 0} lô · {fridgePct}%) vs Ngoài tủ (
              {outsideArea?.lot_count ?? 0} lô · {outsidePct}%)
            </span>
          </div>
          <div className="mob-segmented" role="tablist" aria-label="Chế độ xem vị trí">
            <button
              type="button"
              role="tab"
              aria-selected={areaView === 'chart'}
              className="mob-segment-btn"
              style={{ minHeight: 36, padding: '4px 10px', fontSize: 12 }}
              data-testid="mob-chart-area-toggle-chart"
              onClick={() => setAreaView('chart')}
            >
              Biểu đồ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={areaView === 'table'}
              className="mob-segment-btn"
              style={{ minHeight: 36, padding: '4px 10px', fontSize: 12 }}
              data-testid="mob-chart-area-toggle-table"
              onClick={() => setAreaView('table')}
            >
              Bảng số liệu
            </button>
          </div>
        </div>

        <div className="mob-viz-legend">
          <span className="mob-viz-legend-item">
            <span className="mob-viz-swatch" style={{ backgroundColor: 'var(--viz-series-1)' }} />
            Trong tủ lạnh ({fridgePct}%)
          </span>
          <span className="mob-viz-legend-item">
            <span className="mob-viz-swatch" style={{ backgroundColor: 'var(--viz-series-2)' }} />
            Ngoài tủ lạnh ({outsidePct}%)
          </span>
        </div>

        {areaView === 'chart' ? (
          <>
            <svg
              viewBox="0 0 340 160"
              style={{ display: 'block', width: '100%', height: 'auto' }}
              role="img"
              aria-label="Biểu đồ thanh ngang phân bổ trong tủ lạnh và ngoài tủ lạnh cùng các ngăn chính"
              data-testid="mob-chart-area-svg"
            >
              {/* Proportional Stacked Bar (no 2-slice pie/donut) with 2px white gap */}
              {fridgeBarW > 0 && (
                <g>
                  <rect
                    x={stackX}
                    y={8}
                    width={fridgeBarW}
                    height={24}
                    rx="4"
                    fill="var(--viz-series-1)"
                  />
                  {fridgeBarW >= 56 && (
                    <text
                      x={stackX + fridgeBarW / 2}
                      y={24}
                      textAnchor="middle"
                      fill="var(--text-inverse)"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                    >
                      {fridgePct}%
                    </text>
                  )}
                </g>
              )}
              {outsideBarW > 0 && (
                <g>
                  <rect
                    x={stackX + (fridgeBarW > 0 ? fridgeBarW + gapPx : 0)}
                    y={8}
                    width={outsideBarW}
                    height={24}
                    rx="4"
                    fill="var(--viz-series-2)"
                  />
                  {outsideBarW >= 56 && (
                    <text
                      x={stackX + (fridgeBarW > 0 ? fridgeBarW + gapPx : 0) + outsideBarW / 2}
                      y={24}
                      textAnchor="middle"
                      fill="var(--text-inverse)"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                    >
                      {outsidePct}%
                    </text>
                  )}
                </g>
              )}

              {/* Top Sub-location horizontal meters */}
              {topLocations.map((loc, idx) => {
                const rowY = 50 + idx * 27;
                const meterMaxW = 160;
                const meterX = 146;
                const barW = Math.max(4, (loc.lot_count / maxLocCount) * meterMaxW);
                const fillColor =
                  loc.area_type === 'Ngoài tủ lạnh'
                    ? 'var(--viz-series-2)'
                    : ORDINAL_TEAL_TOKENS[idx % ORDINAL_TEAL_TOKENS.length];

                return (
                  <g
                    key={loc.location_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveLocId(loc.location_id)}
                    onMouseEnter={() => setActiveLocId(loc.location_id)}
                  >
                    <text
                      x={12}
                      y={rowY + 11}
                      fill="var(--text-primary)"
                      fontSize="11"
                      fontWeight={selectedLoc?.location_id === loc.location_id ? '600' : '400'}
                    >
                      {loc.location_name.length > 19
                        ? `${loc.location_name.slice(0, 18)}…`
                        : loc.location_name}
                    </text>
                    <rect
                      x={meterX}
                      y={rowY}
                      width={meterMaxW}
                      height={14}
                      rx="4"
                      fill="var(--bg-subtle)"
                    />
                    <rect x={meterX} y={rowY} width={barW} height={14} rx="4" fill={fillColor} />
                    <text
                      x={328}
                      y={rowY + 11}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                    >
                      {loc.lot_count}
                    </text>
                  </g>
                );
              })}
            </svg>

            {selectedLoc && (
              <div className="mob-viz-tooltip" data-testid="mob-chart-area-tooltip">
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedLoc.location_name} ({selectedLoc.area_type})
                </span>
                <span className="mono-num">
                  {selectedLoc.lot_count} lô · {selectedLoc.expiring_or_expired_count} cảnh báo HSD
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ overflowX: 'auto' }} data-testid="mob-chart-area-table">
            <table className="mob-viz-table">
              <thead>
                <tr>
                  <th>Vị trí</th>
                  <th>Khu vực</th>
                  <th className="num">Số lô</th>
                  <th className="num">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {stats.location_distribution.map((loc) => (
                  <tr key={loc.location_id}>
                    <td>{loc.location_name}</td>
                    <td>{loc.area_type}</td>
                    <td className="num mono-num">{loc.lot_count}</td>
                    <td className="num mono-num">{loc.expiring_or_expired_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
