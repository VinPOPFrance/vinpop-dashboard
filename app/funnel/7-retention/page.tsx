import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 7 du funnel : Recurrence & LTV.
 *
 * Les donnees sont branchees au Lot 6 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[6];

export default function Step7Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="Recurrence & LTV"
        subtitle="Ce que rapporte un client dans la duree, et qui est en train de partir"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={6}
        fallback={{ href: '/repeat-customers', label: 'Repeat Customers' }}
        kpis={[
          'Taux de recurrence des commandes et frequence d achat.',
          'Valeur vie client (LTV) par cohorte d acquisition.',
          'Detection de churn : clients sortis de leur rythme habituel de reachat.',
          'Liste des clients a relancer en priorite.',
        ]}
      />
    </DashboardLayout>
  );
}
