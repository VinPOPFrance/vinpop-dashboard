'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { colors, radius, toneColors, type Tone } from './tokens';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';

/**
 * Tableau de donnees triable et filtrable : le composant unique pour toute
 * liste du dashboard (mots-cles Google Ads, clients a relancer, creatives Meta,
 * bouteilles a controler...).
 *
 * Reprend `SortableDataTable` (supprime au profit de celui-ci) avec la meme API
 * de rendu, plus trois ajouts : etat vide explicite, mise en forme par colonne
 * (`strong`, `tone`) et tri initial documente.
 */

export type DataTableColumn<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  /** Texte de l'infobulle sur l'en-tete : sert a definir le KPI. */
  description?: string;
  /** Pilote a la fois le formatage et la comparaison de tri. */
  type?: 'text' | 'number' | 'money' | 'percent' | 'date';
  align?: 'left' | 'right' | 'center';
  width?: number;
  /** Met la colonne en gras (colonne d'identite : nom du vin, du client...). */
  strong?: boolean;
  /** Colore la colonne pour signaler une valeur a surveiller. */
  tone?: Tone;
  /**
   * Colonne portant l'URL de destination, quand la cellule doit etre cliquable.
   *
   * Version serialisable d'un rendu personnalise : un composant serveur ne peut
   * pas passer de fonction au tableau, il designe donc une colonne compagnon
   * (`creative` + `creativeHref`). Une ligne sans URL reste du texte simple.
   */
  hrefKey?: keyof T & string;
  /**
   * Texte affiche quand la cellule est vide.
   *
   * Par defaut une valeur numerique absente s affiche "Unavailable", ce qui
   * signale une mesure manquante. Certaines colonnes ont au contraire des
   * cases vides par construction — le budget d un canal qui ne s achete pas —
   * ou "Unavailable" ferait croire a une panne de mesure.
   */
  emptyLabel?: string;
};

type SortDirection = 'asc' | 'desc';

/** Valeur brute utilisee pour le tri : les nuls tombent toujours en bas. */
function rawComparable(value: unknown, type: DataTableColumn<Record<string, unknown>>['type']) {
  if (value === null || value === undefined) return type === 'text' ? '' : Number.NEGATIVE_INFINITY;
  if (type === 'number' || type === 'money' || type === 'percent') return Number(value) || 0;
  if (type === 'date') return new Date(String(value)).getTime() || 0;
  return String(value).toLowerCase();
}

/** Valeur affichee : distingue "pas de valeur" (-) de "donnee indisponible". */
function displayValue(
  value: unknown,
  type: DataTableColumn<Record<string, unknown>>['type'],
  emptyLabel?: string,
) {
  if (value === null || value === undefined || value === '') {
    return emptyLabel ?? (type === 'text' || !type ? '-' : 'Unavailable');
  }
  if (type === 'money') return formatEuro(typeof value === 'number' ? value : Number(value));
  if (type === 'percent') return formatPercent(typeof value === 'number' ? value : Number(value));
  if (type === 'number') return formatNumber(typeof value === 'number' ? value : Number(value), 2);
  if (type === 'date') return formatDate(value ? String(value) : null);
  return String(value);
}

/**
 * Mise en forme heritee, appliquee quand la colonne ne declare ni `strong` ni
 * `tone`. Elle reproduit le rendu d'avant le Lot 2 pour ne pas modifier
 * visuellement les pages non encore migrees ; les nouvelles pages doivent
 * declarer `strong` / `tone` explicitement et cette heuristique disparaitra
 * quand toutes les pages seront passees aux 7 etapes.
 */
function legacyCellStyle<T extends Record<string, unknown>>(column: DataTableColumn<T>) {
  const key = column.key.toLowerCase();
  const tone: Tone | undefined = key.includes('dislike') || key.includes('discount') ? 'warning' : undefined;
  const strong = column.key === 'product' || column.key === 'wine' || column.key === 'name';
  return { tone, strong };
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  searchPlaceholder = 'Search...',
  enableSearch = true,
  emptyMessage = 'Aucune ligne a afficher.',
  selectedRowKey,
  rowKey,
  getRowKey,
  onRowClick,
  initialSortKey,
  initialSortDirection = 'desc',
  maxHeight,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  searchPlaceholder?: string;
  enableSearch?: boolean;
  /** Message affiche quand aucune ligne ne subsiste apres filtrage. */
  emptyMessage?: string;
  selectedRowKey?: string;
  /**
   * Colonne servant d identifiant de ligne.
   *
   * Version serialisable de `getRowKey` : un composant serveur ne peut pas
   * passer de fonction a un composant client, il designe donc une colonne.
   */
  rowKey?: keyof T & string;
  /** Identifiant calcule. Reserve aux composants clients. */
  getRowKey?: (row: T) => string;
  /** Reserve aux composants clients, pour la meme raison. */
  onRowClick?: (row: T) => void;
  initialSortKey?: keyof T & string;
  initialSortDirection?: SortDirection;
  /** Active le defilement interne avec en-tete collante. */
  maxHeight?: number;
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
        <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}`, background: colors.surface }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%',
              maxWidth: 320,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              padding: '9px 10px',
              fontSize: 13,
              color: colors.text,
              background: colors.surfaceInput,
            }}
          />
        </div>
      ) : null}
      <div style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : undefined, maxHeight }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: colors.surfaceMuted, color: colors.textSecondary, textAlign: 'left' }}>
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    title={column.description}
                    onClick={() => {
                      // Un clic sur la colonne deja triee inverse le sens ; sinon on
                      // trie la nouvelle colonne dans son sens le plus utile
                      // (alphabetique pour du texte, decroissant pour un chiffre).
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
                      position: maxHeight ? 'sticky' : undefined,
                      top: maxHeight ? 0 : undefined,
                      background: colors.surfaceMuted,
                      zIndex: maxHeight ? 1 : undefined,
                    }}
                  >
                    {column.label} {isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '18px 14px',
                    textAlign: 'center',
                    color: colors.textMuted,
                    borderTop: `1px solid ${colors.border}`,
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, index) => {
                const key = getRowKey ? getRowKey(row) : rowKey ? String(row[rowKey]) : String(index);
                const isSelected = selectedRowKey === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderTop: `1px solid ${colors.border}`,
                      background: isSelected ? colors.brandTint : colors.surface,
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                  >
                    {columns.map((column) => {
                      // Priorite a la declaration explicite de la colonne ; sinon on
                      // retombe sur le rendu historique (voir `legacyCellStyle`).
                      const legacy = legacyCellStyle(column);
                      const tone = column.tone ?? legacy.tone;
                      const strong = column.strong ?? legacy.strong;
                      const href = column.hrefKey ? String(row[column.hrefKey] ?? '') : '';
                      const content = displayValue(row[column.key], column.type, column.emptyLabel);
                      return (
                        <td
                          key={column.key}
                          style={{
                            padding: '10px 14px',
                            color: tone ? toneColors(tone).color : colors.textSecondary,
                            fontWeight: strong ? 700 : 400,
                            textAlign: column.align ?? (column.type && column.type !== 'text' ? 'right' : 'left'),
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {href ? (
                            <Link href={href} prefetch={false} style={{ color: colors.brand, textDecoration: 'none' }}>
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
