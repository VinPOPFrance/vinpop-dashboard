import 'server-only';
import type { BadgeStatus } from '@/components/ui';
import type { DateRange } from '@/lib/analytics/dateRanges';
import {
  getCachedChurnRisk,
  getCachedMetaAdsPerformance,
  getCachedProductConversion,
  getCachedQuizFunnel,
  getCachedRatingsIntelligence,
  getCachedSiteExperience,
  getCachedSmartBoxConversion,
  rangeCacheArgs,
} from '@/lib/cachedDb';
import { formatPercent } from '@/lib/format';

/**
 * Etat de sante des 7 etapes, en une ligne par etape.
 *
 * Chaque page d etape affiche cette bande en haut : le dashboard doit repondre
 * a "ou ca bloque aujourd hui" avant meme qu on ouvre la bonne page. Sans elle,
 * il faut visiter les sept pages pour trouver le goulot d etranglement.
 *
 * Tous les getters passent par `@/lib/cachedDb` : les sept lectures sont donc
 * partagees avec la page qui les affiche en detail, et une navigation d etape
 * en etape ne rejoue pas les requetes.
 */

export type FunnelPipelineStep = {
  step: number;
  href: string;
  /** Libelle court de la bande, plus ramasse que celui de la navigation. */
  label: string;
  /** Nom du KPI principal de l etape. */
  kpiLabel: string;
  /** Valeur deja formatee : la bande n a pas de logique de rendu. */
  kpiValue: string;
  status: BadgeStatus;
  statusLabel: string;
  /** Une phrase expliquant le statut, affichee en info-bulle. */
  detail: string;
};

/**
 * Statut par defaut d une source injoignable ou vide.
 *
 * Un KPI absent n est jamais affiche en vert : tant qu on ne sait pas, l etape
 * est "en retard", pas "fonctionnelle".
 */
const UNAVAILABLE = { status: 'warning' as BadgeStatus, statusLabel: 'Donnees en retard' };

/**
 * Hook rate Meta : le seul seuil de cette bande qui ne soit pas deja fixe
 * ailleurs dans le code. 30 % est la reference de Meta pour un debut de video
 * qui retient, 15 % la limite sous laquelle la creative ne fonctionne pas.
 */
const HOOK_RATE_GOOD = 30;
const HOOK_RATE_WARNING = 15;

/** Taux de recurrence sous lequel l etape 7 est signalee, comme sur sa page. */
const REPEAT_RATE_WARNING = 20;

/** Part des acheteurs de Taste Kit ayant commence a noter, comme a l etape 5. */
const STARTED_RATING_WARNING = 50;

export async function getFunnelPipeline(range: DateRange): Promise<FunnelPipelineStep[]> {
  const rangeArgs = rangeCacheArgs(range);

  const [experience, meta, quiz, product, ratings, smartBox, retention] = await Promise.all([
    getCachedSiteExperience(...rangeArgs),
    getCachedMetaAdsPerformance(),
    getCachedQuizFunnel(...rangeArgs),
    getCachedProductConversion(...rangeArgs),
    getCachedRatingsIntelligence(),
    getCachedSmartBoxConversion(...rangeArgs),
    getCachedChurnRisk(...rangeArgs),
  ]);

  return [
    buildExperienceStep(experience),
    buildAdsStep(meta),
    buildQuizStep(quiz),
    buildProductStep(product),
    buildTasteKitStep(ratings),
    buildSmartBoxStep(smartBox),
    buildRetentionStep(retention),
  ];
}

/** Etape 1 : l inverse du rebond, soit la part des sessions qui restent. */
function buildExperienceStep(result: Awaited<ReturnType<typeof getCachedSiteExperience>>): FunnelPipelineStep {
  const base = { step: 1, href: '/funnel/1-experience', label: 'Rebond Site', kpiLabel: 'Taux d engagement' };

  if (!result.ok || !result.metrics.dataAvailable || result.metrics.bounceRate === null) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'GA4 ne renvoie pas de taux de rebond sur la periode.' };
  }

  const { bounceRate, bounceAlertThreshold } = result.metrics;
  const engagementRate = 100 - bounceRate;
  const healthy = bounceRate <= bounceAlertThreshold;

  return {
    ...base,
    kpiValue: formatPercent(engagementRate),
    status: healthy ? 'good' : 'warning',
    statusLabel: healthy ? 'Fonctionnel' : 'Rebond eleve',
    detail: `Rebond ${formatPercent(bounceRate)} pour un seuil d alerte de ${bounceAlertThreshold} %.`,
  };
}

/** Etape 2 : le hook rate, la seule mesure creative disponible cote Meta. */
function buildAdsStep(result: Awaited<ReturnType<typeof getCachedMetaAdsPerformance>>): FunnelPipelineStep {
  const base = { step: 2, href: '/funnel/2-acquisition', label: 'Ads', kpiLabel: 'Hook rate' };

  if (!result.ok || result.metrics.hookRate === null) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'Aucune donnee creative Meta exploitable.' };
  }

  const { hookRate, hookMetric, adsCount } = result.metrics;
  const status: BadgeStatus = hookRate >= HOOK_RATE_GOOD ? 'good' : hookRate >= HOOK_RATE_WARNING ? 'warning' : 'critical';

  return {
    ...base,
    kpiValue: formatPercent(hookRate),
    status,
    statusLabel: status === 'good' ? 'Fonctionnel' : status === 'warning' ? 'A surveiller' : 'Creatives faibles',
    detail: `${hookMetric} sur ${adsCount} creative(s) actives.`,
  };
}

/** Etape 3 : la completion du quiz, symetrique du taux d abandon. */
function buildQuizStep(result: Awaited<ReturnType<typeof getCachedQuizFunnel>>): FunnelPipelineStep {
  const base = { step: 3, href: '/funnel/3-quiz', label: 'Quiz', kpiLabel: 'Completion quiz' };

  if (!result.ok || !result.metrics.dataAvailable || result.metrics.completionRate === null) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'Aucun evenement quiz enregistre sur la periode.' };
  }

  const { completionRate, dropOffRate, dropOffAlertThreshold, startedSessions } = result.metrics;
  const healthy = (dropOffRate ?? 0) <= dropOffAlertThreshold;

  return {
    ...base,
    kpiValue: formatPercent(completionRate),
    status: healthy ? 'good' : 'critical',
    statusLabel: healthy ? 'Fonctionnel' : 'Abandon massif',
    detail: `${startedSessions} quiz demarres, abandon ${formatPercent(dropOffRate)} pour un seuil de ${dropOffAlertThreshold} %.`,
  };
}

/** Etape 4 : la conversion des fiches produit, vue depuis GA4. */
function buildProductStep(result: Awaited<ReturnType<typeof getCachedProductConversion>>): FunnelPipelineStep {
  const base = { step: 4, href: '/funnel/4-product', label: 'Fiche Produit', kpiLabel: 'CVR produit' };

  if (!result.ok || !result.metrics.dataAvailable || result.metrics.averageConversionRate === null) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'GA4 ne renvoie pas d evenement produit sur la periode.' };
  }

  const { averageConversionRate, underperformingConversionThreshold, underperformingProducts } = result.metrics;
  const healthy = averageConversionRate >= underperformingConversionThreshold;

  return {
    ...base,
    kpiValue: formatPercent(averageConversionRate),
    status: healthy ? 'good' : 'warning',
    statusLabel: healthy ? 'Fonctionnel' : 'Sous le seuil',
    detail: `${underperformingProducts.length} fiche(s) sous ${underperformingConversionThreshold} % de conversion.`,
  };
}

/** Etape 5 : la part des acheteurs de Taste Kit ayant commence a noter. */
function buildTasteKitStep(result: Awaited<ReturnType<typeof getCachedRatingsIntelligence>>): FunnelPipelineStep {
  const base = { step: 5, href: '/funnel/5-taste-kit', label: 'Taste Kit', kpiLabel: 'Notation demarree' };

  if (!result.ok) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'Les tables de notation ne sont pas lisibles.' };
  }

  const tasteKitCustomers = result.metrics.customers.filter((customer) => customer.startupPackBuyer);
  const started = tasteKitCustomers.filter((customer) => customer.bottlesRated > 0);

  if (tasteKitCustomers.length === 0) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'Aucun acheteur de Taste Kit identifie.' };
  }

  const startedRate = (started.length / tasteKitCustomers.length) * 100;
  const healthy = startedRate >= STARTED_RATING_WARNING;
  const bottlesToRate = result.metrics.customers.reduce((sum, customer) => sum + customer.unratedBottlesRemaining, 0);

  return {
    ...base,
    kpiValue: formatPercent(startedRate),
    status: healthy ? 'good' : 'warning',
    statusLabel: healthy ? 'Fonctionnel' : 'Relances a faire',
    detail: `${started.length} clients sur ${tasteKitCustomers.length} ont note, ${bottlesToRate} bouteilles en attente.`,
  };
}

/**
 * Etape 6 : la conversion vers la Smart Box.
 *
 * Zero conversion alors que des clients Taste Kit existent n est pas une
 * contre-performance mais un blocage : c est le rouge de la bande.
 */
function buildSmartBoxStep(result: Awaited<ReturnType<typeof getCachedSmartBoxConversion>>): FunnelPipelineStep {
  const base = { step: 6, href: '/funnel/6-smart-box', label: 'Smart Box', kpiLabel: 'Conversion Smart Box' };

  if (!result.ok) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'Le croisement commandes / notes a echoue.' };
  }

  const { conversionRate, tasteKitCustomers, convertedCustomers, dislikeViolations } = result.metrics;

  // Le controle zero-Dislike prime sur le taux : expedier un vin deja rejete
  // est une erreur produit, pas un chiffre a surveiller.
  if (dislikeViolations.length > 0) {
    return {
      ...base,
      kpiValue: formatPercent(conversionRate),
      status: 'critical',
      statusLabel: 'Violation Dislike',
      detail: `${dislikeViolations.length} bouteille(s) expediee(s) alors qu elles etaient deja notees Dislike.`,
    };
  }

  const blocked = tasteKitCustomers > 0 && convertedCustomers === 0;

  return {
    ...base,
    kpiValue: conversionRate === null ? 'Indisponible' : formatPercent(conversionRate),
    status: blocked ? 'critical' : conversionRate === null ? 'warning' : 'good',
    statusLabel: blocked ? 'Blocage' : conversionRate === null ? 'Donnees en retard' : 'Fonctionnel',
    detail: blocked
      ? `${tasteKitCustomers} clients Taste Kit, aucune Smart Box vendue : le chemin d achat ne fonctionne pas.`
      : `${convertedCustomers} converti(s) sur ${tasteKitCustomers} clients Taste Kit.`,
  };
}

/** Etape 7 : la part des clients ayant commande au moins deux fois. */
function buildRetentionStep(result: Awaited<ReturnType<typeof getCachedChurnRisk>>): FunnelPipelineStep {
  const base = { step: 7, href: '/funnel/7-retention', label: 'Retention', kpiLabel: 'Taux de recurrence' };

  if (!result.ok || result.metrics.repeatRate === null) {
    return { ...base, kpiValue: 'Indisponible', ...UNAVAILABLE, detail: 'Aucune commande exploitable sur la periode.' };
  }

  const { repeatRate, repeatCustomers, orderingCustomers, atRiskCustomers } = result.metrics;
  const healthy = repeatRate >= REPEAT_RATE_WARNING;

  return {
    ...base,
    kpiValue: formatPercent(repeatRate),
    status: healthy ? 'good' : 'warning',
    statusLabel: healthy ? 'Fonctionnel' : 'Recurrence faible',
    detail: `${repeatCustomers} clients recurrents sur ${orderingCustomers}, ${atRiskCustomers.length} sorti(s) de leur rythme.`,
  };
}
