import { Card } from './Section';
import { TrendBadge } from './TrendBadge';
import { colors, toneColors, type Tone } from './tokens';
import type { Trend } from '@/lib/analytics/trends';

/**
 * Carte de KPI : le composant unique pour afficher une valeur chiffree.
 *
 * Remplace l'ancien couple `MetricCard` / `KpiCard` (ce dernier etait mort et a
 * ete supprime au Lot 1). L'API de `MetricCard` est conservee telle quelle
 * (`label`, `value`, `hint`, `tone`) pour que les pages existantes fonctionnent
 * sans modification ; `trend` et `badge` sont les ajouts du Lot 2.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  trend,
  badge,
}: {
  /** Nom du KPI, en haut de la carte. */
  label: string;
  /** Valeur deja formatee (voir `@/lib/format`). */
  value: string;
  /** Aide de lecture : comment interpreter la valeur, quoi faire si elle dérive. */
  hint?: React.ReactNode;
  /** Colore la valeur pour signaler un etat sain, a surveiller ou critique. */
  tone?: Tone;
  /** Variation vs periode precedente, affichee sous la valeur. */
  trend?: Trend | null;
  /** Pastille libre affichee en haut a droite (statut, source de donnees). */
  badge?: React.ReactNode;
}) {
  // `default` doit rester le noir du texte principal, pas le gris des jetons de fond.
  const valueColor = tone === 'default' ? colors.text : toneColors(tone).color;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>{label}</div>
        {badge ? <div style={{ flexShrink: 0 }}>{badge}</div> : null}
      </div>
      <div style={{ color: valueColor, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {trend ? <div style={{ marginTop: 6 }}><TrendBadge trend={trend} /></div> : null}
      {hint ? <p style={{ color: colors.textMuted, fontSize: 12, margin: '6px 0 0' }}>{hint}</p> : null}
    </Card>
  );
}

/**
 * Grille responsive de `StatCard`.
 *
 * Evite de recopier le meme `gridTemplateColumns` dans chaque page : les rangees
 * de KPI des 7 etapes doivent toutes se comporter pareil.
 */
export function StatGrid({ children, min = 200 }: { children: React.ReactNode; min?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12 }}>
      {children}
    </div>
  );
}
