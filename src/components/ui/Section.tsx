import { colors, radius } from './tokens';

/**
 * Primitives de mise en page.
 *
 * `PageSection`, `SectionTitle` et `Card` remplacent a l'identique l'ancien
 * `src/components/Layout.tsx` (meme API, memes marges) afin que les pages
 * existantes continuent de s'afficher sans retouche.
 * `Section` est la nouvelle brique preferee : elle assemble titre + carte en
 * un seul composant, ce qui evite de repeter le trio dans chaque page du funnel.
 */

/** Bloc vertical d'une page, avec les marges horizontales standard. */
export function PageSection({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: '0 32px', marginTop: 28 }}>
      {children}
    </section>
  );
}

/** Titre de bloc, avec sous-titre optionnel expliquant la lecture du bloc. */
export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.text, margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: colors.textMuted, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

/** Conteneur blanc borde : l'unite visuelle de base du dashboard. */
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: '20px 22px',
      ...style,
    }}>
      {children}
    </div>
  );
}

/**
 * Bloc complet : titre + sous-titre + contenu.
 *
 * `bare` sert quand le contenu fournit deja ses propres cartes (une grille de
 * `StatCard` par exemple) et n'a donc pas besoin d'etre enferme dans une carte.
 */
export function Section({
  title,
  sub,
  actions,
  bare = false,
  children,
}: {
  title: string;
  sub?: string;
  /** Contenu aligne a droite du titre (filtre, lien, badge de statut). */
  actions?: React.ReactNode;
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PageSection>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <SectionTitle sub={sub}>{title}</SectionTitle>
        {actions ? <div style={{ flexShrink: 0 }}>{actions}</div> : null}
      </div>
      {bare ? children : <Card>{children}</Card>}
    </PageSection>
  );
}
