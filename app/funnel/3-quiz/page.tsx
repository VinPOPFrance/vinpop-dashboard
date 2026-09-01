import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 3 du funnel : Funnel du quiz.
 *
 * Les donnees sont branchees au Lot 5 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[2];

export default function Step3Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="Funnel du quiz"
        subtitle="Combien de visiteurs commencent le quiz, combien le terminent"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={5}
        fallback={{ href: '/sales-funnel', label: 'Sales Funnel' }}
        kpis={[
          'Quiz demarres contre quiz termines, et taux de completion.',
          'Alerte automatique des que le taux d abandon depasse 80 %.',
          'Abandon par question, pour reperer l etape qui bloque.',
          'Evolution du volume de quiz dans le temps.',
        ]}
      />
    </DashboardLayout>
  );
}
