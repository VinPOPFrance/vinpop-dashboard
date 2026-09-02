/**
 * Types publics de la couche donnees.
 *
 * Regroupe les formes de metriques renvoyees par les getters et les unions de
 * resultat `{ ok: true } | { ok: false, reason }`. Aucun code executable ici :
 * ce module est importable depuis n importe quel autre sans risque de cycle.
 */

export type ShopifyOrdersAggregateMetrics = {
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  totalRevenue: number;
  subtotalRevenue: number;
  totalTax: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  latestOrderDate: string | null;
  totalLineItemsCount: number | null;
  averageLineItemsPerOrder: number | null;
  lineItemsCountWorked: boolean;
};

export type WineRatingSummary = {
  wineId: string;
  shopifyProductId: string;
  wineName: string;
  color: string;
  pairingTags: string;
  totalRatings: number;
  uniqueCustomers: number;
  loveCount: number;
  likeCount: number;
  dislikeCount: number;
  loveRate: number | null;
  likeRate: number | null;
  dislikeRate: number | null;
  positiveRate: number | null;
  averageRatingScore: number | null;
  recommendationLabel: string;
};

export type RatedWineDetail = {
  wineName: string;
  shopifyProductId: string;
  color: string;
  ratingLabel: 'Love' | 'Like' | 'Dislike';
  ratingDate: string | null;
};

export type CustomerProductSummary = {
  productName: string;
  shopifyProductId: string;
  quantityBought: number;
  grossRevenue: number;
  discount: number;
  netRevenue: number;
  ratedCount: number;
  unratedCount: number;
  ratingStatus: string;
};

export type CustomerRatingsSummary = {
  customerId: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
  bottlesBought: number;
  bottlesRated: number;
  ratedPercentage: number | null;
  unratedBottlesRemaining: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  lastRatingDate: string | null;
  repeatCustomer: boolean;
  startupPackBuyer: boolean;
  smartBoxReady: boolean;
  smartBoxBuyer: boolean;
  subscriptionReady: boolean;
  subscriber: boolean;
  funnelStage: string;
  nextAction: string;
  emailAngle: string;
  socialAngle: string;
  suggestedOffer: string;
  objectionToHandle: string;
  dataConfidence: string;
  stageHealth: string;
  stageExplanation: string;
  loveCount: number;
  likeCount: number;
  dislikeCount: number;
  wineColorsRated: string;
  ratedWines: RatedWineDetail[];
  purchasedProducts: CustomerProductSummary[];
};

export type RatingsIntelligenceMetrics = {
  totalUsers: number;
  totalRatings: number;
  uniqueRatedWines: number;
  usersWithRatings: number;
  usersWithThreePlusRatings: number;
  averageRatingsPerRatedUser: number | null;
  loveCount: number;
  likeCount: number;
  dislikeCount: number;
  loveRate: number | null;
  likeRate: number | null;
  dislikeRate: number | null;
  positiveRatingRate: number | null;
  winesWithLove: number;
  winesWithDislike: number;
  winesWithHighSatisfaction: number;
  winesWithHighDisappointment: number;
  firstRatingDate: string | null;
  latestRatingDate: string | null;
  wines: WineRatingSummary[];
  customers: CustomerRatingsSummary[];
  interpretation: string[];
  recommendedActions: string[];
  missingData: string[];
  wineLevelAnalysisAvailable: boolean;
  wineLevelUnavailableReason: string | null;
};

export type PairingSummary = {
  pairingCategory: string;
  winesCount: number;
  ratingsCount: number | null;
  loveCount: number | null;
  likeCount: number | null;
  dislikeCount: number | null;
  positiveRate: number | null;
  suggestedAction: string;
};

export type WinePairingSummary = {
  wineName: string;
  vendor: string;
  pairingTags: string;
  totalRatings: number;
  positiveRate: number | null;
  dislikeRate: number | null;
  actionLabel: string;
};

export type FoodPairingIntelligenceMetrics = {
  totalWines: number;
  foodPairingRows: number;
  populatedPairingRows: number;
  winesWithPairingData: number;
  redMeatWines: number;
  whiteMeatWines: number;
  fishSeafoodWines: number;
  cheeseWines: number;
  aperitifWines: number;
  winesWithMultiplePairings: number;
  winesWithoutPairing: number;
  pairingCoverageRate: number | null;
  pairings: PairingSummary[];
  wines: WinePairingSummary[];
  coverageGapReason: string | null;
  nextDataFixes: string[];
};

export type MetaPerformanceRow = {
  id: string;
  parentId: string;
  campaignId: string;
  adSetId: string;
  campaignObjective: string | null;
  name: string;
  parentName: string;
  campaignName: string;
  creativeLabel: string;
  firstDate: string | null;
  latestDate: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  landingPageViews: number | null;
  activeClickRate: number | null;
  videoPlays: number | null;
  videoPlayToLandingRate: number | null;
  costPerLandingPageView: number | null;
  addToCart: number | null;
  costPerAddToCart: number | null;
  hookRate: number | null;
  hookMetric: string;
  purchases: number | null;
  purchaseValue: number | null;
  cpa: number | null;
  roas: number | null;
  postClickQuality: 'Good' | 'Medium' | 'Weak';
  status: string;
  performanceLabel: string;
  recommendedAction: string;
  sufficientSpend: boolean;
};

export type MetaDailyPerformancePoint = {
  date: string;
  campaignId: string;
  adSetId: string;
  adId: string;
  spend: number;
  impressions: number;
  clicks: number;
  landingPageViews: number | null;
  activeClickRate: number | null;
  videoPlays: number | null;
  videoPlayToLandingRate: number | null;
  costPerLandingPageView: number | null;
  addToCart: number | null;
  costPerAddToCart: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  purchases: number | null;
  cpa: number | null;
  roas: number | null;
};

export type MetaAdsPerformanceMetrics = {
  totalSpend: number;
  impressions: number;
  clicks: number;
  firstDate: string | null;
  latestDate: string | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  hookRate: number | null;
  hookMetric: string;
  campaignsCount: number;
  adSetsCount: number;
  adsCount: number;
  purchases: number | null;
  purchaseValue: number | null;
  cpa: number | null;
  roas: number | null;
  attributionAvailable: boolean;
  attributionNote: string;
  daily: MetaDailyPerformancePoint[];
  campaigns: MetaPerformanceRow[];
  adSets: MetaPerformanceRow[];
  ads: MetaPerformanceRow[];
};

export type MetaOverviewDailyPoint = {
  date: string;
  spend: number;
  clicks: number;
};

export type MetaAdsOverviewSummaryMetrics = {
  totalSpend: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  attributionAvailable: boolean;
  attributionNote: string;
  daily: MetaOverviewDailyPoint[];
};

export type TrackingReadinessTable = {
  schemaName: string;
  tableName: string;
  rowCount: number | null;
  firstDate: string | null;
  latestDate: string | null;
  matchedColumns: string[];
};

export type TrackingReadinessCapability = {
  label: string;
  available: boolean;
  status: 'good' | 'warning' | 'critical' | 'missing';
  evidence: string;
  dataNeeded?: string[];
};

export type TrackingReadinessMetrics = {
  ga4Connected: boolean;
  ga4TablesWithRows: string[];
  availableTables: TrackingReadinessTable[];
  missingTables: string[];
  capabilities: TrackingReadinessCapability[];
  requiredVisitorFields: string[];
  requiredSessionFields: string[];
  requiredEventFields: string[];
};

export type ActivityTrackingTable = {
  schemaName: string;
  tableName: string;
  columns: string[];
};

export type CustomerActivityReadinessMetrics = {
  tablesFound: ActivityTrackingTable[];
  hasTrackingTables: boolean;
  readinessMessage: string;
  requiredFields: string[];
  recommendedEvents: string[];
};

export type ShopifyOrdersSummaryResult =
  | { ok: true; metrics: ShopifyOrdersAggregateMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type RatingsIntelligenceResult =
  | { ok: true; metrics: RatingsIntelligenceMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type FoodPairingIntelligenceResult =
  | { ok: true; metrics: FoodPairingIntelligenceMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type MetaAdsPerformanceResult =
  | { ok: true; metrics: MetaAdsPerformanceMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type MetaAdsOverviewSummaryResult =
  | { ok: true; metrics: MetaAdsOverviewSummaryMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type TrackingReadinessResult =
  | { ok: true; metrics: TrackingReadinessMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type CustomerActivityReadinessResult =
  | { ok: true; metrics: CustomerActivityReadinessMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type SiteEventInsertInput = {
  eventName: string;
  eventTime: string;
  visitorId: string | null;
  sessionId: string | null;
  customerId: string | null;
  email: string | null;
  emailHash: string | null;
  pageUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  payload: Record<string, unknown> | null;
};

export type SiteEventInsertResult =
  | { ok: true }
  | { ok: false; reason: 'missing-url' | 'connection-failed' | 'table-missing' };

export type SiteExperienceSource = {
  sourceMedium: string;
  sessions: number;
  /** Taux de rebond en pourcentage, pondere par les sessions. */
  bounceRate: number | null;
  screenPageViews: number;
  averageSessionDuration: number | null;
};

/**
 * Etape 1 : une page et son engagement.
 *
 * `pages_path_report` ne contient ni sessions ni engagedSessions : GA4 ne
 * fournit donc PAS de taux de rebond par page dans cet entrepot. On expose
 * l engagement par vue, seul signal disponible a la maille page.
 */
export type SiteExperiencePage = {
  pagePath: string;
  screenPageViews: number;
  totalUsers: number;
  newUsers: number;
  /** Secondes d engagement par vue de page. Proche de zero = page traversee. */
  engagementSecondsPerView: number | null;
  /** Evenements par vue de page. Une seule vue sans interaction = 1. */
  eventsPerView: number | null;
  /** true si l engagement par vue est sous le seuil d alerte. */
  lowEngagement: boolean;
};

export type SiteExperienceMetrics = {
  periodLabel: string;
  dataAvailable: boolean;
  totalSessions: number;
  /** Taux de rebond global du site, pondere par les sessions. */
  bounceRate: number | null;
  /** Seuil au-dela duquel une source est signalee. */
  bounceAlertThreshold: number;
  totalPageViews: number;
  averageSessionDuration: number | null;
  sources: SiteExperienceSource[];
  /** Sources depassant le seuil de rebond, les plus grosses d abord. */
  highBounceSources: SiteExperienceSource[];
  pages: SiteExperiencePage[];
  /** Seuil d engagement par vue sous lequel une page est signalee. */
  engagementAlertThresholdSeconds: number;
};

export type SiteExperienceResult =
  | { ok: true; metrics: SiteExperienceMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/** Etape 2 : verdict porte sur un mot-cle Google Ads. */
export type GoogleAdsKeywordVerdict =
  | 'converting'
  | 'trap'
  | 'watch'
  | 'insufficient-clicks';

export type GoogleAdsKeywordRow = {
  keyword: string;
  matchType: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  /** Cout en euros : cost_micros / 1 000 000. */
  cost: number;
  /** Cout par clic, en euros. */
  costPerClick: number | null;
  ctr: number | null;
  conversions: number;
  costPerConversion: number | null;
  qualityScore: number | null;
  verdict: GoogleAdsKeywordVerdict;
  /** Phrase d action associee au verdict. */
  recommendation: string;
};

export type GoogleAdsKeywordMetrics = {
  periodLabel: string;
  dataAvailable: boolean;
  totalCost: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  averageCostPerClick: number | null;
  averageCtr: number | null;
  costPerConversion: number | null;
  /**
   * Rebond du canal google / cpc (GA4). Il n existe pas de taux de rebond par
   * mot-cle dans l entrepot : ce chiffre vaut pour tout le trafic Google Ads.
   */
  paidSearchBounceRate: number | null;
  paidSearchSessions: number;
  /** Nombre minimum de clics pour qu un mot-cle soit jugeable. */
  minimumClicksForVerdict: number;
  keywords: GoogleAdsKeywordRow[];
  /** Mots-cles qui consomment du budget sans jamais convertir. */
  trapKeywords: GoogleAdsKeywordRow[];
  /** Budget total absorbe par ces mots-cles, en euros. */
  wastedCost: number;
};

export type GoogleAdsKeywordResult =
  | { ok: true; metrics: GoogleAdsKeywordMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/** Etape 3 : une decomposition du funnel quiz selon une dimension. */
export type QuizFunnelSegment = {
  label: string;
  startedSessions: number;
  completedSessions: number;
  /** Part des sessions demarrees qui vont au bout, en pourcentage. */
  completionRate: number | null;
  /** Complement du taux de completion. C est lui qui declenche l alerte. */
  dropOffRate: number | null;
};

export type QuizFunnelDailyPoint = {
  date: string;
  startedSessions: number;
  completedSessions: number;
};

export type QuizFunnelMetrics = {
  periodLabel: string;
  dataAvailable: boolean;
  startedSessions: number;
  completedSessions: number;
  /** Visiteurs distincts ayant demarre, pour distinguer volume et audience. */
  startedVisitors: number;
  completionRate: number | null;
  dropOffRate: number | null;
  /** Seuil d abandon au-dela duquel l alerte se declenche (80 %). */
  dropOffAlertThreshold: number;
  byQuizType: QuizFunnelSegment[];
  bySource: QuizFunnelSegment[];
  byEntryPage: QuizFunnelSegment[];
  daily: QuizFunnelDailyPoint[];
  /**
   * Nombre de resultats de quiz enregistres en base sur la periode.
   *
   * A comparer aux quiz termines : un ecart durable signale que les reponses
   * ne sont pas persistees, ou que la synchronisation de la table accuse du
   * retard.
   */
  storedQuizResults: number;
  /**
   * false tant que le site n emet pas d evenement par question : le payload des
   * evenements quiz ne contient aujourd hui que `quiz_type`.
   */
  perQuestionAvailable: boolean;
};

export type QuizFunnelResult =
  | { ok: true; metrics: QuizFunnelMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/** Etape 4 : un produit et son entonnoir de conversion mesure par GA4. */
export type ProductConversionRow = {
  /** Identifiant produit Shopify, extrait de l itemId GA4. */
  productId: string;
  itemName: string;
  /** Chemin de la fiche produit, ou null si le handle Shopify est introuvable. */
  pagePath: string | null;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  itemRevenue: number;
  /** Quantite vendue selon Shopify. Controle, jamais un denominateur : voir getProductConversion. */
  shopifyQuantitySold: number | null;
  /** Ajouts au panier / vues, en pourcentage. */
  cartToViewRate: number | null;
  /** Achats / vues, en pourcentage : le taux de conversion de la fiche. */
  purchaseToViewRate: number | null;
  /** true si la fiche a du trafic mais ne convertit pas. */
  underperforming: boolean;
};

export type ProductConversionMetrics = {
  periodLabel: string;
  dataAvailable: boolean;
  totalViews: number;
  totalAddedToCart: number;
  totalPurchased: number;
  totalRevenue: number;
  /** Taux de conversion moyen des fiches : achats / vues. */
  averageConversionRate: number | null;
  averageCartToViewRate: number | null;
  /** Vues minimales pour qu une fiche soit jugee sous-performante. */
  underperformingViewsThreshold: number;
  /** Taux de conversion sous lequel une fiche a fort trafic est signalee. */
  underperformingConversionThreshold: number;
  products: ProductConversionRow[];
  underperformingProducts: ProductConversionRow[];
};

export type ProductConversionResult =
  | { ok: true; metrics: ProductConversionMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/**
 * Etape 6 : verdict du controle zero-Dislike sur un couple commande / vin.
 *
 * Une correspondance entre un vin note "Dislike" et une commande n est pas une
 * erreur en soi : dans le modele VinPop, le client note precisement les vins
 * qu il vient de recevoir. Seule une note ANTERIEURE a l expedition constitue
 * une faute — le vin etait deja rejete au moment de l envoi.
 */
export type DislikeCheckVerdict = 'violation' | 'rated-after-order' | 'unknown-date';

export type DislikeCheckRow = {
  orderId: string;
  orderDate: string | null;
  customerKey: string;
  customerEmail: string | null;
  wineTitle: string;
  productId: string;
  ratingDate: string | null;
  verdict: DislikeCheckVerdict;
};

/** Etape 6 : un client passe du Taste Kit a la Smart Wine Box. */
export type SmartBoxCustomerRow = {
  customerKey: string;
  customerEmail: string | null;
  tasteKitOrderDate: string | null;
  smartBoxOrderDate: string | null;
  /** Jours ecoules entre le Taste Kit et la premiere Smart Box. */
  daysToConvert: number | null;
  ratingsCount: number;
  loveCount: number;
  likeCount: number;
  dislikeCount: number;
  /** Part de Love + Like dans les notes du client, en pourcentage. */
  positiveRate: number | null;
};

export type SmartBoxConversionMetrics = {
  periodLabel: string;
  /** Clients ayant achete un Taste Kit ou Starter Pack. */
  tasteKitCustomers: number;
  /** Clients ayant achete une Smart Wine Box. */
  smartBoxCustomers: number;
  /** Clients ayant fait les deux, dans cet ordre. */
  convertedCustomers: number;
  /** Conversion Taste Kit vers Smart Box, en pourcentage. */
  conversionRate: number | null;
  /** Delai median de conversion, en jours. */
  medianDaysToConvert: number | null;
  /** Produits Smart Box actifs au catalogue, meme sans vente. */
  smartBoxProductsInCatalogue: number;
  /** Commandes contenant un produit Smart Box. */
  smartBoxOrders: number;
  /** Couples (commande, vin) examines par le controle zero-Dislike. */
  dislikeChecksPerformed: number;
  /** Envois d un vin deja note Dislike : doit rester a zero. */
  dislikeViolations: DislikeCheckRow[];
  /** Correspondances dont la date de note est inconnue : a lever manuellement. */
  dislikeUnknownDate: DislikeCheckRow[];
  customers: SmartBoxCustomerRow[];
};

export type SmartBoxConversionResult =
  | { ok: true; metrics: SmartBoxConversionMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/** Etape 7 : un client et son rythme de reachat. */
export type ChurnRiskRow = {
  customerKey: string;
  customerEmail: string | null;
  ordersCount: number;
  revenue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  /** Intervalle moyen entre deux commandes, en jours. */
  averageIntervalDays: number | null;
  /** Jours ecoules depuis la derniere commande, a la date de reference. */
  daysSinceLastOrder: number | null;
  /** daysSinceLastOrder / averageIntervalDays : au-dela de 1, le client est en retard. */
  overdueRatio: number | null;
  atRisk: boolean;
};

export type RetentionMetrics = {
  periodLabel: string;
  /**
   * Date de reference des calculs de churn : la commande la plus recente de
   * l entrepot, pas la date du jour. Voir `getChurnRisk`.
   */
  referenceDate: string | null;
  /** Ecart entre la date de reference et aujourd hui, en jours. */
  dataLagDays: number | null;
  orderingCustomers: number;
  repeatCustomers: number;
  /** Part des clients ayant commande au moins deux fois, en pourcentage. */
  repeatRate: number | null;
  averageOrdersPerCustomer: number | null;
  /** Intervalle moyen entre deux commandes, tous clients recurrents confondus. */
  averagePurchaseIntervalDays: number | null;
  /** Chiffre d affaires moyen par client : la LTV observee a ce jour. */
  lifetimeValue: number | null;
  /** LTV des clients recurrents seuls. */
  repeatLifetimeValue: number | null;
  totalRevenue: number;
  /** Multiplicateur de retard au-dela duquel un client est juge a risque. */
  churnOverdueFactor: number;
  customers: ChurnRiskRow[];
  atRiskCustomers: ChurnRiskRow[];
  /** Chiffre d affaires historique des clients a risque. */
  revenueAtRisk: number;
};

export type RetentionResult =
  | { ok: true; metrics: RetentionMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };
