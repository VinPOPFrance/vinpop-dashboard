'use client';

import { Priority } from '@/data/mock-actions';

const config: Record<Priority, { bg: string; color: string }> = {
  Low: { bg: '#F5F4F0', color: '#6B6B6B' },
  Medium: { bg: '#EBF2FF', color: '#1A56DB' },
  High: { bg: '#FEF3CD', color: '#B45309' },
  Critical: { bg: '#FDECEA', color: '#C0392B' },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = config[priority];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '20px',
        background: c.bg,
        color: c.color,
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {priority}
    </span>
  );
}
