import { colors } from './tokens';
import { formatTrend, type Trend } from '@/lib/analytics/trends';

/** Variation par rapport a la periode precedente, avec fleche et couleur d'etat. */
export function TrendBadge({ trend }: { trend: Trend }) {
  const color =
    trend.status === 'good' ? colors.good
    : trend.status === 'warning' ? colors.warning
    : trend.status === 'critical' ? colors.critical
    : colors.textSecondary;
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';

  return (
    <span style={{ color, fontSize: 12, fontWeight: 700 }}>
      {arrow} {formatTrend(trend)}
    </span>
  );
}
