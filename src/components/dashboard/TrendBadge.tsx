'use client';

import { formatTrend, type Trend } from '@/lib/analytics/trends';

export function TrendBadge({ trend }: { trend: Trend }) {
  const color = trend.status === 'good' ? '#2D6A4F' : trend.status === 'warning' ? '#B45309' : trend.status === 'critical' ? '#C0392B' : '#6B6B6B';
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';

  return (
    <span style={{ color, fontSize: 12, fontWeight: 700 }}>
      {arrow} {formatTrend(trend)}
    </span>
  );
}
