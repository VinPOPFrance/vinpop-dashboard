'use client';

import { useMemo, useState } from 'react';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';

export type SortableColumn<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'percent' | 'date';
  align?: 'left' | 'right' | 'center';
  width?: number;
};

type SortDirection = 'asc' | 'desc';

function rawComparable(value: unknown, type: SortableColumn<Record<string, unknown>>['type']) {
  if (value === null || value === undefined) return type === 'text' ? '' : Number.NEGATIVE_INFINITY;
  if (type === 'number' || type === 'money' || type === 'percent') return Number(value) || 0;
  if (type === 'date') return new Date(String(value)).getTime() || 0;
  return String(value).toLowerCase();
}

function displayValue(value: unknown, type: SortableColumn<Record<string, unknown>>['type']) {
  if (type === 'money') return formatEuro(typeof value === 'number' ? value : Number(value));
  if (type === 'percent') return formatPercent(typeof value === 'number' ? value : Number(value));
  if (type === 'number') return formatNumber(typeof value === 'number' ? value : Number(value), 2);
  if (type === 'date') return formatDate(value ? String(value) : null);
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

export function SortableDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  searchPlaceholder = 'Search...',
  enableSearch = true,
  selectedRowKey,
  getRowKey,
  onRowClick,
  initialSortKey,
  initialSortDirection = 'desc',
}: {
  columns: SortableColumn<T>[];
  rows: T[];
  searchPlaceholder?: string;
  enableSearch?: boolean;
  selectedRowKey?: string;
  getRowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSortKey?: keyof T & string;
  initialSortDirection?: SortDirection;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>(initialSortKey ?? columns[0]?.key ?? '');
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const visibleRows = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const filtered = lowerQuery
      ? rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(lowerQuery)))
      : rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column) return filtered;

    return [...filtered].sort((a, b) => {
      const left = rawComparable(a[column.key], column.type);
      const right = rawComparable(b[column.key], column.type);
      const result = left > right ? 1 : left < right ? -1 : 0;
      return sortDirection === 'asc' ? result : -result;
    });
  }, [columns, query, rows, sortDirection, sortKey]);

  return (
    <div>
      {enableSearch ? (
        <div style={{ padding: 12, borderBottom: '1px solid #E8E6E1', background: '#FFFFFF' }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%',
              maxWidth: 320,
              border: '1px solid #E8E6E1',
              borderRadius: 7,
              padding: '9px 10px',
              fontSize: 13,
              color: '#1A1A1A',
              background: '#FBFAF8',
            }}
          />
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    onClick={() => {
                      if (isSorted) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortKey(column.key);
                        setSortDirection(column.type === 'text' ? 'asc' : 'desc');
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      fontWeight: 700,
                      textAlign: column.align ?? (column.type && column.type !== 'text' ? 'right' : 'left'),
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minWidth: column.width,
                    }}
                  >
                    {column.label} {isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const rowKey = getRowKey ? getRowKey(row) : String(index);
              const isSelected = selectedRowKey === rowKey;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    borderTop: '1px solid #E8E6E1',
                    background: isSelected ? '#FFF6F7' : '#FFFFFF',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: '10px 14px',
                        color: column.key.toLowerCase().includes('dislike') || column.key.toLowerCase().includes('discount') ? '#B45309' : '#6B6B6B',
                        fontWeight: column.key === 'product' || column.key === 'wine' || column.key === 'name' ? 700 : 400,
                        textAlign: column.align ?? (column.type && column.type !== 'text' ? 'right' : 'left'),
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {displayValue(row[column.key], column.type)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
