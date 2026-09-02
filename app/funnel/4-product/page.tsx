import { Suspense } from 'react';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FunnelPipelineBar, FunnelPipelineBarSkeleton } from '@/components/funnel/FunnelPipelineBar';
import { ProductConversionTable } from '@/components/funnel/ProductConversionTable';
import { TopBar } from '@/components/TopBar';
import {
  AlertBanner,
  Card,
  PageSection,
  Section,
  StatCard,
  StatGrid,
  colors,
} from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedProductConversion, rangeCacheArgs } from '@/lib/cachedDb';
import { buildClarityLinks, getClarityProjectId } from '@/lib/clarity';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Etape 4 du funnel : conversion des fiches produit et du catalogue.
 *
 * Une seule lecture en base, mise en cache : la requete croise deja GA4 et
 * Shopify cote SQL (voir `getProductConversion`). Empiler ici un second appel
 * a l inventaire Shopify doublerait le temps de chargement pour une colonne.
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[3];

export default async function Step4Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const range = getDateRangeFromSearchParams(params);

  const result = await timeAsync(
    'page:/funnel/4-product getProductConversion',
    () => getCachedProductConversion(...rangeCacheArgs(range)),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Conversion fiche produit" subtitle="Ce que le catalogue transforme reellement" step={STEP.step} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees produit indisponibles">
            {result.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'Le croisement GA4 / Shopify a echoue.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const metrics = result.metrics;
  const clarityConfigured = getClarityProjectId() !== null;

  const rows = metrics.products.map((product) => ({
    productId: product.productId,
    itemName: product.itemName,
    itemsViewed: product.itemsViewed,
    itemsAddedToCart: product.itemsAddedToCart,
    itemsPurchased: product.itemsPurchased,
    itemRevenue: product.itemRevenue,
    shopifyQuantitySold: product.shopifyQuantitySold,
    cartToViewRate: product.cartToViewRate,
    purchaseToViewRate: product.purchaseToViewRate,
    underperforming: product.underperforming,
    clarity: product.pagePath ? buildClarityLinks(product.pagePath) : null,
  }));

  return (
    <DashboardLayout>
      <TopBar
        title="Conversion fiche produit"
        subtitle="Ce que la fiche produit et le catalogue transforment reellement"
        step={STEP.step}
      />

      {/* La bande des 7 etapes lit sept sources : elle ne doit jamais retarder
          le contenu de la page, qui n en lit qu une. */}
      <Suspense fallback={<FunnelPipelineBarSkeleton />}>
        <FunnelPipelineBar currentStep={STEP.step} searchParams={params} />
      </Suspense>

      {metrics.underperformingProducts.length > 0 ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`${metrics.underperformingProducts.length} fiche(s) a fort trafic sous ${metrics.underperformingConversionThreshold} % de conversion`}
          >
            {metrics.underperformingProducts
              .slice(0, 4)
              .map(
                (product) =>
                  `${product.itemName} (${formatNumber(product.itemsViewed)} vues, ${formatPercent(product.purchaseToViewRate)})`,
              )
              .join(' · ')}
            {clarityConfigured ? ' — ouvrir la heatmap Clarity depuis le tableau ci-dessous.' : ''}
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard
            label="Taux de conversion moyen"
            value={formatPercent(metrics.averageConversionRate)}
            tone={
              metrics.averageConversionRate !== null &&
              metrics.averageConversionRate < metrics.underperformingConversionThreshold
                ? 'warning'
                : 'good'
            }
            hint={`Achats / vues, mesures par GA4 · ${metrics.periodLabel}`}
          />
          <StatCard label="Achats" value={formatNumber(metrics.totalPurchased)} />
          <StatCard label="Vues de fiches" value={formatNumber(metrics.totalViews)} />
          <StatCard
            label="Ajouts au panier"
            value={formatNumber(metrics.totalAddedToCart)}
            hint={`${formatPercent(metrics.averageCartToViewRate)} des vues`}
          />
          <StatCard label="Chiffre d affaires produit" value={formatEuro(metrics.totalRevenue)} hint="Mesure GA4" />
          <StatCard label="Fiches suivies" value={formatNumber(metrics.products.length)} />
        </StatGrid>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>D ou viennent ces chiffres.</strong> Les vues, ajouts au
            panier et achats proviennent tous du rapport GA4{' '}
            <code>ecommerce_purchases_item_id_report</code> : mesures par le meme outil sur la meme fenetre,
            leur rapport est coherent. L identifiant GA4 encode l id produit Shopify, ce qui permet de
            rattacher chaque ligne a sa fiche — et donc a son URL pour Clarity. La colonne{' '}
            <strong>Vendus (Shopify)</strong> est un controle, jamais un denominateur : la synchronisation
            Shopify n a pas le meme rythme que GA4, et melanger les deux dans un quotient produirait un taux
            faux. Une fiche est signalee a partir de {metrics.underperformingViewsThreshold} vues et sous{' '}
            {metrics.underperformingConversionThreshold} % de conversion.
          </p>
        </Card>
      </PageSection>

      {!clarityConfigured ? (
        <PageSection>
          <Card>
            <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary }}>
              Les liens Clarity sont masques : ajouter <code>CLARITY_PROJECT_ID</code> dans{' '}
              <code>.env.local</code> et dans les variables Vercel pour les activer.
            </p>
          </Card>
        </PageSection>
      ) : null}

      <Section
        title="Conversion par fiche produit"
        sub="Classe par volume de vues. Les fiches signalees sont celles qui ont l audience mais pas la conversion."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ProductConversionTable
            rows={rows}
            conversionThreshold={metrics.underperformingConversionThreshold}
            viewsThreshold={metrics.underperformingViewsThreshold}
          />
        </Card>
      </Section>
    </DashboardLayout>
  );
}
