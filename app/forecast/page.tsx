import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';

/**
 * Charges & point d equilibre.
 *
 * Module financier destine aux fondateurs et aux investisseurs. Branche au
 * Lot 7 : la saisie des charges ecrira dans le schema `dashboard`, isole des
 * tables alimentees par Airbyte.
 */
export default function ForecastPage() {
  return (
    <DashboardLayout>
      <TopBar
        title="Charges & point d equilibre"
        subtitle="Combien de bouteilles vendre chaque mois pour etre a l equilibre"
        showDateRange={false}
      />
      <StepPlaceholder
        sources="Saisie manuelle (schema dashboard) + Meta Ads + Google Ads + Shopify"
        lot={7}
        kpis={[
          'Saisie des charges fixes mensuelles : entrepot, logiciels, salaires, divers.',
          'Saisie des charges variables par bouteille : achat du vin, laboratoire, packaging, expedition.',
          'Recuperation automatique des depenses Meta Ads et Google Ads.',
          'Recuperation automatique du chiffre d affaires brut et net depuis Shopify.',
          'Marge sur cout variable, chiffre d affaires d equilibre et nombre exact de bouteilles a vendre.',
          'Marge nette et benefice recurrent.',
        ]}
      />
    </DashboardLayout>
  );
}
