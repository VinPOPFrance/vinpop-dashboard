import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 1 du funnel : UX & Rebond.
 *
 * Les donnees sont branchees au Lot 4 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[0];

export default function Step1Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="UX & Rebond"
        subtitle="Ou les visiteurs abandonnent avant meme de commencer le parcours"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={4}
        fallback={{ href: '/site-behavior', label: 'Site Behavior' }}
        kpis={[
          'Taux de rebond global du site (GA4).',
          'Classement des pages par taux de rebond, avec alerte au-dela du seuil.',
          'Sessions et duree moyenne par page d atterrissage.',
          'Liens profonds vers les heatmaps et enregistrements Microsoft Clarity.',
        ]}
      />
    </DashboardLayout>
  );
}
