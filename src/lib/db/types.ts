/**
 * Types publics de la couche donnees.
 *
 * Regroupe les formes de metriques renvoyees par les getters et les unions de
 * resultat `{ ok: true } | { ok: false, reason }`. Aucun code executable ici :
 * ce module est importable depuis n importe quel autre sans risque de cycle.
 */

import { type Trend } from '@/lib/analytics/trends';

export type DatabaseTableInfo = {
  schemaName: string;
  tableName: string;
  tableType: string;
};

export type DatabaseColumnInfo = {
  columnName: string;
  dataType: string;
  isNullable: string;
  ordinalPosition: number;
};

export type SelectedDatabaseTable = {
  schemaName: string;
  tableName: string;
};

export type DatabaseTableSchema = SelectedDatabaseTable & {
  status: 'found' | 'missing';
  columns: DatabaseColumnInfo[];
};

export type DatabaseTableCount = SelectedDatabaseTable & {
  status: 'counted' | 'missing' | 'error';
  rowCount: number | null;
};

export type ShopifyMetadataSearchTable = SelectedDatabaseTable & {
  columns: DatabaseColumnInfo[];
};

export type ShopifyLineItemSafeField =
  | 'product_id'
  | 'variant_id'
  | 'title'
  | 'name'
  | 'sku'
  | 'quantity'
  | 'price'
  | 'vendor'
  | 'product_exists'
  | 'grams'
  | 'taxable';

export type ShopifyLineItemSample = Partial<Record<ShopifyLineItemSafeField, string | number | boolean | null>>;

export type ShopifyOrderLineItemsSample = {
  orderId: string;
  createdAt: string | null;
  lineItemsType: string;
  lineItemCount: number | null;
  parseError: boolean;
  lineItems: ShopifyLineItemSample[];
};

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

export type ShopifyProductSummary = {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  vendor: string;
  totalQuantitySold: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  averageDiscountPerUnit: number;
  discountRatePercentage: number;
  freeQuantityEstimate: number;
  paidQuantityEstimate: number;
  orderCount: number;
  averageNetItemPrice: number;
};

export type ShopifyFunnelBasicMetrics = {
  abandonedCheckoutCount: number;
  orderCount: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  fulfilledOrderCount: number;
  unfulfilledOrderCount: number;
  abandonmentToOrderRatio: number | null;
  paidOrderRate: number | null;
  cancelledOrderRate: number | null;
  fulfilledOrderRate: number | null;
  totalRevenue: number;
  averageOrderValue: number;
};

export type BusinessOverviewMetrics = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paidOrders: number;
  cancelledOrders: number;
  abandonedCheckoutCount: number;
  topProducts: ShopifyProductSummary[];
  totalQuantitySold: number;
  totalProductDiscounts: number;
  freeQuantityEstimate: number;
  totalLineItems: number | null;
  potentialIssues: string[];
  startupPackOrders: number;
  averageFreeBottlesPerStartupPackOrder: number | null;
  paidQuantityEstimate: number;
  freeQuantityPercentage: number | null;
  repeatCustomers: number;
  reorderRate: number | null;
  oneTimeCustomers: number;
  laterOrderRevenue: number;
  repeatRevenueShare: number | null;
  startupPackReorderRate: number | null;
  usersWithRatings: number;
  ratingsPerUser: number | null;
};

export type StartupPackProductRow = {
  productName: string;
  vendor: string;
  quantity: number;
  grossValue: number;
  discountValue: number;
  netRevenue: number;
  orderCount: number;
};

export type StartupPackAnalysisMetrics = {
  startupPackOrderCount: number;
  startupPackLineItemsSold: number;
  startupPackGrossRevenue: number;
  startupPackNetRevenue: number;
  averageStartupPackNetRevenuePerOrder: number | null;
  freeBottleLineItemCount: number;
  freeBottleQuantity: number;
  freeBottleGrossValue: number;
  freeBottleDiscountValue: number;
  paidItemsNetRevenueInStartupPackOrders: number;
  averageFreeBottlesPerStartupPackOrder: number | null;
  topFreeWinesByQuantity: StartupPackProductRow[];
  topFreeWinesByGrossValue: StartupPackProductRow[];
  topPaidPackProducts: StartupPackProductRow[];
};

export type StockMovementProduct = {
  productName: string;
  vendor: string;
  sku: string;
  totalQuantityMoved: number;
  paidQuantity: number;
  freeQuantity: number;
  freeQuantityPercentage: number | null;
  grossValue: number;
  discountValue: number;
  netRevenue: number;
  averageNetRevenuePerUnit: number;
  orderCount: number;
};

export type StockMovementSummaryMetrics = {
  totalQuantityMoved: number;
  totalPaidQuantity: number;
  totalFreeQuantity: number;
  freeQuantityPercentage: number | null;
  totalGrossProductValue: number;
  totalDiscountValue: number;
  totalNetProductRevenue: number;
  products: StockMovementProduct[];
};

export type AcquisitionEconomicsBasicMetrics = {
  usersCount: number;
  quizCount: number;
  ratingsCount: number;
  shopifyCustomersCount: number | null;
  ordersCount: number;
  paidOrdersCount: number;
  cancelledOrdersCount: number;
  abandonedCheckoutCount: number;
  startupPackOrdersCount: number;
  boxOrdersCount: number;
  freeBottleQuantity: number;
  productDiscountValue: number;
  totalRevenue: number;
  averageOrderValue: number;
  ratingsPerUser: number | null;
  ratingsPerOrder: number | null;
  quizToOrderRatio: number | null;
  abandonedCheckoutToOrderRatio: number | null;
  repeatCustomers: number;
  reorderRate: number | null;
  laterOrderRevenue: number;
  repeatRevenueShare: number | null;
  startupPackReorderRate: number | null;
  usersWithRatings: number;
  usersWithThreePlusRatings: number;
  ratingsEngagementRate: number | null;
  potentialIssues: string[];
};

export type OrderBucket = {
  bucket: string;
  customerCount: number;
  customerShare: number | null;
  orderCount: number;
  revenue: number;
  revenueShare: number | null;
};

export type RepeatCustomerMetrics = {
  orderingCustomers: number;
  oneTimeCustomers: number;
  repeatCustomers: number;
  reorderRate: number | null;
  customersWithExactlyTwoOrders: number;
  customersWithThreePlusOrders: number;
  totalNonCancelledOrders: number;
  averageOrdersPerOrderingCustomer: number | null;
  firstOrderRevenue: number;
  laterOrderRevenue: number;
  totalNonCancelledRevenue: number;
  repeatRevenueShare: number | null;
  averageFirstOrderValue: number | null;
  averageLaterOrderValue: number | null;
  firstOrderDate: string | null;
  latestOrderDate: string | null;
  distribution: OrderBucket[];
  potentialIssues: string[];
};

export type StartupPackRetentionCohort = {
  cohort: string;
  customerCount: number;
  orders: number;
  revenue: number;
  laterRevenue: number;
  shareOfOrderingCustomers: number | null;
};

export type StartupPackRetentionMetrics = {
  startupPackCustomers: number;
  startupPackOrders: number;
  startupPackCustomersWithLaterOrder: number;
  startupPackReorderRate: number | null;
  startupPackFirstOrderRevenue: number;
  startupPackLaterOrderRevenue: number;
  averageLaterOrdersPerStartupPackCustomer: number | null;
  smartBoxLaterOrdersAfterStartupPack: number;
  customersWithStartupPackOnly: number;
  customersWithStartupPackAndLaterOrder: number;
  customersWithStartupPackAndSmartBox: number;
  averageFreeBottlesPerStartupPackOrder: number | null;
  cohorts: StartupPackRetentionCohort[];
  potentialIssues: string[];
};

export type RatingActivityBucket = {
  bucket: string;
  userCount: number;
  ratingCount: number;
  averageRatingsPerUser: number | null;
  orderCount?: number;
  repeatCustomers?: number;
  reorderRate?: number | null;
  revenue?: number;
};

export type RatingsConversionMetrics = {
  totalUsers: number;
  usersWithRatings: number;
  usersWithThreePlusRatings: number;
  totalRatings: number;
  averageRatingsPerUser: number | null;
  orderingCustomers: number;
  repeatCustomers: number;
  ratedOrderingCustomers: number | null;
  ratedRepeatCustomers: number | null;
  ratedReorderRate: number | null;
  unratedReorderRate: number | null;
  ratedVsUnratedReorderRateDifference: number | null;
  matchingAvailable: boolean;
  matchingUnavailableReason: string | null;
  buckets: RatingActivityBucket[];
  potentialIssues: string[];
};

export type ProductRepeatSignal = {
  productName: string;
  vendor: string;
  sku: string;
  totalQuantityMoved: number;
  paidQuantity: number;
  freeQuantity: number;
  grossRevenue: number;
  discount: number;
  netRevenue: number;
  firstOrderQuantity: number;
  laterOrderQuantity: number;
  firstOrderRevenue: number;
  laterOrderRevenue: number;
  repeatRevenueShare: number | null;
  ordersContainingProduct: number;
  repeatCustomerOrdersContainingProduct: number;
};

export type ProductRepeatSignalsMetrics = {
  products: ProductRepeatSignal[];
  topRetentionProduct: ProductRepeatSignal | null;
  potentialInsights: string[];
};

export type CustomerLifecycleMetrics = {
  users: number;
  quizzes: number;
  abandonedCheckouts: number;
  orders: number;
  quizToOrderRatio: number | null;
  abandonedCheckoutToOrderRatio: number | null;
  orderingCustomers: number;
  firstOrderRevenue: number;
  averageFirstOrderValue: number | null;
  startupPackCustomers: number;
  startupPackOrders: number;
  totalRatings: number;
  usersWithRatings: number;
  usersWithThreePlusRatings: number;
  averageRatingsPerUser: number | null;
  repeatCustomers: number;
  reorderRate: number | null;
  laterOrderRevenue: number;
  repeatRevenueShare: number | null;
  smartBoxOrders: number;
  totalQuantityMoved: number;
  freeQuantity: number;
  freeQuantityPercentage: number | null;
  productDiscounts: number;
  averageFreeBottlesPerStartupPackOrder: number | null;
  potentialIssues: string[];
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

export type SiteBehaviorSeriesPoint = {
  date: string;
  visitors: number | null;
  sessions: number | null;
  pageViews: number | null;
  orders: number;
  abandonedCheckouts: number;
  quizzes: number;
  ratings: number;
};

export type SiteBehaviorMetrics = {
  hasSessionData: boolean;
  hasGa4Rows: boolean;
  visitorsPerDayAvailable: boolean;
  sessionsPerDayAvailable: boolean;
  pageViewsPerDayAvailable: boolean;
  clicksPerSessionAvailable: boolean;
  pagesPerSessionAvailable: boolean;
  averageSessionDurationAvailable: boolean;
  totalOrders: number;
  totalAbandonedCheckouts: number;
  totalQuizzes: number;
  totalRatings: number;
  checkoutAbandonmentRate: number | null;
  purchaseConversionRate: number | null;
  series: SiteBehaviorSeriesPoint[];
  insights: string[];
};

export type LandingPageArrivalDay = {
  date: string;
  arrivals: number;
  uniqueSessions: number;
  uniqueVisitors: number;
};

export type LandingPageArrivalHour = {
  hour: number;
  arrivals: number;
  uniqueSessions: number;
};

export type HighIntentConversionMetrics = {
  available: boolean;
  method: 'true_click_count' | 'engagement_proxy';
  methodLabel: string;
  sourceTable: string | null;
  thresholdInteractionsPerSession: number;
  totalSessions: number;
  highIntentSessions: number;
  highIntentSessionShare: number | null;
  purchaseUsers: number;
  conversionRateAllSessions: number | null;
  conversionRateHighIntentSessions: number | null;
  daily: Array<{
    date: string;
    sessions: number;
    highIntentSessions: number;
    purchaseUsers: number;
    conversionRateHighIntent: number | null;
  }>;
  beforeAfter: {
    beforeLabel: string;
    afterLabel: string;
    beforeSessions: number;
    afterSessions: number;
    beforeHighIntentSessions: number;
    afterHighIntentSessions: number;
    beforeConversionRateHighIntent: number | null;
    afterConversionRateHighIntent: number | null;
    deltaConversionRateHighIntent: number | null;
  } | null;
  byWeekday: Array<{
    weekday: string;
    weekdayIndex: number;
    sessions: number;
    highIntentSessions: number;
    purchaseUsers: number;
    conversionRateHighIntent: number | null;
  }>;
  bySourceMedium: Array<{
    sourceMedium: string;
    sessions: number;
    highIntentSessions: number;
    purchaseUsersEstimated: number;
    conversionRateHighIntentEstimated: number | null;
  }>;
};

export type LandingPageArrivalMetrics = {
  totalArrivals: number;
  totalUniqueSessions: number;
  totalUniqueVisitors: number;
  daily: LandingPageArrivalDay[];
  byHour: LandingPageArrivalHour[];
  topDay: LandingPageArrivalDay | null;
  topHour: LandingPageArrivalHour | null;
  highIntentConversion: HighIntentConversionMetrics;
};

export type GeoInsightCityRow = {
  city: string;
  region: string;
  classification: 'Big city' | 'Periphery / smaller city';
  customers: number;
  orders: number;
  revenue: number;
};

export type GeoInsightsMetrics = {
  buyersWithCityData: number;
  buyersMissingCityData: number;
  bigCityCustomers: number;
  peripheryCustomers: number;
  bigCityCustomerShare: number | null;
  peripheryCustomerShare: number | null;
  bigCityRevenue: number;
  peripheryRevenue: number;
  bigCityOrderCount: number;
  peripheryOrderCount: number;
  topCities: GeoInsightCityRow[];
  recommendation: string;
  heuristicNote: string;
};

export type AcquisitionTrafficSeriesPoint = {
  date: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  eventCount: number;
  pageViews: number;
  conversions: number;
};

export type AcquisitionTrafficDimensionRow = {
  name: string;
  sessions: number;
  users: number;
  conversions: number;
  conversionRate: number | null;
  trend: Trend;
};

export type AcquisitionTrafficMetrics = {
  periodLabel: string;
  sessions: Trend;
  users: Trend;
  engagedSessions: Trend;
  engagementRate: Trend;
  eventsPerSession: Trend;
  pageViews: Trend;
  averageEngagementDuration: Trend;
  conversions: Trend;
  conversionRate: Trend;
  revenue: Trend;
  tablesPresent: string[];
  tablesWithRows: string[];
  dataAvailable: boolean;
  series: AcquisitionTrafficSeriesPoint[];
  sources: AcquisitionTrafficDimensionRow[];
  channels: AcquisitionTrafficDimensionRow[];
  campaigns: AcquisitionTrafficDimensionRow[];
  devices: AcquisitionTrafficDimensionRow[];
  cities: AcquisitionTrafficDimensionRow[];
  regions: AcquisitionTrafficDimensionRow[];
  countries: AcquisitionTrafficDimensionRow[];
  insights: string[];
};

export type Ga4OverviewDailyPoint = {
  date: string;
  sessions: number;
  users: number;
  pageViews: number;
};

export type Ga4OverviewTrendsMetrics = {
  periodLabel: string;
  dataAvailable: boolean;
  sessions: Trend;
  users: Trend;
  engagedSessions: Trend;
  pageViews: Trend;
  engagementRate: Trend;
  eventsPerSession: Trend;
  conversions: Trend;
  topSourceMedium: string | null;
  daily: Ga4OverviewDailyPoint[];
};

export type BusinessOverviewPeriodTrends = {
  revenue: Trend;
  orders: Trend;
  paidOrders: Trend;
  averageOrderValue: Trend;
  metaSpend: Trend;
  ga4Sessions: Trend;
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

export type TodayAction = {
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  businessProblem: string;
  whyItMatters: string;
  suggestedAction: string;
  relatedPage: string;
  metricEvidence: string;
  stageAffected?: string;
  customersAffected?: number;
  recommendedEmail?: string;
  recommendedOffer?: string;
  objectionToAddress?: string;
  businessImpact?: string;
};

export type TodayActionPlanMetrics = {
  topActions: TodayAction[];
  allActions: TodayAction[];
};

export type DatabaseNowResult =
  | { ok: true; now: string }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type DatabaseTablesResult =
  | { ok: true; tables: DatabaseTableInfo[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type DatabaseTableSchemasResult =
  | { ok: true; tables: DatabaseTableSchema[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type DatabaseTableCountsResult =
  | { ok: true; tables: DatabaseTableCount[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyMetadataSearchResult =
  | { ok: true; tables: ShopifyMetadataSearchTable[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyLineItemsSampleResult =
  | { ok: true; orders: ShopifyOrderLineItemsSample[]; safeFieldsFound: ShopifyLineItemSafeField[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyOrdersSummaryResult =
  | { ok: true; metrics: ShopifyOrdersAggregateMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyProductsSummaryResult =
  | {
      ok: true;
      products: ShopifyProductSummary[];
      totalQuantitySold: number;
      totalProductDiscounts: number;
      freeQuantityEstimate: number;
      discountFieldsDetected: string[];
    }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyFunnelBasicResult =
  | { ok: true; metrics: ShopifyFunnelBasicMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type BusinessOverviewResult =
  | { ok: true; metrics: BusinessOverviewMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type StartupPackAnalysisResult =
  | { ok: true; metrics: StartupPackAnalysisMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type StockMovementSummaryResult =
  | { ok: true; metrics: StockMovementSummaryMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type AcquisitionEconomicsBasicResult =
  | { ok: true; metrics: AcquisitionEconomicsBasicMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type RepeatCustomerMetricsResult =
  | { ok: true; metrics: RepeatCustomerMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type StartupPackRetentionResult =
  | { ok: true; metrics: StartupPackRetentionMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type RatingsConversionResult =
  | { ok: true; metrics: RatingsConversionMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ProductRepeatSignalsResult =
  | { ok: true; metrics: ProductRepeatSignalsMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type CustomerLifecycleResult =
  | { ok: true; metrics: CustomerLifecycleMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type RatingsIntelligenceResult =
  | { ok: true; metrics: RatingsIntelligenceMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type CustomerIntelligenceResult =
  | { ok: true; metrics: { customers: CustomerRatingsSummary[] } }
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

export type AcquisitionTrafficResult =
  | { ok: true; metrics: AcquisitionTrafficMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type Ga4OverviewTrendsResult =
  | { ok: true; metrics: Ga4OverviewTrendsMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type TrackingReadinessResult =
  | { ok: true; metrics: TrackingReadinessMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type SiteBehaviorResult =
  | { ok: true; metrics: SiteBehaviorMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type LandingPageArrivalResult =
  | { ok: true; metrics: LandingPageArrivalMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type GeoInsightsResult =
  | { ok: true; metrics: GeoInsightsMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type BusinessOverviewPeriodTrendsResult =
  | { ok: true; metrics: BusinessOverviewPeriodTrends }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type CustomerActivityReadinessResult =
  | { ok: true; metrics: CustomerActivityReadinessMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type TodayActionPlanResult =
  | { ok: true; metrics: TodayActionPlanMetrics }
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

export type CopyVersionPeriodInput = {
  id: string;
  start: string;
  end: string | null;
};

export type CopyVersionPeriodMetrics = {
  id: string;
  quizSessions: number;
  quizStarted: number;
  quizCompleted: number;
  emailSubmitted: number;
  orders: number;
  revenue: number;
};

export type CopyVersionPerformanceMetrics = {
  periods: CopyVersionPeriodMetrics[];
  /** Data only exists between these boundaries; outside them a zero means "not measured". */
  firstEventAt: string | null;
  lastEventAt: string | null;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  lastOrderSyncAt: string | null;
};

export type CopyVersionPerformanceResult =
  | { ok: true; metrics: CopyVersionPerformanceMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/**
 * Aggregates site events and Shopify orders for each copy version period.
 *
 * Read-only. Periods come from the theme's Git history (see src/data/copyVersions.ts),
 * so they are approximations of when each version was live. The returned coverage
 * boundaries let the page state how much of each period the data actually reaches.
 */

/** Etape 1 : une source de trafic et son taux de rebond reel (GA4). */
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
