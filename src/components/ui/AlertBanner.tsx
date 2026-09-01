import { colors, radius, toneColors, type Tone } from './tokens';

/**
 * Banniere d'alerte pleine largeur.
 *
 * Sert a rendre visible, en haut d'une etape, la condition qui demande une
 * action aujourd'hui : abandon de quiz au-dela de 80 %, page a fort rebond,
 * mot-cle Google Ads a 100 % de rebond, bouteille "Dislike" prete a partir.
 * Quand tout va bien, ne pas afficher de banniere plutot qu'en afficher une
 * verte : le dashboard doit signaler les problemes, pas se feliciter.
 */
export function AlertBanner({
  tone = 'warning',
  title,
  children,
  action,
}: {
  tone?: Tone;
  /** Le probleme, formule en une phrase. */
  title: string;
  /** Detail chiffre ou explication de la regle declenchee. */
  children?: React.ReactNode;
  /** Lien ou bouton menant a l'action corrective. */
  action?: React.ReactNode;
}) {
  const { color, background } = toneColors(tone);

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        background,
        border: `1px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        borderRadius: radius.md,
        padding: '12px 14px',
      }}
    >
      <div>
        <div style={{ color, fontSize: 13, fontWeight: 700 }}>{title}</div>
        {children ? (
          <div style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{children}</div>
        ) : null}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}
