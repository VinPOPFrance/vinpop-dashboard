/**
 * Point d'entree unique du design system.
 *
 * Toutes les pages importent depuis `@/components/ui` : un seul chemin a
 * connaitre, et un seul endroit ou ajouter une brique. Les anciens modules
 * `Layout.tsx`, `MetricCard.tsx`, `SortableDataTable.tsx`, `StatusBadge.tsx` et
 * `dashboard/TrendBadge.tsx` ont ete remplaces par ces fichiers au Lot 2.
 */

export { AlertBanner } from './AlertBanner';
export { ChartFrame } from './ChartFrame';
export { DataTable, type DataTableColumn } from './DataTable';
export { Card, PageSection, Section, SectionTitle } from './Section';
export { StatCard, StatGrid } from './StatCard';
export { StatusBadge, type BadgeStatus } from './StatusBadge';
export { TrendBadge } from './TrendBadge';
export { colors, radius, toneColors, type Tone } from './tokens';
