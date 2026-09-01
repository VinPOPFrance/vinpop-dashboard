import { AlertBanner, Card, PageSection, Section, StatusBadge } from '@/components/ui';
import { colors } from '@/components/ui';

/**
 * Contenu provisoire d une etape du funnel.
 *
 * La navigation en 7 etapes est livree au Lot 2, mais les requetes qui
 * alimentent chaque etape arrivent aux Lots 4 a 6. Plutot que de laisser un
 * lien mort, chaque etape affiche ce qu elle mesurera, avec quelles sources,
 * et a quel lot elle sera branchee. Ce composant disparait au fur et a mesure
 * que les etapes recoivent leurs vraies donnees.
 */
export function StepPlaceholder({
  sources,
  lot,
  kpis,
  fallback,
}: {
  /** Sources de donnees de l etape, telles que declarees dans `@/lib/navigation`. */
  sources: string;
  /** Numero du lot qui branchera les donnees reelles. */
  lot: number;
  /** KPI prevus, dans l ordre de lecture de la page. */
  kpis: string[];
  /** Page annexe qui couvre deja partiellement le sujet, en attendant. */
  fallback?: { href: string; label: string };
}) {
  return (
    <>
      <PageSection>
        <AlertBanner tone="info" title={`Etape en cours de construction (Lot ${lot})`}>
          La navigation et les composants sont en place. Les requetes SQL de cette etape seront branchees au Lot {lot}.
          {fallback ? (
            <>
              {' '}En attendant, la page{' '}
              <a href={fallback.href} style={{ color: colors.brand, fontWeight: 600 }}>
                {fallback.label}
              </a>{' '}
              couvre une partie du sujet.
            </>
          ) : null}
        </AlertBanner>
      </PageSection>

      <Section title="Ce que cette etape mesurera" sub={`Sources : ${sources}`}>
        <ul style={{ margin: 0, paddingLeft: 18, color: colors.textSecondary, fontSize: 13, lineHeight: 1.9 }}>
          {kpis.map((kpi) => (
            <li key={kpi}>{kpi}</li>
          ))}
        </ul>
      </Section>

      <PageSection>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status="neutral" label="Donnees non branchees" />
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              Aucun chiffre n est affiche tant que la source n est pas verifiee : un KPI faux est pire qu un KPI absent.
            </span>
          </div>
        </Card>
      </PageSection>
    </>
  );
}
