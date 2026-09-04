export type DateRangePeriod =
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'all'
  /** Deux dates saisies a la main, transportees par `from` et `to` dans l URL. */
  | 'custom';

export type DateRange = {
  period: DateRangePeriod;
  label: string;
  start: Date;
  end: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Jour civil au format AAAA-MM-JJ, lu dans le fuseau du serveur.
 *
 * `toISOString` convertit d abord en UTC : a Paris, minuit le 4 septembre
 * devient 22 h le 3 septembre, et toutes les bornes de periode reculaient d un
 * jour. La derniere journee etait donc systematiquement absente des requetes.
 * Les composants locaux de la date evitent cette conversion.
 */
function formatLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateToSql(date: Date): string {
  return formatLocalDay(date);
}

export function dateToGa4(date: Date): string {
  return formatLocalDay(date).replaceAll('-', '');
}

/** Lit une date "AAAA-MM-JJ" en date locale. `null` si la saisie est inexploitable. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Libelle d une periode saisie a la main : 15/07/2026 → 25/07/2026. */
function customLabel(start: Date, end: Date): string {
  const format = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  return `${format(start)} → ${format(end)}`;
}

export function getDateRange(
  period: string | null | undefined,
  from?: string | null,
  to?: string | null,
): DateRange {
  // Une periode saisie a la main prime sur les raccourcis, mais seulement si
  // les deux bornes sont lisibles : une date incomplete doit retomber sur un
  // raccourci plutot que d afficher une page vide.
  if (period === 'custom') {
    const start = parseDay(from);
    const end = parseDay(to);
    if (start && end) {
      // Deux dates saisies a l envers designent la meme periode : les remettre
      // dans l ordre vaut mieux que de renvoyer un intervalle vide.
      const [first, last] = start <= end ? [start, end] : [end, start];
      return { period: 'custom', label: customLabel(first, last), start: first, end: last };
    }
  }

  const normalized = (
    period === 'last_14_days' ||
    period === 'last_30_days' ||
    period === 'this_month' ||
    period === 'last_month' ||
    period === 'all'
      ? period
      : 'last_7_days'
  ) satisfies DateRangePeriod;
  const today = startOfDay(new Date());

  if (normalized === 'all') {
    return {
      period: normalized,
      label: 'All time',
      start: new Date(2000, 0, 1),
      end: today,
    };
  }

  if (normalized === 'this_month') {
    return {
      period: normalized,
      label: 'This month',
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
  }

  if (normalized === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return {
      period: normalized,
      label: 'Last month',
      start,
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };
  }

  const days = normalized === 'last_30_days' ? 30 : normalized === 'last_14_days' ? 14 : 7;
  return {
    period: normalized,
    label: `Last ${days} days`,
    start: addDays(today, -(days - 1)),
    end: today,
  };
}

export function getPreviousDateRange(range: DateRange): DateRange {
  const days = Math.max(1, Math.round((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / DAY_MS) + 1);
  const previousEnd = addDays(startOfDay(range.start), -1);
  return {
    period: range.period,
    label: `Previous ${days} days`,
    start: addDays(previousEnd, -(days - 1)),
    end: previousEnd,
  };
}

export function getDateRangeFromSearchParams(params: Record<string, string | string[] | undefined>): DateRange {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const rawRange = first(params.range);
  const rawPeriod = first(params.period);
  const mappedRange = rawRange === '7d' ? 'last_7_days' : rawRange === '30d' ? 'last_30_days' : rawRange === 'all' ? 'all' : null;
  return getDateRange(mappedRange ?? rawPeriod, first(params.from), first(params.to));
}
