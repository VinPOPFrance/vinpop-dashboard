import { Card } from '@/components/Layout';

export function InsightCard({ title, children, tone = 'neutral' }: { title: string; children: React.ReactNode; tone?: 'good' | 'warning' | 'critical' | 'neutral' }) {
  const color = tone === 'good' ? '#2D6A4F' : tone === 'critical' ? '#C0392B' : tone === 'warning' ? '#B45309' : '#1A1A1A';

  return (
    <Card>
      <div style={{ color, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>{children}</div>
    </Card>
  );
}
