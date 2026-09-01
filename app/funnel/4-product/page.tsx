import { DashboardLayout } from '@/components/DashboardLayout';
import { StepPlaceholder } from '@/components/funnel/StepPlaceholder';
import { TopBar } from '@/components/TopBar';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * Etape 4 du funnel : Conversion fiche produit.
 *
 * Les donnees sont branchees au Lot 5 ; la page decrit pour l instant les KPI
 * qu elle affichera et les sources qui les alimenteront.
 */

const STEP = FUNNEL_STEPS[3];

export default function Step4Page() {
  return (
    <DashboardLayout>
      <TopBar
        title="Conversion fiche produit"
        subtitle="Ce que la fiche produit et le catalogue transforment reellement"
        step={STEP.step}
      />
      <StepPlaceholder
        sources={STEP.sources}
        lot={5}
        fallback={{ href: '/shopify-products-summary', label: 'Products & Stock' }}
        kpis={[
          'Taux de conversion des fiches produit (Shopify).',
          'Nombre d achats par produit et panier moyen associe.',
          'Comportement Clarity sur les sections de la fiche produit.',
          'Produits vus souvent mais jamais achetes.',
        ]}
      />
    </DashboardLayout>
  );
}
