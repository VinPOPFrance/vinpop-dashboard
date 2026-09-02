'use client';

import { formatNumber, formatPercent } from '@/lib/format';

/**
 * Formats de valeur disponibles.
 *
 * `format` est une chaine et non une fonction : un composant serveur ne peut
 * pas passer de fonction a un composant client (React ne sait pas la
 * serialiser), ce qui provoquait des erreurs 500 cote serveur.
 * Les composants clients peuvent toujours passer `valueFormatter`.
 */
export type BarChartFormat = 'raw' | 'number' | 'percent';

function formatValue(value: number, format: BarChartFormat): string {
  if (format === 'number') return formatNumber(value);
  if (format === 'percent') return formatPercent(value);
  return value.toLocaleString('en-US');
}

export function BarChart({
  data,
  format = 'raw',
  valueFormatter,
  onBarClick,
}: {
  data: { label: string; value: number; color?: string }[];
  /** Formatage serialisable, utilisable depuis un composant serveur. */
  format?: BarChartFormat;
  /** Formatage libre, reserve aux composants clients. */
  valueFormatter?: (value: number) => string;
  onBarClick?: (label: string) => void;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((item) => {
        const width = max > 0 ? Math.max((item.value / max) * 100, 2) : 2;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onBarClick?.(item.label)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 220px) 1fr auto',
              alignItems: 'center',
              gap: 10,
              border: 0,
              background: 'transparent',
              padding: 0,
              cursor: onBarClick ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#1A1A1A', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            <span style={{ height: 10, background: '#F5F4F0', borderRadius: 99, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${width}%`, height: '100%', background: item.color ?? '#722F37' }} />
            </span>
            <span style={{ color: '#6B6B6B', fontSize: 12 }}>
              {valueFormatter ? valueFormatter(item.value) : formatValue(item.value, format)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
