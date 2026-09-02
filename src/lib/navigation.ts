/**
 * Structure de navigation du dashboard.
 *
 * Source unique de verite pour la barre laterale et pour l'en-tete de page :
 * ajouter une etape ou deplacer une page se fait ici, pas dans les composants.
 *
 * Le dashboard est organise autour du parcours client en 7 etapes. La
 * navigation ne contient plus que cela : les 7 etapes, le module financier et
 * le controle qualite des donnees. Les anciennes pages, conservees en annexes
 * pendant la transition, ont ete supprimees au Lot 9.
 */

export type NavLink = {
  href: string;
  label: string;
  /** Court rappel de ce que la page repond, affiche en info-bulle. */
  hint?: string;
};

export type FunnelStep = NavLink & {
  /** Numero d'etape, de 1 a 7, affiche dans la navigation et l'en-tete. */
  step: number;
  /** Sources de donnees qui alimentent l'etape. */
  sources: string;
};

/** Les 7 etapes du funnel, dans l'ordre du parcours client. */
export const FUNNEL_STEPS: FunnelStep[] = [
  {
    step: 1,
    href: '/funnel/1-experience',
    label: 'UX & Rebond',
    hint: 'Ou les visiteurs quittent le site',
    sources: 'GA4 + Microsoft Clarity',
  },
  {
    step: 2,
    href: '/funnel/2-acquisition',
    label: 'Acquisition',
    hint: 'Meta Ads et Google Ads : cout par visite qualifiee',
    sources: 'Meta Ads + Google Ads',
  },
  {
    step: 3,
    href: '/funnel/3-quiz',
    label: 'Funnel Quiz',
    hint: 'Quiz demarres contre quiz termines',
    sources: 'Base VinPop',
  },
  {
    step: 4,
    href: '/funnel/4-product',
    label: 'Fiche Produit',
    hint: 'Taux de conversion des fiches et du catalogue',
    sources: 'Shopify + Clarity',
  },
  {
    step: 5,
    href: '/funnel/5-taste-kit',
    label: 'Taste Kit & Notes',
    hint: 'Clients ayant note leurs vins, relances a faire',
    sources: 'Base VinPop (labo + notes)',
  },
  {
    step: 6,
    href: '/funnel/6-smart-box',
    label: 'Smart Wine Box',
    hint: 'Passage du Taste Kit a la box, controle zero erreur',
    sources: 'Shopify + base VinPop',
  },
  {
    step: 7,
    href: '/funnel/7-retention',
    label: 'Recurrence & LTV',
    hint: 'Reachat, frequence, churn',
    sources: 'Shopify + base VinPop',
  },
];

/** Module financier : saisie des charges puis simulation investisseur. */
export const FORECAST_LINKS: NavLink[] = [
  { href: '/forecast', label: 'Charges & Break-even', hint: 'Combien de bouteilles pour etre a l equilibre' },
  { href: '/forecast/investor', label: 'Simulateur investisseur', hint: 'Projection d une injection de capital' },
];

/** Controle de la fiabilite des donnees : reste accessible en permanence. */
export const DATA_QUALITY_LINKS: NavLink[] = [
  { href: '/data-quality', label: 'Data Quality' },
  { href: '/tracking-readiness', label: 'Tracking Readiness' },
  { href: '/attribution-readiness', label: 'Attribution Readiness' },
  { href: '/performance-diagnostics', label: 'Performance' },
  { href: '/customer-activity-readiness', label: 'Customer Activity' },
];

/** Retrouve l'etape correspondant a une URL, pour l'en-tete de page. */
export function findFunnelStep(pathname: string): FunnelStep | null {
  return FUNNEL_STEPS.find((step) => step.href === pathname) ?? null;
}
