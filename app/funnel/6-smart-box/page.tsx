import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 6 du funnel : Conversion Smart Wine Box.
 *
 * Les donnees sont branchees au Lot 6 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[5];

export default function Step6Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="Conversion Smart Wine Box"
        subtitle="Le passage du Taste Kit a l abonnement, et le controle zero erreur"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={6}
        fallback={{ href: '/startup-pack-retention', label: 'Startup Pack Retention' }}
        kpis={[
          'Taux de conversion du Taste Kit vers la Smart Wine Box.',
          'Delai moyen entre le Taste Kit et la premiere box.',
          'Controle zero erreur : aucune bouteille notee Dislike ne doit partir dans une box.',
          'Profils aromatiques des box en preparation.',
        ]}
      />
    </DashboardLayout>
  );
}
