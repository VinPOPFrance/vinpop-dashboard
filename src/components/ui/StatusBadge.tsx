import { colors, radius } from './tokens';

/**
 * Pastille d'etat.
 *
 * Utilisee pour les alertes des 7 etapes du funnel : abandon de quiz > 80 %,
 * page a fort rebond, bouteille "Dislike" detectee dans une Smart Wine Box...
 * Le libelle par defaut suffit pour un statut brut ; passer `label` pour
 * afficher la valeur qui declenche l'alerte (ex. "Abandon 84 %").
 */

export type BadgeStatus = 'good' | 'warning' | 'critical' | 'info' | 'neutral';

const config: Record<BadgeStatus, { background: string; color: string; label: string }> = {
  good: { background: colors.goodSurface, color: colors.good, label: 'Good' },
  warning: { background: colors.warningSurface, color: colors.warning, label: 'Warning' },
  critical: { background: colors.criticalSurface, color: colors.critical, label: 'Critical' },
  info: { background: colors.infoSurface, color: colors.info, label: 'Info' },
  neutral: { background: colors.surfaceMuted, color: colors.textSecondary, label: 'Neutral' },
};

export function StatusBadge({ status, label }: { status: BadgeStatus; label?: string }) {
  const tone = config[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: radius.pill,
        background: tone.background,
        color: tone.color,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.color, flexShrink: 0 }} />
      {label ?? tone.label}
    </span>
  );
}
