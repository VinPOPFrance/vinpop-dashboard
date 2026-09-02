import Link from 'next/link';
import { Card, StatusBadge, colors, radius } from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getFunnelPipeline, type FunnelPipelineStep } from '@/lib/funnelPipeline';
import { timeAsync } from '@/lib/performance';

/**
 * Bande de synthese des 7 etapes, affichee en haut de chaque page du funnel.
 *
 * Elle repond a la premiere question du matin : ou est le goulot d etranglement
 * aujourd hui. Chaque carte porte le KPI principal de son etape et une pastille
 * de statut, donc le blocage se voit sans ouvrir les sept pages.
 *
 * Toutes les lectures passent par le cache partage : afficher la bande sur les
 * sept pages ne multiplie pas les requetes. Elle est malgre tout rendue sous
 * `Suspense` par les pages, pour ne jamais retarder le contenu principal.
 */
export async function FunnelPipelineBar({
  currentStep,
  searchParams,
}: {
  /** Etape de la page courante, mise en avant dans la bande. */
  currentStep: number;
  /** Parametres de la page : la bande suit la meme periode que son ecran. */
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const range = getDateRangeFromSearchParams(searchParams ?? {});
  const steps = await timeAsync('component:FunnelPipelineBar', () => getFunnelPipeline(range), {
    category: 'other',
    cacheStatus: 'unknown',
  });

  return (
    <section style={{ padding: '0 32px', marginTop: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {steps.map((step) => (
          <PipelineCard key={step.step} step={step} current={step.step === currentStep} />
        ))}
      </div>
    </section>
  );
}

/**
 * Une colonne de la bande.
 *
 * `flex: 1 1 150px` remplace une grille a 7 colonnes fixes : au-dela de sept
 * cartes de 150 px, la ligne se replie d elle-meme en deux ou trois rangees
 * plutot que d ecraser les libelles.
 */
function PipelineCard({ step, current }: { step: FunnelPipelineStep; current: boolean }) {
  return (
    <Link
      href={step.href}
      prefetch={false}
      title={step.detail}
      style={{ flex: '1 1 150px', minWidth: 0, textDecoration: 'none' }}
    >
      <Card
        style={{
          padding: '11px 13px',
          height: '100%',
          // L etape ouverte est bordee en bordeaux : la bande sert aussi de
          // reperage dans le parcours.
          borderColor: current ? colors.brand : colors.border,
          background: current ? colors.brandTint : colors.surface,
        }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.04em' }}>
          {step.step}. {step.label.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: step.kpiValue === 'Indisponible' ? colors.textMuted : colors.text,
            margin: '6px 0 2px',
          }}
        >
          {step.kpiValue}
        </div>
        <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8, lineHeight: 1.3 }}>
          {step.kpiLabel}
        </div>
        <StatusBadge status={step.status} label={step.statusLabel} />
      </Card>
    </Link>
  );
}

/** Squelette affiche pendant que la bande charge, pour figer la hauteur. */
export function FunnelPipelineBarSkeleton() {
  return (
    <section style={{ padding: '0 32px', marginTop: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
          <div
            key={step}
            style={{
              flex: '1 1 150px',
              minWidth: 0,
              height: 112,
              background: colors.surfaceMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
            }}
          />
        ))}
      </div>
    </section>
  );
}
