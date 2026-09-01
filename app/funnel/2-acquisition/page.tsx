import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 2 du funnel : Acquisition publicitaire.
 *
 * Les donnees sont branchees au Lot 4 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[1];

export default function Step2Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="Acquisition publicitaire"
        subtitle="Meta Ads et Google Ads : ce que coute une visite reellement qualifiee"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={4}
        fallback={{ href: '/meta', label: 'Meta Ads' }}
        kpis={[
          'Meta : hook rate, cout par Landing Page View, depense quotidienne.',
          'Meta : association script video et performance, pour identifier les scripts gagnants.',
          'Google Ads : cout par visite par mot-cle, calcule depuis cost_micros / 1 000 000.',
          'Google Ads : croisement CPLPV et taux de rebond, pour isoler le trafic non qualifie a 100 % de rebond.',
          'Historique des creatives et des scripts avec leurs performances.',
        ]}
      />
    </DashboardLayout>
  );
}
