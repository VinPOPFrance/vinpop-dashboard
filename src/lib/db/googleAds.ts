/**
 * Google Ads.
 *
 * Cette source est presente dans la base depuis le debut (Airbyte alimente
 * `public.campaign`, `public.ad_group`, `public.keyword_view` et
 * `public.click_view`) mais n avait jamais ete exploitee par le dashboard.
 * Les requetes de l etape 2 du funnel arrivent au Lot 4 ; ce module pose la
 * conversion de couts et l inventaire des tables disponibles.
 */

import 'server-only';

/**
 * Tables Google Ads disponibles, avec ce qu on peut en tirer.
 *
 * Sert de reference pour le Lot 4 : les colonnes de couts sont toutes en
 * micro-unites et les volumes sont deja agreges par `segments_date`.
 */
export const GOOGLE_ADS_TABLES = {
  /** Depense, impressions, clics et conversions par campagne et par jour. */
  campaign: 'public.campaign',
  /** Meme granularite, au niveau du groupe d annonces. */
  adGroup: 'public.ad_group',
  /** Performance par mot-cle : la base du croisement CPLPV / taux de rebond. */
  keywordView: 'public.keyword_view',
  /** Un clic par ligne, avec le gclid : permet de rapprocher clics et sessions GA4. */
  clickView: 'public.click_view',
  /** Performance Shopping, si des campagnes Shopping sont actives. */
  shoppingPerformance: 'public.shopping_performance_view',
} as const;

/**
 * Convertit un cout Google Ads en euros.
 *
 * L API Google Ads exprime tous les montants en micro-unites de la devise du
 * compte : 1 000 000 micros = 1 EUR. Oublier cette division fait apparaitre des
 * budgets un million de fois trop grands, d ou cette conversion unique et
 * partagee plutot qu une division recopiee dans chaque requete.
 */
export function microsToEuros(micros: number | string | null | undefined): number {
  if (micros === null || micros === undefined) {
    return 0;
  }

  const parsed = typeof micros === 'number' ? micros : Number(micros);
  return Number.isFinite(parsed) ? parsed / 1_000_000 : 0;
}
