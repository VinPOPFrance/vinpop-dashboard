'use client';

interface StatusBadgeProps {
  status: 'good' | 'warning' | 'critical';
  label?: string;
}

const config = {
  good: { bg: '#EDF7F3', color: '#2D6A4F', dot: '#2D6A4F', label: 'Good' },
  warning: { bg: '#FEF3CD', color: '#B45309', dot: '#B45309', label: 'Warning' },
  critical: { bg: '#FDECEA', color: '#C0392B', dot: '#C0392B', label: 'Critical' },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const c = config[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '20px',
        background: c.bg,
        color: c.color,
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {label ?? c.label}
    </span>
  );
}
