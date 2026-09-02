/**
 * Moteur de calcul du point d equilibre.
 *
 * Volontairement sans dependance : pas de `server-only`, pas d acces base, que
 * des fonctions pures. Le formulaire de saisie recalcule donc les memes chiffres
 * dans le navigateur a chaque frappe, sans aller-retour serveur, et le serveur
 * obtient exactement le meme resultat au rechargement. Une seule implementation,
 * deux endroits d execution.
 */

/** Une charge saisie a la main dans le dashboard. */
export type CostItem = {
  id: number;
  kind: 'fixed' | 'variable';
  label: string;
  amount: number;
  unit: 'per_month' | 'per_bottle';
};

/** Entrees du modele : ce qui est saisi et ce qui est mesure. */
export type BreakEvenInputs = {
  /** Charges fixes mensuelles saisies. */
  fixedCosts: CostItem[];
  /** Charges variables par bouteille saisies. */
  variableCosts: CostItem[];
  /** Prix de vente moyen d une bouteille, en euros. */
  averageSellingPrice: number;
  /**
   * Depense publicitaire mensuelle (Meta + Google), mesuree.
   *
   * Traitee comme une charge fixe de la periode : elle ne varie pas avec le
   * nombre de bouteilles vendues sur le mois en cours. C est le choix standard
   * en calcul de seuil de rentabilite, et il rend le break-even honnete —
   * l ignorer donnerait un seuil bien trop bas.
   */
  monthlyAdSpend: number;
  /** Chiffre d affaires mensuel mesure, en euros. */
  monthlyRevenue: number;
  /** Bouteilles vendues sur le mois, mesurees. */
  monthlyBottlesSold: number;
};

export type BreakEvenResult = {
  /** Total des charges fixes saisies, hors publicite. */
  totalFixedCosts: number;
  /** Charges fixes + publicite : ce qu il faut couvrir chaque mois. */
  totalMonthlyCharges: number;
  /** Cout variable d une bouteille. */
  variableCostPerBottle: number;
  /** Prix de vente moins cout variable : ce que chaque bouteille laisse. */
  contributionMargin: number;
  /** Marge sur cout variable en pourcentage du prix de vente. */
  contributionMarginRate: number | null;
  /** Bouteilles a vendre par mois pour couvrir toutes les charges. */
  breakEvenBottles: number | null;
  /** Chiffre d affaires mensuel correspondant. */
  breakEvenRevenue: number | null;
  /** Resultat mensuel estime au volume actuel. */
  netMargin: number;
  /** Resultat rapporte au chiffre d affaires. */
  netMarginRate: number | null;
  /** Bouteilles manquantes pour atteindre l equilibre. Negatif = au-dela. */
  bottlesToBreakEven: number | null;
  /** true si le modele est rentable au volume actuel. */
  profitable: boolean;
  /**
   * Raisons pour lesquelles le point d equilibre n est pas calculable.
   * Vide quand le calcul aboutit.
   */
  blockers: string[];
};

/** Somme des montants d une liste de charges. */
export function sumCosts(items: CostItem[]): number {
  return items.reduce((total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

/**
 * Calcule le point d equilibre et la rentabilite courante.
 *
 * Le modele est celui du seuil de rentabilite classique :
 *
 *   marge sur cout variable = prix de vente - cout variable unitaire
 *   seuil (bouteilles)      = charges fixes totales / marge sur cout variable
 *
 * Deux situations rendent le seuil non calculable, et sont renvoyees comme
 * `blockers` plutot que masquees derriere un zero trompeur :
 *  - le prix de vente moyen n est pas renseigne ;
 *  - la marge sur cout variable est nulle ou negative, auquel cas aucun volume
 *    ne permet jamais d atteindre l equilibre.
 */
export function calculateBreakEven(inputs: BreakEvenInputs): BreakEvenResult {
  const totalFixedCosts = sumCosts(inputs.fixedCosts);
  const variableCostPerBottle = sumCosts(inputs.variableCosts);
  const totalMonthlyCharges = totalFixedCosts + inputs.monthlyAdSpend;
  const contributionMargin = inputs.averageSellingPrice - variableCostPerBottle;

  const contributionMarginRate =
    inputs.averageSellingPrice > 0 ? (contributionMargin / inputs.averageSellingPrice) * 100 : null;

  const blockers: string[] = [];

  if (inputs.averageSellingPrice <= 0) {
    blockers.push('Renseigner le prix de vente moyen par bouteille.');
  }

  if (inputs.averageSellingPrice > 0 && contributionMargin <= 0) {
    blockers.push(
      'La marge sur cout variable est nulle ou negative : chaque bouteille vendue creuse la perte. Aucun volume ne permet d atteindre l equilibre.',
    );
  }

  const canComputeBreakEven = blockers.length === 0;

  // On arrondit au superieur : vendre 12,3 bouteilles n existe pas, il en faut 13.
  const breakEvenBottles = canComputeBreakEven
    ? Math.ceil(totalMonthlyCharges / contributionMargin)
    : null;

  const breakEvenRevenue =
    breakEvenBottles !== null ? breakEvenBottles * inputs.averageSellingPrice : null;

  // Resultat courant : ce que laissent les bouteilles reellement vendues, moins
  // les charges du mois. On s appuie sur le volume mesure et non sur le chiffre
  // d affaires mesure, pour rester coherent avec le cout variable unitaire.
  const netMargin = inputs.monthlyBottlesSold * contributionMargin - totalMonthlyCharges;

  const netMarginRate = inputs.monthlyRevenue > 0 ? (netMargin / inputs.monthlyRevenue) * 100 : null;

  return {
    totalFixedCosts,
    totalMonthlyCharges,
    variableCostPerBottle,
    contributionMargin,
    contributionMarginRate,
    breakEvenBottles,
    breakEvenRevenue,
    netMargin,
    netMarginRate,
    bottlesToBreakEven:
      breakEvenBottles !== null ? breakEvenBottles - inputs.monthlyBottlesSold : null,
    profitable: netMargin > 0,
    blockers,
  };
}

/**
 * Ramene une mesure faite sur N jours a un equivalent mensuel.
 *
 * Les periodes du dashboard (7, 14, 30 jours...) ne correspondent pas a un mois.
 * Comparer une depense de 7 jours a des charges fixes mensuelles donnerait un
 * resultat faux d un facteur quatre : toutes les mesures sont donc normalisees
 * sur 30 jours avant d entrer dans le modele.
 */
export function toMonthly(value: number, periodDays: number): number {
  if (periodDays <= 0) {
    return 0;
  }

  return (value / periodDays) * 30;
}
