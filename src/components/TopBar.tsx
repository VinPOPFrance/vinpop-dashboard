'use client';

interface TopBarProps {
  title: string;
  subtitle: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '24px 32px 0',
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#9B9B9B' }}>{today}</span>
        <div style={{
          padding: '6px 12px',
          background: '#F5F4F0',
          border: '1px solid #E8E6E1',
          borderRadius: 6,
          fontSize: 12,
          color: '#6B6B6B',
          cursor: 'pointer',
        }}>
          Last 7 days ▾
        </div>
      </div>
    </div>
  );
}
