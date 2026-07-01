'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const options = [
  ['last_7_days', 'Last 7 days'],
  ['last_14_days', 'Last 14 days'],
  ['last_30_days', 'Last 30 days'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['all', 'All time'],
];

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get('range');
  const current = range === '7d' ? 'last_7_days' : range === '30d' ? 'last_30_days' : range === 'all' ? 'all' : searchParams.get('period') ?? 'last_7_days';

  return (
    <select
      value={current}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set('period', event.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      style={{
        padding: '6px 12px',
        background: '#F5F4F0',
        border: '1px solid #E8E6E1',
        borderRadius: 6,
        fontSize: 12,
        color: '#6B6B6B',
      }}
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}
