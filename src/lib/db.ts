import 'server-only';

import { Pool } from 'pg';
import { dateToGa4, dateToSql, getPreviousDateRange, type DateRange } from '@/lib/analytics/dateRanges';
import { calculateTrend, type Trend } from '@/lib/analytics/trends';
import { classifyCustomerStage } from '@/lib/customerStages';

type DatabaseNowRow = {
  now: Date | string;
};

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

export type LandingPageArrivalMetrics = {
  totalArrivals: number;
  totalUniqueSessions: number;
  totalUniqueVisitors: number;
  daily: LandingPageArrivalDay[];
  byHour: LandingPageArrivalHour[];
  topDay: LandingPageArrivalDay | null;
  topHour: LandingPageArrivalHour | null;
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

type DatabaseTableInfoRow = {
  table_schema: string;
  table_name: string;
  table_type: string;
};

type DatabaseColumnInfoRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  ordinal_position: number;
};

type DatabaseTableExistsRow = {
  table_schema: string;
  table_name: string;
};

type DatabaseCountRow = {
  row_count: string;
};

type ShopifyOrderLineItemsSampleRow = {
  id: string | number;
  created_at: Date | string | null;
  line_items: unknown;
};

type ShopifyOrdersAggregateMetricsRow = {
  total_orders: string;
  paid_orders: string;
  cancelled_orders: string;
  fulfilled_orders: string;
  unfulfilled_orders: string;
  total_revenue: string | null;
  subtotal_revenue: string | null;
  total_tax: string | null;
  average_order_value: string | null;
  first_order_date: Date | string | null;
  latest_order_date: Date | string | null;
};

type ShopifyOrdersLineItemsAggregateRow = {
  total_line_items_count: string | null;
  average_line_items_per_order: string | null;
};

type ShopifyProductSummaryRow = {
  product_id: string | null;
  variant_id: string | null;
  product_name: string | null;
  sku: string | null;
  vendor: string | null;
  total_quantity_sold: string | null;
  gross_revenue: string | null;
  total_discount: string | null;
  net_revenue: string | null;
  average_discount_per_unit: string | null;
  discount_rate_percentage: string | null;
  free_quantity_estimate: string | null;
  paid_quantity_estimate: string | null;
  order_count: string;
  average_net_item_price: string | null;
};

type ShopifyProductSummaryTotalRow = {
  total_quantity_sold: string | null;
  total_product_discounts: string | null;
  free_quantity_estimate: string | null;
};

type ShopifyLineItemFieldRow = {
  field_name: string;
};

type ShopifyFunnelBasicRow = {
  abandoned_checkout_count: string;
  order_count: string;
  paid_order_count: string;
  cancelled_order_count: string;
  fulfilled_order_count: string;
  unfulfilled_order_count: string;
  total_revenue: string | null;
  average_order_value: string | null;
};

type StartupPackMetricsRow = {
  startup_pack_order_count: string | null;
  startup_pack_line_items_sold: string | null;
  startup_pack_gross_revenue: string | null;
  startup_pack_net_revenue: string | null;
  average_startup_pack_net_revenue_per_order: string | null;
  free_bottle_line_item_count: string | null;
  free_bottle_quantity: string | null;
  free_bottle_gross_value: string | null;
  free_bottle_discount_value: string | null;
  paid_items_net_revenue_in_startup_pack_orders: string | null;
  average_free_bottles_per_startup_pack_order: string | null;
};

type StartupPackProductRowResult = {
  product_name: string | null;
  vendor: string | null;
  quantity: string | null;
  gross_value: string | null;
  discount_value: string | null;
  net_revenue: string | null;
  order_count: string | null;
};

type StockMovementProductRow = {
  product_name: string | null;
  vendor: string | null;
  sku: string | null;
  total_quantity_moved: string | null;
  paid_quantity: string | null;
  free_quantity: string | null;
  free_quantity_percentage: string | null;
  gross_value: string | null;
  discount_value: string | null;
  net_revenue: string | null;
  average_net_revenue_per_unit: string | null;
  order_count: string | null;
};

type StockMovementGlobalRow = {
  total_quantity_moved: string | null;
  total_paid_quantity: string | null;
  total_free_quantity: string | null;
  free_quantity_percentage: string | null;
  total_gross_product_value: string | null;
  total_discount_value: string | null;
  total_net_product_revenue: string | null;
};

type AcquisitionEconomicsBasicRow = {
  users_count: string | null;
  quiz_count: string | null;
  ratings_count: string | null;
  shopify_customers_count: string | null;
  orders_count: string | null;
  paid_orders_count: string | null;
  cancelled_orders_count: string | null;
  abandoned_checkout_count: string | null;
  startup_pack_orders_count: string | null;
  box_orders_count: string | null;
  free_bottle_quantity: string | null;
  product_discount_value: string | null;
  total_revenue: string | null;
  average_order_value: string | null;
};

type RepeatCustomerMetricsRow = {
  ordering_customers: string | null;
  one_time_customers: string | null;
  repeat_customers: string | null;
  customers_with_exactly_two_orders: string | null;
  customers_with_three_plus_orders: string | null;
  total_non_cancelled_orders: string | null;
  first_order_revenue: string | null;
  later_order_revenue: string | null;
  total_non_cancelled_revenue: string | null;
  first_order_date: Date | string | null;
  latest_order_date: Date | string | null;
};

type OrderBucketRow = {
  bucket: string;
  customer_count: string | null;
  customer_share: string | null;
  order_count: string | null;
  revenue: string | null;
  revenue_share: string | null;
};

type StartupPackRetentionMetricsRow = {
  startup_pack_customers: string | null;
  startup_pack_orders: string | null;
  startup_pack_customers_with_later_order: string | null;
  startup_pack_first_order_revenue: string | null;
  startup_pack_later_order_revenue: string | null;
  average_later_orders_per_startup_pack_customer: string | null;
  smart_box_later_orders_after_startup_pack: string | null;
  customers_with_startup_pack_only: string | null;
  customers_with_startup_pack_and_later_order: string | null;
  customers_with_startup_pack_and_smart_box: string | null;
};

type StartupPackRetentionCohortRow = {
  cohort: string;
  customer_count: string | null;
  orders: string | null;
  revenue: string | null;
  later_revenue: string | null;
  share_of_ordering_customers: string | null;
};

type RatingsAggregateRow = {
  total_users: string | null;
  users_with_ratings: string | null;
  users_with_three_plus_ratings: string | null;
  total_ratings: string | null;
};

type RatingActivityBucketRow = {
  bucket: string;
  user_count: string | null;
  rating_count: string | null;
  average_ratings_per_user: string | null;
};

type ProductRepeatSignalRow = {
  product_name: string | null;
  vendor: string | null;
  sku: string | null;
  total_quantity_moved: string | null;
  paid_quantity: string | null;
  free_quantity: string | null;
  gross_revenue: string | null;
  discount: string | null;
  net_revenue: string | null;
  first_order_quantity: string | null;
  later_order_quantity: string | null;
  first_order_revenue: string | null;
  later_order_revenue: string | null;
  repeat_revenue_share: string | null;
  orders_containing_product: string | null;
  repeat_customer_orders_containing_product: string | null;
};

type CustomerLifecycleRow = {
  users: string | null;
  quizzes: string | null;
  abandoned_checkouts: string | null;
  orders: string | null;
  ordering_customers: string | null;
  first_order_revenue: string | null;
  startup_pack_customers: string | null;
  startup_pack_orders: string | null;
  total_ratings: string | null;
  users_with_ratings: string | null;
  users_with_three_plus_ratings: string | null;
  repeat_customers: string | null;
  later_order_revenue: string | null;
  total_non_cancelled_revenue: string | null;
  smart_box_orders: string | null;
  total_quantity_moved: string | null;
  free_quantity: string | null;
  product_discounts: string | null;
  average_free_bottles_per_startup_pack_order: string | null;
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

declare global {
  var vinpopDashboardPgPool: Pool | undefined;
}

function getPool(databaseUrl: string): Pool {
  if (!globalThis.vinpopDashboardPgPool) {
    globalThis.vinpopDashboardPgPool = new Pool({
      connectionString: databaseUrl,
      max: 1,
    });
  }

  return globalThis.vinpopDashboardPgPool;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error('Unsafe database identifier');
  }

  return `"${identifier}"`;
}

function getValueType(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function parseLineItems(value: unknown): { value: unknown; parseError: boolean } {
  if (typeof value !== 'string') {
    return { value, parseError: false };
  }

  try {
    return { value: JSON.parse(value), parseError: false };
  } catch {
    return { value: null, parseError: true };
  }
}

const shopifyLineItemSafeFields: ShopifyLineItemSafeField[] = [
  'product_id',
  'variant_id',
  'title',
  'name',
  'sku',
  'quantity',
  'price',
  'vendor',
  'product_exists',
  'grams',
  'taxable',
];

function sanitizeLineItem(lineItem: unknown): ShopifyLineItemSample {
  if (typeof lineItem !== 'object' || lineItem === null || Array.isArray(lineItem)) {
    return {};
  }

  const source = lineItem as Record<string, unknown>;
  const safeLineItem: ShopifyLineItemSample = {};

  for (const field of shopifyLineItemSafeFields) {
    const value = source[field];

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      safeLineItem[field] = value;
    }
  }

  return safeLineItem;
}

function numberFromPg(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromPg(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function mapProductSummaryRow(row: ShopifyProductSummaryRow): ShopifyProductSummary {
  return {
    productId: row.product_id || 'Unknown product ID',
    variantId: row.variant_id || 'Unknown variant ID',
    productName: row.product_name || 'Unknown product',
    sku: row.sku || 'No SKU',
    vendor: row.vendor || 'Unknown vendor',
    totalQuantitySold: numberFromPg(row.total_quantity_sold),
    grossRevenue: numberFromPg(row.gross_revenue),
    totalDiscount: numberFromPg(row.total_discount),
    netRevenue: numberFromPg(row.net_revenue),
    averageDiscountPerUnit: numberFromPg(row.average_discount_per_unit),
    discountRatePercentage: numberFromPg(row.discount_rate_percentage),
    freeQuantityEstimate: numberFromPg(row.free_quantity_estimate),
    paidQuantityEstimate: numberFromPg(row.paid_quantity_estimate),
    orderCount: numberFromPg(row.order_count),
    averageNetItemPrice: numberFromPg(row.average_net_item_price),
  };
}

function mapStartupPackProductRow(row: StartupPackProductRowResult): StartupPackProductRow {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    quantity: numberFromPg(row.quantity),
    grossValue: numberFromPg(row.gross_value),
    discountValue: numberFromPg(row.discount_value),
    netRevenue: numberFromPg(row.net_revenue),
    orderCount: numberFromPg(row.order_count),
  };
}

function mapStockMovementProductRow(row: StockMovementProductRow): StockMovementProduct {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    sku: row.sku || 'No SKU',
    totalQuantityMoved: numberFromPg(row.total_quantity_moved),
    paidQuantity: numberFromPg(row.paid_quantity),
    freeQuantity: numberFromPg(row.free_quantity),
    freeQuantityPercentage: row.free_quantity_percentage === null ? null : numberFromPg(row.free_quantity_percentage),
    grossValue: numberFromPg(row.gross_value),
    discountValue: numberFromPg(row.discount_value),
    netRevenue: numberFromPg(row.net_revenue),
    averageNetRevenuePerUnit: numberFromPg(row.average_net_revenue_per_unit),
    orderCount: numberFromPg(row.order_count),
  };
}

function mapOrderBucketRow(row: OrderBucketRow): OrderBucket {
  return {
    bucket: row.bucket,
    customerCount: numberFromPg(row.customer_count),
    customerShare: row.customer_share === null ? null : numberFromPg(row.customer_share),
    orderCount: numberFromPg(row.order_count),
    revenue: numberFromPg(row.revenue),
    revenueShare: row.revenue_share === null ? null : numberFromPg(row.revenue_share),
  };
}

function mapStartupPackRetentionCohortRow(
  row: StartupPackRetentionCohortRow,
): StartupPackRetentionCohort {
  return {
    cohort: row.cohort,
    customerCount: numberFromPg(row.customer_count),
    orders: numberFromPg(row.orders),
    revenue: numberFromPg(row.revenue),
    laterRevenue: numberFromPg(row.later_revenue),
    shareOfOrderingCustomers:
      row.share_of_ordering_customers === null ? null : numberFromPg(row.share_of_ordering_customers),
  };
}

function mapRatingActivityBucketRow(row: RatingActivityBucketRow): RatingActivityBucket {
  return {
    bucket: row.bucket,
    userCount: numberFromPg(row.user_count),
    ratingCount: numberFromPg(row.rating_count),
    averageRatingsPerUser:
      row.average_ratings_per_user === null ? null : numberFromPg(row.average_ratings_per_user),
  };
}

function mapProductRepeatSignalRow(row: ProductRepeatSignalRow): ProductRepeatSignal {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    sku: row.sku || 'No SKU',
    totalQuantityMoved: numberFromPg(row.total_quantity_moved),
    paidQuantity: numberFromPg(row.paid_quantity),
    freeQuantity: numberFromPg(row.free_quantity),
    grossRevenue: numberFromPg(row.gross_revenue),
    discount: numberFromPg(row.discount),
    netRevenue: numberFromPg(row.net_revenue),
    firstOrderQuantity: numberFromPg(row.first_order_quantity),
    laterOrderQuantity: numberFromPg(row.later_order_quantity),
    firstOrderRevenue: numberFromPg(row.first_order_revenue),
    laterOrderRevenue: numberFromPg(row.later_order_revenue),
    repeatRevenueShare: row.repeat_revenue_share === null ? null : numberFromPg(row.repeat_revenue_share),
    ordersContainingProduct: numberFromPg(row.orders_containing_product),
    repeatCustomerOrdersContainingProduct: numberFromPg(
      row.repeat_customer_orders_containing_product,
    ),
  };
}

const startupPackTitleCondition = `
  title_text ILIKE '%starter pack%'
  OR title_text ILIKE '%startup pack%'
  OR title_text ILIKE '%start up pack%'
  OR title_text ILIKE '%calibration kit%'
  OR title_text ILIKE '%taste kit%'
  OR title_text ILIKE '%tasting kit%'
`;

const boxTitleCondition = `
  title_text ILIKE '%subscription%'
  OR title_text ILIKE '%smart box%'
  OR title_text ILIKE '%box%'
`;

const lineItemsBaseCte = `
  WITH order_items AS (
    SELECT
      id AS order_id,
      item,
      COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), '') AS title_text,
      COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
      COALESCE(NULLIF(item->>'vendor', ''), 'Unknown vendor') AS vendor,
      COALESCE(NULLIF(item->>'sku', ''), 'No SKU') AS sku,
      CASE
        WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
        ELSE 0
      END AS quantity_value,
      CASE
        WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric
        ELSE 0
      END AS price_value,
      CASE
        WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
        WHEN jsonb_typeof(item->'discount_allocations') = 'array' THEN COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN allocation->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (allocation->>'amount')::numeric
                ELSE 0
              END
            )
            FROM jsonb_array_elements(item->'discount_allocations') AS allocation
          ),
          0
        )
        ELSE 0
      END AS discount_value
    FROM shopify.orders
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
  ),
  enriched_items AS (
    SELECT
      *,
      quantity_value * price_value AS gross_value,
      GREATEST(quantity_value * price_value - discount_value, 0) AS net_value,
      CASE
        WHEN quantity_value * price_value > 0
          AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
        THEN quantity_value
        ELSE 0
      END AS free_quantity,
      CASE
        WHEN quantity_value * price_value > 0
          AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
        THEN 0
        ELSE quantity_value
      END AS paid_quantity,
      CASE WHEN ${startupPackTitleCondition} THEN true ELSE false END AS is_startup_pack,
      CASE WHEN ${boxTitleCondition} THEN true ELSE false END AS is_box
    FROM order_items
  )
`;

const customerOrdersCte = `
  WITH orders_base AS (
    SELECT
      id AS order_id,
      created_at,
      cancelled_at,
      CASE
        WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
        ELSE 0
      END AS order_revenue,
      COALESCE(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
  identified_non_cancelled_orders AS (
    SELECT *
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
      *,
      ROW_NUMBER() OVER (PARTITION BY customer_key ORDER BY created_at, order_id) AS order_number,
      COUNT(*) OVER (PARTITION BY customer_key) AS customer_order_count
    FROM identified_non_cancelled_orders
  ),
  customer_rollups AS (
    SELECT
      customer_key,
      COUNT(*) AS order_count,
      SUM(order_revenue) AS revenue,
      SUM(order_revenue) FILTER (WHERE order_number = 1) AS first_order_revenue,
      SUM(order_revenue) FILTER (WHERE order_number > 1) AS later_order_revenue,
      MIN(created_at) AS first_order_date,
      MAX(created_at) AS latest_order_date
    FROM customer_order_positions
    GROUP BY customer_key
  )
`;

const customerOrdersAfterLineItemsCtes = `,
  orders_base AS (
    SELECT
      id AS order_id,
      created_at,
      cancelled_at,
      CASE
        WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
        ELSE 0
      END AS order_revenue,
      COALESCE(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
  identified_non_cancelled_orders AS (
    SELECT *
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
      *,
      ROW_NUMBER() OVER (PARTITION BY customer_key ORDER BY created_at, order_id) AS order_number,
      COUNT(*) OVER (PARTITION BY customer_key) AS customer_order_count
    FROM identified_non_cancelled_orders
  ),
  customer_rollups AS (
    SELECT
      customer_key,
      COUNT(*) AS order_count,
      SUM(order_revenue) AS revenue,
      SUM(order_revenue) FILTER (WHERE order_number = 1) AS first_order_revenue,
      SUM(order_revenue) FILTER (WHERE order_number > 1) AS later_order_revenue
    FROM customer_order_positions
    GROUP BY customer_key
  ),
  order_flags AS (
    SELECT
      customer_order_positions.order_id,
      customer_order_positions.customer_key,
      customer_order_positions.order_number,
      customer_order_positions.customer_order_count,
      customer_order_positions.order_revenue,
      COALESCE(BOOL_OR(enriched_items.is_startup_pack), false) AS has_startup_pack,
      COALESCE(BOOL_OR(enriched_items.is_box), false) AS has_box
    FROM customer_order_positions
    LEFT JOIN enriched_items ON enriched_items.order_id = customer_order_positions.order_id
    GROUP BY
      customer_order_positions.order_id,
      customer_order_positions.customer_key,
      customer_order_positions.order_number,
      customer_order_positions.customer_order_count,
      customer_order_positions.order_revenue
  )
`;

export async function getDatabaseNow(): Promise<DatabaseNowResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<DatabaseNowRow>('SELECT now() AS now');
    const now = result.rows[0]?.now;

    return {
      ok: true,
      now: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database connection test failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function insertSiteEvent(input: SiteEventInsertInput): Promise<SiteEventInsertResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    // Documentation-only schema reference. This is intentionally not executed automatically.
    // CREATE TABLE IF NOT EXISTS public.site_events (
    //   id bigserial PRIMARY KEY,
    //   event_name text NOT NULL,
    //   event_time timestamptz NOT NULL DEFAULT now(),
    //   visitor_id text,
    //   session_id text,
    //   customer_id text,
    //   email text,
    //   email_hash text,
    //   page_url text,
    //   referrer text,
    //   utm_source text,
    //   utm_medium text,
    //   utm_campaign text,
    //   utm_content text,
    //   utm_term text,
    //   fbclid text,
    //   payload jsonb,
    //   created_at timestamptz NOT NULL DEFAULT now()
    // );
    await getPool(databaseUrl).query(
      `
        INSERT INTO public.site_events (
          event_name,
          event_time,
          visitor_id,
          session_id,
          customer_id,
          email,
          email_hash,
          page_url,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          fbclid,
          payload
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16
        )
      `,
      [
        input.eventName,
        input.eventTime,
        input.visitorId,
        input.sessionId,
        input.customerId,
        input.email,
        input.emailHash,
        input.pageUrl,
        input.referrer,
        input.utmSource,
        input.utmMedium,
        input.utmCampaign,
        input.utmContent,
        input.utmTerm,
        input.fbclid,
        input.payload,
      ],
    );

    return { ok: true };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    if (errorCode === '42P01') {
      console.error('Site event insert failed: table missing', { code: errorCode });
      return { ok: false, reason: 'table-missing' };
    }

    console.error('Site event insert failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getDatabaseTables(): Promise<DatabaseTablesResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<DatabaseTableInfoRow>(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
      LIMIT 200
    `);

    return {
      ok: true,
      tables: result.rows.map((row) => ({
        schemaName: row.table_schema,
        tableName: row.table_name,
        tableType: row.table_type,
      })),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database inspection failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getDatabaseTableSchemas(
  selectedTables: SelectedDatabaseTable[],
): Promise<DatabaseTableSchemasResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  if (selectedTables.length === 0) {
    return { ok: true, tables: [] };
  }

  try {
    const tableKeys = selectedTables.map((table) => `${table.schemaName}.${table.tableName}`);
    const result = await getPool(databaseUrl).query<DatabaseColumnInfoRow>(
      `
        SELECT table_schema, table_name, column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema || '.' || table_name = ANY($1::text[])
        ORDER BY table_schema, table_name, ordinal_position
      `,
      [tableKeys],
    );

    const columnsByTable = new Map<string, DatabaseColumnInfo[]>();
    for (const row of result.rows) {
      const tableKey = `${row.table_schema}.${row.table_name}`;
      const columns = columnsByTable.get(tableKey) ?? [];
      columns.push({
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        ordinalPosition: row.ordinal_position,
      });
      columnsByTable.set(tableKey, columns);
    }

    return {
      ok: true,
      tables: selectedTables.map((table) => {
        const tableKey = `${table.schemaName}.${table.tableName}`;
        const columns = columnsByTable.get(tableKey) ?? [];

        return {
          ...table,
          status: columns.length > 0 ? 'found' : 'missing',
          columns,
        };
      }),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database schema inspection failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getDatabaseTableCounts(
  selectedTables: SelectedDatabaseTable[],
): Promise<DatabaseTableCountsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  if (selectedTables.length === 0) {
    return { ok: true, tables: [] };
  }

  try {
    const pool = getPool(databaseUrl);
    const tableKeys = selectedTables.map((table) => `${table.schemaName}.${table.tableName}`);
    const existingTablesResult = await pool.query<DatabaseTableExistsRow>(
      `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema || '.' || table_name = ANY($1::text[])
      `,
      [tableKeys],
    );
    const existingTableKeys = new Set(
      existingTablesResult.rows.map((row) => `${row.table_schema}.${row.table_name}`),
    );

    const tables: DatabaseTableCount[] = [];

    for (const table of selectedTables) {
      const tableKey = `${table.schemaName}.${table.tableName}`;

      if (!existingTableKeys.has(tableKey)) {
        tables.push({ ...table, status: 'missing', rowCount: null });
        continue;
      }

      try {
        const schemaName = quoteIdentifier(table.schemaName);
        const tableName = quoteIdentifier(table.tableName);
        const countResult = await pool.query<DatabaseCountRow>(
          `SELECT COUNT(*)::text AS row_count FROM ${schemaName}.${tableName}`,
        );
        const rowCount = Number(countResult.rows[0]?.row_count ?? 0);

        tables.push({ ...table, status: 'counted', rowCount });
      } catch (error) {
        const errorCode =
          typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

        console.error('Database table count failed', { table: tableKey, code: errorCode });
        tables.push({ ...table, status: 'error', rowCount: null });
      }
    }

    return { ok: true, tables };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database table counts failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function searchShopifyTableMetadata(): Promise<ShopifyMetadataSearchResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const matchedTablesResult = await pool.query<DatabaseTableInfoRow>(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'shopify'
        AND (
          table_name ILIKE '%order%'
          OR table_name ILIKE '%line%'
          OR table_name ILIKE '%item%'
          OR table_name ILIKE '%product%'
          OR table_name ILIKE '%variant%'
        )
      ORDER BY table_name
      LIMIT 100
    `);

    if (matchedTablesResult.rows.length === 0) {
      return { ok: true, tables: [] };
    }

    const tableKeys = matchedTablesResult.rows.map((row) => `${row.table_schema}.${row.table_name}`);
    const columnsResult = await pool.query<DatabaseColumnInfoRow>(
      `
        SELECT table_schema, table_name, column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema || '.' || table_name = ANY($1::text[])
        ORDER BY table_schema, table_name, ordinal_position
      `,
      [tableKeys],
    );

    const columnsByTable = new Map<string, DatabaseColumnInfo[]>();
    for (const row of columnsResult.rows) {
      const tableKey = `${row.table_schema}.${row.table_name}`;
      const columns = columnsByTable.get(tableKey) ?? [];
      columns.push({
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        ordinalPosition: row.ordinal_position,
      });
      columnsByTable.set(tableKey, columns);
    }

    return {
      ok: true,
      tables: matchedTablesResult.rows.map((row) => {
        const tableKey = `${row.table_schema}.${row.table_name}`;

        return {
          schemaName: row.table_schema,
          tableName: row.table_name,
          columns: columnsByTable.get(tableKey) ?? [],
        };
      }),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify metadata search failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getShopifyLineItemsSample(): Promise<ShopifyLineItemsSampleResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ShopifyOrderLineItemsSampleRow>(`
      SELECT id, created_at, line_items
      FROM shopify.orders
      WHERE line_items IS NOT NULL
      LIMIT 3
    `);
    const safeFieldsFound = new Set<ShopifyLineItemSafeField>();

    const orders = result.rows.map((row) => {
      const parsed = parseLineItems(row.line_items);
      const lineItemsType = getValueType(parsed.value);
      const lineItems = Array.isArray(parsed.value) ? parsed.value.map(sanitizeLineItem) : [];

      for (const lineItem of lineItems) {
        for (const field of Object.keys(lineItem) as ShopifyLineItemSafeField[]) {
          safeFieldsFound.add(field);
        }
      }

      return {
        orderId: String(row.id),
        createdAt:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : row.created_at
              ? new Date(row.created_at).toISOString()
              : null,
        lineItemsType,
        lineItemCount: Array.isArray(parsed.value) ? parsed.value.length : null,
        parseError: parsed.parseError,
        lineItems,
      };
    });

    return {
      ok: true,
      orders,
      safeFieldsFound: shopifyLineItemSafeFields.filter((field) => safeFieldsFound.has(field)),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify line items sample failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getShopifyOrdersSummary(): Promise<ShopifyOrdersSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const summaryResult = await pool.query<ShopifyOrdersAggregateMetricsRow>(`
      SELECT
        COUNT(*)::text AS total_orders,
        COUNT(*) FILTER (WHERE lower(coalesce(financial_status::text, '')) = 'paid')::text AS paid_orders,
        COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::text AS cancelled_orders,
        COUNT(*) FILTER (WHERE lower(coalesce(fulfillment_status::text, '')) = 'fulfilled')::text AS fulfilled_orders,
        COUNT(*) FILTER (
          WHERE fulfillment_status IS NULL OR lower(coalesce(fulfillment_status::text, '')) <> 'fulfilled'
        )::text AS unfulfilled_orders,
        COALESCE(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ),
          0
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
              ELSE NULL
            END
          ),
          0
        )::text AS subtotal_revenue,
        COALESCE(
          SUM(
            CASE
              WHEN total_tax::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_tax::text::numeric
              ELSE NULL
            END
          ),
          0
        )::text AS total_tax,
        COALESCE(
          AVG(
            CASE
              WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
              ELSE NULL
            END
          ),
          0
        )::text AS average_order_value,
        MIN(created_at) AS first_order_date,
        MAX(created_at) AS latest_order_date
      FROM shopify.orders
    `);
    const summary = summaryResult.rows[0];

    let totalLineItemsCount: number | null = null;
    let averageLineItemsPerOrder: number | null = null;
    let lineItemsCountWorked = false;

    try {
      const lineItemsResult = await pool.query<ShopifyOrdersLineItemsAggregateRow>(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN line_items IS NULL THEN 0
                WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN jsonb_array_length(line_items::jsonb)
                ELSE 0
              END
            ),
            0
          )::text AS total_line_items_count,
          COALESCE(
            AVG(
              CASE
                WHEN line_items IS NULL THEN 0
                WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN jsonb_array_length(line_items::jsonb)
                ELSE 0
              END
            ),
            0
          )::text AS average_line_items_per_order
        FROM shopify.orders
      `);
      const lineItemsSummary = lineItemsResult.rows[0];
      totalLineItemsCount = numberFromPg(lineItemsSummary?.total_line_items_count);
      averageLineItemsPerOrder = numberFromPg(lineItemsSummary?.average_line_items_per_order);
      lineItemsCountWorked = true;
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

      console.error('Shopify line items aggregate failed', { code: errorCode });
    }

    return {
      ok: true,
      metrics: {
        totalOrders: numberFromPg(summary?.total_orders),
        paidOrders: numberFromPg(summary?.paid_orders),
        cancelledOrders: numberFromPg(summary?.cancelled_orders),
        fulfilledOrders: numberFromPg(summary?.fulfilled_orders),
        unfulfilledOrders: numberFromPg(summary?.unfulfilled_orders),
        totalRevenue: numberFromPg(summary?.total_revenue),
        subtotalRevenue: numberFromPg(summary?.subtotal_revenue),
        totalTax: numberFromPg(summary?.total_tax),
        averageOrderValue: numberFromPg(summary?.average_order_value),
        firstOrderDate: dateFromPg(summary?.first_order_date ?? null),
        latestOrderDate: dateFromPg(summary?.latest_order_date ?? null),
        totalLineItemsCount,
        averageLineItemsPerOrder,
        lineItemsCountWorked,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify orders summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getShopifyProductsSummary(): Promise<ShopifyProductsSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const productsResult = await pool.query<ShopifyProductSummaryRow>(`
      WITH order_items AS (
        SELECT
          id AS order_id,
          item,
          CASE
            WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
            ELSE 0
          END AS quantity_value,
          CASE
            WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric
            ELSE 0
          END AS price_value,
          CASE
            WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
            WHEN jsonb_typeof(item->'discount_allocations') = 'array' THEN COALESCE(
              (
                SELECT SUM(
                  CASE
                    WHEN allocation->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (allocation->>'amount')::numeric
                    ELSE 0
                  END
                )
                FROM jsonb_array_elements(item->'discount_allocations') AS allocation
              ),
              0
            )
            ELSE 0
          END AS discount_value
        FROM shopify.orders
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
      ),
      enriched_items AS (
        SELECT
          order_id,
          item,
          quantity_value,
          price_value,
          discount_value,
          quantity_value * price_value AS gross_value,
          GREATEST(quantity_value * price_value - discount_value, 0) AS net_value,
          CASE
            WHEN quantity_value * price_value > 0
              AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
            THEN quantity_value
            ELSE 0
          END AS free_quantity,
          CASE
            WHEN quantity_value * price_value > 0
              AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
            THEN 0
            ELSE quantity_value
          END AS paid_quantity
        FROM order_items
      )
      SELECT
        NULLIF(item->>'product_id', '') AS product_id,
        NULLIF(item->>'variant_id', '') AS variant_id,
        COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
        COALESCE(NULLIF(item->>'sku', ''), 'No SKU') AS sku,
        COALESCE(NULLIF(item->>'vendor', ''), 'Unknown vendor') AS vendor,
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_sold,
        COALESCE(SUM(gross_value), 0)::text AS gross_revenue,
        COALESCE(SUM(discount_value), 0)::text AS total_discount,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COALESCE(SUM(discount_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_discount_per_unit,
        COALESCE((SUM(discount_value) / NULLIF(SUM(gross_value), 0)) * 100, 0)::text AS discount_rate_percentage,
        COALESCE(SUM(free_quantity), 0)::text AS free_quantity_estimate,
        COALESCE(SUM(paid_quantity), 0)::text AS paid_quantity_estimate,
        COUNT(DISTINCT order_id)::text AS order_count,
        COALESCE(SUM(net_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_net_item_price
      FROM enriched_items
      GROUP BY product_id, variant_id, product_name, sku, vendor
      ORDER BY SUM(net_value) DESC
      LIMIT 50
    `);
    const totalResult = await pool.query<ShopifyProductSummaryTotalRow>(`
      WITH order_items AS (
        SELECT
          CASE
            WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
            ELSE 0
          END AS quantity_value,
          CASE
            WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric
            ELSE 0
          END AS price_value,
          CASE
            WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
            WHEN jsonb_typeof(item->'discount_allocations') = 'array' THEN COALESCE(
              (
                SELECT SUM(
                  CASE
                    WHEN allocation->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (allocation->>'amount')::numeric
                    ELSE 0
                  END
                )
                FROM jsonb_array_elements(item->'discount_allocations') AS allocation
              ),
              0
            )
            ELSE 0
          END AS discount_value
        FROM shopify.orders
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
      )
      SELECT
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_sold,
        COALESCE(SUM(discount_value), 0)::text AS total_product_discounts,
        COALESCE(
          SUM(
            CASE
              WHEN quantity_value * price_value > 0
                AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
              THEN quantity_value
              ELSE 0
            END
          ),
          0
        )::text AS free_quantity_estimate
      FROM order_items
    `);
    const detectedFieldsResult = await pool.query<ShopifyLineItemFieldRow>(`
      SELECT DISTINCT field_name
      FROM shopify.orders
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN line_items IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
          ELSE '[]'::jsonb
        END
      ) AS item
      CROSS JOIN LATERAL jsonb_object_keys(item) AS keys(field_name)
      WHERE field_name = ANY($1::text[])
      ORDER BY field_name
    `, [
      [
        'total_discount',
        'discount_allocations',
        'discounted_price',
        'discounted_total',
        'price',
        'quantity',
        'gift_card',
        'product_id',
        'variant_id',
        'title',
        'name',
        'sku',
        'vendor',
      ],
    ]);
    const totalSummary = totalResult.rows[0];

    return {
      ok: true,
      products: productsResult.rows.map(mapProductSummaryRow),
      totalQuantitySold: numberFromPg(totalSummary?.total_quantity_sold),
      totalProductDiscounts: numberFromPg(totalSummary?.total_product_discounts),
      freeQuantityEstimate: numberFromPg(totalSummary?.free_quantity_estimate),
      discountFieldsDetected: detectedFieldsResult.rows.map((row) => row.field_name),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify products summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getShopifyFunnelBasic(): Promise<ShopifyFunnelBasicResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ShopifyFunnelBasicRow>(`
      WITH orders_summary AS (
        SELECT
          COUNT(*)::text AS order_count,
          COUNT(*) FILTER (WHERE lower(coalesce(financial_status::text, '')) = 'paid')::text AS paid_order_count,
          COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::text AS cancelled_order_count,
          COUNT(*) FILTER (WHERE lower(coalesce(fulfillment_status::text, '')) = 'fulfilled')::text AS fulfilled_order_count,
          COUNT(*) FILTER (
            WHERE fulfillment_status IS NULL OR lower(coalesce(fulfillment_status::text, '')) <> 'fulfilled'
          )::text AS unfulfilled_order_count,
          COALESCE(
            SUM(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )::text AS total_revenue,
          COALESCE(
            AVG(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )::text AS average_order_value
        FROM shopify.orders
      ),
      abandoned_summary AS (
        SELECT COUNT(*)::text AS abandoned_checkout_count
        FROM shopify.abandoned_checkouts
      )
      SELECT
        abandoned_summary.abandoned_checkout_count,
        orders_summary.order_count,
        orders_summary.paid_order_count,
        orders_summary.cancelled_order_count,
        orders_summary.fulfilled_order_count,
        orders_summary.unfulfilled_order_count,
        orders_summary.total_revenue,
        orders_summary.average_order_value
      FROM orders_summary
      CROSS JOIN abandoned_summary
    `);
    const row = result.rows[0];
    const abandonedCheckoutCount = numberFromPg(row?.abandoned_checkout_count);
    const orderCount = numberFromPg(row?.order_count);
    const paidOrderCount = numberFromPg(row?.paid_order_count);
    const cancelledOrderCount = numberFromPg(row?.cancelled_order_count);
    const fulfilledOrderCount = numberFromPg(row?.fulfilled_order_count);

    return {
      ok: true,
      metrics: {
        abandonedCheckoutCount,
        orderCount,
        paidOrderCount,
        cancelledOrderCount,
        fulfilledOrderCount,
        unfulfilledOrderCount: numberFromPg(row?.unfulfilled_order_count),
        abandonmentToOrderRatio: ratio(abandonedCheckoutCount, orderCount),
        paidOrderRate: rate(paidOrderCount, orderCount),
        cancelledOrderRate: rate(cancelledOrderCount, orderCount),
        fulfilledOrderRate: rate(fulfilledOrderCount, orderCount),
        totalRevenue: numberFromPg(row?.total_revenue),
        averageOrderValue: numberFromPg(row?.average_order_value),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify funnel basic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStartupPackAnalysis(): Promise<StartupPackAnalysisResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<StartupPackMetricsRow>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      ),
      startup_items AS (
        SELECT enriched_items.*
        FROM enriched_items
        INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      )
      SELECT
        (SELECT COUNT(*) FROM startup_orders)::text AS startup_pack_order_count,
        COALESCE(SUM(quantity_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_line_items_sold,
        COALESCE(SUM(gross_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_gross_revenue,
        COALESCE(SUM(net_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_net_revenue,
        COALESCE(
          SUM(net_value) FILTER (WHERE is_startup_pack) / NULLIF((SELECT COUNT(*) FROM startup_orders), 0),
          0
        )::text AS average_startup_pack_net_revenue_per_order,
        COUNT(*) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack)::text AS free_bottle_line_item_count,
        COALESCE(SUM(free_quantity) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_quantity,
        COALESCE(SUM(gross_value) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_gross_value,
        COALESCE(SUM(discount_value) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_discount_value,
        COALESCE(SUM(net_value) FILTER (WHERE free_quantity = 0), 0)::text AS paid_items_net_revenue_in_startup_pack_orders,
        COALESCE(
          SUM(free_quantity) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack)
          / NULLIF((SELECT COUNT(*) FROM startup_orders), 0),
          0
        )::text AS average_free_bottles_per_startup_pack_order
      FROM startup_items
    `);
    const freeByQuantityResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      )
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(free_quantity), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT enriched_items.order_id)::text AS order_count
      FROM enriched_items
      INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      WHERE free_quantity > 0 AND NOT is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(free_quantity) DESC
      LIMIT 10
    `);
    const freeByGrossValueResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      )
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(free_quantity), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT enriched_items.order_id)::text AS order_count
      FROM enriched_items
      INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      WHERE free_quantity > 0 AND NOT is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(gross_value) DESC
      LIMIT 10
    `);
    const paidPackProductsResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte}
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(quantity_value), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT order_id)::text AS order_count
      FROM enriched_items
      WHERE is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(net_value) DESC
      LIMIT 10
    `);
    const metrics = metricsResult.rows[0];

    return {
      ok: true,
      metrics: {
        startupPackOrderCount: numberFromPg(metrics?.startup_pack_order_count),
        startupPackLineItemsSold: numberFromPg(metrics?.startup_pack_line_items_sold),
        startupPackGrossRevenue: numberFromPg(metrics?.startup_pack_gross_revenue),
        startupPackNetRevenue: numberFromPg(metrics?.startup_pack_net_revenue),
        averageStartupPackNetRevenuePerOrder:
          metrics?.average_startup_pack_net_revenue_per_order === null
            ? null
            : numberFromPg(metrics?.average_startup_pack_net_revenue_per_order),
        freeBottleLineItemCount: numberFromPg(metrics?.free_bottle_line_item_count),
        freeBottleQuantity: numberFromPg(metrics?.free_bottle_quantity),
        freeBottleGrossValue: numberFromPg(metrics?.free_bottle_gross_value),
        freeBottleDiscountValue: numberFromPg(metrics?.free_bottle_discount_value),
        paidItemsNetRevenueInStartupPackOrders: numberFromPg(
          metrics?.paid_items_net_revenue_in_startup_pack_orders,
        ),
        averageFreeBottlesPerStartupPackOrder:
          metrics?.average_free_bottles_per_startup_pack_order === null
            ? null
            : numberFromPg(metrics?.average_free_bottles_per_startup_pack_order),
        topFreeWinesByQuantity: freeByQuantityResult.rows.map(mapStartupPackProductRow),
        topFreeWinesByGrossValue: freeByGrossValueResult.rows.map(mapStartupPackProductRow),
        topPaidPackProducts: paidPackProductsResult.rows.map(mapStartupPackProductRow),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Startup Pack analysis failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStockMovementSummary(): Promise<StockMovementSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const productsResult = await pool.query<StockMovementProductRow>(`
      ${lineItemsBaseCte}
      SELECT
        product_name,
        vendor,
        sku,
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(paid_quantity), 0)::text AS paid_quantity,
        COALESCE(SUM(free_quantity), 0)::text AS free_quantity,
        COALESCE((SUM(free_quantity) / NULLIF(SUM(quantity_value), 0)) * 100, 0)::text AS free_quantity_percentage,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COALESCE(SUM(net_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_net_revenue_per_unit,
        COUNT(DISTINCT order_id)::text AS order_count
      FROM enriched_items
      GROUP BY product_name, vendor, sku
      ORDER BY SUM(quantity_value) DESC
      LIMIT 100
    `);
    const globalResult = await pool.query<StockMovementGlobalRow>(`
      ${lineItemsBaseCte}
      SELECT
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(paid_quantity), 0)::text AS total_paid_quantity,
        COALESCE(SUM(free_quantity), 0)::text AS total_free_quantity,
        COALESCE((SUM(free_quantity) / NULLIF(SUM(quantity_value), 0)) * 100, 0)::text AS free_quantity_percentage,
        COALESCE(SUM(gross_value), 0)::text AS total_gross_product_value,
        COALESCE(SUM(discount_value), 0)::text AS total_discount_value,
        COALESCE(SUM(net_value), 0)::text AS total_net_product_revenue
      FROM enriched_items
    `);
    const global = globalResult.rows[0];

    return {
      ok: true,
      metrics: {
        totalQuantityMoved: numberFromPg(global?.total_quantity_moved),
        totalPaidQuantity: numberFromPg(global?.total_paid_quantity),
        totalFreeQuantity: numberFromPg(global?.total_free_quantity),
        freeQuantityPercentage:
          global?.free_quantity_percentage === null
            ? null
            : numberFromPg(global?.free_quantity_percentage),
        totalGrossProductValue: numberFromPg(global?.total_gross_product_value),
        totalDiscountValue: numberFromPg(global?.total_discount_value),
        totalNetProductRevenue: numberFromPg(global?.total_net_product_revenue),
        products: productsResult.rows.map(mapStockMovementProductRow),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Stock movement summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getRepeatCustomerMetrics(): Promise<RepeatCustomerMetricsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<RepeatCustomerMetricsRow>(`
      ${customerOrdersCte}
      SELECT
        COUNT(*)::text AS ordering_customers,
        COUNT(*) FILTER (WHERE order_count = 1)::text AS one_time_customers,
        COUNT(*) FILTER (WHERE order_count >= 2)::text AS repeat_customers,
        COUNT(*) FILTER (WHERE order_count = 2)::text AS customers_with_exactly_two_orders,
        COUNT(*) FILTER (WHERE order_count >= 3)::text AS customers_with_three_plus_orders,
        COALESCE(SUM(order_count), 0)::text AS total_non_cancelled_orders,
        COALESCE(SUM(first_order_revenue), 0)::text AS first_order_revenue,
        COALESCE(SUM(later_order_revenue), 0)::text AS later_order_revenue,
        COALESCE(SUM(revenue), 0)::text AS total_non_cancelled_revenue,
        MIN(first_order_date) AS first_order_date,
        MAX(latest_order_date) AS latest_order_date
      FROM customer_rollups
    `);
    const bucketsResult = await pool.query<OrderBucketRow>(`
      ${customerOrdersCte},
      bucketed AS (
        SELECT
          CASE
            WHEN order_count = 1 THEN '1 order'
            WHEN order_count = 2 THEN '2 orders'
            ELSE '3+ orders'
          END AS bucket,
          CASE
            WHEN order_count = 1 THEN 1
            WHEN order_count = 2 THEN 2
            ELSE 3
          END AS bucket_order,
          COUNT(*) AS customer_count,
          SUM(order_count) AS order_count,
          SUM(revenue) AS revenue
        FROM customer_rollups
        GROUP BY bucket, bucket_order
      ),
      totals AS (
        SELECT
          COALESCE(SUM(customer_count), 0) AS total_customers,
          COALESCE(SUM(revenue), 0) AS total_revenue
        FROM bucketed
      )
      SELECT
        bucket,
        customer_count::text,
        COALESCE((customer_count / NULLIF(total_customers, 0)) * 100, 0)::text AS customer_share,
        order_count::text,
        revenue::text,
        COALESCE((revenue / NULLIF(total_revenue, 0)) * 100, 0)::text AS revenue_share
      FROM bucketed
      CROSS JOIN totals
      ORDER BY bucket_order
    `);
    const row = metricsResult.rows[0];
    const orderingCustomers = numberFromPg(row?.ordering_customers);
    const oneTimeCustomers = numberFromPg(row?.one_time_customers);
    const repeatCustomers = numberFromPg(row?.repeat_customers);
    const totalNonCancelledOrders = numberFromPg(row?.total_non_cancelled_orders);
    const firstOrderRevenue = numberFromPg(row?.first_order_revenue);
    const laterOrderRevenue = numberFromPg(row?.later_order_revenue);
    const totalNonCancelledRevenue = numberFromPg(row?.total_non_cancelled_revenue);
    const potentialIssues: string[] = [];
    const reorderRate = rate(repeatCustomers, orderingCustomers);

    if ((reorderRate ?? 100) < 20) {
      potentialIssues.push(
        'Reorder rate is low. Startup Pack acquisition may not yet be converting into repeat orders.',
      );
    }

    if (laterOrderRevenue === 0 && orderingCustomers > 0) {
      potentialIssues.push('No later-order revenue detected yet.');
    }

    if (orderingCustomers > 0 && oneTimeCustomers / orderingCustomers > 0.8) {
      potentialIssues.push('Most customers have ordered only once.');
    }

    if (repeatCustomers > 0) {
      potentialIssues.push('Repeat customers detected. Analyze what they bought after the first order.');
    }

    return {
      ok: true,
      metrics: {
        orderingCustomers,
        oneTimeCustomers,
        repeatCustomers,
        reorderRate,
        customersWithExactlyTwoOrders: numberFromPg(row?.customers_with_exactly_two_orders),
        customersWithThreePlusOrders: numberFromPg(row?.customers_with_three_plus_orders),
        totalNonCancelledOrders,
        averageOrdersPerOrderingCustomer: ratio(totalNonCancelledOrders, orderingCustomers),
        firstOrderRevenue,
        laterOrderRevenue,
        totalNonCancelledRevenue,
        repeatRevenueShare: rate(laterOrderRevenue, totalNonCancelledRevenue),
        averageFirstOrderValue: ratio(firstOrderRevenue, orderingCustomers),
        averageLaterOrderValue: ratio(laterOrderRevenue, totalNonCancelledOrders - orderingCustomers),
        firstOrderDate: dateFromPg(row?.first_order_date ?? null),
        latestOrderDate: dateFromPg(row?.latest_order_date ?? null),
        distribution: bucketsResult.rows.map(mapOrderBucketRow),
        potentialIssues,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Repeat customer metrics failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStartupPackRetention(): Promise<StartupPackRetentionResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<StartupPackRetentionMetricsRow>(`
      ${lineItemsBaseCte}
      ${customerOrdersAfterLineItemsCtes},
      startup_customers AS (
        SELECT DISTINCT customer_key
        FROM order_flags
        WHERE has_startup_pack
      ),
      startup_first_order AS (
        SELECT customer_key, MIN(order_number) AS startup_order_number
        FROM order_flags
        WHERE has_startup_pack
        GROUP BY customer_key
      )
      SELECT
        (SELECT COUNT(*) FROM startup_customers)::text AS startup_pack_customers,
        (SELECT COUNT(*) FROM order_flags WHERE has_startup_pack)::text AS startup_pack_orders,
        (
          SELECT COUNT(DISTINCT order_flags.customer_key)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
        )::text AS startup_pack_customers_with_later_order,
        COALESCE(SUM(order_revenue) FILTER (WHERE has_startup_pack), 0)::text AS startup_pack_first_order_revenue,
        COALESCE(
          (
            SELECT SUM(order_flags.order_revenue)
            FROM order_flags
            INNER JOIN startup_first_order USING (customer_key)
            WHERE order_flags.order_number > startup_first_order.startup_order_number
          ),
          0
        )::text AS startup_pack_later_order_revenue,
        COALESCE(
          (
            SELECT COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM startup_customers), 0)
            FROM order_flags
            INNER JOIN startup_first_order USING (customer_key)
            WHERE order_flags.order_number > startup_first_order.startup_order_number
          ),
          0
        )::text AS average_later_orders_per_startup_pack_customer,
        (
          SELECT COUNT(*)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
            AND order_flags.has_box
        )::text AS smart_box_later_orders_after_startup_pack,
        (
          SELECT COUNT(*)
          FROM startup_customers
          WHERE NOT EXISTS (
            SELECT 1
            FROM order_flags
            INNER JOIN startup_first_order USING (customer_key)
            WHERE order_flags.customer_key = startup_customers.customer_key
              AND order_flags.order_number > startup_first_order.startup_order_number
          )
        )::text AS customers_with_startup_pack_only,
        (
          SELECT COUNT(DISTINCT order_flags.customer_key)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
        )::text AS customers_with_startup_pack_and_later_order,
        (
          SELECT COUNT(DISTINCT order_flags.customer_key)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
            AND order_flags.has_box
        )::text AS customers_with_startup_pack_and_smart_box
      FROM order_flags
    `);
    const cohortsResult = await pool.query<StartupPackRetentionCohortRow>(`
      ${lineItemsBaseCte}
      ${customerOrdersAfterLineItemsCtes},
      startup_first_order AS (
        SELECT customer_key, MIN(order_number) AS startup_order_number
        FROM order_flags
        WHERE has_startup_pack
        GROUP BY customer_key
      ),
      customer_cohorts AS (
        SELECT
          customer_rollups.customer_key,
          customer_rollups.order_count,
          customer_rollups.revenue,
          COALESCE(customer_rollups.later_order_revenue, 0) AS later_revenue,
          CASE
            WHEN startup_first_order.customer_key IS NULL THEN 'Non-Startup-Pack customers'
            WHEN EXISTS (
              SELECT 1 FROM order_flags
              WHERE order_flags.customer_key = customer_rollups.customer_key
                AND order_flags.order_number > startup_first_order.startup_order_number
                AND order_flags.has_box
            ) THEN 'Startup Pack + Smart Box/subscription'
            WHEN EXISTS (
              SELECT 1 FROM order_flags
              WHERE order_flags.customer_key = customer_rollups.customer_key
                AND order_flags.order_number > startup_first_order.startup_order_number
            ) THEN 'Startup Pack + any later order'
            ELSE 'Startup Pack only'
          END AS cohort
        FROM customer_rollups
        LEFT JOIN startup_first_order USING (customer_key)
      ),
      totals AS (
        SELECT COUNT(*) AS ordering_customers FROM customer_rollups
      )
      SELECT
        cohort,
        COUNT(*)::text AS customer_count,
        COALESCE(SUM(order_count), 0)::text AS orders,
        COALESCE(SUM(revenue), 0)::text AS revenue,
        COALESCE(SUM(later_revenue), 0)::text AS later_revenue,
        COALESCE((COUNT(*)::numeric / NULLIF(totals.ordering_customers, 0)) * 100, 0)::text AS share_of_ordering_customers
      FROM customer_cohorts
      CROSS JOIN totals
      GROUP BY cohort, totals.ordering_customers
      ORDER BY CASE cohort
        WHEN 'Startup Pack only' THEN 1
        WHEN 'Startup Pack + any later order' THEN 2
        WHEN 'Startup Pack + Smart Box/subscription' THEN 3
        ELSE 4
      END
    `);
    const startupPackResult = await getStartupPackAnalysis();

    if (!startupPackResult.ok) {
      return startupPackResult;
    }

    const row = metricsResult.rows[0];
    const startupPackCustomers = numberFromPg(row?.startup_pack_customers);
    const startupPackOrders = numberFromPg(row?.startup_pack_orders);
    const startupPackCustomersWithLaterOrder = numberFromPg(
      row?.startup_pack_customers_with_later_order,
    );
    const smartBoxLaterOrdersAfterStartupPack = numberFromPg(
      row?.smart_box_later_orders_after_startup_pack,
    );
    const startupPackReorderRate = rate(startupPackCustomersWithLaterOrder, startupPackCustomers);
    const potentialIssues: string[] = [];
    const averageFreeBottles =
      startupPackResult.metrics.averageFreeBottlesPerStartupPackOrder;

    if ((startupPackReorderRate ?? 100) < 20) {
      potentialIssues.push('Startup Pack customers are not yet reordering enough.');
    }

    if (startupPackOrders > 0 && smartBoxLaterOrdersAfterStartupPack === 0) {
      potentialIssues.push('Startup Pack customers may not yet be converting to Smart Box.');
    }

    if (startupPackOrders > 0 && (averageFreeBottles === null || averageFreeBottles < 3 || averageFreeBottles > 4)) {
      potentialIssues.push('Average free bottles per Startup Pack is outside the expected 3 to 4 range.');
    }

    return {
      ok: true,
      metrics: {
        startupPackCustomers,
        startupPackOrders,
        startupPackCustomersWithLaterOrder,
        startupPackReorderRate,
        startupPackFirstOrderRevenue: numberFromPg(row?.startup_pack_first_order_revenue),
        startupPackLaterOrderRevenue: numberFromPg(row?.startup_pack_later_order_revenue),
        averageLaterOrdersPerStartupPackCustomer:
          row?.average_later_orders_per_startup_pack_customer === null
            ? null
            : numberFromPg(row?.average_later_orders_per_startup_pack_customer),
        smartBoxLaterOrdersAfterStartupPack,
        customersWithStartupPackOnly: numberFromPg(row?.customers_with_startup_pack_only),
        customersWithStartupPackAndLaterOrder: numberFromPg(
          row?.customers_with_startup_pack_and_later_order,
        ),
        customersWithStartupPackAndSmartBox: numberFromPg(
          row?.customers_with_startup_pack_and_smart_box,
        ),
        averageFreeBottlesPerStartupPackOrder: averageFreeBottles,
        cohorts: cohortsResult.rows.map(mapStartupPackRetentionCohortRow),
        potentialIssues,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Startup Pack retention failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getRatingsConversion(): Promise<RatingsConversionResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const [ratingsResult, bucketsResult, repeatResult] = await Promise.all([
      pool.query<RatingsAggregateRow>(`
        WITH rating_counts AS (
          SELECT customer_id, COUNT(*) AS rating_count
          FROM public.ratings
          GROUP BY customer_id
        )
        SELECT
          (SELECT COUNT(*) FROM public.users)::text AS total_users,
          COUNT(*)::text AS users_with_ratings,
          COUNT(*) FILTER (WHERE rating_count >= 3)::text AS users_with_three_plus_ratings,
          COALESCE(SUM(rating_count), 0)::text AS total_ratings
        FROM rating_counts
      `),
      pool.query<RatingActivityBucketRow>(`
        WITH rating_counts AS (
          SELECT users.id, COALESCE(COUNT(ratings.*), 0) AS rating_count
          FROM public.users
          LEFT JOIN public.ratings ON ratings.customer_id = users.id
          GROUP BY users.id
        )
        SELECT
          CASE
            WHEN rating_count = 0 THEN '0 ratings'
            WHEN rating_count = 1 THEN '1 rating'
            WHEN rating_count = 2 THEN '2 ratings'
            ELSE '3+ ratings'
          END AS bucket,
          CASE
            WHEN rating_count = 0 THEN 1
            WHEN rating_count = 1 THEN 2
            WHEN rating_count = 2 THEN 3
            ELSE 4
          END AS bucket_order,
          COUNT(*)::text AS user_count,
          COALESCE(SUM(rating_count), 0)::text AS rating_count,
          COALESCE(AVG(rating_count), 0)::text AS average_ratings_per_user
        FROM rating_counts
        GROUP BY bucket, bucket_order
        ORDER BY bucket_order
      `),
      getRepeatCustomerMetrics(),
    ]);

    if (!repeatResult.ok) {
      return repeatResult;
    }

    const row = ratingsResult.rows[0];
    const totalUsers = numberFromPg(row?.total_users);
    const usersWithRatings = numberFromPg(row?.users_with_ratings);
    const usersWithThreePlusRatings = numberFromPg(row?.users_with_three_plus_ratings);
    const totalRatings = numberFromPg(row?.total_ratings);
    const potentialIssues: string[] = [
      'Ratings exist, but direct matching to Shopify customers is not yet available.',
    ];

    if (totalUsers > 0 && usersWithRatings / totalUsers < 0.5) {
      potentialIssues.push('Most users have not rated wines yet.');
    }

    return {
      ok: true,
      metrics: {
        totalUsers,
        usersWithRatings,
        usersWithThreePlusRatings,
        totalRatings,
        averageRatingsPerUser: ratio(totalRatings, totalUsers),
        orderingCustomers: repeatResult.metrics.orderingCustomers,
        repeatCustomers: repeatResult.metrics.repeatCustomers,
        ratedOrderingCustomers: null,
        ratedRepeatCustomers: null,
        ratedReorderRate: null,
        unratedReorderRate: null,
        ratedVsUnratedReorderRateDifference: null,
        matchingAvailable: false,
        matchingUnavailableReason:
          'Direct customer matching unavailable because public ratings users are not safely linked to Shopify customer identifiers.',
        buckets: bucketsResult.rows.map(mapRatingActivityBucketRow),
        potentialIssues,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Ratings conversion failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getProductRepeatSignals(): Promise<ProductRepeatSignalsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ProductRepeatSignalRow>(`
      ${lineItemsBaseCte}
      ${customerOrdersAfterLineItemsCtes}
      SELECT
        enriched_items.product_name,
        enriched_items.vendor,
        enriched_items.sku,
        COALESCE(SUM(enriched_items.quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(enriched_items.paid_quantity), 0)::text AS paid_quantity,
        COALESCE(SUM(enriched_items.free_quantity), 0)::text AS free_quantity,
        COALESCE(SUM(enriched_items.gross_value), 0)::text AS gross_revenue,
        COALESCE(SUM(enriched_items.discount_value), 0)::text AS discount,
        COALESCE(SUM(enriched_items.net_value), 0)::text AS net_revenue,
        COALESCE(SUM(enriched_items.quantity_value) FILTER (WHERE order_flags.order_number = 1), 0)::text AS first_order_quantity,
        COALESCE(SUM(enriched_items.quantity_value) FILTER (WHERE order_flags.order_number > 1), 0)::text AS later_order_quantity,
        COALESCE(SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number = 1), 0)::text AS first_order_revenue,
        COALESCE(SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number > 1), 0)::text AS later_order_revenue,
        COALESCE(
          (SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number > 1)
          / NULLIF(SUM(enriched_items.net_value), 0)) * 100,
          0
        )::text AS repeat_revenue_share,
        COUNT(DISTINCT enriched_items.order_id)::text AS orders_containing_product,
        COUNT(DISTINCT enriched_items.order_id) FILTER (WHERE order_flags.customer_order_count >= 2)::text AS repeat_customer_orders_containing_product
      FROM enriched_items
      INNER JOIN order_flags ON order_flags.order_id = enriched_items.order_id
      GROUP BY enriched_items.product_name, enriched_items.vendor, enriched_items.sku
      ORDER BY SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number > 1) DESC NULLS LAST
      LIMIT 100
    `);
    const products = result.rows.map(mapProductRepeatSignalRow);
    const topRetentionProduct = products[0] ?? null;
    const potentialInsights: string[] = [];

    if (topRetentionProduct && topRetentionProduct.laterOrderRevenue > 0) {
      potentialInsights.push('Products with later-order revenue are appearing in repeat purchase behavior.');
    }

    if (products.some((product) => product.firstOrderQuantity > 0 && product.laterOrderQuantity === 0)) {
      potentialInsights.push('Some products currently look like acquisition-only products.');
    }

    return {
      ok: true,
      metrics: {
        products,
        topRetentionProduct,
        potentialInsights,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Product repeat signals failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getCustomerLifecycle(): Promise<CustomerLifecycleResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const [result, repeatResult, startupResult, ratingsResult, stockResult] = await Promise.all([
      getPool(databaseUrl).query<CustomerLifecycleRow>(`
        ${lineItemsBaseCte}
        ${customerOrdersAfterLineItemsCtes}
        SELECT
          (SELECT COUNT(*) FROM public.users)::text AS users,
          (SELECT COUNT(*) FROM public.quizz)::text AS quizzes,
          (SELECT COUNT(*) FROM shopify.abandoned_checkouts)::text AS abandoned_checkouts,
          (SELECT COUNT(*) FROM shopify.orders)::text AS orders,
          (SELECT COUNT(*) FROM customer_rollups)::text AS ordering_customers,
          COALESCE((SELECT SUM(first_order_revenue) FROM customer_rollups), 0)::text AS first_order_revenue,
          (SELECT COUNT(DISTINCT customer_key) FROM order_flags WHERE has_startup_pack)::text AS startup_pack_customers,
          (SELECT COUNT(*) FROM order_flags WHERE has_startup_pack)::text AS startup_pack_orders,
          (SELECT COUNT(*) FROM public.ratings)::text AS total_ratings,
          (SELECT COUNT(DISTINCT customer_id) FROM public.ratings)::text AS users_with_ratings,
          (
            SELECT COUNT(*)
            FROM (
              SELECT customer_id
              FROM public.ratings
              GROUP BY customer_id
              HAVING COUNT(*) >= 3
            ) rated
          )::text AS users_with_three_plus_ratings,
          (SELECT COUNT(*) FROM customer_rollups WHERE order_count >= 2)::text AS repeat_customers,
          COALESCE((SELECT SUM(later_order_revenue) FROM customer_rollups), 0)::text AS later_order_revenue,
          COALESCE((SELECT SUM(revenue) FROM customer_rollups), 0)::text AS total_non_cancelled_revenue,
          (SELECT COUNT(*) FROM order_flags WHERE has_box)::text AS smart_box_orders,
          COALESCE(SUM(enriched_items.quantity_value), 0)::text AS total_quantity_moved,
          COALESCE(SUM(enriched_items.free_quantity), 0)::text AS free_quantity,
          COALESCE(SUM(enriched_items.discount_value), 0)::text AS product_discounts,
          COALESCE(
            SUM(enriched_items.free_quantity) FILTER (WHERE NOT enriched_items.is_startup_pack)
            / NULLIF((SELECT COUNT(*) FROM order_flags WHERE has_startup_pack), 0),
            0
          )::text AS average_free_bottles_per_startup_pack_order
        FROM enriched_items
      `),
      getRepeatCustomerMetrics(),
      getStartupPackRetention(),
      getRatingsConversion(),
      getStockMovementSummary(),
    ]);

    if (!repeatResult.ok) return repeatResult;
    if (!startupResult.ok) return startupResult;
    if (!ratingsResult.ok) return ratingsResult;
    if (!stockResult.ok) return stockResult;

    const row = result.rows[0];
    const users = numberFromPg(row?.users);
    const quizzes = numberFromPg(row?.quizzes);
    const abandonedCheckouts = numberFromPg(row?.abandoned_checkouts);
    const orders = numberFromPg(row?.orders);
    const orderingCustomers = numberFromPg(row?.ordering_customers);
    const totalRatings = numberFromPg(row?.total_ratings);
    const usersWithRatings = numberFromPg(row?.users_with_ratings);
    const repeatCustomers = numberFromPg(row?.repeat_customers);
    const laterOrderRevenue = numberFromPg(row?.later_order_revenue);
    const totalNonCancelledRevenue = numberFromPg(row?.total_non_cancelled_revenue);
    const totalQuantityMoved = numberFromPg(row?.total_quantity_moved);
    const freeQuantity = numberFromPg(row?.free_quantity);
    const potentialIssues = [
      ...repeatResult.metrics.potentialIssues.filter((issue) => !issue.startsWith('Repeat customers detected')),
      ...startupResult.metrics.potentialIssues,
      ...(abandonedCheckouts > orders ? ['Abandoned checkouts exceed completed orders.'] : []),
      ...ratingsResult.metrics.potentialIssues,
      ...(stockResult.metrics.totalFreeQuantity > 0
        ? ['Free stock movement detected. Stock movement exceeds paid product sales.']
        : []),
    ].slice(0, 8);

    return {
      ok: true,
      metrics: {
        users,
        quizzes,
        abandonedCheckouts,
        orders,
        quizToOrderRatio: ratio(orders, quizzes),
        abandonedCheckoutToOrderRatio: ratio(abandonedCheckouts, orders),
        orderingCustomers,
        firstOrderRevenue: numberFromPg(row?.first_order_revenue),
        averageFirstOrderValue: ratio(numberFromPg(row?.first_order_revenue), orderingCustomers),
        startupPackCustomers: numberFromPg(row?.startup_pack_customers),
        startupPackOrders: numberFromPg(row?.startup_pack_orders),
        totalRatings,
        usersWithRatings,
        usersWithThreePlusRatings: numberFromPg(row?.users_with_three_plus_ratings),
        averageRatingsPerUser: ratio(totalRatings, users),
        repeatCustomers,
        reorderRate: rate(repeatCustomers, orderingCustomers),
        laterOrderRevenue,
        repeatRevenueShare: rate(laterOrderRevenue, totalNonCancelledRevenue),
        smartBoxOrders: numberFromPg(row?.smart_box_orders),
        totalQuantityMoved,
        freeQuantity,
        freeQuantityPercentage: rate(freeQuantity, totalQuantityMoved),
        productDiscounts: numberFromPg(row?.product_discounts),
        averageFreeBottlesPerStartupPackOrder:
          row?.average_free_bottles_per_startup_pack_order === null
            ? null
            : numberFromPg(row?.average_free_bottles_per_startup_pack_order),
        potentialIssues:
          potentialIssues.length > 0 ? potentialIssues : ['No major lifecycle issue detected.'],
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Customer lifecycle failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getRatingsIntelligence(): Promise<RatingsIntelligenceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const mappedRatingsCte = `
      WITH wine_pairings AS (
        SELECT
          wine_id::text AS wine_id,
          CONCAT_WS(', ',
            CASE WHEN BOOL_OR(COALESCE(red_meat, false)) THEN 'red meat' END,
            CASE WHEN BOOL_OR(COALESCE(white_meat, false)) THEN 'white meat' END,
            CASE WHEN BOOL_OR(COALESCE(fish_seafood, false)) THEN 'fish/seafood' END,
            CASE WHEN BOOL_OR(COALESCE(cheese, false)) THEN 'cheese' END,
            CASE WHEN BOOL_OR(COALESCE(aperitif, false)) THEN 'aperitif' END
          ) AS pairing_tags
        FROM public.food_pairing
        GROUP BY wine_id
      ),
      mapped_ratings AS (
        SELECT
          ratings.customer_id,
          users.email,
          ratings.rating,
          CASE
            WHEN ratings.rating = 3 THEN 'Love'
            WHEN ratings.rating = 2 THEN 'Like'
            WHEN ratings.rating = 1 THEN 'Dislike'
            ELSE 'Unknown'
          END AS rating_label,
          CASE
            WHEN ratings.rating = 3 THEN 2
            WHEN ratings.rating = 2 THEN 1
            WHEN ratings.rating = 1 THEN 0
            ELSE NULL
          END AS rating_score,
          ratings.created_at,
          public.mapping.vp_id::text AS shopify_product_id,
          wines.id::text AS wine_id,
          COALESCE(wines.name, public.mapping.name, 'Unknown wine') AS wine_name,
          COALESCE(NULLIF(wines.wine->>'colour', ''), 'Unknown color') AS color,
          COALESCE(NULLIF(wine_pairings.pairing_tags, ''), 'No pairing tags') AS pairing_tags
        FROM public.ratings AS ratings
        LEFT JOIN public.users AS users ON users.id = ratings.customer_id
        LEFT JOIN public.mapping ON public.mapping.vp_id::text = ratings.id::text
        LEFT JOIN public.wines AS wines ON wines.id::text = public.mapping.wl_id::text
        LEFT JOIN wine_pairings ON wine_pairings.wine_id = wines.id::text
      )
    `;
    const summaryResult = await pool.query<Record<string, string | Date | null>>(`
        ${mappedRatingsCte},
        user_counts AS (
          SELECT customer_id, COUNT(*) AS ratings_count
          FROM mapped_ratings
          GROUP BY customer_id
        ),
        wine_rollups AS (
          SELECT
            wine_id,
            COUNT(*) AS total_ratings,
            COUNT(*) FILTER (WHERE rating_label = 'Love') AS love_count,
            COUNT(*) FILTER (WHERE rating_label = 'Like') AS like_count,
            COUNT(*) FILTER (WHERE rating_label = 'Dislike') AS dislike_count
          FROM mapped_ratings
          WHERE wine_id IS NOT NULL
          GROUP BY wine_id
        )
        SELECT
          (SELECT COUNT(*) FROM public.users)::text AS total_users,
          COUNT(*)::text AS total_ratings,
          COUNT(DISTINCT wine_id)::text AS unique_rated_wines,
          COUNT(DISTINCT customer_id)::text AS users_with_ratings,
          (SELECT COUNT(*) FROM user_counts WHERE ratings_count >= 3)::text AS users_with_three_plus_ratings,
          COUNT(*) FILTER (WHERE rating_label = 'Love')::text AS love_count,
          COUNT(*) FILTER (WHERE rating_label = 'Like')::text AS like_count,
          COUNT(*) FILTER (WHERE rating_label = 'Dislike')::text AS dislike_count,
          (SELECT COUNT(*) FROM wine_rollups WHERE love_count > 0)::text AS wines_with_love,
          (SELECT COUNT(*) FROM wine_rollups WHERE dislike_count > 0)::text AS wines_with_dislike,
          (SELECT COUNT(*) FROM wine_rollups WHERE ((love_count + like_count)::numeric / NULLIF(total_ratings, 0)) >= 0.8)::text AS wines_with_high_satisfaction,
          (SELECT COUNT(*) FROM wine_rollups WHERE (dislike_count::numeric / NULLIF(total_ratings, 0)) >= 0.3)::text AS wines_with_high_disappointment,
          MIN(created_at) AS first_rating_date,
          MAX(created_at) AS latest_rating_date
        FROM mapped_ratings
      `);
    const wineResult = await pool.query<Record<string, string | null>>(`
      ${mappedRatingsCte}
      SELECT
        COALESCE(shopify_product_id, 'Unmapped') AS shopify_product_id,
        wine_id,
        wine_name,
        color,
        pairing_tags,
        COUNT(*)::text AS total_ratings,
        COUNT(DISTINCT customer_id)::text AS unique_customers,
        COUNT(*) FILTER (WHERE rating_label = 'Love')::text AS love_count,
        COUNT(*) FILTER (WHERE rating_label = 'Like')::text AS like_count,
        COUNT(*) FILTER (WHERE rating_label = 'Dislike')::text AS dislike_count,
        AVG(rating_score)::text AS average_rating_score
      FROM mapped_ratings
      WHERE wine_id IS NOT NULL
      GROUP BY shopify_product_id, wine_id, wine_name, color, pairing_tags
      ORDER BY COUNT(*) DESC, wine_name
      LIMIT 100
    `);
    const customerResult = await pool.query<Record<string, string | Date | null>>(`
      ${mappedRatingsCte},
      rating_rollups AS (
        SELECT
          customer_id,
          COUNT(*)::text AS total_ratings,
          COUNT(*) FILTER (WHERE rating_label = 'Love')::text AS love_count,
          COUNT(*) FILTER (WHERE rating_label = 'Like')::text AS like_count,
          COUNT(*) FILTER (WHERE rating_label = 'Dislike')::text AS dislike_count,
          COUNT(DISTINCT wine_id)::text AS bottles_rated,
          MAX(created_at) AS last_rating_date,
          STRING_AGG(DISTINCT color, ', ' ORDER BY color) AS wine_colors_rated
        FROM mapped_ratings
        GROUP BY customer_id
      ),
      order_rollups AS (
        SELECT
          lower(email) AS email,
          COUNT(DISTINCT id)::text AS orders_count,
          COUNT(DISTINCT id) FILTER (WHERE cancelled_at IS NULL)::text AS non_cancelled_orders_count,
          COALESCE(SUM(total_price), 0)::text AS total_spent,
          MIN(created_at) AS first_order_date,
          MAX(created_at) AS last_order_date
        FROM shopify.orders
        WHERE email IS NOT NULL
        GROUP BY lower(email)
      ),
      bottle_rollups AS (
        SELECT
          lower(orders.email) AS email,
          COALESCE(SUM(
            CASE
              WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
              ELSE 0
            END
          ), 0)::text AS bottles_bought,
          BOOL_OR(
            COALESCE(item->>'title', item->>'name', '') ILIKE '%starter pack%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%startup pack%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%taste kit%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%tasting kit%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%calibration kit%'
          )::text AS startup_pack_buyer,
          BOOL_OR(
            COALESCE(item->>'title', item->>'name', '') ILIKE '%smart box%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%box%'
          )::text AS smart_box_buyer,
          BOOL_OR(COALESCE(item->>'title', item->>'name', '') ILIKE '%subscription%')::text AS subscriber
        FROM shopify.orders AS orders
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
        WHERE orders.email IS NOT NULL
        GROUP BY lower(orders.email)
      ),
      quiz_rollups AS (
        SELECT customer_id, COUNT(*)::text AS quiz_count
        FROM public.quizz
        GROUP BY customer_id
      )
      SELECT
        users.id AS customer_id,
        users.email,
        COALESCE(order_rollups.total_spent, '0') AS total_spent,
        COALESCE(order_rollups.orders_count, '0') AS orders_count,
        COALESCE(order_rollups.non_cancelled_orders_count, '0') AS non_cancelled_orders_count,
        COALESCE(bottle_rollups.bottles_bought, '0') AS bottles_bought,
        COALESCE(bottle_rollups.startup_pack_buyer, 'false') AS startup_pack_buyer,
        COALESCE(bottle_rollups.smart_box_buyer, 'false') AS smart_box_buyer,
        COALESCE(bottle_rollups.subscriber, 'false') AS subscriber,
        COALESCE(rating_rollups.bottles_rated, '0') AS bottles_rated,
        COALESCE(rating_rollups.total_ratings, '0') AS total_ratings,
        COALESCE(rating_rollups.love_count, '0') AS love_count,
        COALESCE(rating_rollups.like_count, '0') AS like_count,
        COALESCE(rating_rollups.dislike_count, '0') AS dislike_count,
        order_rollups.first_order_date,
        order_rollups.last_order_date,
        rating_rollups.last_rating_date,
        COALESCE(quiz_rollups.quiz_count, '0') AS quiz_count,
        COALESCE(rating_rollups.wine_colors_rated, 'None') AS wine_colors_rated
      FROM public.users AS users
      LEFT JOIN order_rollups ON order_rollups.email = lower(users.email)
      LEFT JOIN bottle_rollups ON bottle_rollups.email = lower(users.email)
      LEFT JOIN rating_rollups ON rating_rollups.customer_id = users.id
      LEFT JOIN quiz_rollups ON quiz_rollups.customer_id = users.id
      WHERE users.email IS NOT NULL
        AND (
          COALESCE(order_rollups.orders_count, '0') <> '0'
          OR COALESCE(rating_rollups.total_ratings, '0') <> '0'
          OR COALESCE(quiz_rollups.quiz_count, '0') <> '0'
        )
      ORDER BY COALESCE(order_rollups.total_spent, '0')::numeric DESC, users.email
      LIMIT 200
    `);
    const customerProductResult = await pool.query<Record<string, string | null>>(`
      WITH order_items AS (
        SELECT
          users.id AS customer_id,
          COALESCE(NULLIF(item->>'product_id', ''), 'Unmapped') AS shopify_product_id,
          COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
          CASE WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric ELSE 0 END AS quantity_value,
          CASE WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric ELSE 0 END AS price_value,
          CASE
            WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
            ELSE 0
          END AS discount_value
        FROM shopify.orders AS orders
        JOIN public.users AS users ON lower(users.email) = lower(orders.email)
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
      ),
      rated_products AS (
        SELECT
          ratings.customer_id,
          public.mapping.vp_id::text AS shopify_product_id,
          COUNT(*) AS rated_count
        FROM public.ratings AS ratings
        JOIN public.mapping ON public.mapping.vp_id::text = ratings.id::text
        GROUP BY ratings.customer_id, public.mapping.vp_id
      )
      SELECT
        order_items.customer_id,
        order_items.shopify_product_id,
        order_items.product_name,
        COALESCE(SUM(quantity_value), 0)::text AS quantity_bought,
        COALESCE(SUM(quantity_value * price_value), 0)::text AS gross_revenue,
        COALESCE(SUM(discount_value), 0)::text AS discount,
        COALESCE(SUM(GREATEST(quantity_value * price_value - discount_value, 0)), 0)::text AS net_revenue,
        COALESCE(MAX(rated_products.rated_count), 0)::text AS rated_count
      FROM order_items
      LEFT JOIN rated_products ON rated_products.customer_id = order_items.customer_id
        AND rated_products.shopify_product_id = order_items.shopify_product_id
      GROUP BY order_items.customer_id, order_items.shopify_product_id, order_items.product_name
      ORDER BY order_items.customer_id, SUM(quantity_value) DESC
    `);
    const customerRatedWineResult = await pool.query<Record<string, string | Date | null>>(`
      ${mappedRatingsCte}
      SELECT
        customer_id,
        wine_name,
        COALESCE(shopify_product_id, 'Unmapped') AS shopify_product_id,
        color,
        rating_label,
        created_at AS rating_date
      FROM mapped_ratings
      WHERE customer_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `);
    const row = summaryResult.rows[0];
    const totalRatings = numberFromPg(row?.total_ratings as string | null);
    const loveCount = numberFromPg(row?.love_count as string | null);
    const likeCount = numberFromPg(row?.like_count as string | null);
    const dislikeCount = numberFromPg(row?.dislike_count as string | null);
    const totalUsers = numberFromPg(row?.total_users as string | null);
    const usersWithRatings = numberFromPg(row?.users_with_ratings as string | null);
    const usersWithThreePlusRatings = numberFromPg(row?.users_with_three_plus_ratings as string | null);
    const wines: WineRatingSummary[] = wineResult.rows.map((wineRow) => {
      const total = numberFromPg(wineRow.total_ratings);
      const love = numberFromPg(wineRow.love_count);
      const like = numberFromPg(wineRow.like_count);
      const dislike = numberFromPg(wineRow.dislike_count);
      const positive = rate(love + like, total);
      const dislikeRate = rate(dislike, total);

      return {
        wineId: wineRow.wine_id || 'Unknown',
        shopifyProductId: wineRow.shopify_product_id || 'Unmapped',
        wineName: wineRow.wine_name || 'Unknown wine',
        color: wineRow.color || 'Unknown color',
        pairingTags: wineRow.pairing_tags || 'No pairing tags',
        totalRatings: total,
        uniqueCustomers: numberFromPg(wineRow.unique_customers),
        loveCount: love,
        likeCount: like,
        dislikeCount: dislike,
        loveRate: rate(love, total),
        likeRate: rate(like, total),
        dislikeRate,
        positiveRate: positive,
        averageRatingScore: wineRow.average_rating_score === null ? null : numberFromPg(wineRow.average_rating_score),
        recommendationLabel:
          total < 3 ? 'Needs more ratings' : (dislikeRate ?? 0) >= 30 ? 'Risk' : (positive ?? 0) >= 80 ? 'Promote' : 'Watch',
      };
    });
    const productsByCustomer = new Map<string, CustomerProductSummary[]>();
    for (const productRow of customerProductResult.rows) {
      const customerId = productRow.customer_id || '';
      const quantityBought = numberFromPg(productRow.quantity_bought);
      const ratedCount = numberFromPg(productRow.rated_count);
      const unratedCount = Math.max(quantityBought - ratedCount, 0);
      const product: CustomerProductSummary = {
        productName: productRow.product_name || 'Unknown product',
        shopifyProductId: productRow.shopify_product_id || 'Unmapped',
        quantityBought,
        grossRevenue: numberFromPg(productRow.gross_revenue),
        discount: numberFromPg(productRow.discount),
        netRevenue: numberFromPg(productRow.net_revenue),
        ratedCount,
        unratedCount,
        ratingStatus: ratedCount === 0 ? 'Not rated' : unratedCount > 0 ? 'Partially rated' : 'Rated',
      };
      productsByCustomer.set(customerId, [...(productsByCustomer.get(customerId) ?? []), product]);
    }
    const ratedWinesByCustomer = new Map<string, RatedWineDetail[]>();
    for (const ratedWineRow of customerRatedWineResult.rows) {
      const customerId = ratedWineRow.customer_id as string;
      const detail: RatedWineDetail = {
        wineName: (ratedWineRow.wine_name as string | null) || 'Unknown wine',
        shopifyProductId: (ratedWineRow.shopify_product_id as string | null) || 'Unmapped',
        color: (ratedWineRow.color as string | null) || 'Unknown color',
        ratingLabel:
          ratedWineRow.rating_label === 'Like'
            ? 'Like'
            : ratedWineRow.rating_label === 'Dislike'
              ? 'Dislike'
              : 'Love',
        ratingDate: dateFromPg((ratedWineRow.rating_date as Date | string | null) ?? null),
      };
      ratedWinesByCustomer.set(customerId, [...(ratedWinesByCustomer.get(customerId) ?? []), detail]);
    }
    const customers: CustomerRatingsSummary[] = customerResult.rows.map((customerRow) => {
      const customerId = (customerRow.customer_id as string | null) || '';
      const bottlesBought = numberFromPg(customerRow.bottles_bought as string | null);
      const bottlesRated = numberFromPg(customerRow.bottles_rated as string | null);
      const unrated = Math.max(bottlesBought - bottlesRated, 0);
      const ordersCount = numberFromPg(customerRow.orders_count as string | null);
      const nonCancelledOrdersCount = numberFromPg(customerRow.non_cancelled_orders_count as string | null);
      const ratedPercentage = rate(bottlesRated, bottlesBought);
      const totalCustomerRatings = numberFromPg(customerRow.total_ratings as string | null);
      const loveForCustomer = numberFromPg(customerRow.love_count as string | null);
      const likeForCustomer = numberFromPg(customerRow.like_count as string | null);
      const startupPackBuyer = customerRow.startup_pack_buyer === 'true';
      const smartBoxBuyer = customerRow.smart_box_buyer === 'true';
      const subscriber = customerRow.subscriber === 'true';
      const repeatCustomer = nonCancelledOrdersCount >= 2;
      const stage = classifyCustomerStage({
        ordersCount,
        nonCancelledOrdersCount,
        bottlesBought,
        bottlesRated,
        ratingsCount: totalCustomerRatings,
        positiveRatingsCount: loveForCustomer + likeForCustomer,
        isStartupPackBuyer: startupPackBuyer,
        isSmartBoxBuyer: smartBoxBuyer,
        isSubscriber: subscriber,
        hasEmail: Boolean(customerRow.email),
        hasQuiz: numberFromPg(customerRow.quiz_count as string | null) > 0,
      });
      const smartBoxReady = stage.name === 'Ready for Smart Box' || totalCustomerRatings >= 3;
      const subscriptionReady = stage.name === 'Ready for Subscription';

      return {
        customerId,
        email: (customerRow.email as string | null) || 'Unknown email',
        totalSpent: numberFromPg(customerRow.total_spent as string | null),
        ordersCount,
        bottlesBought,
        bottlesRated,
        ratedPercentage,
        unratedBottlesRemaining: unrated,
        firstOrderDate: dateFromPg((customerRow.first_order_date as Date | string | null) ?? null),
        lastOrderDate: dateFromPg((customerRow.last_order_date as Date | string | null) ?? null),
        lastRatingDate: dateFromPg((customerRow.last_rating_date as Date | string | null) ?? null),
        repeatCustomer,
        startupPackBuyer,
        smartBoxReady,
        smartBoxBuyer,
        subscriptionReady,
        subscriber,
        funnelStage: stage.name,
        nextAction: stage.recommendedAction,
        emailAngle: stage.emailAngle,
        socialAngle: stage.socialAngle,
        suggestedOffer: stage.offer,
        objectionToHandle: stage.objection,
        dataConfidence: stage.confidence,
        stageHealth: stage.health,
        stageExplanation: stage.explanation,
        loveCount: loveForCustomer,
        likeCount: likeForCustomer,
        dislikeCount: numberFromPg(customerRow.dislike_count as string | null),
        wineColorsRated: (customerRow.wine_colors_rated as string | null) || 'None',
        ratedWines: ratedWinesByCustomer.get(customerId) ?? [],
        purchasedProducts: productsByCustomer.get(customerId) ?? [],
      };
    });
    const positiveRatingRate = rate(loveCount + likeCount, totalRatings);
    const recommendedActions: string[] = [];

    if (totalUsers > 0 && usersWithRatings / totalUsers < 0.5) {
      recommendedActions.push('Improve post-delivery rating emails.');
    }

    if (totalRatings > 0) {
      recommendedActions.push('Use wine-level Love/Like/Dislike signals to improve Smart Box recommendations.');
    }

    if ((positiveRatingRate ?? 0) >= 95 && totalRatings > 0) {
      recommendedActions.push('Check whether Dislike is being correctly captured.');
    }

    if (usersWithThreePlusRatings > 0) {
      recommendedActions.push('Create a Smart Box Ready segment for users with 3+ ratings.');
    }

    return {
      ok: true,
      metrics: {
        totalUsers,
        totalRatings,
        uniqueRatedWines: numberFromPg(row?.unique_rated_wines as string | null),
        usersWithRatings,
        usersWithThreePlusRatings,
        averageRatingsPerRatedUser: ratio(totalRatings, usersWithRatings),
        loveCount,
        likeCount,
        dislikeCount,
        loveRate: rate(loveCount, totalRatings),
        likeRate: rate(likeCount, totalRatings),
        dislikeRate: rate(dislikeCount, totalRatings),
        positiveRatingRate,
        winesWithLove: numberFromPg(row?.wines_with_love as string | null),
        winesWithDislike: numberFromPg(row?.wines_with_dislike as string | null),
        winesWithHighSatisfaction: numberFromPg(row?.wines_with_high_satisfaction as string | null),
        winesWithHighDisappointment: numberFromPg(row?.wines_with_high_disappointment as string | null),
        firstRatingDate: dateFromPg((row?.first_rating_date as Date | string | null) ?? null),
        latestRatingDate: dateFromPg((row?.latest_rating_date as Date | string | null) ?? null),
        wines,
        customers,
        interpretation: [
          'Wine-level ratings are available through public.mapping from VinPop product IDs to wine IDs.',
          'Love/Like/Dislike distribution can guide Smart Box product ranking and product page confidence.',
          'Keep monitoring wines with low rating counts before making strong assortment decisions.',
        ],
        recommendedActions,
        missingData: [
          'public.ratings.id maps to public.mapping.vp_id, then public.mapping.wl_id maps to public.wines.id.',
          'Need rating timestamp, already available as created_at.',
          'Need rating value mapped to Love / Like / Dislike, currently inferred from numeric rating values.',
        ],
        wineLevelAnalysisAvailable: wines.length > 0,
        wineLevelUnavailableReason:
          wines.length > 0
            ? null
            : 'No wine-level ratings matched through public.mapping.vp_id to public.wines.id.',
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Ratings intelligence failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getCustomerIntelligence(): Promise<CustomerIntelligenceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [customerResult, customerProductResult, customerRatedWineResult] = await Promise.all([
      pool.query<Record<string, string | Date | null>>(`
        WITH rating_rollups AS (
          SELECT
            customer_id,
            COUNT(*)::text AS total_ratings,
            COUNT(*) FILTER (WHERE rating = 3)::text AS love_count,
            COUNT(*) FILTER (WHERE rating = 2)::text AS like_count,
            COUNT(*) FILTER (WHERE rating = 1)::text AS dislike_count,
            COUNT(DISTINCT id)::text AS bottles_rated,
            MAX(created_at) AS last_rating_date
          FROM public.ratings
          GROUP BY customer_id
        ),
        order_rollups AS (
          SELECT
            lower(email) AS email,
            COUNT(DISTINCT id)::text AS orders_count,
            COUNT(DISTINCT id) FILTER (WHERE cancelled_at IS NULL)::text AS non_cancelled_orders_count,
            COALESCE(SUM(total_price), 0)::text AS total_spent,
            MIN(created_at) AS first_order_date,
            MAX(created_at) AS last_order_date
          FROM shopify.orders
          WHERE email IS NOT NULL
          GROUP BY lower(email)
        ),
        bottle_rollups AS (
          SELECT
            lower(orders.email) AS email,
            COALESCE(SUM(
              CASE
                WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
                ELSE 0
              END
            ), 0)::text AS bottles_bought,
            BOOL_OR(
              COALESCE(item->>'title', item->>'name', '') ILIKE '%starter pack%'
              OR COALESCE(item->>'title', item->>'name', '') ILIKE '%startup pack%'
              OR COALESCE(item->>'title', item->>'name', '') ILIKE '%taste kit%'
              OR COALESCE(item->>'title', item->>'name', '') ILIKE '%tasting kit%'
              OR COALESCE(item->>'title', item->>'name', '') ILIKE '%calibration kit%'
            )::text AS startup_pack_buyer,
            BOOL_OR(
              COALESCE(item->>'title', item->>'name', '') ILIKE '%smart box%'
              OR COALESCE(item->>'title', item->>'name', '') ILIKE '%box%'
            )::text AS smart_box_buyer,
            BOOL_OR(COALESCE(item->>'title', item->>'name', '') ILIKE '%subscription%')::text AS subscriber
          FROM shopify.orders AS orders
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE
              WHEN line_items IS NULL THEN '[]'::jsonb
              WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
              ELSE '[]'::jsonb
            END
          ) AS item
          WHERE orders.email IS NOT NULL
          GROUP BY lower(orders.email)
        ),
        quiz_rollups AS (
          SELECT customer_id, COUNT(*)::text AS quiz_count
          FROM public.quizz
          GROUP BY customer_id
        )
        SELECT
          users.id AS customer_id,
          users.email,
          COALESCE(order_rollups.total_spent, '0') AS total_spent,
          COALESCE(order_rollups.orders_count, '0') AS orders_count,
          COALESCE(order_rollups.non_cancelled_orders_count, '0') AS non_cancelled_orders_count,
          COALESCE(bottle_rollups.bottles_bought, '0') AS bottles_bought,
          COALESCE(bottle_rollups.startup_pack_buyer, 'false') AS startup_pack_buyer,
          COALESCE(bottle_rollups.smart_box_buyer, 'false') AS smart_box_buyer,
          COALESCE(bottle_rollups.subscriber, 'false') AS subscriber,
          COALESCE(rating_rollups.bottles_rated, '0') AS bottles_rated,
          COALESCE(rating_rollups.total_ratings, '0') AS total_ratings,
          COALESCE(rating_rollups.love_count, '0') AS love_count,
          COALESCE(rating_rollups.like_count, '0') AS like_count,
          COALESCE(rating_rollups.dislike_count, '0') AS dislike_count,
          order_rollups.first_order_date,
          order_rollups.last_order_date,
          rating_rollups.last_rating_date,
          COALESCE(quiz_rollups.quiz_count, '0') AS quiz_count
        FROM public.users AS users
        LEFT JOIN order_rollups ON order_rollups.email = lower(users.email)
        LEFT JOIN bottle_rollups ON bottle_rollups.email = lower(users.email)
        LEFT JOIN rating_rollups ON rating_rollups.customer_id = users.id
        LEFT JOIN quiz_rollups ON quiz_rollups.customer_id = users.id
        WHERE users.email IS NOT NULL
          AND (
            COALESCE(order_rollups.orders_count, '0') <> '0'
            OR COALESCE(rating_rollups.total_ratings, '0') <> '0'
            OR COALESCE(quiz_rollups.quiz_count, '0') <> '0'
          )
        ORDER BY COALESCE(order_rollups.total_spent, '0')::numeric DESC, users.email
        LIMIT 200
      `),
      pool.query<Record<string, string | null>>(`
        WITH order_items AS (
          SELECT
            users.id AS customer_id,
            COALESCE(NULLIF(item->>'product_id', ''), 'Unmapped') AS shopify_product_id,
            COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
            CASE WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric ELSE 0 END AS quantity_value,
            CASE WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric ELSE 0 END AS price_value,
            CASE
              WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
              ELSE 0
            END AS discount_value
          FROM shopify.orders AS orders
          JOIN public.users AS users ON lower(users.email) = lower(orders.email)
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE
              WHEN line_items IS NULL THEN '[]'::jsonb
              WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
              ELSE '[]'::jsonb
            END
          ) AS item
        ),
        rated_products AS (
          SELECT
            ratings.customer_id,
            public.mapping.vp_id::text AS shopify_product_id,
            COUNT(*) AS rated_count
          FROM public.ratings AS ratings
          JOIN public.mapping ON public.mapping.vp_id::text = ratings.id::text
          GROUP BY ratings.customer_id, public.mapping.vp_id
        )
        SELECT
          order_items.customer_id,
          order_items.shopify_product_id,
          order_items.product_name,
          COALESCE(SUM(quantity_value), 0)::text AS quantity_bought,
          COALESCE(SUM(quantity_value * price_value), 0)::text AS gross_revenue,
          COALESCE(SUM(discount_value), 0)::text AS discount,
          COALESCE(SUM(GREATEST(quantity_value * price_value - discount_value, 0)), 0)::text AS net_revenue,
          COALESCE(MAX(rated_products.rated_count), 0)::text AS rated_count
        FROM order_items
        LEFT JOIN rated_products ON rated_products.customer_id = order_items.customer_id
          AND rated_products.shopify_product_id = order_items.shopify_product_id
        GROUP BY order_items.customer_id, order_items.shopify_product_id, order_items.product_name
        ORDER BY order_items.customer_id, SUM(quantity_value) DESC
      `),
      pool.query<Record<string, string | Date | null>>(`
        SELECT
          ratings.customer_id,
          COALESCE(public.mapping.vp_id::text, 'Unmapped') AS shopify_product_id,
          COALESCE(wines.name, public.mapping.name, 'Unknown wine') AS wine_name,
          COALESCE(NULLIF(wines.wine->>'colour', ''), 'Unknown color') AS color,
          CASE
            WHEN ratings.rating = 3 THEN 'Love'
            WHEN ratings.rating = 2 THEN 'Like'
            WHEN ratings.rating = 1 THEN 'Dislike'
            ELSE 'Love'
          END AS rating_label,
          ratings.created_at AS rating_date
        FROM public.ratings AS ratings
        LEFT JOIN public.mapping ON public.mapping.vp_id::text = ratings.id::text
        LEFT JOIN public.wines AS wines ON wines.id::text = public.mapping.wl_id::text
        WHERE ratings.customer_id IS NOT NULL
        ORDER BY ratings.created_at DESC
        LIMIT 1000
      `),
    ]);
    const productsByCustomer = new Map<string, CustomerProductSummary[]>();
    for (const productRow of customerProductResult.rows) {
      const customerId = productRow.customer_id || '';
      const quantityBought = numberFromPg(productRow.quantity_bought);
      const ratedCount = numberFromPg(productRow.rated_count);
      const unratedCount = Math.max(quantityBought - ratedCount, 0);
      const product: CustomerProductSummary = {
        productName: productRow.product_name || 'Unknown product',
        shopifyProductId: productRow.shopify_product_id || 'Unmapped',
        quantityBought,
        grossRevenue: numberFromPg(productRow.gross_revenue),
        discount: numberFromPg(productRow.discount),
        netRevenue: numberFromPg(productRow.net_revenue),
        ratedCount,
        unratedCount,
        ratingStatus: ratedCount === 0 ? 'Not rated' : unratedCount > 0 ? 'Partially rated' : 'Rated',
      };
      productsByCustomer.set(customerId, [...(productsByCustomer.get(customerId) ?? []), product]);
    }
    const ratedWinesByCustomer = new Map<string, RatedWineDetail[]>();
    for (const ratedWineRow of customerRatedWineResult.rows) {
      const customerId = ratedWineRow.customer_id as string;
      const detail: RatedWineDetail = {
        wineName: (ratedWineRow.wine_name as string | null) || 'Unknown product',
        shopifyProductId: (ratedWineRow.shopify_product_id as string | null) || 'Unmapped',
        color: (ratedWineRow.color as string | null) || 'Unknown color',
        ratingLabel:
          ratedWineRow.rating_label === 'Like'
            ? 'Like'
            : ratedWineRow.rating_label === 'Dislike'
              ? 'Dislike'
              : 'Love',
        ratingDate: dateFromPg((ratedWineRow.rating_date as Date | string | null) ?? null),
      };
      ratedWinesByCustomer.set(customerId, [...(ratedWinesByCustomer.get(customerId) ?? []), detail]);
    }
    const customers: CustomerRatingsSummary[] = customerResult.rows.map((customerRow) => {
      const customerId = (customerRow.customer_id as string | null) || '';
      const bottlesBought = numberFromPg(customerRow.bottles_bought as string | null);
      const bottlesRated = numberFromPg(customerRow.bottles_rated as string | null);
      const unrated = Math.max(bottlesBought - bottlesRated, 0);
      const ordersCount = numberFromPg(customerRow.orders_count as string | null);
      const nonCancelledOrdersCount = numberFromPg(customerRow.non_cancelled_orders_count as string | null);
      const ratedPercentage = rate(bottlesRated, bottlesBought);
      const totalCustomerRatings = numberFromPg(customerRow.total_ratings as string | null);
      const loveForCustomer = numberFromPg(customerRow.love_count as string | null);
      const likeForCustomer = numberFromPg(customerRow.like_count as string | null);
      const startupPackBuyer = customerRow.startup_pack_buyer === 'true';
      const smartBoxBuyer = customerRow.smart_box_buyer === 'true';
      const subscriber = customerRow.subscriber === 'true';
      const repeatCustomer = nonCancelledOrdersCount >= 2;
      const stage = classifyCustomerStage({
        ordersCount,
        nonCancelledOrdersCount,
        bottlesBought,
        bottlesRated,
        ratingsCount: totalCustomerRatings,
        positiveRatingsCount: loveForCustomer + likeForCustomer,
        isStartupPackBuyer: startupPackBuyer,
        isSmartBoxBuyer: smartBoxBuyer,
        isSubscriber: subscriber,
        hasEmail: Boolean(customerRow.email),
        hasQuiz: numberFromPg(customerRow.quiz_count as string | null) > 0,
      });
      const smartBoxReady = stage.name === 'Ready for Smart Box' || totalCustomerRatings >= 3;
      const subscriptionReady = stage.name === 'Ready for Subscription';
      const ratedWines = ratedWinesByCustomer.get(customerId) ?? [];
      const wineColorsRated =
        Array.from(new Set(ratedWines.map((wine) => wine.color).filter((color) => color !== 'Unknown color')))
          .sort()
          .join(', ') || 'Unknown color';

      return {
        customerId,
        email: (customerRow.email as string | null) || 'Unknown email',
        totalSpent: numberFromPg(customerRow.total_spent as string | null),
        ordersCount,
        bottlesBought,
        bottlesRated,
        ratedPercentage,
        unratedBottlesRemaining: unrated,
        firstOrderDate: dateFromPg((customerRow.first_order_date as Date | string | null) ?? null),
        lastOrderDate: dateFromPg((customerRow.last_order_date as Date | string | null) ?? null),
        lastRatingDate: dateFromPg((customerRow.last_rating_date as Date | string | null) ?? null),
        repeatCustomer,
        startupPackBuyer,
        smartBoxReady,
        smartBoxBuyer,
        subscriptionReady,
        subscriber,
        funnelStage: stage.name,
        nextAction: stage.recommendedAction,
        emailAngle: stage.emailAngle,
        socialAngle: stage.socialAngle,
        suggestedOffer: stage.offer,
        objectionToHandle: stage.objection,
        dataConfidence: stage.confidence,
        stageHealth: stage.health,
        stageExplanation: stage.explanation,
        loveCount: loveForCustomer,
        likeCount: likeForCustomer,
        dislikeCount: numberFromPg(customerRow.dislike_count as string | null),
        wineColorsRated,
        ratedWines,
        purchasedProducts: productsByCustomer.get(customerId) ?? [],
      };
    });

    return { ok: true, metrics: { customers } };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Customer intelligence failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getFoodPairingIntelligence(): Promise<FoodPairingIntelligenceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [summaryResult, pairingResult, wineResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
        WITH wine_pairings AS (
          SELECT
            wines.id::text AS wine_id,
            BOOL_OR(COALESCE(food_pairing.red_meat, false)) AS red_meat,
            BOOL_OR(COALESCE(food_pairing.white_meat, false)) AS white_meat,
            BOOL_OR(COALESCE(food_pairing.fish_seafood, false)) AS fish_seafood,
            BOOL_OR(COALESCE(food_pairing.cheese, false)) AS cheese,
            BOOL_OR(COALESCE(food_pairing.aperitif, false)) AS aperitif
          FROM public.wines
          LEFT JOIN public.food_pairing ON food_pairing.wine_id::text = wines.id::text
            OR food_pairing.wine_id::text = wines.wine_id::text
          GROUP BY wines.id
        )
        SELECT
          (SELECT COUNT(*) FROM public.food_pairing)::text AS food_pairing_rows,
          (
            SELECT COUNT(*)
            FROM public.food_pairing
            WHERE COALESCE(red_meat, false)
               OR COALESCE(white_meat, false)
               OR COALESCE(fish_seafood, false)
               OR COALESCE(cheese, false)
               OR COALESCE(aperitif, false)
          )::text AS populated_pairing_rows,
          COUNT(*)::text AS total_wines,
          COUNT(*) FILTER (WHERE red_meat OR white_meat OR fish_seafood OR cheese OR aperitif)::text AS wines_with_pairing_data,
          COUNT(*) FILTER (WHERE red_meat)::text AS red_meat_wines,
          COUNT(*) FILTER (WHERE white_meat)::text AS white_meat_wines,
          COUNT(*) FILTER (WHERE fish_seafood)::text AS fish_seafood_wines,
          COUNT(*) FILTER (WHERE cheese)::text AS cheese_wines,
          COUNT(*) FILTER (WHERE aperitif)::text AS aperitif_wines,
          COUNT(*) FILTER (WHERE ((red_meat::int + white_meat::int + fish_seafood::int + cheese::int + aperitif::int) > 1))::text AS wines_with_multiple_pairings,
          COUNT(*) FILTER (WHERE NOT (red_meat OR white_meat OR fish_seafood OR cheese OR aperitif))::text AS wines_without_pairing
        FROM wine_pairings
      `),
      pool.query<Record<string, string | null>>(`
        WITH pairings AS (
          SELECT 'Red meat' AS category, wine_id FROM public.food_pairing WHERE red_meat
          UNION ALL SELECT 'White meat', wine_id FROM public.food_pairing WHERE white_meat
          UNION ALL SELECT 'Fish/seafood', wine_id FROM public.food_pairing WHERE fish_seafood
          UNION ALL SELECT 'Cheese', wine_id FROM public.food_pairing WHERE cheese
          UNION ALL SELECT 'Aperitif', wine_id FROM public.food_pairing WHERE aperitif
        )
        SELECT
          category,
          COUNT(DISTINCT wine_id)::text AS wines_count,
          NULL::text AS ratings_count,
          NULL::text AS love_count,
          NULL::text AS like_count,
          NULL::text AS dislike_count
        FROM pairings
        GROUP BY category
        ORDER BY wines_count DESC
      `),
      pool.query<Record<string, string | null>>(`
        WITH wine_pairings AS (
          SELECT
            wines.id::text AS wine_id,
            wines.name AS wine_name,
            COALESCE(wines.wine->>'vendor', wines.wine->>'producer', 'Unknown vendor') AS vendor,
            CONCAT_WS(', ',
              CASE WHEN BOOL_OR(COALESCE(food_pairing.red_meat, false)) THEN 'red meat' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.white_meat, false)) THEN 'white meat' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.fish_seafood, false)) THEN 'fish/seafood' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.cheese, false)) THEN 'cheese' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.aperitif, false)) THEN 'aperitif' END
            ) AS pairing_tags
          FROM public.wines
          LEFT JOIN public.food_pairing ON food_pairing.wine_id::text = wines.id::text
            OR food_pairing.wine_id::text = wines.wine_id::text
          GROUP BY wines.id, wines.name, wines.wine
        )
        SELECT
          wine_name,
          vendor,
          NULLIF(pairing_tags, '') AS pairing_tags,
          0::text AS total_ratings,
          0::text AS love_count,
          0::text AS like_count,
          0::text AS dislike_count
        FROM wine_pairings
        GROUP BY wine_name, vendor, pairing_tags
        ORDER BY wine_name
        LIMIT 100
      `),
    ]);
    const summary = summaryResult.rows[0];
    const totalWines = numberFromPg(summary?.total_wines);
    const winesWithPairingData = numberFromPg(summary?.wines_with_pairing_data);
    const foodPairingRows = numberFromPg(summary?.food_pairing_rows);
    const populatedPairingRows = numberFromPg(summary?.populated_pairing_rows);
    const coverageGapReason =
      foodPairingRows === 0
        ? 'public.food_pairing table is empty.'
        : populatedPairingRows === 0
          ? 'public.food_pairing exists, but pairing booleans are not populated.'
          : winesWithPairingData === 0
            ? 'Food pairing rows exist, but the join to public.wines is not matching.'
            : null;
    const pairings = pairingResult.rows.map((row) => {
      const ratingsCount = row.ratings_count === null ? null : numberFromPg(row.ratings_count);
      const loveCount = row.love_count === null ? null : numberFromPg(row.love_count);
      const likeCount = row.like_count === null ? null : numberFromPg(row.like_count);
      const dislikeCount = row.dislike_count === null ? null : numberFromPg(row.dislike_count);
      const positiveRate = ratingsCount === null || loveCount === null || likeCount === null ? null : rate(loveCount + likeCount, ratingsCount);
      return {
        pairingCategory: row.category || 'Unknown pairing',
        winesCount: numberFromPg(row.wines_count),
        ratingsCount,
        loveCount,
        likeCount,
        dislikeCount,
        positiveRate,
        suggestedAction:
          ratingsCount === null ? 'Use in product page messaging' : ratingsCount < 5 ? 'Needs more ratings' : (rate(dislikeCount ?? 0, ratingsCount) ?? 0) >= 30 ? 'Monitor dislikes' : 'Use in product page messaging',
      };
    });

    return {
      ok: true,
      metrics: {
        totalWines,
        foodPairingRows,
        populatedPairingRows,
        winesWithPairingData,
        redMeatWines: numberFromPg(summary?.red_meat_wines),
        whiteMeatWines: numberFromPg(summary?.white_meat_wines),
        fishSeafoodWines: numberFromPg(summary?.fish_seafood_wines),
        cheeseWines: numberFromPg(summary?.cheese_wines),
        aperitifWines: numberFromPg(summary?.aperitif_wines),
        winesWithMultiplePairings: numberFromPg(summary?.wines_with_multiple_pairings),
        winesWithoutPairing: numberFromPg(summary?.wines_without_pairing),
        pairingCoverageRate: rate(winesWithPairingData, totalWines),
        pairings,
        wines: wineResult.rows.map((row) => {
          const totalRatings = numberFromPg(row.total_ratings);
          const loveCount = numberFromPg(row.love_count);
          const likeCount = numberFromPg(row.like_count);
          const dislikeCount = numberFromPg(row.dislike_count);
          const positiveRate = rate(loveCount + likeCount, totalRatings);
          const dislikeRate = rate(dislikeCount, totalRatings);
          return {
            wineName: row.wine_name || 'Unknown wine',
            vendor: row.vendor || 'Unknown vendor',
            pairingTags: row.pairing_tags || 'No pairing tags',
            totalRatings,
            positiveRate,
            dislikeRate,
            actionLabel: totalRatings < 3 ? 'Needs more ratings' : (dislikeRate ?? 0) >= 30 ? 'Monitor dislikes' : 'Use in product page messaging',
          };
        }),
        coverageGapReason,
        nextDataFixes: [
          'Ensure every wine has at least one pairing.',
          'Connect pairing tags to product recommendation logic.',
          'Use pairing labels on product cards and Smart Box explanations.',
        ],
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Food pairing intelligence failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

function metaPerformanceLabel(
  spend: number,
  clicks: number,
  ctrValue: number | null,
  cpcValue: number | null,
  purchases: number | null,
  roasValue: number | null,
): string {
  if ((purchases ?? 0) > 0 && (roasValue ?? 0) >= 1.5) return 'Scale candidate';
  if (spend <= 0 || clicks <= 0 || ctrValue === null || cpcValue === null) return 'Insufficient data';
  if (ctrValue >= 1.5 && cpcValue <= 1) return purchases === null ? 'Attribution missing' : 'Keep testing';
  if (spend >= 25 && ctrValue < 0.8) return 'Weak creative';
  if (ctrValue >= 1) return 'Watch';
  return 'Weak creative';
}

function metaRecommendedAction(label: string, ctrValue: number | null, cpcValue: number | null, hookRate: number | null): string {
  if (label === 'Scale candidate') return 'Scale carefully if CPA and stock capacity are acceptable.';
  if (label === 'Attribution missing' && (ctrValue ?? 0) >= 1.5 && (cpcValue ?? 99) <= 1) return 'Keep creative, fix attribution.';
  if (label === 'Weak creative') return 'Stop, refresh creative, or test a stronger first 3 seconds.';
  if (hookRate !== null && hookRate >= 20 && (ctrValue ?? 0) < 1) return 'Hook works, improve offer or CTA.';
  if (hookRate !== null && hookRate < 10) return 'Test a stronger first 3 seconds.';
  if (label === 'Watch') return 'Keep testing and compare against checkout friction.';
  return 'Add UTM/meta click tracking before scaling.';
}

function metaPostClickQuality(
  activeClickRate: number | null,
  costPerAddToCart: number | null,
  purchases: number | null,
): 'Good' | 'Medium' | 'Weak' {
  if ((activeClickRate ?? 0) >= 55 && (costPerAddToCart ?? 999) <= 25 && (purchases ?? 0) >= 2) {
    return 'Good';
  }
  if ((activeClickRate ?? 0) >= 35 && ((costPerAddToCart ?? 999) <= 45 || (purchases ?? 0) >= 1)) {
    return 'Medium';
  }
  return 'Weak';
}

export async function getMetaAdsOverviewSummary(range: DateRange): Promise<MetaAdsOverviewSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const start = dateToSql(range.start);
  const end = dateToSql(range.end);

  try {
    const pool = getPool(databaseUrl);
    const [summaryResult, dailyResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(SUM(spend), 0)::text AS total_spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value
        FROM public.ads_insights
        WHERE date_start BETWEEN $1 AND $2
      `, [start, end]),
      pool.query<Record<string, string | null>>(`
        SELECT
          date_start::text AS date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(clicks), 0)::text AS clicks
        FROM public.ads_insights
        WHERE date_start BETWEEN $1 AND $2
        GROUP BY date_start
        ORDER BY date_start
      `, [start, end]),
    ]);

    const summary = summaryResult.rows[0];
    const totalSpend = numberFromPg(summary?.total_spend);
    const impressions = numberFromPg(summary?.impressions);
    const clicks = numberFromPg(summary?.clicks);
    const purchases = numberFromPg(summary?.purchases);
    const purchaseValue = numberFromPg(summary?.purchase_value);

    return {
      ok: true,
      metrics: {
        totalSpend,
        clicks,
        ctr: rate(clicks, impressions),
        cpc: ratio(totalSpend, clicks),
        attributionAvailable: purchases > 0 || purchaseValue > 0,
        attributionNote:
          purchases > 0 || purchaseValue > 0
            ? 'Meta platform attribution fields are available. True Shopify CAC/ROAS attribution still requires session/order joining.'
            : 'Meta spend and clicks are available, but purchase attribution fields are missing for this period.',
        daily: dailyResult.rows.map((row) => ({
          date: row.date || '',
          spend: numberFromPg(row.spend),
          clicks: numberFromPg(row.clicks),
        })),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Meta ads overview summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getMetaAdsPerformance(): Promise<MetaAdsPerformanceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const objectiveCandidates = ['objective', 'effective_objective', 'campaign_objective', 'marketing_objective', 'outcome'];
    const campaignObjectiveColumnResult = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'campaigns'
        AND column_name = ANY($1::text[])
    `, [objectiveCandidates]);
    const availableObjectiveColumns = new Set(campaignObjectiveColumnResult.rows.map((row) => row.column_name));
    const selectedObjectiveColumn = objectiveCandidates.find((column) => availableObjectiveColumns.has(column)) ?? null;
    const campaignObjectiveSql = selectedObjectiveColumn
      ? `MAX(campaigns.${selectedObjectiveColumn})::text`
      : 'NULL::text';

    const [summaryResult, dailyResult, campaignsResult, adSetsResult, adsResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(SUM(spend), 0)::text AS total_spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_add_to_cart'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS add_to_cart,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COUNT(DISTINCT campaign_id)::text AS campaigns_count,
          COUNT(DISTINCT adset_id)::text AS ad_sets_count,
          COUNT(DISTINCT ad_id)::text AS ads_count,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date
        FROM public.ads_insights
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          date_start::text AS date,
          COALESCE(ads_insights.campaign_id, '') AS campaign_id,
          COALESCE(ads_insights.adset_id, '') AS adset_id,
          COALESCE(ads_insights.ad_id, '') AS ad_id,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_add_to_cart'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS add_to_cart,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value
          ,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events
        FROM public.ads_insights
        GROUP BY date_start, ads_insights.campaign_id, ads_insights.adset_id, ads_insights.ad_id
        ORDER BY date_start
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(ads_insights.campaign_id, '') AS id,
          ${campaignObjectiveSql} AS campaign_objective,
          COALESCE(MAX(campaign_name), 'Unknown campaign') AS name,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(inline_link_clicks), 0)::text AS inline_link_clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COALESCE(MAX(campaigns.effective_status), MAX(campaigns.status), 'Unknown') AS status
        FROM public.ads_insights
        LEFT JOIN public.campaigns ON campaigns.id = ads_insights.campaign_id
        GROUP BY ads_insights.campaign_id
        ORDER BY SUM(spend) DESC NULLS LAST
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(ads_insights.adset_id, '') AS id,
          COALESCE(ads_insights.campaign_id, '') AS campaign_id,
          ${campaignObjectiveSql} AS campaign_objective,
          COALESCE(MAX(adset_name), 'Unknown ad set') AS name,
          COALESCE(MAX(campaign_name), 'Unknown campaign') AS parent_name,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(inline_link_clicks), 0)::text AS inline_link_clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COALESCE(MAX(ad_sets.effective_status), 'Unknown') AS status
        FROM public.ads_insights
        LEFT JOIN public.ad_sets ON ad_sets.id = ads_insights.adset_id
        LEFT JOIN public.campaigns ON campaigns.id = ads_insights.campaign_id
        GROUP BY ads_insights.adset_id, ads_insights.campaign_id
        ORDER BY SUM(spend) DESC NULLS LAST
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(ads_insights.ad_id, '') AS id,
          COALESCE(ads_insights.adset_id, '') AS adset_id,
          COALESCE(ads_insights.campaign_id, '') AS campaign_id,
          ${campaignObjectiveSql} AS campaign_objective,
          COALESCE(MAX(ad_name), 'Unknown ad') AS name,
          COALESCE(MAX(ads.name), MAX(ad_name), 'Unknown creative') AS creative_label,
          COALESCE(MAX(adset_name), 'Unknown ad set') AS parent_name,
          COALESCE(MAX(campaign_name), 'Unknown campaign') AS campaign_name,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(inline_link_clicks), 0)::text AS inline_link_clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COALESCE(MAX(ads.effective_status), MAX(ads.status), 'Unknown') AS status
        FROM public.ads_insights
        LEFT JOIN public.ads ON ads.id = ads_insights.ad_id
        LEFT JOIN public.campaigns ON campaigns.id = ads_insights.campaign_id
        GROUP BY ads_insights.ad_id, ads_insights.adset_id, ads_insights.campaign_id
        ORDER BY SUM(spend) DESC NULLS LAST
      `),
    ]);
    const toRow = (row: Record<string, string | null>): MetaPerformanceRow => {
      const spend = numberFromPg(row.spend);
      const impressions = numberFromPg(row.impressions);
      const clicks = numberFromPg(row.clicks);
      const reach = numberFromPg(row.reach);
      const landingPageViewsRaw = numberFromPg(row.landing_page_views);
      const landingPageViews = landingPageViewsRaw > 0 ? landingPageViewsRaw : null;
      const addToCartRaw = numberFromPg(row.add_to_cart);
      const addToCart = addToCartRaw > 0 ? addToCartRaw : null;
      const purchasesRaw = numberFromPg(row.purchases);
      const purchaseValueRaw = numberFromPg(row.purchase_value);
      const purchases = purchasesRaw > 0 ? purchasesRaw : null;
      const purchaseValue = purchaseValueRaw > 0 ? purchaseValueRaw : null;
      const hookEvents = numberFromPg(row.hook_events);
      const videoPlays = hookEvents > 0 ? hookEvents : null;
      const activeClickRate = landingPageViews === null ? null : rate(landingPageViews, clicks);
      const costPerAddToCart = addToCart === null ? null : ratio(spend, addToCart);
      const ctrValue = rate(clicks, impressions);
      const cpcValue = ratio(spend, clicks);
      const cpmValue = impressions === 0 ? null : (spend / impressions) * 1000;
      const hookRate = hookEvents > 0 ? rate(hookEvents, impressions) : null;
      const roasValue = purchaseValue === null || spend === 0 ? null : purchaseValue / spend;
      const performanceLabel = metaPerformanceLabel(spend, clicks, ctrValue, cpcValue, purchases, roasValue);
      return {
        id: row.id || row.name || 'unknown',
        parentId: row.adset_id || row.campaign_id || '',
        campaignId: row.campaign_id || row.id || '',
        adSetId: row.adset_id || '',
        campaignObjective: row.campaign_objective || null,
        name: row.name || 'Unknown',
        parentName: row.parent_name || row.campaign_name || '',
        campaignName: row.campaign_name || row.parent_name || row.name || 'Unknown',
        creativeLabel: row.creative_label || row.name || 'Unknown creative',
        firstDate: row.first_date || null,
        latestDate: row.latest_date || null,
        spend,
        impressions,
        clicks,
        reach,
        frequency: ratio(impressions, reach),
        ctr: ctrValue,
        cpc: cpcValue,
        cpm: cpmValue,
        landingPageViews,
        activeClickRate,
        videoPlays,
        videoPlayToLandingRate: landingPageViews === null || videoPlays === null ? null : rate(landingPageViews, videoPlays),
        costPerLandingPageView: landingPageViews === null ? null : ratio(spend, landingPageViews),
        addToCart,
        costPerAddToCart,
        hookRate,
        hookMetric: hookRate === null ? 'Unavailable' : 'Video action proxy / impressions',
        purchases,
        purchaseValue,
        cpa: purchases === null ? null : ratio(spend, purchases),
        roas: roasValue,
        postClickQuality: metaPostClickQuality(activeClickRate, costPerAddToCart, purchases),
        status: row.status || 'Unknown',
        performanceLabel,
        recommendedAction: metaRecommendedAction(performanceLabel, ctrValue, cpcValue, hookRate),
        sufficientSpend: spend >= 15,
      };
    };
    const summary = summaryResult.rows[0];
    const totalSpend = numberFromPg(summary?.total_spend);
    const impressions = numberFromPg(summary?.impressions);
    const clicks = numberFromPg(summary?.clicks);
    const purchasesRaw = numberFromPg(summary?.purchases);
    const purchaseValueRaw = numberFromPg(summary?.purchase_value);
    const purchases = purchasesRaw > 0 ? purchasesRaw : null;
    const purchaseValue = purchaseValueRaw > 0 ? purchaseValueRaw : null;
    const hookEvents = numberFromPg(summary?.hook_events);
    const daily = dailyResult.rows.map((row) => {
      const spend = numberFromPg(row.spend);
      const impressionsValue = numberFromPg(row.impressions);
      const clicksValue = numberFromPg(row.clicks);
      const landingPageViewsValueRaw = numberFromPg(row.landing_page_views);
      const landingPageViewsValue = landingPageViewsValueRaw > 0 ? landingPageViewsValueRaw : null;
      const addToCartValueRaw = numberFromPg(row.add_to_cart);
      const addToCartValue = addToCartValueRaw > 0 ? addToCartValueRaw : null;
      const videoPlaysRaw = numberFromPg(row.hook_events);
      const videoPlaysValue = videoPlaysRaw > 0 ? videoPlaysRaw : null;
      const purchasesValue = numberFromPg(row.purchases);
      const purchaseValue = numberFromPg(row.purchase_value);
      const purchasesOrNull = purchasesValue > 0 ? purchasesValue : null;

      return {
        date: row.date || '',
        campaignId: row.campaign_id || '',
        adSetId: row.adset_id || '',
        adId: row.ad_id || '',
        spend,
        impressions: impressionsValue,
        clicks: clicksValue,
        landingPageViews: landingPageViewsValue,
        activeClickRate: landingPageViewsValue === null ? null : rate(landingPageViewsValue, clicksValue),
        videoPlays: videoPlaysValue,
        videoPlayToLandingRate: landingPageViewsValue === null || videoPlaysValue === null ? null : rate(landingPageViewsValue, videoPlaysValue),
        costPerLandingPageView: landingPageViewsValue === null ? null : ratio(spend, landingPageViewsValue),
        addToCart: addToCartValue,
        costPerAddToCart: addToCartValue === null ? null : ratio(spend, addToCartValue),
        ctr: rate(clicksValue, impressionsValue),
        cpc: ratio(spend, clicksValue),
        cpm: impressionsValue === 0 ? null : (spend / impressionsValue) * 1000,
        purchases: purchasesOrNull,
        cpa: purchasesOrNull === null ? null : ratio(spend, purchasesOrNull),
        roas: purchaseValue > 0 && spend > 0 ? purchaseValue / spend : null,
      };
    });

    return {
      ok: true,
      metrics: {
        totalSpend,
        impressions,
        clicks,
        firstDate: summary?.first_date || null,
        latestDate: summary?.latest_date || null,
        ctr: rate(clicks, impressions),
        cpc: ratio(totalSpend, clicks),
        cpm: impressions === 0 ? null : (totalSpend / impressions) * 1000,
        hookRate: hookEvents > 0 ? rate(hookEvents, impressions) : null,
        hookMetric: hookEvents > 0 ? 'Video action proxy / impressions' : 'Unavailable',
        campaignsCount: numberFromPg(summary?.campaigns_count),
        adSetsCount: numberFromPg(summary?.ad_sets_count),
        adsCount: numberFromPg(summary?.ads_count),
        purchases,
        purchaseValue,
        cpa: purchases === null ? null : ratio(totalSpend, purchases),
        roas: purchaseValue === null || totalSpend === 0 ? null : purchaseValue / totalSpend,
        attributionAvailable: purchases !== null || purchaseValue !== null,
        attributionNote: purchases !== null || purchaseValue !== null
          ? 'Meta platform purchase/action values are available. Shopify server-side order attribution is still separate until UTM/meta click tracking is joined to orders.'
          : 'Meta spend/click metrics are available, but purchases, CAC, and ROAS are unavailable until Meta action values or Shopify attribution are reliable.',
        daily,
        campaigns: campaignsResult.rows.map(toRow),
        adSets: adSetsResult.rows.map(toRow),
        ads: adsResult.rows.map(toRow),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Meta ads performance failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getGa4OverviewTrends(range: DateRange): Promise<Ga4OverviewTrendsResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const previousRange = getPreviousDateRange(range);
  const current = ga4Bounds(range);
  const previous = ga4Bounds(previousRange);

  try {
    const pool = getPool(databaseUrl);
    const [currentSummaryResult, previousSummaryResult, currentConversionsResult, previousConversionsResult, dailyResult, topSourceResult] = await Promise.all([
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          '0'::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          '0'::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4SeriesRow>(`
        WITH traffic AS (
          SELECT
            date,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(SUM("totalUsers"), 0) AS users,
            COALESCE(SUM("engagedSessions"), 0) AS engaged_sessions,
            COALESCE(SUM("eventCount"), 0) AS event_count
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        ),
        devices AS (
          SELECT date, COALESCE(SUM("screenPageViews"), 0) AS page_views
          FROM public.devices
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        )
        SELECT
          traffic.date AS date,
          COALESCE(traffic.sessions, 0)::text AS sessions,
          COALESCE(traffic.users, 0)::text AS users,
          COALESCE(traffic.engaged_sessions, 0)::text AS engaged_sessions,
          COALESCE(traffic.event_count, 0)::text AS event_count,
          COALESCE(devices.page_views, 0)::text AS page_views,
          '0'::text AS conversions
        FROM traffic
        LEFT JOIN devices ON devices.date = traffic.date
        ORDER BY traffic.date
      `, [current.start, current.end]),
      pool.query<{ source_medium: string | null; sessions: string | null }>(`
        SELECT
          CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS source_medium,
          COALESCE(SUM(sessions), 0)::text AS sessions
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
        GROUP BY source_medium
        ORDER BY SUM(sessions) DESC
        LIMIT 1
      `, [current.start, current.end]),
    ]);

    const currentSummary = currentSummaryResult.rows[0];
    const previousSummary = previousSummaryResult.rows[0];
    const currentSessions = numberFromPg(currentSummary?.sessions);
    const previousSessions = numberFromPg(previousSummary?.sessions);
    const currentUsers = numberFromPg(currentSummary?.users);
    const previousUsers = numberFromPg(previousSummary?.users);
    const currentEngagedSessions = numberFromPg(currentSummary?.engaged_sessions);
    const previousEngagedSessions = numberFromPg(previousSummary?.engaged_sessions);
    const currentEventCount = numberFromPg(currentSummary?.event_count);
    const previousEventCount = numberFromPg(previousSummary?.event_count);
    const currentPageViews = numberFromPg(currentSummary?.page_views);
    const previousPageViews = numberFromPg(previousSummary?.page_views);
    const currentConversions = numberFromPg(currentConversionsResult.rows[0]?.conversions);
    const previousConversions = numberFromPg(previousConversionsResult.rows[0]?.conversions);
    const currentEngagementRate = rate(currentEngagedSessions, currentSessions) ?? 0;
    const previousEngagementRate = rate(previousEngagedSessions, previousSessions) ?? 0;
    const currentEventsPerSession = rate(currentEventCount, currentSessions) ?? 0;
    const previousEventsPerSession = rate(previousEventCount, previousSessions) ?? 0;

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: currentSessions > 0 || currentUsers > 0 || currentPageViews > 0,
        sessions: calculateTrend('sessions', currentSessions, previousSessions),
        users: calculateTrend('users', currentUsers, previousUsers),
        engagedSessions: calculateTrend('engaged_sessions', currentEngagedSessions, previousEngagedSessions),
        pageViews: calculateTrend('page_views', currentPageViews, previousPageViews),
        engagementRate: calculateTrend('engagement_rate', currentEngagementRate, previousEngagementRate),
        eventsPerSession: calculateTrend('events_per_session', currentEventsPerSession, previousEventsPerSession),
        conversions: calculateTrend('conversions', currentConversions, previousConversions),
        topSourceMedium: topSourceResult.rows[0]?.source_medium || null,
        daily: dailyResult.rows.map((row) => ({
          date: row.date,
          sessions: numberFromPg(row.sessions),
          users: numberFromPg(row.users),
          pageViews: numberFromPg(row.page_views),
        })),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('GA4 overview trends failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

type Ga4SummaryRow = {
  sessions: string | null;
  users: string | null;
  engaged_sessions: string | null;
  event_count: string | null;
  page_views: string | null;
  engagement_duration: string | null;
  revenue: string | null;
};

type Ga4ConversionRow = {
  conversions: string | null;
};

type Ga4SeriesRow = {
  date: string;
  sessions: string | null;
  users: string | null;
  engaged_sessions: string | null;
  event_count: string | null;
  page_views: string | null;
  conversions: string | null;
};

type Ga4DimensionRow = {
  name: string | null;
  sessions: string | null;
  users: string | null;
  conversions: string | null;
  previous_sessions: string | null;
};

function ga4Bounds(range: DateRange) {
  return {
    start: dateToGa4(range.start),
    end: dateToGa4(range.end),
  };
}

function mapGa4Dimension(row: Ga4DimensionRow): AcquisitionTrafficDimensionRow {
  const sessions = numberFromPg(row.sessions);
  const conversions = numberFromPg(row.conversions);

  return {
    name: row.name || 'Unknown',
    sessions,
    users: numberFromPg(row.users),
    conversions,
    conversionRate: rate(conversions, sessions),
    trend: calculateTrend('sessions', sessions, numberFromPg(row.previous_sessions)),
  };
}

export async function getAcquisitionTraffic(range: DateRange): Promise<AcquisitionTrafficResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const previousRange = getPreviousDateRange(range);
  const current = ga4Bounds(range);
  const previous = ga4Bounds(previousRange);

  try {
    const pool = getPool(databaseUrl);
    const [
      tablesResult,
      currentSummaryResult,
      previousSummaryResult,
      currentConversionResult,
      previousConversionResult,
      seriesResult,
      sourcesResult,
      channelsResult,
      campaignsResult,
      devicesResult,
      citiesResult,
      regionsResult,
      countriesResult,
    ] = await Promise.all([
      pool.query<{ table_name: string; row_count: string }>(`
        SELECT table_name, row_count::text
        FROM (
          SELECT 'traffic_acquisition_session_source_medium_report' AS table_name, COUNT(*) AS row_count FROM public.traffic_acquisition_session_source_medium_report
          UNION ALL SELECT 'traffic_acquisition_session_campaign_report', COUNT(*) FROM public.traffic_acquisition_session_campaign_report
          UNION ALL SELECT 'traffic_acquisition_session_default_channel_grouping_report', COUNT(*) FROM public.traffic_acquisition_session_default_channel_grouping_report
          UNION ALL SELECT 'traffic_acquisition_session_medium_report', COUNT(*) FROM public.traffic_acquisition_session_medium_report
          UNION ALL SELECT 'traffic_acquisition_session_source_platform_report', COUNT(*) FROM public.traffic_acquisition_session_source_platform_report
          UNION ALL SELECT 'traffic_acquisition_session_source_report', COUNT(*) FROM public.traffic_acquisition_session_source_report
          UNION ALL SELECT 'devices', COUNT(*) FROM public.devices
          UNION ALL SELECT 'daily_active_users', COUNT(*) FROM public.daily_active_users
          UNION ALL SELECT 'conversions_report', COUNT(*) FROM public.conversions_report
          UNION ALL SELECT 'demographic_city_report', COUNT(*) FROM public.demographic_city_report
          UNION ALL SELECT 'demographic_region_report', COUNT(*) FROM public.demographic_region_report
          UNION ALL SELECT 'demographic_country_report', COUNT(*) FROM public.demographic_country_report
        ) tables
      `),
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          COALESCE(SUM("totalRevenue"), 0)::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          COALESCE(SUM("totalRevenue"), 0)::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4SeriesRow>(`
        WITH traffic AS (
          SELECT
            date,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(SUM("totalUsers"), 0) AS users,
            COALESCE(SUM("engagedSessions"), 0) AS engaged_sessions,
            COALESCE(SUM("eventCount"), 0) AS event_count
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        ),
        devices AS (
          SELECT date, COALESCE(SUM("screenPageViews"), 0) AS page_views
          FROM public.devices
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        ),
        conversions AS (
          SELECT date, COALESCE(SUM("totalUsers"), 0) AS conversions
          FROM public.conversions_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        )
        SELECT
          COALESCE(traffic.date, conversions.date) AS date,
          COALESCE(traffic.sessions, 0)::text AS sessions,
          COALESCE(traffic.users, 0)::text AS users,
          COALESCE(traffic.engaged_sessions, 0)::text AS engaged_sessions,
          COALESCE(traffic.event_count, 0)::text AS event_count,
          COALESCE(devices.page_views, 0)::text AS page_views,
          COALESCE(conversions.conversions, 0)::text AS conversions
        FROM traffic
        FULL OUTER JOIN conversions ON conversions.date = traffic.date
        LEFT JOIN devices ON devices.date = COALESCE(traffic.date, conversions.date)
        ORDER BY date
      `, [current.start, current.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT
            CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS name,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT
            CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS name,
            COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 25
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE("sessionDefaultChannelGrouping", 'Unknown') AS name, COALESCE(SUM(sessions), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.traffic_acquisition_session_default_channel_grouping_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE("sessionDefaultChannelGrouping", 'Unknown') AS name, COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.traffic_acquisition_session_default_channel_grouping_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE("sessionCampaignName", 'Unknown campaign') AS name, COALESCE(SUM(sessions), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.traffic_acquisition_session_campaign_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE("sessionCampaignName", 'Unknown campaign') AS name, COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.traffic_acquisition_session_campaign_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE("deviceCategory", 'Unknown device') AS name, COALESCE(SUM(sessions), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.devices
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE("deviceCategory", 'Unknown device') AS name, COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.devices
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE(city, 'Unknown city') AS name, COALESCE(SUM("engagedSessions"), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.demographic_city_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE(city, 'Unknown city') AS name, COALESCE(SUM("engagedSessions"), 0) AS previous_sessions
          FROM public.demographic_city_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE(region, 'Unknown region') AS name, COALESCE(SUM("engagedSessions"), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.demographic_region_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE(region, 'Unknown region') AS name, COALESCE(SUM("engagedSessions"), 0) AS previous_sessions
          FROM public.demographic_region_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE(country, 'Unknown country') AS name, COALESCE(SUM("engagedSessions"), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.demographic_country_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE(country, 'Unknown country') AS name, COALESCE(SUM("engagedSessions"), 0) AS previous_sessions
          FROM public.demographic_country_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
    ]);

    const currentSummary = currentSummaryResult.rows[0];
    const previousSummary = previousSummaryResult.rows[0];
    const currentConversions = numberFromPg(currentConversionResult.rows[0]?.conversions);
    const previousConversions = numberFromPg(previousConversionResult.rows[0]?.conversions);
    const currentSessions = numberFromPg(currentSummary?.sessions);
    const previousSessions = numberFromPg(previousSummary?.sessions);
    const currentUsers = numberFromPg(currentSummary?.users);
    const previousUsers = numberFromPg(previousSummary?.users);
    const currentEngagedSessions = numberFromPg(currentSummary?.engaged_sessions);
    const previousEngagedSessions = numberFromPg(previousSummary?.engaged_sessions);
    const currentEventCount = numberFromPg(currentSummary?.event_count);
    const previousEventCount = numberFromPg(previousSummary?.event_count);
    const currentPageViews = numberFromPg(currentSummary?.page_views);
    const previousPageViews = numberFromPg(previousSummary?.page_views);
    const currentDuration = numberFromPg(currentSummary?.engagement_duration);
    const previousDuration = numberFromPg(previousSummary?.engagement_duration);
    const currentRevenue = numberFromPg(currentSummary?.revenue);
    const previousRevenue = numberFromPg(previousSummary?.revenue);
    const currentEngagementRate = rate(currentEngagedSessions, currentSessions) ?? 0;
    const previousEngagementRate = rate(previousEngagedSessions, previousSessions) ?? 0;
    const currentEventsPerSession = rate(currentEventCount, currentSessions) ?? 0;
    const previousEventsPerSession = rate(previousEventCount, previousSessions) ?? 0;
    const currentAverageDuration = rate(currentDuration, currentSessions) ?? 0;
    const previousAverageDuration = rate(previousDuration, previousSessions) ?? 0;
    const tablesWithRows = tablesResult.rows.filter((row) => numberFromPg(row.row_count) > 0).map((row) => row.table_name);
    const dataAvailable = tablesWithRows.length > 0 && (currentSessions > 0 || currentUsers > 0 || currentConversions > 0);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        sessions: calculateTrend('sessions', currentSessions, previousSessions),
        users: calculateTrend('users', currentUsers, previousUsers),
        engagedSessions: calculateTrend('engaged_sessions', currentEngagedSessions, previousEngagedSessions),
        engagementRate: calculateTrend('engagement_rate', currentEngagementRate, previousEngagementRate),
        eventsPerSession: calculateTrend('events_per_session', currentEventsPerSession, previousEventsPerSession),
        pageViews: calculateTrend('page_views', currentPageViews, previousPageViews),
        averageEngagementDuration: calculateTrend('average_engagement_duration', currentAverageDuration, previousAverageDuration),
        conversions: calculateTrend('conversions', currentConversions, previousConversions),
        conversionRate: calculateTrend('conversion_rate', rate(currentConversions, currentSessions) ?? 0, rate(previousConversions, previousSessions) ?? 0),
        revenue: calculateTrend('revenue', currentRevenue, previousRevenue),
        tablesPresent: tablesResult.rows.map((row) => row.table_name),
        tablesWithRows,
        dataAvailable,
        series: seriesResult.rows.map((row) => ({
          date: row.date,
          sessions: numberFromPg(row.sessions),
          users: numberFromPg(row.users),
          engagedSessions: numberFromPg(row.engaged_sessions),
          eventCount: numberFromPg(row.event_count),
          pageViews: numberFromPg(row.page_views),
          conversions: numberFromPg(row.conversions),
        })),
        sources: sourcesResult.rows.map(mapGa4Dimension),
        channels: channelsResult.rows.map(mapGa4Dimension),
        campaigns: campaignsResult.rows.map(mapGa4Dimension),
        devices: devicesResult.rows.map(mapGa4Dimension),
        cities: citiesResult.rows.map(mapGa4Dimension),
        regions: regionsResult.rows.map(mapGa4Dimension),
        countries: countriesResult.rows.map(mapGa4Dimension),
        insights: dataAvailable
          ? [
              currentSessions > previousSessions ? 'Traffic is growing vs the previous period.' : 'Traffic is flat or down vs the previous period.',
              currentEngagementRate >= 50 ? 'Engagement looks healthy.' : 'Engagement may need attention.',
              sourcesResult.rows.some((row) => String(row.name ?? '').toLowerCase().includes('facebook') || String(row.name ?? '').toLowerCase().includes('instagram') || String(row.name ?? '').toLowerCase().includes('meta')) ? 'Meta traffic is visible in GA4.' : 'Meta traffic is not clearly visible in GA4 source/medium.',
              campaignsResult.rows.some((row) => row.name && row.name !== 'Unknown campaign') ? 'Campaign data is available.' : 'Campaign naming is missing or mostly unknown.',
            ]
          : [
              'GA4 tables exist in PostgreSQL, but they currently contain no usable rows for dashboard metrics.',
              'Check the Airbyte GA4 sync, selected property, date range, and report configuration.',
            ],
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Acquisition traffic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

const trackingVisitorFields = [
  'visitor_id',
  'first_seen_at',
  'last_seen_at',
  'landing_page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'meta_click_id',
  'country',
  'city',
  'region',
  'device',
  'consent_analytics',
  'consent_marketing',
];

const trackingSessionFields = [
  'session_id',
  'visitor_id',
  'customer_id',
  'started_at',
  'ended_at',
  'page_count',
  'click_count',
  'source',
  'campaign',
  'device',
  'country',
  'city',
  'region',
];

const trackingEventFields = [
  'event_id',
  'visitor_id',
  'session_id',
  'customer_id',
  'event_name',
  'event_time',
  'page_url',
  'referrer',
  'product_id',
  'order_id',
  'funnel_stage',
];

type TrackingMetadataRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
};

type TrackingCountRow = {
  table_name: string;
  row_count: string | null;
  first_date: string | null;
  latest_date: string | null;
};

function hasColumn(tables: TrackingReadinessTable[], columnNames: string[]) {
  const wanted = new Set(columnNames.map((column) => column.toLowerCase()));
  return tables.some((table) => table.matchedColumns.some((column) => wanted.has(column.toLowerCase())));
}

export async function getTrackingReadiness(): Promise<TrackingReadinessResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [metadataResult, countsResult] = await Promise.all([
      pool.query<TrackingMetadataRow>(`
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          AND (
            table_name ILIKE ANY ($1)
            OR column_name ILIKE ANY ($1)
          )
        ORDER BY table_schema, table_name, ordinal_position
        LIMIT 1000
      `, [[
        '%google%', '%ga4%', '%analytics%', '%sessions%', '%session%', '%events%', '%event%',
        '%visitor%', '%visitors%', '%pageviews%', '%page_views%', '%clicks%', '%activity%',
        '%utm%', '%meta_click_id%', '%fbp%', '%fbc%', '%gclid%', '%checkout%', '%abandoned%',
      ]]),
      pool.query<TrackingCountRow>(`
        SELECT 'traffic_acquisition_session_source_medium_report' AS table_name, COUNT(*)::text AS row_count, MIN(date)::text AS first_date, MAX(date)::text AS latest_date FROM public.traffic_acquisition_session_source_medium_report
        UNION ALL SELECT 'traffic_acquisition_session_campaign_report', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.traffic_acquisition_session_campaign_report
        UNION ALL SELECT 'traffic_acquisition_session_default_channel_grouping_report', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.traffic_acquisition_session_default_channel_grouping_report
        UNION ALL SELECT 'devices', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.devices
        UNION ALL SELECT 'daily_active_users', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.daily_active_users
        UNION ALL SELECT 'conversions_report', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.conversions_report
        UNION ALL SELECT 'site_events', COUNT(*)::text, MIN(event_time)::text, MAX(event_time)::text FROM public.site_events
        UNION ALL SELECT 'shopify.abandoned_checkouts', COUNT(*)::text, MIN(created_at)::text, MAX(created_at)::text FROM shopify.abandoned_checkouts
        UNION ALL SELECT 'shopify.orders', COUNT(*)::text, MIN(created_at)::text, MAX(created_at)::text FROM shopify.orders
      `),
    ]);

    const countMap = new Map(countsResult.rows.map((row) => [row.table_name, row]));
    const grouped = new Map<string, TrackingReadinessTable>();
    for (const row of metadataResult.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      const current = grouped.get(key) ?? {
        schemaName: row.table_schema,
        tableName: row.table_name,
        rowCount: null,
        firstDate: null,
        latestDate: null,
        matchedColumns: [],
      };
      current.matchedColumns.push(row.column_name);
      const count = countMap.get(row.table_name) ?? countMap.get(`${row.table_schema}.${row.table_name}`);
      if (count) {
        current.rowCount = numberFromPg(count.row_count);
        current.firstDate = count.first_date;
        current.latestDate = count.latest_date;
      }
      grouped.set(key, current);
    }

    const availableTables = Array.from(grouped.values());
    const ga4TablesWithRows = countsResult.rows
      .filter((row) => !row.table_name.startsWith('shopify.') && numberFromPg(row.row_count) > 0)
      .map((row) => row.table_name);
    const abandonedCheckoutRows = numberFromPg(countMap.get('shopify.abandoned_checkouts')?.row_count);
    const hasSessionTracking = hasColumn(availableTables, ['session_id', 'sessionId']) || ga4TablesWithRows.some((table) => table.includes('session'));
    const hasVisitorTracking = hasColumn(availableTables, ['visitor_id', 'client_id', 'user_pseudo_id']);
    const hasEvents = hasColumn(availableTables, ['event_name', 'eventName']);
    const hasLandingPageArrivalTracking = hasColumn(availableTables, ['event_time', 'page_url']) && (hasEvents || hasColumn(availableTables, ['event_name']));
    const hasAttribution = hasColumn(availableTables, ['utm_source', 'utm_campaign', 'meta_click_id', 'fbp', 'fbc', 'gclid']);
    const hasCity = hasColumn(availableTables, ['city', 'region', 'province']);

    return {
      ok: true,
      metrics: {
        ga4Connected: ga4TablesWithRows.length > 0,
        ga4TablesWithRows,
        availableTables,
        missingTables: [
          !hasVisitorTracking ? 'visitors' : '',
          !hasSessionTracking ? 'sessions' : '',
          !hasEvents ? 'events' : '',
          !hasAttribution ? 'attribution / UTM identity table' : '',
        ].filter(Boolean),
        capabilities: [
          {
            label: 'GA4 connection status',
            available: ga4TablesWithRows.length > 0,
            status: ga4TablesWithRows.length > 0 ? 'good' : 'missing',
            evidence: ga4TablesWithRows.length > 0 ? `${ga4TablesWithRows.length} GA4 tables contain rows.` : 'GA4 tables exist but currently have no rows.',
          },
          {
            label: 'Visitor/session tracking status',
            available: hasSessionTracking || hasVisitorTracking,
            status: hasSessionTracking || hasVisitorTracking ? 'warning' : 'missing',
            evidence: hasSessionTracking || hasVisitorTracking ? 'Some visitor/session-like metadata exists.' : 'No dedicated visitor/session table was found.',
            dataNeeded: [...trackingVisitorFields, ...trackingSessionFields],
          },
          {
            label: 'Event tracking status',
            available: hasEvents,
            status: hasEvents ? 'warning' : 'missing',
            evidence: hasEvents ? 'Event-like columns exist.' : 'No event table with event_name/event_time was found.',
            dataNeeded: trackingEventFields,
          },
          {
            label: 'Landing page arrival tracking',
            available: hasLandingPageArrivalTracking,
            status: hasLandingPageArrivalTracking ? 'good' : 'missing',
            evidence: hasLandingPageArrivalTracking ? 'event_time + page_url are available for landing page arrival measurement.' : 'Need an event table with event_time and page_url for landing page arrival analysis.',
            dataNeeded: ['event_name', 'event_time', 'page_url', 'session_id', 'visitor_id'],
          },
          {
            label: 'Meta attribution tracking status',
            available: hasAttribution,
            status: hasAttribution ? 'warning' : 'missing',
            evidence: hasAttribution ? 'Attribution-like columns exist in synced tables.' : 'No reliable UTM/meta click identity columns were found.',
            dataNeeded: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'meta_click_id', 'fbp', 'fbc', 'gclid'],
          },
          {
            label: 'Shopify abandoned checkout status',
            available: abandonedCheckoutRows > 0,
            status: abandonedCheckoutRows > 0 ? 'good' : 'missing',
            evidence: `${abandonedCheckoutRows} abandoned checkout rows found.`,
          },
          {
            label: 'Daily sessions possible',
            available: ga4TablesWithRows.some((table) => table.includes('session')),
            status: ga4TablesWithRows.some((table) => table.includes('session')) ? 'good' : 'missing',
            evidence: 'Requires GA4/session rows with a date column.',
          },
          {
            label: 'Pages per session possible',
            available: hasColumn(availableTables, ['screenPageViews', 'page_count', 'pageviews']),
            status: hasColumn(availableTables, ['screenPageViews', 'page_count', 'pageviews']) ? 'warning' : 'missing',
            evidence: 'Requires page views or page_count by session.',
          },
          {
            label: 'Clicks per session possible',
            available: hasColumn(availableTables, ['click_count', 'clicks']),
            status: hasColumn(availableTables, ['click_count', 'clicks']) ? 'warning' : 'missing',
            evidence: 'Requires click_count or click events by session.',
          },
          {
            label: 'Sessions before order possible',
            available: hasSessionTracking && hasAttribution,
            status: hasSessionTracking && hasAttribution ? 'warning' : 'missing',
            evidence: 'Requires session/customer/order identity join.',
          },
          {
            label: 'Customer last activity possible',
            available: hasColumn(availableTables, ['last_seen_at', 'last_activity_at', 'event_time']),
            status: hasColumn(availableTables, ['last_seen_at', 'last_activity_at', 'event_time']) ? 'warning' : 'missing',
            evidence: 'Requires a tracked customer or visitor timestamp.',
          },
          {
            label: 'City/suburb buyer geography possible',
            available: hasCity,
            status: hasCity ? 'good' : 'missing',
            evidence: hasCity ? 'City/region fields exist in Shopify or tracking metadata.' : 'No city/region fields found.',
          },
        ],
        requiredVisitorFields: trackingVisitorFields,
        requiredSessionFields: trackingSessionFields,
        requiredEventFields: trackingEventFields,
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Tracking readiness failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

type DailyBehaviorRow = {
  date: string;
  visitors: string | null;
  sessions: string | null;
  page_views: string | null;
  orders: string | null;
  abandoned_checkouts: string | null;
  quizzes: string | null;
  ratings: string | null;
};

type LandingPageArrivalDayRow = {
  date: string;
  arrivals: string | null;
  unique_sessions: string | null;
  unique_visitors: string | null;
};

type LandingPageArrivalHourRow = {
  hour: string | null;
  arrivals: string | null;
  unique_sessions: string | null;
};

type TableColumnRow = {
  column_name: string;
  data_type: string;
};

function pickColumn(columns: TableColumnRow[], candidates: string[]): TableColumnRow | null {
  const lookup = new Map(columns.map((column) => [column.column_name.toLowerCase(), column]));
  for (const candidate of candidates) {
    const matched = lookup.get(candidate.toLowerCase());
    if (matched) return matched;
  }
  return null;
}

function isTimestampLike(dataType: string): boolean {
  return ['timestamp without time zone', 'timestamp with time zone', 'date'].includes(dataType.toLowerCase());
}

export async function getSiteBehavior(range: DateRange): Promise<SiteBehaviorResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const current = {
      sqlStart: dateToSql(range.start),
      sqlEnd: dateToSql(range.end),
      gaStart: dateToGa4(range.start),
      gaEnd: dateToGa4(range.end),
    };
    const [ga4CountResult, seriesResult] = await Promise.all([
      pool.query<{ row_count: string | null }>(`
        SELECT COUNT(*)::text AS row_count
        FROM public.traffic_acquisition_session_source_medium_report
      `),
      pool.query<DailyBehaviorRow>(`
        WITH dates AS (
          SELECT generate_series($1::date, $2::date, interval '1 day')::date AS date
        ),
        ga4 AS (
          SELECT to_date(date, 'YYYYMMDD') AS date, SUM("totalUsers") AS visitors, SUM(sessions) AS sessions, NULL::numeric AS page_views
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY 1
        ),
        orders AS (
          SELECT created_at::date AS date, COUNT(*) AS orders
          FROM shopify.orders
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        ),
        checkouts AS (
          SELECT created_at::date AS date, COUNT(*) AS abandoned_checkouts
          FROM shopify.abandoned_checkouts
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        ),
        quizzes AS (
          SELECT created_at::date AS date, COUNT(*) AS quizzes
          FROM public.quizz
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        ),
        ratings AS (
          SELECT created_at::date AS date, COUNT(*) AS ratings
          FROM public.ratings
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        )
        SELECT
          dates.date::text AS date,
          COALESCE(ga4.visitors, 0)::text AS visitors,
          COALESCE(ga4.sessions, 0)::text AS sessions,
          COALESCE(ga4.page_views, 0)::text AS page_views,
          COALESCE(orders.orders, 0)::text AS orders,
          COALESCE(checkouts.abandoned_checkouts, 0)::text AS abandoned_checkouts,
          COALESCE(quizzes.quizzes, 0)::text AS quizzes,
          COALESCE(ratings.ratings, 0)::text AS ratings
        FROM dates
        LEFT JOIN ga4 ON ga4.date = dates.date
        LEFT JOIN orders ON orders.date = dates.date
        LEFT JOIN checkouts ON checkouts.date = dates.date
        LEFT JOIN quizzes ON quizzes.date = dates.date
        LEFT JOIN ratings ON ratings.date = dates.date
        ORDER BY dates.date
      `, [current.sqlStart, current.sqlEnd, current.gaStart, current.gaEnd]),
    ]);

    const hasGa4Rows = numberFromPg(ga4CountResult.rows[0]?.row_count) > 0;
    const series = seriesResult.rows.map((row) => ({
      date: row.date,
      visitors: hasGa4Rows ? numberFromPg(row.visitors) : null,
      sessions: hasGa4Rows ? numberFromPg(row.sessions) : null,
      pageViews: hasGa4Rows && numberFromPg(row.page_views) > 0 ? numberFromPg(row.page_views) : null,
      orders: numberFromPg(row.orders),
      abandonedCheckouts: numberFromPg(row.abandoned_checkouts),
      quizzes: numberFromPg(row.quizzes),
      ratings: numberFromPg(row.ratings),
    }));
    const totalOrders = series.reduce((sum, row) => sum + row.orders, 0);
    const totalAbandonedCheckouts = series.reduce((sum, row) => sum + row.abandonedCheckouts, 0);
    const totalRatings = series.reduce((sum, row) => sum + row.ratings, 0);
    const totalQuizzes = series.reduce((sum, row) => sum + row.quizzes, 0);
    const totalSessions = series.reduce((sum, row) => sum + (row.sessions ?? 0), 0);
    const insights = [
      hasGa4Rows ? 'GA4 session rows are available for behavior trends.' : 'Session/event tracking is unavailable or empty; implement tracking to see stay/leave behavior.',
      totalAbandonedCheckouts > totalOrders ? 'Abandoned checkouts exceed completed orders. Checkout friction needs attention.' : 'Completed orders are not below abandoned checkouts for this period.',
      totalOrders > 0 && totalRatings / totalOrders < 1 ? 'Ratings look low compared with orders. Post-delivery rating reminders may need work.' : 'Ratings are visible for this period.',
    ];

    return {
      ok: true,
      metrics: {
        hasSessionData: hasGa4Rows && totalSessions > 0,
        hasGa4Rows,
        visitorsPerDayAvailable: hasGa4Rows,
        sessionsPerDayAvailable: hasGa4Rows,
        pageViewsPerDayAvailable: false,
        clicksPerSessionAvailable: false,
        pagesPerSessionAvailable: false,
        averageSessionDurationAvailable: false,
        totalOrders,
        totalAbandonedCheckouts,
        totalQuizzes,
        totalRatings,
        checkoutAbandonmentRate: rate(totalAbandonedCheckouts, totalAbandonedCheckouts + totalOrders),
        purchaseConversionRate: rate(totalOrders, totalSessions),
        series,
        insights,
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Site behavior failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getLandingPageArrivals(range: DateRange): Promise<LandingPageArrivalResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const engagementRowCountResult = await pool.query<{ row_count: string }>(`
      SELECT COUNT(*)::text AS row_count
      FROM public.engagement_horaire
    `);

    const canUseEngagementHoraire = numberFromPg(engagementRowCountResult.rows[0]?.row_count) > 0;

    const dailyResult = canUseEngagementHoraire
      ? await pool.query<LandingPageArrivalDayRow>(`
          SELECT
            to_date(date, 'YYYYMMDD')::text AS date,
            COALESCE(SUM(sessions), 0)::text AS arrivals,
            COALESCE(SUM(sessions), 0)::text AS unique_sessions,
            COALESCE(SUM(COALESCE("activeUsers", 0)), 0)::text AS unique_visitors
          FROM public.engagement_horaire
          WHERE to_date(date, 'YYYYMMDD') >= $1::date
            AND to_date(date, 'YYYYMMDD') < ($2::date + interval '1 day')
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)])
      : await pool.query<LandingPageArrivalDayRow>(`
          SELECT
            (event_time AT TIME ZONE 'Europe/Amsterdam')::date::text AS date,
            COUNT(*)::text AS arrivals,
            COUNT(DISTINCT session_id)::text AS unique_sessions,
            COUNT(DISTINCT visitor_id)::text AS unique_visitors
          FROM public.site_events
          WHERE event_name IN ('vinpop_page_view', 'vinpop_landing_page_view')
            AND event_time >= $1::date
            AND event_time < ($2::date + interval '1 day')
            AND page_url IS NOT NULL
            AND (
              page_url ILIKE 'https://vinpop.nl%'
              OR page_url ILIKE 'https://www.vinpop.nl%'
              OR page_url = '/'
            )
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)]);

    const hourlyResult = canUseEngagementHoraire
      ? await pool.query<LandingPageArrivalHourRow>(`
          SELECT
            COALESCE(NULLIF(hour, ''), '0')::int::text AS hour,
            COALESCE(SUM(sessions), 0)::text AS arrivals,
            COALESCE(SUM(sessions), 0)::text AS unique_sessions
          FROM public.engagement_horaire
          WHERE to_date(date, 'YYYYMMDD') >= $1::date
            AND to_date(date, 'YYYYMMDD') < ($2::date + interval '1 day')
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)])
      : await pool.query<LandingPageArrivalHourRow>(`
          SELECT
            EXTRACT(HOUR FROM event_time AT TIME ZONE 'Europe/Amsterdam')::int::text AS hour,
            COUNT(*)::text AS arrivals,
            COUNT(DISTINCT session_id)::text AS unique_sessions
          FROM public.site_events
          WHERE event_name IN ('vinpop_page_view', 'vinpop_landing_page_view')
            AND event_time >= $1::date
            AND event_time < ($2::date + interval '1 day')
            AND page_url IS NOT NULL
            AND (
              page_url ILIKE 'https://vinpop.nl%'
              OR page_url ILIKE 'https://www.vinpop.nl%'
              OR page_url = '/'
            )
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)]);

    const daily = dailyResult.rows.map((row) => ({
      date: row.date,
      arrivals: numberFromPg(row.arrivals),
      uniqueSessions: numberFromPg(row.unique_sessions),
      uniqueVisitors: numberFromPg(row.unique_visitors),
    }));
    const byHour = hourlyResult.rows.map((row) => ({
      hour: row.hour ? Number(row.hour) : 0,
      arrivals: numberFromPg(row.arrivals),
      uniqueSessions: numberFromPg(row.unique_sessions),
    })).sort((a, b) => a.hour - b.hour);

    const topDay = daily.reduce<LandingPageArrivalDay | null>((best, current) => {
      if (!best || current.arrivals > best.arrivals) return current;
      return best;
    }, null);
    const topHour = byHour.reduce<LandingPageArrivalHour | null>((best, current) => {
      if (!best || current.arrivals > best.arrivals) return current;
      return best;
    }, null);

    return {
      ok: true,
      metrics: {
        totalArrivals: daily.reduce((sum, row) => sum + row.arrivals, 0),
        totalUniqueSessions: daily.reduce((sum, row) => sum + row.uniqueSessions, 0),
        totalUniqueVisitors: daily.reduce((sum, row) => sum + row.uniqueVisitors, 0),
        daily,
        byHour,
        topDay,
        topHour,
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Landing page arrival analytics failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

const majorNlBeCities = new Set([
  'amsterdam',
  'rotterdam',
  'den haag',
  'the hague',
  'utrecht',
  'eindhoven',
  'tilburg',
  'groningen',
  'almere',
  'breda',
  'nijmegen',
  'enschede',
  'haarlem',
  'arnhem',
  'amersfoort',
  'apeldoorn',
  'antwerpen',
  'brussel',
  'brussels',
  'gent',
  'ghent',
  'charleroi',
  'liege',
  'luik',
  'brugge',
  'leuven',
  'mechelen',
]);

function classifyCity(city: string): GeoInsightCityRow['classification'] {
  return majorNlBeCities.has(city.trim().toLowerCase()) ? 'Big city' : 'Periphery / smaller city';
}

type GeoCityRow = {
  city: string | null;
  region: string | null;
  customers: string | null;
  orders: string | null;
  revenue: string | null;
};

export async function getGeoInsights(): Promise<GeoInsightsResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [cityResult, missingResult] = await Promise.all([
      pool.query<GeoCityRow>(`
        WITH address_by_customer AS (
          SELECT DISTINCT ON (customer_id)
            customer_id::text AS customer_id,
            NULLIF(TRIM(city), '') AS city,
            NULLIF(TRIM(COALESCE(province, province_code, country_code)), '') AS region
          FROM shopify.customer_address
          WHERE customer_id IS NOT NULL
          ORDER BY customer_id, "default" DESC NULLS LAST, updated_at DESC NULLS LAST
        ),
        order_by_customer AS (
          SELECT
            COALESCE(customer->>'id', '') AS customer_id,
            COUNT(*) AS orders,
            COALESCE(SUM(total_price), 0) AS revenue
          FROM shopify.orders
          WHERE cancelled_at IS NULL
          GROUP BY COALESCE(customer->>'id', '')
        )
        SELECT
          address_by_customer.city,
          COALESCE(address_by_customer.region, 'Unknown region') AS region,
          COUNT(DISTINCT address_by_customer.customer_id)::text AS customers,
          COALESCE(SUM(order_by_customer.orders), 0)::text AS orders,
          COALESCE(SUM(order_by_customer.revenue), 0)::text AS revenue
        FROM address_by_customer
        LEFT JOIN order_by_customer ON order_by_customer.customer_id = address_by_customer.customer_id
        WHERE address_by_customer.city IS NOT NULL
        GROUP BY address_by_customer.city, address_by_customer.region
        ORDER BY COALESCE(SUM(order_by_customer.revenue), 0) DESC, COUNT(DISTINCT address_by_customer.customer_id) DESC
        LIMIT 50
      `),
      pool.query<{ with_city: string | null; missing_city: string | null }>(`
        SELECT
          COUNT(*) FILTER (WHERE NULLIF(TRIM(city), '') IS NOT NULL)::text AS with_city,
          COUNT(*) FILTER (WHERE NULLIF(TRIM(city), '') IS NULL)::text AS missing_city
        FROM shopify.customer_address
        WHERE customer_id IS NOT NULL
      `),
    ]);

    const topCities = cityResult.rows.map((row) => ({
      city: row.city || 'Unknown city',
      region: row.region || 'Unknown region',
      classification: classifyCity(row.city || ''),
      customers: numberFromPg(row.customers),
      orders: numberFromPg(row.orders),
      revenue: numberFromPg(row.revenue),
    }));
    const bigCityCustomers = topCities.filter((row) => row.classification === 'Big city').reduce((sum, row) => sum + row.customers, 0);
    const peripheryCustomers = topCities.filter((row) => row.classification !== 'Big city').reduce((sum, row) => sum + row.customers, 0);
    const bigCityRevenue = topCities.filter((row) => row.classification === 'Big city').reduce((sum, row) => sum + row.revenue, 0);
    const peripheryRevenue = topCities.filter((row) => row.classification !== 'Big city').reduce((sum, row) => sum + row.revenue, 0);
    const bigCityOrderCount = topCities.filter((row) => row.classification === 'Big city').reduce((sum, row) => sum + row.orders, 0);
    const peripheryOrderCount = topCities.filter((row) => row.classification !== 'Big city').reduce((sum, row) => sum + row.orders, 0);
    const buyersWithCityData = numberFromPg(missingResult.rows[0]?.with_city);
    const buyersMissingCityData = numberFromPg(missingResult.rows[0]?.missing_city);

    return {
      ok: true,
      metrics: {
        buyersWithCityData,
        buyersMissingCityData,
        bigCityCustomers,
        peripheryCustomers,
        bigCityCustomerShare: rate(bigCityCustomers, bigCityCustomers + peripheryCustomers),
        peripheryCustomerShare: rate(peripheryCustomers, bigCityCustomers + peripheryCustomers),
        bigCityRevenue,
        peripheryRevenue,
        bigCityOrderCount,
        peripheryOrderCount,
        topCities,
        recommendation: buyersWithCityData === 0
          ? 'Improve checkout/location capture or Shopify address sync.'
          : bigCityCustomers >= peripheryCustomers
            ? 'Prioritize big city targeting, then test periphery expansion.'
            : 'Test suburban/periphery targeting; current buyers skew outside major cities.',
        heuristicNote: 'City classification is a simple editable NL/BE major-city list, not population data.',
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Geo insights failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getCustomerActivityReadiness(): Promise<CustomerActivityReadinessResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const result = await getPool(databaseUrl).query<Record<string, string>>(`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND (
          table_name ILIKE '%visitor%' OR table_name ILIKE '%session%' OR table_name ILIKE '%event%'
          OR table_name ILIKE '%activity%' OR table_name ILIKE '%pageview%' OR table_name ILIKE '%page_view%'
          OR table_name ILIKE '%login%' OR table_name ILIKE '%analytics%'
        )
      ORDER BY table_schema, table_name, ordinal_position
      LIMIT 500
    `);
    const grouped = new Map<string, ActivityTrackingTable>();
    for (const row of result.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      const current = grouped.get(key) ?? {
        schemaName: row.table_schema,
        tableName: row.table_name,
        columns: [],
      };
      current.columns.push(row.column_name);
      grouped.set(key, current);
    }
    const tablesFound = Array.from(grouped.values());

    return {
      ok: true,
      metrics: {
        tablesFound,
        hasTrackingTables: tablesFound.length > 0,
        readinessMessage:
          tablesFound.length > 0
            ? 'Potential tracking tables exist. Review metadata before calculating visit/session metrics.'
            : 'Current database does not yet contain visitor/session/event tracking needed to calculate last visit or sessions before purchase.',
        requiredFields: [
          'visitor_id',
          'session_id',
          'customer_id if known',
          'first_seen_at',
          'last_seen_at',
          'page_count',
          'landing_page',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'meta_click_id',
          'event_name',
          'event_time',
          'funnel_stage',
          'order_id after purchase if matchable',
        ],
        recommendedEvents: [
          'site_viewed',
          'landing_page_viewed',
          'quiz_started',
          'quiz_completed',
          'email_submitted',
          'taste_kit_viewed',
          'taste_kit_added_to_cart',
          'checkout_started',
          'purchase_completed',
          'wine_rated_love',
          'wine_rated_like',
          'wine_rated_dislike',
          'smart_box_viewed',
          'smart_box_customized',
          'smart_box_purchased',
          'subscription_viewed',
          'subscription_started',
        ],
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Customer activity readiness failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getTodayActionPlan(): Promise<TodayActionPlanResult> {
  const [repeatResult, startupResult, ratingsResult, ratingsIntelligenceResult, foodResult, stockResult, funnelResult, metaResult, activityResult, trackingResult] =
    await Promise.all([
      getRepeatCustomerMetrics(),
      getStartupPackRetention(),
      getRatingsConversion(),
      getRatingsIntelligence(),
      getFoodPairingIntelligence(),
      getStockMovementSummary(),
      getShopifyFunnelBasic(),
      getMetaAdsPerformance(),
      getCustomerActivityReadiness(),
      getTrackingReadiness(),
    ]);

  const firstFailure = [repeatResult, startupResult, ratingsResult, ratingsIntelligenceResult, foodResult, stockResult, funnelResult, metaResult, activityResult, trackingResult].find(
    (result) => !result.ok,
  );
  if (firstFailure && !firstFailure.ok) return firstFailure;

  const repeat = repeatResult.ok ? repeatResult.metrics : null;
  const startup = startupResult.ok ? startupResult.metrics : null;
  const ratings = ratingsResult.ok ? ratingsResult.metrics : null;
  const ratingsIntelligence = ratingsIntelligenceResult.ok ? ratingsIntelligenceResult.metrics : null;
  const food = foodResult.ok ? foodResult.metrics : null;
  const stock = stockResult.ok ? stockResult.metrics : null;
  const funnel = funnelResult.ok ? funnelResult.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;
  const activity = activityResult.ok ? activityResult.metrics : null;
  const tracking = trackingResult.ok ? trackingResult.metrics : null;
  const actions: TodayAction[] = [];
  const stageCustomers = ratingsIntelligence?.customers ?? [];
  const needsRatingCustomers = stageCustomers.filter((customer) => customer.funnelStage === 'Needs to Rate Wines');
  const readyForSmartBoxCustomers = stageCustomers.filter((customer) => customer.funnelStage === 'Ready for Smart Box');

  if (!tracking?.ga4Connected) {
    actions.push({
      priority: 'High',
      businessProblem: 'GA4 data is not connected to usable dashboard tables.',
      whyItMatters: 'Without GA4 rows, traffic, sessions, pages per session and acquisition direction are missing.',
      suggestedAction: 'Connect GA4 data to dashboard by fixing Airbyte GA4 streams or adding BigQuery/Data API ingestion.',
      relatedPage: '/tracking-readiness',
      metricEvidence: 'GA4 reporting tables have no usable rows.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Tracking implementation',
      objectionToAddress: 'We cannot know if ads drive qualified traffic.',
      businessImpact: 'Unlocks traffic trends and acquisition diagnosis.',
    });
  }

  const quizEventsAvailable = Boolean(
    tracking?.availableTables.some((table) =>
      table.matchedColumns.some((column) => column.toLowerCase() === 'event_name' || column.toLowerCase() === 'eventname'),
    ),
  );
  if (!quizEventsAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Quiz started/completed events are not trackable yet.',
      whyItMatters: 'The dashboard cannot tell whether ads drive quiz engagement or where visitors drop out.',
      suggestedAction: 'Implement quiz_started and quiz_completed tracking in GA4, Meta, and PostgreSQL.',
      relatedPage: '/tracking-readiness',
      metricEvidence: 'No event tracking table with event_name was detected.',
      stageAffected: 'Quiz Started',
      recommendedEmail: 'Not applicable',
      recommendedOffer: 'Tracking setup',
      objectionToAddress: 'Quiz engagement is currently invisible.',
      businessImpact: 'Unlocks quiz funnel and ad optimization signals.',
    });
  }

  if (!meta?.attributionAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Meta attribution is missing before scaling ads.',
      whyItMatters: 'Spend, CTR, and CPC exist, but true CAC/ROAS require campaign-to-order attribution.',
      suggestedAction: 'Implement UTM, Meta click id, visitor/session tracking, and order attribution.',
      relatedPage: '/attribution-readiness',
      metricEvidence: meta?.attributionNote ?? 'Meta attribution unavailable.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Attribution readiness',
      objectionToAddress: 'Good CPC may still produce poor sales.',
      businessImpact: 'Prevents scaling ads without sales proof.',
    });
  }

  const metaAdsWithEnoughSpend = meta?.ads.filter((ad) => ad.spend >= 15) ?? [];
  const weakMetaAds = metaAdsWithEnoughSpend.filter((ad) => (ad.ctr ?? 0) < 1);
  const strongMetaAds = metaAdsWithEnoughSpend.filter((ad) => (ad.ctr ?? 0) >= 2 && (ad.cpc ?? 99) <= 0.5);
  const hookRateUnavailable = meta ? meta.ads.every((ad) => ad.hookRate === null) : false;

  if (weakMetaAds.length > 0) {
    actions.push({
      priority: 'High',
      businessProblem: 'Some Meta creatives have enough spend and weak CTR.',
      whyItMatters: 'Spend above €15 with CTR below 1% is a useful signal that the hook or creative is not pulling attention.',
      suggestedAction: 'Pause or refresh weak creatives.',
      relatedPage: '/meta',
      metricEvidence: `${weakMetaAds.length} ads have spend >= €15 and CTR < 1%.`,
      stageAffected: 'Visitor',
      recommendedOffer: 'Creative refresh',
      objectionToAddress: 'The first impression is not strong enough.',
      businessImpact: 'Stops budget leaking into weak hooks.',
    });
  }

  if (strongMetaAds.length > 0) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Some Meta creatives have strong click signals.',
      whyItMatters: 'CTR >= 2% with CPC <= €0.50 suggests the creative is worth testing further, even before true ROAS is available.',
      suggestedAction: 'Test increasing budget on strongest creatives, but do not scale based only on clicks.',
      relatedPage: '/meta',
      metricEvidence: `${strongMetaAds.length} ads have spend >= €15, CTR >= 2%, and CPC <= €0.50.`,
      stageAffected: 'Visitor',
      recommendedOffer: 'Controlled budget test',
      objectionToAddress: 'Clicks are not yet proven customers.',
      businessImpact: 'Finds promising creatives while keeping attribution risk visible.',
    });
  }

  if (!meta?.attributionAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Meta clicks cannot yet be tied to Shopify customers.',
      whyItMatters: 'Good CTR and CPC are creative signals, not proof of profitable sales.',
      suggestedAction: 'Do not scale based only on Meta clicks; implement attribution first.',
      relatedPage: '/attribution-readiness',
      metricEvidence: 'True Shopify CAC/ROAS unavailable.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Attribution setup',
      objectionToAddress: 'A good ad can still send low-converting traffic.',
      businessImpact: 'Keeps scaling decisions honest.',
    });
  }

  if (hookRateUnavailable) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Hook rate is unavailable for Meta creatives.',
      whyItMatters: 'Without 3-second video views, video plays, or thruplays, the dashboard cannot separate weak hooks from weak CTAs.',
      suggestedAction: 'Configure video view metrics / hook tracking.',
      relatedPage: '/meta',
      metricEvidence: 'No hook-rate proxy found in Meta action metrics.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Creative diagnostics',
      objectionToAddress: 'We cannot tell whether people stop watching or stop clicking.',
      businessImpact: 'Improves creative testing decisions.',
    });
  }

  if (needsRatingCustomers.length > 0) {
    actions.push({
      priority: 'High',
      businessProblem: 'Customers need to rate wines before the Smart Box can improve.',
      whyItMatters: 'Customers bought more bottles than they rated, so the recommendation engine has missing preference data.',
      suggestedAction: 'Send rating reminder email to customers with unrated bottles.',
      relatedPage: '/sales-funnel?stage=needs-to-rate-wines',
      metricEvidence: `${needsRatingCustomers.length} customers in Needs to Rate Wines.`,
      stageAffected: 'Needs to Rate Wines',
      customersAffected: needsRatingCustomers.length,
      recommendedEmail: 'Rate your bottles so we can build your Smart Box.',
      recommendedOffer: 'Smart Box readiness',
      objectionToAddress: 'Rating feels like work.',
      businessImpact: 'More ratings increase Smart Box conversion readiness.',
    });
  }

  if (readyForSmartBoxCustomers.length > 0) {
    actions.push({
      priority: 'High',
      businessProblem: 'Customers are ready for Smart Box but need a clear next offer.',
      whyItMatters: 'These customers have enough ratings to justify a personalized box follow-up.',
      suggestedAction: 'Send Smart Box ready email.',
      relatedPage: '/sales-funnel?stage=ready-for-smart-box',
      metricEvidence: `${readyForSmartBoxCustomers.length} customers in Ready for Smart Box.`,
      stageAffected: 'Ready for Smart Box',
      customersAffected: readyForSmartBoxCustomers.length,
      recommendedEmail: 'Your taste profile is ready for a Smart Box.',
      recommendedOffer: 'Smart Box',
      objectionToAddress: 'Will the next box be better than the kit?',
      businessImpact: 'This is the cleanest conversion segment for the next offer.',
    });
  }

  if (needsRatingCustomers.length > 0 || readyForSmartBoxCustomers.length > 0) {
    const targetStage = readyForSmartBoxCustomers.length > 0 ? 'Ready for Smart Box' : 'Needs to Rate Wines';
    const targetCount = readyForSmartBoxCustomers.length > 0 ? readyForSmartBoxCustomers.length : needsRatingCustomers.length;
    actions.push({
      priority: 'Medium',
      businessProblem: 'Funnel stages have contactable customers.',
      whyItMatters: 'The highest leverage daily action is often contacting a concrete segment instead of reading more dashboards.',
      suggestedAction: 'Click a Sales Funnel stage and contact customers in that segment.',
      relatedPage: `/sales-funnel?stage=${encodeURIComponent(targetStage)}`,
      metricEvidence: `${targetCount} customers in ${targetStage}.`,
      stageAffected: targetStage,
      customersAffected: targetCount,
      recommendedEmail: targetStage === 'Ready for Smart Box' ? 'Your taste profile is ready for a Smart Box.' : 'Rate your bottles so we can build your Smart Box.',
      recommendedOffer: targetStage === 'Ready for Smart Box' ? 'Smart Box' : 'Rating reminder',
      objectionToAddress: targetStage === 'Ready for Smart Box' ? 'Will the next box be better?' : 'Rating feels like work.',
      businessImpact: 'Turns funnel diagnosis into customer contact.',
    });
  }

  if ((repeat?.reorderRate ?? 100) < 20) {
    actions.push({
      priority: 'Critical',
      businessProblem: 'First-time customers are not reordering.',
      whyItMatters: 'Revenue depends too much on acquisition if later orders do not appear.',
      suggestedAction: 'Create a follow-up campaign for first-time customers and Startup Pack buyers.',
      relatedPage: '/repeat-customers',
      metricEvidence: `Reorder rate: ${repeat?.reorderRate?.toFixed(1) ?? '0'}%`,
      stageAffected: 'Repeat Buyer',
      recommendedEmail: 'Make your next wine box easier.',
      recommendedOffer: 'Repeat order / subscription starter',
      objectionToAddress: 'I only wanted to try it once.',
      businessImpact: 'Repeat orders reduce dependence on paid acquisition.',
    });
  }

  if ((startup?.startupPackReorderRate ?? 100) < 20) {
    actions.push({
      priority: 'High',
      businessProblem: 'Startup Pack customers are not converting to later orders.',
      whyItMatters: 'Startup Pack stock cost only pays back if customers continue into Smart Box or repeat orders.',
      suggestedAction: 'Send Smart Box offer to Startup Pack customers after ratings are completed.',
      relatedPage: '/startup-pack-retention',
      metricEvidence: `Startup Pack reorder rate: ${startup?.startupPackReorderRate?.toFixed(1) ?? '0'}%`,
    });
  }

  if (ratings && ratings.totalUsers > 0 && ratings.usersWithRatings / ratings.totalUsers < 0.5) {
    actions.push({
      priority: 'High',
      businessProblem: 'Ratings engagement is too low.',
      whyItMatters: 'Ratings power Smart Wine Box recommendations and segmentation.',
      suggestedAction: 'Improve post-delivery rating emails.',
      relatedPage: '/ratings-conversion',
      metricEvidence: `${ratings.usersWithRatings} of ${ratings.totalUsers} users have rated.`,
    });
  }

  if (ratingsIntelligence && !ratingsIntelligence.wineLevelAnalysisAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Wine-level ratings cannot be measured yet.',
      whyItMatters: 'Smart Box recommendations need wine-level Love/Like/Dislike performance.',
      suggestedAction: 'Add wine_id to ratings so Smart Box recommendations can be measured by wine.',
      relatedPage: '/ratings',
      metricEvidence: ratingsIntelligence.wineLevelUnavailableReason ?? 'Wine-level rating key missing.',
    });
  }

  if (ratingsIntelligence && (ratingsIntelligence.positiveRatingRate ?? 0) >= 99 && ratingsIntelligence.totalRatings > 0) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Ratings are almost entirely positive.',
      whyItMatters: 'A 100% positive rating signal can mean customers love the wines, or that Dislike is not being captured clearly.',
      suggestedAction: 'Audit the rating UI and make sure Love, Like and Dislike are all easy to submit.',
      relatedPage: '/ratings',
      metricEvidence: `Positive rating rate: ${ratingsIntelligence.positiveRatingRate?.toFixed(1) ?? '100'}%.`,
    });
  }

  if (funnel && funnel.abandonedCheckoutCount > funnel.orderCount) {
    actions.push({
      priority: 'High',
      businessProblem: 'Abandoned checkouts exceed completed orders.',
      whyItMatters: 'Checkout friction can waste paid traffic and quiz demand.',
      suggestedAction: 'Investigate abandoned checkout emails and payment friction.',
      relatedPage: '/acquisition-economics-basic',
      metricEvidence: `${funnel.abandonedCheckoutCount} abandoned checkouts vs ${funnel.orderCount} orders.`,
    });
  }

  if ((stock?.freeQuantityPercentage ?? 0) > 20) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Free stock movement is material.',
      whyItMatters: 'Discounted pack bottles move inventory before repeat revenue is proven.',
      suggestedAction: 'Monitor acquisition stock cost and make sure Startup Pack leads convert.',
      relatedPage: '/stock-movement-summary',
      metricEvidence: `Free quantity share: ${stock?.freeQuantityPercentage?.toFixed(1) ?? '0'}%`,
    });
  }

  if (food && food.pairingCoverageRate === 0) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Food pairing coverage is missing.',
      whyItMatters: 'Pairing tags can improve product positioning and Smart Box explanations.',
      suggestedAction: 'Populate food pairing tags for wines so Smart Box explanations are stronger.',
      relatedPage: '/food-pairing-intelligence',
      metricEvidence: food.coverageGapReason ?? 'Pairing coverage is 0%.',
    });
  }

  if (meta && meta.totalSpend > 0 && !meta.attributionAvailable) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Meta spend is not reliably attributed to Shopify orders.',
      whyItMatters: 'CAC and ROAS cannot be trusted without click/order attribution.',
      suggestedAction: 'Set up UTM/meta click tracking and Shopify order attribution.',
      relatedPage: '/meta',
      metricEvidence: `Meta spend detected: €${meta.totalSpend.toFixed(2)}.`,
      stageAffected: 'Visitor',
      recommendedEmail: 'Not applicable until attribution exists.',
      recommendedOffer: 'Tracking fix',
      objectionToAddress: 'CAC is unknown.',
      businessImpact: 'Prevents scaling spend without knowing CAC or ROAS.',
    });
  }

  if (activity && !activity.hasTrackingTables) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Customer activity tracking is missing.',
      whyItMatters: 'Sales prediction needs sessions, events, and visit recency before purchase.',
      suggestedAction: 'Implement visitor/session/event tracking before trying to predict sales.',
      relatedPage: '/customer-activity-readiness',
      metricEvidence: 'No visitor/session/event tables found.',
    });
  }

  return { ok: true, metrics: { topActions: actions.slice(0, 5), allActions: actions } };
}

export async function getAcquisitionEconomicsBasic(): Promise<AcquisitionEconomicsBasicResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const [result, repeatResult, startupRetentionResult, ratingsConversionResult] =
      await Promise.all([
        getPool(databaseUrl).query<AcquisitionEconomicsBasicRow>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id FROM enriched_items WHERE is_startup_pack
      ),
      box_orders AS (
        SELECT DISTINCT order_id FROM enriched_items WHERE is_box
      ),
      movement AS (
        SELECT
          COALESCE(SUM(free_quantity), 0)::text AS free_bottle_quantity,
          COALESCE(SUM(discount_value), 0)::text AS product_discount_value
        FROM enriched_items
      )
      SELECT
        (SELECT COUNT(*) FROM public.users)::text AS users_count,
        (SELECT COUNT(*) FROM public.quizz)::text AS quiz_count,
        (SELECT COUNT(*) FROM public.ratings)::text AS ratings_count,
        (SELECT COUNT(*) FROM shopify.customers)::text AS shopify_customers_count,
        (SELECT COUNT(*) FROM shopify.orders)::text AS orders_count,
        (
          SELECT COUNT(*)
          FROM shopify.orders
          WHERE lower(coalesce(financial_status::text, '')) = 'paid'
        )::text AS paid_orders_count,
        (SELECT COUNT(*) FROM shopify.orders WHERE cancelled_at IS NOT NULL)::text AS cancelled_orders_count,
        (SELECT COUNT(*) FROM shopify.abandoned_checkouts)::text AS abandoned_checkout_count,
        (SELECT COUNT(*) FROM startup_orders)::text AS startup_pack_orders_count,
        (SELECT COUNT(*) FROM box_orders)::text AS box_orders_count,
        movement.free_bottle_quantity,
        movement.product_discount_value,
        (
          SELECT COALESCE(
            SUM(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )
          FROM shopify.orders
        )::text AS total_revenue,
        (
          SELECT COALESCE(
            AVG(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )
          FROM shopify.orders
        )::text AS average_order_value
      FROM movement
    `),
        getRepeatCustomerMetrics(),
        getStartupPackRetention(),
        getRatingsConversion(),
      ]);

    if (!repeatResult.ok) {
      return repeatResult;
    }

    if (!startupRetentionResult.ok) {
      return startupRetentionResult;
    }

    if (!ratingsConversionResult.ok) {
      return ratingsConversionResult;
    }

    const row = result.rows[0];
    const usersCount = numberFromPg(row?.users_count);
    const quizCount = numberFromPg(row?.quiz_count);
    const ratingsCount = numberFromPg(row?.ratings_count);
    const ordersCount = numberFromPg(row?.orders_count);
    const abandonedCheckoutCount = numberFromPg(row?.abandoned_checkout_count);
    const startupPackOrdersCount = numberFromPg(row?.startup_pack_orders_count);
    const boxOrdersCount = numberFromPg(row?.box_orders_count);
    const freeBottleQuantity = numberFromPg(row?.free_bottle_quantity);
    const potentialIssues: string[] = [];

    if (quizCount > 0 && ordersCount / quizCount < 0.2) {
      potentialIssues.push('Quiz-to-order conversion may need attention.');
    }

    if (abandonedCheckoutCount > ordersCount) {
      potentialIssues.push('Abandoned checkouts exceed completed orders.');
    }

    if (freeBottleQuantity > 0 && startupPackOrdersCount === 0) {
      potentialIssues.push('Free stock movement detected outside Startup Pack logic.');
    }

    if (usersCount > 0 && ratingsCount / usersCount < 1) {
      potentialIssues.push('Most users have not rated at least one wine yet.');
    }

    if (boxOrdersCount === 0 && ratingsCount > 0) {
      potentialIssues.push('Rated users may not yet be converting to Smart Box.');
    }

    if ((repeatResult.metrics.reorderRate ?? 100) < 20) {
      potentialIssues.push('Acquisition economics may depend too much on first orders.');
    }

    if ((startupRetentionResult.metrics.startupPackReorderRate ?? 100) < 20) {
      potentialIssues.push('Startup Pack acquisition may not be converting yet.');
    }

    return {
      ok: true,
      metrics: {
        usersCount,
        quizCount,
        ratingsCount,
        shopifyCustomersCount:
          row?.shopify_customers_count === null ? null : numberFromPg(row?.shopify_customers_count),
        ordersCount,
        paidOrdersCount: numberFromPg(row?.paid_orders_count),
        cancelledOrdersCount: numberFromPg(row?.cancelled_orders_count),
        abandonedCheckoutCount,
        startupPackOrdersCount,
        boxOrdersCount,
        freeBottleQuantity,
        productDiscountValue: numberFromPg(row?.product_discount_value),
        totalRevenue: numberFromPg(row?.total_revenue),
        averageOrderValue: numberFromPg(row?.average_order_value),
        ratingsPerUser: ratio(ratingsCount, usersCount),
        ratingsPerOrder: ratio(ratingsCount, ordersCount),
        quizToOrderRatio: ratio(ordersCount, quizCount),
        abandonedCheckoutToOrderRatio: ratio(abandonedCheckoutCount, ordersCount),
        repeatCustomers: repeatResult.metrics.repeatCustomers,
        reorderRate: repeatResult.metrics.reorderRate,
        laterOrderRevenue: repeatResult.metrics.laterOrderRevenue,
        repeatRevenueShare: repeatResult.metrics.repeatRevenueShare,
        startupPackReorderRate: startupRetentionResult.metrics.startupPackReorderRate,
        usersWithRatings: ratingsConversionResult.metrics.usersWithRatings,
        usersWithThreePlusRatings: ratingsConversionResult.metrics.usersWithThreePlusRatings,
        ratingsEngagementRate: rate(ratingsConversionResult.metrics.usersWithRatings, usersCount),
        potentialIssues:
          potentialIssues.length > 0 ? potentialIssues : ['No major acquisition issue detected.'],
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Acquisition economics basic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

type OverviewPeriodRow = {
  revenue: string | null;
  orders: string | null;
  paid_orders: string | null;
};

export async function getBusinessOverviewPeriodTrends(range: DateRange): Promise<BusinessOverviewPeriodTrendsResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const previousRange = getPreviousDateRange(range);
  const currentStart = dateToSql(range.start);
  const currentEnd = dateToSql(range.end);
  const previousStart = dateToSql(previousRange.start);
  const previousEnd = dateToSql(previousRange.end);
  const currentGa4 = ga4Bounds(range);
  const previousGa4 = ga4Bounds(previousRange);

  try {
    const pool = getPool(databaseUrl);
    const [currentOrdersResult, previousOrdersResult, currentMetaResult, previousMetaResult, currentGa4Result, previousGa4Result] =
      await Promise.all([
        pool.query<OverviewPeriodRow>(`
          SELECT
            COALESCE(SUM(total_price), 0)::text AS revenue,
            COUNT(*)::text AS orders,
            COUNT(*) FILTER (WHERE lower(coalesce(financial_status, '')) = 'paid')::text AS paid_orders
          FROM shopify.orders
          WHERE created_at::date BETWEEN $1::date AND $2::date
        `, [currentStart, currentEnd]),
        pool.query<OverviewPeriodRow>(`
          SELECT
            COALESCE(SUM(total_price), 0)::text AS revenue,
            COUNT(*)::text AS orders,
            COUNT(*) FILTER (WHERE lower(coalesce(financial_status, '')) = 'paid')::text AS paid_orders
          FROM shopify.orders
          WHERE created_at::date BETWEEN $1::date AND $2::date
        `, [previousStart, previousEnd]),
        pool.query<{ spend: string | null }>(`
          SELECT COALESCE(SUM(spend), 0)::text AS spend
          FROM public.ads_insights
          WHERE date_start BETWEEN $1 AND $2
        `, [currentStart, currentEnd]),
        pool.query<{ spend: string | null }>(`
          SELECT COALESCE(SUM(spend), 0)::text AS spend
          FROM public.ads_insights
          WHERE date_start BETWEEN $1 AND $2
        `, [previousStart, previousEnd]),
        pool.query<{ sessions: string | null }>(`
          SELECT COALESCE(SUM(sessions), 0)::text AS sessions
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
        `, [currentGa4.start, currentGa4.end]),
        pool.query<{ sessions: string | null }>(`
          SELECT COALESCE(SUM(sessions), 0)::text AS sessions
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
        `, [previousGa4.start, previousGa4.end]),
      ]);
    const currentOrders = currentOrdersResult.rows[0];
    const previousOrders = previousOrdersResult.rows[0];
    const currentRevenue = numberFromPg(currentOrders?.revenue);
    const previousRevenue = numberFromPg(previousOrders?.revenue);
    const currentOrderCount = numberFromPg(currentOrders?.orders);
    const previousOrderCount = numberFromPg(previousOrders?.orders);

    return {
      ok: true,
      metrics: {
        revenue: calculateTrend('revenue', currentRevenue, previousRevenue),
        orders: calculateTrend('orders', currentOrderCount, previousOrderCount),
        paidOrders: calculateTrend('paid_orders', numberFromPg(currentOrders?.paid_orders), numberFromPg(previousOrders?.paid_orders)),
        averageOrderValue: calculateTrend('average_order_value', ratio(currentRevenue, currentOrderCount) ?? 0, ratio(previousRevenue, previousOrderCount) ?? 0),
        metaSpend: calculateTrend('meta_spend', numberFromPg(currentMetaResult.rows[0]?.spend), numberFromPg(previousMetaResult.rows[0]?.spend)),
        ga4Sessions: calculateTrend('sessions', numberFromPg(currentGa4Result.rows[0]?.sessions), numberFromPg(previousGa4Result.rows[0]?.sessions)),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Business overview period trends failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getBusinessOverview(): Promise<BusinessOverviewResult> {
  const [
    ordersResult,
    productsResult,
    funnelResult,
    startupPackResult,
    stockMovementResult,
    repeatResult,
    startupRetentionResult,
    ratingsResult,
  ] = await Promise.all([
      getShopifyOrdersSummary(),
      getShopifyProductsSummary(),
      getShopifyFunnelBasic(),
      getStartupPackAnalysis(),
      getStockMovementSummary(),
      getRepeatCustomerMetrics(),
      getStartupPackRetention(),
      getRatingsConversion(),
    ]);

  const orders = ordersResult.ok
    ? ordersResult.metrics
    : ({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        paidOrders: 0,
        cancelledOrders: 0,
        fulfilledOrders: 0,
        unfulfilledOrders: 0,
        totalLineItemsCount: null,
        averageLineItemsPerOrder: null,
        lineItemsCountWorked: false,
        firstOrderDate: null,
        latestOrderDate: null,
      } as ShopifyOrdersAggregateMetrics);

  const products = productsResult.ok
    ? productsResult
    : ({
        ok: true,
        products: [],
        totalQuantitySold: 0,
        totalProductDiscounts: 0,
        freeQuantityEstimate: 0,
        discountFieldsDetected: [],
      } as Extract<ShopifyProductsSummaryResult, { ok: true }>);

  const funnel = funnelResult.ok
    ? funnelResult.metrics
    : ({
        abandonedCheckoutCount: 0,
        orderCount: 0,
        paidOrderCount: 0,
        cancelledOrderCount: 0,
        fulfilledOrderCount: 0,
        unfulfilledOrderCount: 0,
        abandonmentToOrderRatio: null,
        paidOrderRate: null,
        cancelledOrderRate: null,
        fulfilledOrderRate: null,
        totalRevenue: 0,
        averageOrderValue: 0,
      } as ShopifyFunnelBasicMetrics);

  const startupPack = startupPackResult.ok
    ? startupPackResult.metrics
    : ({
        startupPackOrderCount: 0,
        startupPackLineItemsSold: 0,
        startupPackGrossRevenue: 0,
        startupPackNetRevenue: 0,
        averageStartupPackNetRevenuePerOrder: null,
        freeBottleLineItemCount: 0,
        freeBottleQuantity: 0,
        freeBottleGrossValue: 0,
        freeBottleDiscountValue: 0,
        paidItemsNetRevenueInStartupPackOrders: 0,
        averageFreeBottlesPerStartupPackOrder: null,
        topFreeWinesByQuantity: [],
        topFreeWinesByGrossValue: [],
        topPaidPackProducts: [],
      } as StartupPackAnalysisMetrics);

  const stockMovement = stockMovementResult.ok
    ? stockMovementResult.metrics
    : ({
        totalQuantityMoved: 0,
        totalPaidQuantity: 0,
        totalFreeQuantity: 0,
        freeQuantityPercentage: null,
        totalGrossProductValue: 0,
        totalDiscountValue: 0,
        totalNetProductRevenue: 0,
        products: [],
      } as StockMovementSummaryMetrics);

  const repeat = repeatResult.ok
    ? repeatResult.metrics
    : ({
        orderingCustomers: 0,
        oneTimeCustomers: 0,
        repeatCustomers: 0,
        reorderRate: null,
        customersWithExactlyTwoOrders: 0,
        customersWithThreePlusOrders: 0,
        totalNonCancelledOrders: 0,
        averageOrdersPerOrderingCustomer: null,
        firstOrderRevenue: 0,
        laterOrderRevenue: 0,
        totalNonCancelledRevenue: 0,
        repeatRevenueShare: null,
        averageFirstOrderValue: null,
        averageLaterOrderValue: null,
        firstOrderDate: null,
        latestOrderDate: null,
        distribution: [],
        potentialIssues: [],
      } as RepeatCustomerMetrics);

  const startupRetention = startupRetentionResult.ok
    ? startupRetentionResult.metrics
    : ({
        startupPackCustomers: 0,
        startupPackOrders: 0,
        startupPackCustomersWithLaterOrder: 0,
        startupPackReorderRate: null,
        startupPackFirstOrderRevenue: 0,
        startupPackLaterOrderRevenue: 0,
        averageLaterOrdersPerStartupPackCustomer: null,
        smartBoxLaterOrdersAfterStartupPack: 0,
        customersWithStartupPackOnly: 0,
        customersWithStartupPackAndLaterOrder: 0,
        customersWithStartupPackAndSmartBox: 0,
        averageFreeBottlesPerStartupPackOrder: null,
        cohorts: [],
        potentialIssues: [],
      } as StartupPackRetentionMetrics);

  const ratings = ratingsResult.ok
    ? ratingsResult.metrics
    : ({
        totalUsers: 0,
        usersWithRatings: 0,
        usersWithThreePlusRatings: 0,
        totalRatings: 0,
        averageRatingsPerUser: null,
        orderingCustomers: 0,
        repeatCustomers: 0,
        ratedOrderingCustomers: null,
        ratedRepeatCustomers: null,
        ratedReorderRate: null,
        unratedReorderRate: null,
        ratedVsUnratedReorderRateDifference: null,
        matchingAvailable: false,
        matchingUnavailableReason: null,
        buckets: [],
        potentialIssues: [],
      } as RatingsConversionMetrics);

  const potentialIssues: string[] = [];

  if ((funnel.cancelledOrderRate ?? 0) > 10) {
    potentialIssues.push('Cancelled orders may be high.');
  }

  if (funnel.abandonedCheckoutCount > funnel.orderCount) {
    potentialIssues.push('Abandoned checkouts exceed completed orders.');
  }

  if ((funnel.paidOrderRate ?? 100) < 90) {
    potentialIssues.push('Paid order rate may need attention.');
  }

  if (products.freeQuantityEstimate > 0) {
    potentialIssues.push(
      'Some products were included for free via discounts. Stock movement may exceed paid product sales.',
    );
  }

  const averageFreeBottles = startupPack.averageFreeBottlesPerStartupPackOrder;
  if (
    startupPack.startupPackOrderCount > 0 &&
    (averageFreeBottles === null || averageFreeBottles < 3 || averageFreeBottles > 4)
  ) {
    potentialIssues.push('Average free bottles per Startup Pack is outside the expected 3 to 4 range.');
  }

  if ((stockMovement.freeQuantityPercentage ?? 0) > 50) {
    potentialIssues.push(
      'A large share of stock movement is discounted/free. Check acquisition economics.',
    );
  }

  if ((repeat.reorderRate ?? 100) < 20) {
    potentialIssues.push('Reorder rate is low. Startup Pack acquisition may not yet be converting into repeat orders.');
  }

  if ((startupRetention.startupPackReorderRate ?? 100) < 20) {
    potentialIssues.push('Startup Pack customers are not yet reordering enough.');
  }

  if (ratings.totalUsers > 0 && ratings.usersWithRatings / ratings.totalUsers < 0.5) {
    potentialIssues.push('Most users have not rated wines yet.');
  }

  return {
    ok: true,
    metrics: {
      totalRevenue: orders.totalRevenue,
      totalOrders: orders.totalOrders,
      averageOrderValue: orders.averageOrderValue,
      paidOrders: orders.paidOrders,
      cancelledOrders: orders.cancelledOrders,
      abandonedCheckoutCount: funnel.abandonedCheckoutCount,
      topProducts: products.products.slice(0, 5),
      totalQuantitySold: products.totalQuantitySold,
      totalProductDiscounts: products.totalProductDiscounts,
      freeQuantityEstimate: products.freeQuantityEstimate,
      totalLineItems: orders.totalLineItemsCount,
      startupPackOrders: startupPack.startupPackOrderCount,
      averageFreeBottlesPerStartupPackOrder:
        startupPack.averageFreeBottlesPerStartupPackOrder,
      paidQuantityEstimate: stockMovement.totalPaidQuantity,
      freeQuantityPercentage: stockMovement.freeQuantityPercentage,
      repeatCustomers: repeat.repeatCustomers,
      reorderRate: repeat.reorderRate,
      oneTimeCustomers: repeat.oneTimeCustomers,
      laterOrderRevenue: repeat.laterOrderRevenue,
      repeatRevenueShare: repeat.repeatRevenueShare,
      startupPackReorderRate: startupRetention.startupPackReorderRate,
      usersWithRatings: ratings.usersWithRatings,
      ratingsPerUser: ratings.averageRatingsPerUser,
      potentialIssues:
        potentialIssues.length > 0 ? potentialIssues : ['No major Shopify issue detected.'],
    },
  };
}
