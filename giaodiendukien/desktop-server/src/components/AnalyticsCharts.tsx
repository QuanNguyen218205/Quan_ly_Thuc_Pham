import { useMemo, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import type { AnalyticsSnapshot } from '@food-mgmt/shared-sim';
import { formatQuantity } from '../domain/pantry-formatters';

interface AnalyticsChartsProps {
  stats: AnalyticsSnapshot | null;
  isLoading: boolean;
}

function buildTopRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  if (w <= 0 || h <= 0) return '';
  const rad = Math.min(r, w / 2, h);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + rad}`,
    `Q ${x} ${y} ${x + rad} ${y}`,
    `L ${x + w - rad} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rad}`,
    `L ${x + w} ${y + h}`,
    'Z',
  ].join(' ');
}

function buildRightRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  if (w <= 0 || h <= 0) return '';
  const rad = Math.min(r, w, h / 2);
  return [
    `M ${x} ${y}`,
    `L ${x + w - rad} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rad}`,
    `L ${x + w} ${y + h - rad}`,
    `Q ${x + w} ${y + h} ${x + w - rad} ${y + h}`,
    `L ${x} ${y + h}`,
    'Z',
  ].join(' ');
}

const ORDINAL_TEAL_VARS = [
  'var(--viz-ordinal-5)',
  'var(--viz-ordinal-4)',
  'var(--viz-ordinal-3)',
  'var(--viz-ordinal-2)',
  'var(--viz-ordinal-1)',
];

export function AnalyticsCharts({ stats, isLoading }: AnalyticsChartsProps) {
  const [trendMode, setTrendMode] = useState<'chart' | 'table'>('chart');
  const [areaMode, setAreaMode] = useState<'chart' | 'table'>('chart');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverLocationId, setHoverLocationId] = useState<number | null>(null);

  const trendMetrics = useMemo(() => {
    const points = stats?.daily_trend ?? [];
    let maxVal = 1;
    for (const p of points) {
      maxVal = Math.max(maxVal, p.restocked_quantity, p.used_quantity, p.wasted_quantity);
    }
    const niceMax = Math.max(2, Math.ceil(maxVal * 1.18));
    return { points, niceMax };
  }, [stats]);

  const topLocations = useMemo(() => {
    if (!stats) return [];
    return [...stats.location_distribution]
      .sort((a, b) => b.lot_count - a.lot_count || a.location_id - b.location_id)
      .slice(0, 5);
  }, [stats]);

  if (isLoading && !stats) {
    return (
      <div className="charts-grid">
        <div className="hairline-card chart-card">
          <div className="skeleton-box" style={{ height: 24, width: '55%', marginBottom: 12 }} />
          <div className="skeleton-box" style={{ height: 220, width: '100%' }} />
        </div>
        <div className="hairline-card chart-card">
          <div className="skeleton-box" style={{ height: 24, width: '60%', marginBottom: 12 }} />
          <div className="skeleton-box" style={{ height: 220, width: '100%' }} />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Chart 1 geometry: viewBox 0 0 640 240, plot y: 16..196, x-axis band y: 196..232
  const plotLeft = 44;
  const plotRight = 622;
  const plotTop = 16;
  const plotBottom = 196;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const { points, niceMax } = trendMetrics;
  const useLineChart = points.length > 10;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: Math.round(niceMax * ratio * 10) / 10,
    y: plotBottom - ratio * plotHeight,
  }));

  const xStep = points.length > 0 ? plotWidth / points.length : plotWidth;
  const xPointAt = (idx: number) =>
    points.length <= 1
      ? plotLeft + plotWidth / 2
      : useLineChart
        ? plotLeft + (idx / Math.max(1, points.length - 1)) * plotWidth
        : plotLeft + idx * xStep + xStep / 2;

  const yForValue = (val: number) => plotBottom - (Math.max(0, val) / niceMax) * plotHeight;

  const xLabelStride = points.length <= 8 ? 1 : points.length <= 16 ? 2 : Math.ceil(points.length / 6);
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] ?? null : null;

  // Chart 2 geometry: viewBox 0 0 460 220
  const fridgeArea = stats.area_distribution.find((a) => a.area_type === 'Trong tủ lạnh');
  const outsideArea = stats.area_distribution.find((a) => a.area_type === 'Ngoài tủ lạnh');
  const fridgeLots = fridgeArea?.lot_count ?? 0;
  const outsideLots = outsideArea?.lot_count ?? 0;
  const totalAreaLots = Math.max(1, fridgeLots + outsideLots);
  const barX = 12;
  const barW = 436;
  const gapPx = fridgeLots > 0 && outsideLots > 0 ? 2 : 0;
  const usableW = barW - gapPx;
  const fridgeW = fridgeLots + outsideLots === 0 ? 0 : Math.round((fridgeLots / totalAreaLots) * usableW);
  const outsideW = fridgeLots + outsideLots === 0 ? 0 : usableW - fridgeW;
  const maxLocLots = Math.max(1, ...topLocations.map((l) => l.lot_count));

  return (
    <div className="charts-grid">
      {/* CHART 1: Consumption & Stock In/Out Trend */}
      <section className="hairline-card chart-card" aria-label="Biểu đồ xu hướng nhập xuất và tiêu hủy">
        <div className="chart-header">
          <div>
            <h3 className="t-card-title">Xu hướng Nhập kho, Xuất dùng & Vứt hủy</h3>
            <p className="t-meta">
              Khoảng <span className="mono-num">{stats.start_date}</span> →{' '}
              <span className="mono-num">{stats.end_date}</span> · Hiệu suất tiêu thụ{' '}
              <strong className="mono-num">{stats.kpi.consumption_efficiency_pct}%</strong>
            </p>
          </div>
          <div className="segmented-toggle" role="group" aria-label="Chế độ hiển thị biểu đồ xu hướng">
            <button
              type="button"
              className={`segmented-btn ${trendMode === 'chart' ? 'is-active' : ''}`}
              onClick={() => setTrendMode('chart')}
              data-testid="dsk-chart-trend-toggle-chart"
            >
              <BarChart3 size={13} />
              <span>Biểu đồ</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${trendMode === 'table' ? 'is-active' : ''}`}
              onClick={() => setTrendMode('table')}
              data-testid="dsk-chart-trend-toggle-table"
            >
              <Table2 size={13} />
              <span>Bảng số liệu</span>
            </button>
          </div>
        </div>

        <div className="chart-legend" aria-label="Chú giải chuỗi dữ liệu">
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--viz-series-1)' }} />
            <span>Nhập thêm</span>
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--viz-series-2)' }} />
            <span>Xuất dùng</span>
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--viz-series-4)' }} />
            <span>Vứt hủy</span>
          </span>
        </div>

        {trendMode === 'chart' ? (
          <div className="svg-chart-wrap" onMouseLeave={() => setHoverIndex(null)}>
            <svg
              viewBox="0 0 640 240"
              width="100%"
              role="img"
              aria-label="Biểu đồ xu hướng nhập thêm, xuất dùng và vứt hủy theo ngày"
            >
              {/* Solid hairline horizontal gridlines (never dashed) */}
              {yTicks.map((t, i) => (
                <g key={i}>
                  <line
                    x1={plotLeft}
                    y1={t.y}
                    x2={plotRight}
                    y2={t.y}
                    stroke={i === 0 ? 'var(--viz-axis)' : 'var(--viz-gridline)'}
                    strokeWidth={1}
                  />
                  <text
                    x={plotLeft - 6}
                    y={t.y + 4}
                    textAnchor="end"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    fill="var(--text-muted)"
                  >
                    {formatQuantity(t.value)}
                  </text>
                </g>
              ))}

              {/* Crosshair hairline on hover */}
              {hoveredPoint && hoverIndex !== null ? (
                <line
                  x1={xPointAt(hoverIndex)}
                  y1={plotTop}
                  x2={xPointAt(hoverIndex)}
                  y2={plotBottom}
                  stroke="var(--border-strong)"
                  strokeWidth={1}
                />
              ) : null}

              {/* Bars for <=10 days or Lines for >10 days */}
              {!useLineChart ? (
                points.map((pt, idx) => {
                  const center = xPointAt(idx);
                  const barWEach = Math.min(14, Math.max(6, Math.floor((xStep - 12) / 3)));
                  const gap = 2;
                  const totalGroupW = barWEach * 3 + gap * 2;
                  const startX = center - totalGroupW / 2;

                  const bars = [
                    { val: pt.restocked_quantity, color: 'var(--viz-series-1)', x: startX },
                    { val: pt.used_quantity, color: 'var(--viz-series-2)', x: startX + barWEach + gap },
                    { val: pt.wasted_quantity, color: 'var(--viz-series-4)', x: startX + (barWEach + gap) * 2 },
                  ];

                  return (
                    <g key={pt.date}>
                      {bars.map((b, bIdx) => {
                        const h = (b.val / niceMax) * plotHeight;
                        const y = plotBottom - h;
                        return h > 0 ? (
                          <path
                            key={bIdx}
                            d={buildTopRoundedRectPath(b.x, y, barWEach, h, 3)}
                            fill={b.color}
                            opacity={hoverIndex === null || hoverIndex === idx ? 1 : 0.65}
                          />
                        ) : null;
                      })}
                    </g>
                  );
                })
              ) : (
                <>
                  {(
                    [
                      { key: 'restocked_quantity', color: 'var(--viz-series-1)' },
                      { key: 'used_quantity', color: 'var(--viz-series-2)' },
                      { key: 'wasted_quantity', color: 'var(--viz-series-4)' },
                    ] as const
                  ).map((series) => {
                    const pathD = points
                      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xPointAt(idx)} ${yForValue(pt[series.key])}`)
                      .join(' ');
                    return (
                      <g key={series.key}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={series.color}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((pt, idx) => (
                          <circle
                            key={pt.date}
                            cx={xPointAt(idx)}
                            cy={yForValue(pt[series.key])}
                            r={hoverIndex === idx ? 4.5 : 3.5}
                            fill={series.color}
                            stroke="var(--viz-surface)"
                            strokeWidth={2}
                          />
                        ))}
                      </g>
                    );
                  })}
                </>
              )}

              {/* X-axis tick labels inside y: 196..232 band */}
              {points.map((pt, idx) => {
                const showTick = idx % xLabelStride === 0 || idx === points.length - 1;
                if (!showTick) return null;
                return (
                  <text
                    key={pt.date}
                    x={xPointAt(idx)}
                    y={216}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    fill="var(--text-muted)"
                  >
                    {pt.label}
                  </text>
                );
              })}

              {/* Full-column invisible hover targets */}
              {points.map((pt, idx) => {
                const cx = xPointAt(idx);
                const hitW = Math.max(14, plotWidth / Math.max(1, points.length));
                return (
                  <rect
                    key={pt.date}
                    x={cx - hitW / 2}
                    y={plotTop}
                    width={hitW}
                    height={plotHeight + 24}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(idx)}
                    style={{ cursor: 'crosshair' }}
                  />
                );
              })}
            </svg>

            {hoveredPoint ? (
              <div className="chart-floating-tooltip" role="status">
                <div className="tooltip-date mono-num">{hoveredPoint.date}</div>
                <div className="tooltip-row">
                  <span className="tooltip-key" style={{ backgroundColor: 'var(--viz-series-1)' }} />
                  <span className="tooltip-label">Nhập thêm</span>
                  <strong className="mono-num">{formatQuantity(hoveredPoint.restocked_quantity)}</strong>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-key" style={{ backgroundColor: 'var(--viz-series-2)' }} />
                  <span className="tooltip-label">Xuất dùng</span>
                  <strong className="mono-num">{formatQuantity(hoveredPoint.used_quantity)}</strong>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-key" style={{ backgroundColor: 'var(--viz-series-4)' }} />
                  <span className="tooltip-label">Vứt hủy</span>
                  <strong className="mono-num">{formatQuantity(hoveredPoint.wasted_quantity)}</strong>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="chart-table-scroll">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th className="num-col">Nhập thêm</th>
                  <th className="num-col">Xuất dùng</th>
                  <th className="num-col">Vứt hủy</th>
                  <th className="num-col">Số GD</th>
                </tr>
              </thead>
              <tbody>
                {points.map((pt) => (
                  <tr key={pt.date}>
                    <td className="mono-num">{pt.date}</td>
                    <td className="num-col mono-num">{formatQuantity(pt.restocked_quantity)}</td>
                    <td className="num-col mono-num">{formatQuantity(pt.used_quantity)}</td>
                    <td className="num-col mono-num">{formatQuantity(pt.wasted_quantity)}</td>
                    <td className="num-col mono-num">{pt.transaction_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CHART 2: Fridge vs Outside Distribution */}
      <section className="hairline-card chart-card" aria-label="Biểu đồ phân bố tồn kho theo khu vực">
        <div className="chart-header">
          <div>
            <h3 className="t-card-title">Phân bố Kho: Trong tủ lạnh vs Ngoài tủ lạnh</h3>
            <p className="t-meta">
              Tổng <strong className="mono-num">{stats.kpi.active_lot_count}</strong> lô đang sử dụng tại{' '}
              <strong className="mono-num">{stats.location_distribution.length}</strong> ngăn bảo quản
            </p>
          </div>
          <div className="segmented-toggle" role="group" aria-label="Chế độ hiển thị biểu đồ khu vực">
            <button
              type="button"
              className={`segmented-btn ${areaMode === 'chart' ? 'is-active' : ''}`}
              onClick={() => setAreaMode('chart')}
              data-testid="dsk-chart-area-toggle-chart"
            >
              <BarChart3 size={13} />
              <span>Biểu đồ</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${areaMode === 'table' ? 'is-active' : ''}`}
              onClick={() => setAreaMode('table')}
              data-testid="dsk-chart-area-toggle-table"
            >
              <Table2 size={13} />
              <span>Bảng số liệu</span>
            </button>
          </div>
        </div>

        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--viz-series-1)' }} />
            <span>
              Trong tủ lạnh: <strong className="mono-num">{fridgeLots}</strong> lô (
              <span className="mono-num">{fridgeArea?.percentage ?? 0}%</span>)
            </span>
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--viz-series-2)' }} />
            <span>
              Ngoài tủ lạnh: <strong className="mono-num">{outsideLots}</strong> lô (
              <span className="mono-num">{outsideArea?.percentage ?? 0}%</span>)
            </span>
          </span>
        </div>

        {areaMode === 'chart' ? (
          <div className="svg-chart-wrap">
            <svg
              viewBox="0 0 460 220"
              width="100%"
              role="img"
              aria-label="Thanh tỷ lệ Trong tủ lạnh so với Ngoài tủ lạnh và 5 vị trí bảo quản chính"
            >
              {/* Proportional stacked horizontal bar (no pie/donut) */}
              {fridgeLots + outsideLots === 0 ? (
                <rect x={barX} y={10} width={barW} height={28} rx={4} fill="var(--bg-muted)" />
              ) : (
                <g>
                  {fridgeW > 0 ? (
                    <rect
                      x={barX}
                      y={10}
                      width={fridgeW}
                      height={28}
                      rx={4}
                      fill="var(--viz-series-1)"
                    />
                  ) : null}
                  {outsideW > 0 ? (
                    <rect
                      x={barX + fridgeW + gapPx}
                      y={10}
                      width={outsideW}
                      height={28}
                      rx={4}
                      fill="var(--viz-series-2)"
                    />
                  ) : null}
                  {/* Direct label inside bar ONLY when width >= 56px */}
                  {fridgeW >= 56 ? (
                    <text
                      x={barX + fridgeW / 2}
                      y={28}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fontFamily="var(--font-mono)"
                      fill="var(--text-inverse)"
                    >
                      {fridgeLots} ({fridgeArea?.percentage ?? 0}%)
                    </text>
                  ) : null}
                  {outsideW >= 56 ? (
                    <text
                      x={barX + fridgeW + gapPx + outsideW / 2}
                      y={28}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fontFamily="var(--font-mono)"
                      fill="var(--text-inverse)"
                    >
                      {outsideLots} ({outsideArea?.percentage ?? 0}%)
                    </text>
                  ) : null}
                </g>
              )}

              <text
                x={12}
                y={62}
                fontSize={11}
                fontWeight={600}
                fontFamily="var(--font-sans)"
                fill="var(--text-muted)"
              >
                CHI TIẾT NGĂN BẢO QUẢN HÀNG ĐẦU
              </text>

              {topLocations.map((loc, idx) => {
                const y = 76 + idx * 28;
                const labelX = 12;
                const trackX = 176;
                const trackMaxW = 198;
                const w = Math.max(loc.lot_count > 0 ? 12 : 0, (loc.lot_count / maxLocLots) * trackMaxW);
                const fill = ORDINAL_TEAL_VARS[idx] ?? 'var(--viz-ordinal-1)';
                const isHovered = hoverLocationId === loc.location_id;

                return (
                  <g
                    key={loc.location_id}
                    onMouseEnter={() => setHoverLocationId(loc.location_id)}
                    onMouseLeave={() => setHoverLocationId(null)}
                  >
                    <text
                      x={labelX}
                      y={y + 13}
                      fontSize={12}
                      fontFamily="var(--font-sans)"
                      fontWeight={isHovered ? 600 : 500}
                      fill="var(--text-primary)"
                    >
                      {loc.location_name.length > 22
                        ? `${loc.location_name.slice(0, 20)}…`
                        : loc.location_name}
                    </text>
                    <rect x={trackX} y={y + 1} width={trackMaxW} height={16} rx={4} fill="var(--bg-muted)" />
                    {w > 0 ? (
                      <path d={buildRightRoundedRectPath(trackX, y + 1, w, 16, 4)} fill={fill} />
                    ) : null}
                    <text
                      x={trackX + trackMaxW + 10}
                      y={y + 13}
                      fontSize={12}
                      fontFamily="var(--font-mono)"
                      fill="var(--text-secondary)"
                    >
                      {loc.lot_count} lô
                      {loc.expiring_or_expired_count > 0 ? ` (${loc.expiring_or_expired_count}⚠)` : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="chart-table-scroll">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Khu vực</th>
                  <th>Vị trí chi tiết</th>
                  <th className="num-col">Số lô</th>
                  <th className="num-col">Cận/Quá hạn</th>
                </tr>
              </thead>
              <tbody>
                {stats.location_distribution.map((loc) => (
                  <tr key={loc.location_id}>
                    <td>{loc.area_type}</td>
                    <td>{loc.location_name}</td>
                    <td className="num-col mono-num">{loc.lot_count}</td>
                    <td className="num-col mono-num">{loc.expiring_or_expired_count}</td>
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
