export type TrendDirection = 'up' | 'down' | 'flat';
export type TrendStatus = 'good' | 'warning' | 'critical' | 'neutral';

export type Trend = {
  current: number;
  previous: number;
  changePercent: number | null;
  direction: TrendDirection;
  status: TrendStatus;
};

const LOWER_IS_BETTER = new Set(['abandoned_checkout_ratio', 'cpc', 'cpm', 'free_quantity_percentage']);

export function calculateTrend(metricName: string, current: number, previous: number): Trend {
  const changePercent = previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100;
  const direction: TrendDirection = changePercent === null || Math.abs(changePercent) < 0.1 ? 'flat' : changePercent > 0 ? 'up' : 'down';
  const lowerIsBetter = LOWER_IS_BETTER.has(metricName);
  const status: TrendStatus =
    direction === 'flat'
      ? 'neutral'
      : lowerIsBetter
        ? direction === 'down'
          ? 'good'
          : 'warning'
        : direction === 'up'
          ? 'good'
          : 'warning';

  return { current, previous, changePercent, direction, status };
}

export function formatTrend(trend: Trend): string {
  if (trend.changePercent === null) return 'No previous baseline';
  const sign = trend.changePercent > 0 ? '+' : '';
  return `${sign}${trend.changePercent.toLocaleString('en-US', { maximumFractionDigits: 1 })}% vs previous period`;
}
