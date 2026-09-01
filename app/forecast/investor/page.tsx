import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';

/**
 * Simulateur investisseur.
 *
 * Module financier destine aux fondateurs et aux investisseurs. Branche au
 * Lot 8 : la saisie des charges ecrira dans le schema `dashboard`, isole des
 * tables alimentees par Airbyte.
 */
export default function InvestorSimulatorPage() {
  return (
    <DashboardLayout>
      <TopBar
        title="Simulateur investisseur"
        subtitle="Ce que produirait une injection de capital publicitaire"
        showDateRange={false}
      />
      <StepPlaceholder
        sources="CAC et ROAS historiques (etape 2) + modele de charges (Forecast)"
        lot={8}
        kpis={[
          'Saisie du montant d injection de capital.',
          'Acquisition client projetee a partir du CAC et du ROAS historiques.',
          'Projection du chiffre d affaires a 3, 6 et 12 mois.',
          'Volume de bouteilles a acheter et stocker pour honorer la croissance.',
          'Marge nette generee et retour sur investissement pour l investisseur.',
          'Graphique comparatif : scenario actuel contre scenario avec injection.',
        ]}
      />
    </DashboardLayout>
  );
}
