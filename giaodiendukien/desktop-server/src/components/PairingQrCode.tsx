import { useMemo } from 'react';

interface PairingQrCodeProps {
  ip: string;
  port: number;
  pin: string;
  size?: number;
}

const GRID_SIZE = 21;

function isFinderModule(row: number, col: number): boolean | null {
  const corners: Array<[number, number]> = [
    [0, 0],
    [0, GRID_SIZE - 7],
    [GRID_SIZE - 7, 0],
  ];
  for (const [r0, c0] of corners) {
    if (row >= r0 && row < r0 + 7 && col >= c0 && col < c0 + 7) {
      const dr = row - r0;
      const dc = col - c0;
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
      if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
      return false;
    }
  }
  return null;
}

export function PairingQrCode({ ip, port, pin, size = 112 }: PairingQrCodeProps) {
  const payload = `FOODMGMT://${ip}:${port}?pin=${pin}`;

  const modules = useMemo(() => {
    let hash = 2166136261;
    for (let i = 0; i < payload.length; i += 1) {
      hash ^= payload.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const cells: boolean[][] = [];
    for (let r = 0; r < GRID_SIZE; r += 1) {
      const row: boolean[] = [];
      for (let c = 0; c < GRID_SIZE; c += 1) {
        const finder = isFinderModule(r, c);
        if (finder !== null) {
          row.push(finder);
          continue;
        }
        // Timing strips
        if (r === 6 || c === 6) {
          row.push((r + c) % 2 === 0);
          continue;
        }
        // Deterministic pseudo-random module derived from endpoint + pin
        const seed = (hash ^ ((r + 1) * 73856093) ^ ((c + 1) * 19349663)) >>> 0;
        row.push((seed % 11) < 5);
      }
      cells.push(row);
    }
    return cells;
  }, [payload]);

  const cellSize = 4;
  const viewWidth = (GRID_SIZE + 2) * cellSize;

  return (
    <div className="qr-preview-box" aria-label={`Mã QR kết nối ${ip}:${port}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewWidth} ${viewWidth}`}
        role="img"
        aria-label={`Mã QR ghép nối Server ${ip}:${port} PIN ${pin}`}
      >
        <rect x={0} y={0} width={viewWidth} height={viewWidth} fill="#FFFFFF" rx={4} />
        {modules.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={(c + 1) * cellSize}
                y={(r + 1) * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0F172A"
              />
            ) : null,
          ),
        )}
      </svg>
      <div className="qr-caption mono-num">
        {ip}:{port} · PIN {pin}
      </div>
    </div>
  );
}
