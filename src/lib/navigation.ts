/**
 * Structure de navigation du dashboard.
 *
 * Source unique de verite pour la barre laterale et pour l'en-tete de page :
 * ajouter une etape ou deplacer une page se fait ici, pas dans les composants.
 *
 * Le dashboard est organise autour du parcours client en 7 etapes. Tout ce qui
 * ne sert pas directement a lire ce parcours est range dans les annexes, pour
 * que la navigation principale reste courte et sequentielle.
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

export type AnnexGroup = {
  title: string;
  links: NavLink[];
};

/**
 * Annexes : pages conservees mais sorties de la navigation principale.
 *
 * Le premier groupe contient les vues actuelles dont le contenu sera absorbe
 * par les etapes 1 a 7 au fil des lots suivants ; elles restent accessibles
 * pour ne rien perdre pendant la transition.
 */
export const ANNEX_GROUPS: AnnexGroup[] = [
  {
    title: 'Vues actuelles',
    links: [
      { href: '/business-overview', label: 'Business Overview' },
      { href: '/today-action-plan', label: 'Today Action Plan' },
      { href: '/sales-funnel', label: 'Sales Funnel' },
      { href: '/acquisition-traffic', label: 'Acquisition & Traffic' },
      { href: '/meta', label: 'Meta Ads' },
      { href: '/customers', label: 'Customers' },
      { href: '/ratings', label: 'Ratings' },
      { href: '/copy-history', label: 'Copy History' },
      { href: '/shopify-products-summary', label: 'Products & Stock' },
    ],
  },
  {
    title: 'Analyses ponctuelles',
    links: [
      { href: '/ratings-intelligence', label: 'Ratings Intelligence' },
      { href: '/ratings-conversion', label: 'Ratings Conversion' },
      { href: '/customer-lifecycle', label: 'Customer Lifecycle' },
      { href: '/customer-counts', label: 'Customer Counts' },
      { href: '/repeat-customers', label: 'Repeat Customers' },
      { href: '/product-repeat-signals', label: 'Product Repeat Signals' },
      { href: '/food-pairing-intelligence', label: 'Food Pairing' },
      { href: '/geo-insights', label: 'Geo Insights' },
      { href: '/site-behavior', label: 'Site Behavior' },
      { href: '/startup-pack-analysis', label: 'Startup Pack Analysis' },
      { href: '/startup-pack-retention', label: 'Startup Pack Retention' },
      { href: '/stock-movement-summary', label: 'Stock Movement' },
      { href: '/acquisition-economics-basic', label: 'Acquisition Economics' },
    ],
  },
  {
    title: 'Inspection base de donnees',
    links: [
      { href: '/db-test', label: 'DB Test' },
      { href: '/db-inspect', label: 'DB Inspect' },
      { href: '/db-schema', label: 'DB Schema' },
      { href: '/shopify-orders-schema', label: 'Shopify Orders Schema' },
      { href: '/shopify-orders-summary', label: 'Shopify Orders Summary' },
      { href: '/shopify-line-items-sample', label: 'Shopify Line Items' },
      { href: '/shopify-table-search', label: 'Shopify Table Search' },
      { href: '/shopify-funnel-basic', label: 'Shopify Funnel Basic' },
    ],
  },
];

/** Toutes les URL rangees dans les annexes, pour deplier la section au bon moment. */
export const ANNEX_HREFS = new Set(ANNEX_GROUPS.flatMap((group) => group.links.map((link) => link.href)));

/** Retrouve l'etape correspondant a une URL, pour l'en-tete de page. */
export function findFunnelStep(pathname: string): FunnelStep | null {
  return FUNNEL_STEPS.find((step) => step.href === pathname) ?? null;
}
