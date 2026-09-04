'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Selecteur de periode de l en-tete.
 *
 * Les raccourcis couvrent la lecture du matin ; les deux champs de dates
 * servent aux questions qui portent sur une periode precise — la semaine d un
 * lancement, les dix jours qu a vecu une campagne. La periode voyage dans l URL
 * plutot que dans un etat React : chaque vue reste partageable par lien et le
 * rendu serveur continue de lire la meme source.
 */

const options: [string, string][] = [
  ['last_7_days', 'Last 7 days'],
  ['last_14_days', 'Last 14 days'],
  ['last_30_days', 'Last 30 days'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['all', 'All time'],
  ['custom', 'Dates precises'],
];

const inputStyle = {
  padding: '5px 8px',
  background: '#F5F4F0',
  border: '1px solid #E8E6E1',
  borderRadius: 6,
  fontSize: 12,
  color: '#6B6B6B',
} as const;

/** Jour civil au format AAAA-MM-JJ, sans passer par UTC (voir `dateToSql`). */
function formatDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get('range');
  const current =
    range === '7d'
      ? 'last_7_days'
      : range === '30d'
        ? 'last_30_days'
        : range === 'all'
          ? 'all'
          : (searchParams.get('period') ?? 'last_7_days');

  const isCustom = current === 'custom';
  const today = new Date();
  // Premiere ouverture des champs : un mois glissant, une periode assez large
  // pour montrer quelque chose et assez courte pour etre ajustee a la main.
  const defaultTo = formatDay(today);
  const defaultFrom = formatDay(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
  const from = searchParams.get('from') ?? defaultFrom;
  const to = searchParams.get('to') ?? defaultTo;

  function push(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <select
        value={current}
        onChange={(event) => {
          const value = event.target.value;
          push(
            value === 'custom'
              ? // Ouvrir les champs sans bornes laisserait la page sur la
                // periode precedente : on pose la periode par defaut des
                // l ouverture, l utilisateur n a plus qu a l ajuster.
                { period: value, from, to }
              : { period: value, from: null, to: null },
          );
        }}
        style={{ ...inputStyle, padding: '6px 12px' }}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {isCustom ? (
        <>
          <input
            type="date"
            value={from}
            max={to}
            aria-label="Date de debut"
            onChange={(event) => push({ period: 'custom', from: event.target.value, to })}
            style={inputStyle}
          />
          <span style={{ fontSize: 12, color: '#9B9B9B' }}>→</span>
          <input
            type="date"
            value={to}
            min={from}
            aria-label="Date de fin"
            onChange={(event) => push({ period: 'custom', from, to: event.target.value })}
            style={inputStyle}
          />
        </>
      ) : null}
    </div>
  );
}
