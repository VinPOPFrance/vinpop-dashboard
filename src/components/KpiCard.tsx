'use client';

import { KpiCard as KpiCardType } from '@/data/mock-kpis';
import { StatusBadge } from './StatusBadge';

export function KpiCard({ kpi }: { kpi: KpiCardType }) {
  const isUp = kpi.comparisonDelta >= 0;
  const deltaColor = isUp ? '#2D6A4F' : '#C0392B';

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8E6E1',
      borderRadius: 10,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: '#6B6B6B', fontWeight: 500 }}>{kpi.label}</span>
        <StatusBadge status={kpi.status} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>
        {kpi.value}
      </div>
      <div style={{ fontSize: 12, color: deltaColor, fontWeight: 500 }}>
        {isUp ? '▲' : '▼'} {kpi.comparison}
      </div>
    </div>
  );
}
