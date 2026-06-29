'use client';

export function DonutChart({
  data,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 25;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width="150" height="150" viewBox="0 0 42 42" aria-label={centerLabel ?? 'Donut chart'}>
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E8E6E1" strokeWidth="6" />
        {total > 0
          ? data.map((item) => {
              const dash = (item.value / total) * 100;
              const circle = (
                <circle
                  key={item.label}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="6"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={offset}
                />
              );
              offset -= dash;
              return circle;
            })
          : null}
        <text x="21" y="20" textAnchor="middle" fontSize="4" fill="#1A1A1A" fontWeight="700">
          {total.toLocaleString('en-US')}
        </text>
        <text x="21" y="25" textAnchor="middle" fontSize="2.5" fill="#6B6B6B">
          total
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B6B6B', fontSize: 13 }}>
            <span style={{ width: 10, height: 10, background: item.color, borderRadius: 2 }} />
            {item.label}: {item.value.toLocaleString('en-US')}
          </div>
        ))}
      </div>
    </div>
  );
}
