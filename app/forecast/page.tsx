import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CostEditor } from '@/components/forecast/CostEditor';
import { TopBar } from '@/components/TopBar';
import { AlertBanner, Card, PageSection, StatCard, StatGrid, colors } from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getForecastActuals, getForecastSettings } from '@/lib/db';
import { formatEuro, formatNumber } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Module financier : charges saisies et point d equilibre.
 *
 * La page lit les charges (schema `dashboard`) et les grandeurs mesurees
 * (Meta, Google Ads, Shopify), puis confie la saisie et le calcul au composant
 * client `CostEditor`, qui recalcule le point d equilibre a chaque frappe.
 *
 * Les charges ne sont volontairement PAS mises en cache : elles changent parce
 * que l utilisateur vient de les modifier, et un cache de 60 secondes lui
 * renverrait ses anciennes valeurs juste apres avoir enregistre.
 */

export const runtime = 'nodejs';

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);

  const [settingsResult, actualsResult] = await Promise.all([
    timeAsync('page:/forecast getForecastSettings', () => getForecastSettings(), {
      category: 'page',
      cacheStatus: 'none',
    }),
    timeAsync('page:/forecast getForecastActuals', () => getForecastActuals(range), {
      category: 'page',
      cacheStatus: 'none',
    }),
  ]);

  if (!settingsResult.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Charges & point d equilibre" subtitle="Combien vendre pour etre a l equilibre" showDateRange={false} />
        <PageSection>
          <AlertBanner
            tone="critical"
            title={
              settingsResult.reason === 'schema-missing'
                ? 'Le schema dashboard n existe pas encore'
                : 'Charges indisponibles'
            }
          >
            {settingsResult.reason === 'schema-missing' ? (
              <>
                Executer <code>scripts/create-dashboard-schema.sql</code> sur la base pour creer les
                tables de saisie. Le script est idempotent et ne touche pas aux schemas Airbyte.
              </>
            ) : settingsResult.reason === 'missing-url' ? (
              'DATABASE_URL n est pas configure.'
            ) : (
              'La lecture du schema dashboard a echoue.'
            )}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const actuals = actualsResult.ok ? actualsResult.actuals : null;

  return (
    <DashboardLayout>
      <TopBar
        title="Charges & point d equilibre"
        subtitle="Combien de bouteilles vendre chaque mois pour couvrir les charges"
      />

      {!actuals ? (
        <PageSection>
          <AlertBanner tone="warning" title="Depenses et chiffre d affaires indisponibles">
            Le modele fonctionne avec les charges saisies, mais sans les montants mesures la publicite
            et le volume vendu sont comptes a zero.
          </AlertBanner>
        </PageSection>
      ) : null}

      {/* Grandeurs mesurees : ce que le modele reprend automatiquement */}
      {actuals ? (
        <PageSection>
          <StatGrid>
            <StatCard
              label="Depense Meta Ads"
              value={formatEuro(actuals.metaSpend)}
              hint={actuals.periodLabel}
            />
            <StatCard label="Depense Google Ads" value={formatEuro(actuals.googleSpend)} />
            <StatCard
              label="Chiffre d affaires Shopify"
              value={formatEuro(actuals.revenue)}
              hint={`${formatNumber(actuals.ordersCount)} commandes`}
            />
            <StatCard
              label="Bouteilles vendues"
              value={formatNumber(actuals.bottlesSold)}
              hint="Hors coffrets et box"
            />
          </StatGrid>
        </PageSection>
      ) : null}

      {actuals ? (
        <PageSection>
          <Card style={{ background: colors.surfaceMuted }}>
            <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
              <strong style={{ color: colors.text }}>Tout est ramene au mois.</strong> La periode
              selectionnee couvre {formatNumber(actuals.periodDays)} jours ; depenses, chiffre d affaires
              et volumes sont normalises sur 30 jours avant d entrer dans le modele, sinon les comparer a
              des charges fixes mensuelles n aurait pas de sens. Equivalent mensuel retenu :{' '}
              <strong>{formatEuro(actuals.monthlyAdSpend)}</strong> de publicite,{' '}
              <strong>{formatEuro(actuals.monthlyRevenue)}</strong> de chiffre d affaires,{' '}
              <strong>{formatNumber(actuals.monthlyBottlesSold)}</strong> bouteilles. La publicite est
              traitee comme une charge fixe de la periode : elle ne depend pas du nombre de bouteilles
              vendues ce mois-ci.
            </p>
          </Card>
        </PageSection>
      ) : null}

      <CostEditor
        initialFixedCosts={settingsResult.settings.fixedCosts}
        initialVariableCosts={settingsResult.settings.variableCosts}
        initialAssumptions={settingsResult.settings.assumptions}
        actuals={
          actuals ?? {
            monthlyAdSpend: 0,
            monthlyRevenue: 0,
            monthlyBottlesSold: 0,
            observedAveragePrice: null,
            periodLabel: range.label,
            periodDays: 30,
          }
        }
      />
    </DashboardLayout>
  );
}
