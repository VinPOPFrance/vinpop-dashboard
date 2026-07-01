'use client';

export type LineChartPoint = { label: string; value: number; tooltip?: string };

export function LineChart({
  data,
  color = '#722F37',
  selectedLabel = null,
  onPointClick,
}: {
  data: LineChartPoint[];
  color?: string;
  selectedLabel?: string | null;
  onPointClick?: (point: LineChartPoint) => void;
}) {
  const width = 520;
  const height = 180;
  const padding = 24;
  const max = Math.max(...data.map((item) => item.value), 0);
  const min = Math.min(...data.map((item) => item.value), 0);
  const range = Math.max(max - min, 1);
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? padding : padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((item.value - min) / range) * (height - padding * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block' }} role="img">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E8E6E1" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E8E6E1" />
      {points.length > 0 ? <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" /> : null}
      {points.map((point) => {
        const selected = selectedLabel === point.label;
        return (
        <circle
          key={`${point.label}.${point.x}`}
          cx={point.x}
          cy={point.y}
          r={selected ? 6 : 4}
          fill={selected ? '#FFFFFF' : color}
          stroke={color}
          strokeWidth={selected ? 3 : 0}
          style={{ cursor: onPointClick ? 'pointer' : 'default' }}
          onClick={() => onPointClick?.(point)}
        >
          <title>{point.tooltip ?? `${point.label}: ${point.value.toLocaleString('en-US')}`}</title>
        </circle>
        );
      })}
      {points.slice(-4).map((point) => (
        <text key={point.label} x={point.x} y={height - 6} textAnchor="middle" fontSize="10" fill="#9B9B9B">
          {point.label.slice(5)}
        </text>
      ))}
    </svg>
  );
}
