import { Card } from '@/components/Layout';

export function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warning';
}) {
  const color = tone === 'warning' ? '#B45309' : tone === 'good' ? '#2D6A4F' : '#1A1A1A';

  return (
    <Card>
      <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {hint ? <p style={{ color: '#9B9B9B', fontSize: 12, margin: '6px 0 0' }}>{hint}</p> : null}
    </Card>
  );
}
