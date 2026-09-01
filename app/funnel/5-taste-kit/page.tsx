import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 5 du funnel : Taste Kit & notation des vins.
 *
 * Les donnees sont branchees au Lot 6 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[4];

export default function Step5Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="Taste Kit & notation des vins"
        subtitle="Qui a note ses vins, qui doit etre relance, et si l algorithme voit juste"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={6}
        fallback={{ href: '/ratings-intelligence', label: 'Ratings Intelligence' }}
        kpis={[
          'Part des clients ayant note leurs vins (Love / Like / Dislike).',
          'Nombre de vins restant a noter, client par client.',
          'Taux de concordance entre la recommandation (quiz + labo) et la note reelle.',
          'Table actionnable des clients a relancer pour notation.',
        ]}
      />
    </DashboardLayout>
  );
}
