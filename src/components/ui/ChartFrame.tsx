import { colors, radius } from './tokens';

/**
 * Cadre commun a tous les graphiques.
 *
 * Les graphiques ne dessinent que la donnee ; ce cadre fournit le titre, la
 * legende, la hauteur et surtout l'etat
 * vide. Sans lui, chaque page reinventait son propre "no data" et affichait
 * parfois un graphique vide sans dire pourquoi.
 */
export function ChartFrame({
  title,
  sub,
  legend,
  height,
  isEmpty = false,
  emptyMessage = 'Aucune donnee sur la periode selectionnee.',
  children,
}: {
  title: string;
  sub?: string;
  /** Legende ou filtre, aligne a droite du titre. */
  legend?: React.ReactNode;
  /** Hauteur fixe de la zone de dessin, pour aligner plusieurs graphiques. */
  height?: number;
  /** Passer `true` quand la serie est vide : evite un graphique muet. */
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{title}</div>
          {sub ? <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{sub}</div> : null}
        </div>
        {legend ? <div style={{ flexShrink: 0 }}>{legend}</div> : null}
      </div>
      {isEmpty ? (
        <div
          style={{
            height: height ?? 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: 12,
            background: colors.surfaceMuted,
            borderRadius: radius.md,
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  );
}
