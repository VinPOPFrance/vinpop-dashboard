/**
 * Moteur de projection d une injection de capital publicitaire.
 *
 * Comme `breakEven.ts`, ce module est pur et sans dependance : les curseurs du
 * simulateur recalculent la projection entiere dans le navigateur, image par
 * image, ce qui permet d ajuster les hypotheses en direct pendant un pitch.
 *
 * Le modele est volontairement simple et explicite. Il ne pretend pas predire
 * l avenir : il traduit des hypotheses en consequences chiffrees. Chaque
 * hypothese est nommee dans `ProjectionInputs` pour qu un investisseur puisse
 * la contester ligne par ligne.
 */

export type ProjectionInputs = {
  /** Capital injecte, en euros. */
  capital: number;
  /** Nombre de mois sur lesquels le capital est depense. */
  deploymentMonths: number;
  /**
   * ROAS vise apres optimisation des campagnes.
   *
   * C est l hypothese centrale, et la plus discutable : elle suppose que la
   * publicite est optimisee avant d y injecter du capital. Le ROAS historique
   * est fourni a part (`baselineRoas`) precisement pour que l ecart entre les
   * deux soit visible et assume.
   */
  targetRoas: number;
  /** Depense publicitaire mensuelle actuelle, hors injection. */
  baselineMonthlyAdSpend: number;
  /** Chiffre d affaires mensuel actuel. */
  baselineMonthlyRevenue: number;
  /** Prix de vente moyen d une bouteille. */
  averageSellingPrice: number;
  /** Cout variable par bouteille (COGS, labo, packaging, expedition). */
  variableCostPerBottle: number;
  /** Charges fixes mensuelles hors publicite. */
  fixedMonthlyCosts: number;
  /** Horizon de projection, en mois. */
  horizonMonths: number;
  /**
   * Volume mensuel au-dela duquel la capacite logistique actuelle ne suffit
   * plus : il faudra un entrepot plus grand, donc des charges fixes en plus.
   */
  capacityBottlesPerMonth: number;
};

export type ProjectionMonth = {
  month: number;
  /** Part du capital depensee ce mois-ci. */
  injectedAdSpend: number;
  /** Depense publicitaire totale du mois. */
  adSpend: number;
  revenue: number;
  bottles: number;
  variableCosts: number;
  /** Charges fixes + publicite + couts variables. */
  totalCosts: number;
  netMargin: number;
  /** Marge nette cumulee depuis le premier mois. */
  cumulativeNetMargin: number;
  /** Chiffre d affaires du scenario sans injection, pour comparaison. */
  baselineRevenue: number;
  /** Marge nette du scenario sans injection. */
  baselineNetMargin: number;
  /** true si le volume depasse la capacite logistique declaree. */
  overCapacity: boolean;
};

export type ProjectionResult = {
  months: ProjectionMonth[];
  /** Premier mois ou la marge nette mensuelle devient positive. */
  breakEvenMonth: number | null;
  /** Premier mois ou la marge cumulee rembourse l injection. */
  paybackMonth: number | null;
  /** Chiffre d affaires cumule sur l horizon. */
  totalRevenue: number;
  /** Marge nette cumulee sur l horizon. */
  totalNetMargin: number;
  /** Bouteilles a sourcer sur l horizon. */
  totalBottles: number;
  /** Pic de volume mensuel : le dimensionnement de l entrepot. */
  peakMonthlyBottles: number;
  /** Retour sur investissement : marge cumulee rapportee au capital. */
  roi: number | null;
  /** Chiffre d affaires cumule du scenario sans injection. */
  baselineTotalRevenue: number;
  /** Marge cumulee du scenario sans injection. */
  baselineTotalNetMargin: number;
  /** Mois ou la capacite logistique est depassee pour la premiere fois. */
  firstOverCapacityMonth: number | null;
  /** Raisons rendant la projection non calculable. */
  blockers: string[];
};

/** Extrait les valeurs a 3, 6 et 12 mois pour la synthese du pitch. */
export function milestones(result: ProjectionResult): ProjectionMonth[] {
  return [3, 6, 12]
    .map((month) => result.months.find((entry) => entry.month === month))
    .filter((entry): entry is ProjectionMonth => entry !== undefined);
}

/**
 * ROAS historique observe : chiffre d affaires rapporte a la depense publicitaire.
 *
 * Sert de point de comparaison au ROAS cible. Renvoie `null` quand aucune
 * depense n a ete mesuree, plutot qu un zero qui se lirait comme une performance.
 */
export function observedRoas(monthlyRevenue: number, monthlyAdSpend: number): number | null {
  if (monthlyAdSpend <= 0) {
    return null;
  }

  return monthlyRevenue / monthlyAdSpend;
}

/**
 * Projette mois par mois les consequences d une injection de capital.
 *
 * Hypotheses du modele, toutes discutables et toutes explicites :
 *
 *  1. Le capital est depense lineairement sur `deploymentMonths`. Au-dela, la
 *     depense publicitaire revient a son niveau actuel.
 *  2. Le chiffre d affaires d un mois vaut depense publicitaire x ROAS cible.
 *     Le ROAS optimise s applique donc a TOUTE la depense, y compris la part
 *     historique : c est l hypothese optimiste du scenario, et elle doit etre
 *     presentee comme telle.
 *  3. Aucun effet de trainee : le chiffre d affaires d un mois ne depend que de
 *     la depense de ce mois. Pas de recurrence, pas de LTV differee. Le modele
 *     sous-estime donc un business d abonnement qui fonctionne, et c est le sens
 *     prudent.
 *  4. Le prix de vente et le cout variable unitaire restent constants : aucune
 *     economie d echelle sur les achats n est supposee.
 */
export function projectInvestment(inputs: ProjectionInputs): ProjectionResult {
  const blockers: string[] = [];

  if (inputs.averageSellingPrice <= 0) {
    blockers.push('Renseigner le prix de vente moyen par bouteille dans les charges.');
  }

  if (inputs.deploymentMonths <= 0) {
    blockers.push('La duree de deploiement doit etre d au moins un mois.');
  }

  if (inputs.targetRoas <= 0) {
    blockers.push('Le ROAS cible doit etre superieur a zero.');
  }

  const contributionMargin = inputs.averageSellingPrice - inputs.variableCostPerBottle;

  if (inputs.averageSellingPrice > 0 && contributionMargin <= 0) {
    blockers.push(
      'La marge sur cout variable est nulle ou negative : augmenter le volume aggrave la perte, quelle que soit l injection.',
    );
  }

  if (blockers.length > 0) {
    return {
      months: [],
      breakEvenMonth: null,
      paybackMonth: null,
      totalRevenue: 0,
      totalNetMargin: 0,
      totalBottles: 0,
      peakMonthlyBottles: 0,
      roi: null,
      baselineTotalRevenue: 0,
      baselineTotalNetMargin: 0,
      firstOverCapacityMonth: null,
      blockers,
    };
  }

  const monthlyInjection = inputs.capital / inputs.deploymentMonths;

  // Scenario de reference : rien ne change. Sert de courbe de comparaison.
  const baselineBottles = inputs.baselineMonthlyRevenue / inputs.averageSellingPrice;
  const baselineNetMargin =
    inputs.baselineMonthlyRevenue -
    (inputs.fixedMonthlyCosts +
      inputs.baselineMonthlyAdSpend +
      baselineBottles * inputs.variableCostPerBottle);

  const months: ProjectionMonth[] = [];
  let cumulativeNetMargin = 0;

  for (let month = 1; month <= inputs.horizonMonths; month += 1) {
    const injectedAdSpend = month <= inputs.deploymentMonths ? monthlyInjection : 0;
    const adSpend = inputs.baselineMonthlyAdSpend + injectedAdSpend;
    const revenue = adSpend * inputs.targetRoas;
    const bottles = revenue / inputs.averageSellingPrice;
    const variableCosts = bottles * inputs.variableCostPerBottle;
    const totalCosts = inputs.fixedMonthlyCosts + adSpend + variableCosts;
    const netMargin = revenue - totalCosts;

    cumulativeNetMargin += netMargin;

    months.push({
      month,
      injectedAdSpend,
      adSpend,
      revenue,
      bottles,
      variableCosts,
      totalCosts,
      netMargin,
      cumulativeNetMargin,
      baselineRevenue: inputs.baselineMonthlyRevenue,
      baselineNetMargin,
      overCapacity: inputs.capacityBottlesPerMonth > 0 && bottles > inputs.capacityBottlesPerMonth,
    });
  }

  const breakEvenMonth = months.find((entry) => entry.netMargin > 0)?.month ?? null;

  // Remboursement : la marge cumulee couvre le capital injecte. Distinct du
  // point d equilibre mensuel, qui ne dit rien du capital deja consomme.
  const paybackMonth =
    inputs.capital > 0
      ? (months.find((entry) => entry.cumulativeNetMargin >= inputs.capital)?.month ?? null)
      : (months.find((entry) => entry.cumulativeNetMargin >= 0)?.month ?? null);

  const totalNetMargin = months.reduce((sum, entry) => sum + entry.netMargin, 0);

  return {
    months,
    breakEvenMonth,
    paybackMonth,
    totalRevenue: months.reduce((sum, entry) => sum + entry.revenue, 0),
    totalNetMargin,
    totalBottles: months.reduce((sum, entry) => sum + entry.bottles, 0),
    peakMonthlyBottles: months.reduce((max, entry) => Math.max(max, entry.bottles), 0),
    roi: inputs.capital > 0 ? (totalNetMargin / inputs.capital) * 100 : null,
    baselineTotalRevenue: inputs.baselineMonthlyRevenue * inputs.horizonMonths,
    baselineTotalNetMargin: baselineNetMargin * inputs.horizonMonths,
    firstOverCapacityMonth: months.find((entry) => entry.overCapacity)?.month ?? null,
    blockers,
  };
}
