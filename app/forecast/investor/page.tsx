import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { InvestorSimulator } from '@/components/forecast/InvestorSimulator';
import { TopBar } from '@/components/TopBar';
import { AlertBanner, Card, PageSection, colors } from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getForecastActuals, getForecastSettings } from '@/lib/db';
import { sumCosts } from '@/lib/forecast/breakEven';
import { formatEuro, formatNumber } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Simulateur d investissement publicitaire.
 *
 * Le serveur ne fait que reunir le point de depart : charges saisies au Lot 7 et
 * grandeurs mesurees (publicite, chiffre d affaires, volumes). Toute la
 * projection est ensuite calculee dans le navigateur, pour que les curseurs
 * repondent instantanement pendant un pitch.
 */

export const runtime = 'nodejs';

const PRICE_KEY = 'average_selling_price_per_bottle';

export default async function InvestorSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);

  const [settingsResult, actualsResult] = await Promise.all([
    timeAsync('page:/forecast/investor getForecastSettings', () => getForecastSettings(), {
      category: 'page',
      cacheStatus: 'none',
    }),
    timeAsync('page:/forecast/investor getForecastActuals', () => getForecastActuals(range), {
      category: 'page',
      cacheStatus: 'none',
    }),
  ]);

  if (!settingsResult.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Simulateur investisseur" subtitle="Projeter une injection de capital" showDateRange={false} />
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
                Executer <code>scripts/create-dashboard-schema.sql</code>, puis renseigner les charges sur
                la page Charges &amp; break-even. Le simulateur s appuie dessus.
              </>
            ) : (
              'La lecture du schema dashboard a echoue.'
            )}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const settings = settingsResult.settings;
  const actuals = actualsResult.ok ? actualsResult.actuals : null;

  const averageSellingPrice = settings.assumptions.find((item) => item.key === PRICE_KEY)?.value ?? 0;
  const fixedMonthlyCosts = sumCosts(settings.fixedCosts);
  const variableCostPerBottle = sumCosts(settings.variableCosts);

  // Sans prix de vente saisi, la projection ne peut rien produire : on le dit
  // ici plutot que de laisser le simulateur afficher des cartes vides.
  const missingInputs = averageSellingPrice <= 0;

  return (
    <DashboardLayout>
      <TopBar
        title="Simulateur investisseur"
        subtitle="Ce que produirait une injection de capital publicitaire"
      />

      {missingInputs ? (
        <PageSection>
          <AlertBanner tone="warning" title="Renseigner d abord les charges">
            Le prix de vente moyen par bouteille n est pas saisi. Le simulateur a besoin de cette
            hypothese, ainsi que des charges fixes et variables, pour projeter quoi que ce soit. Tout se
            renseigne sur la page <strong>Charges &amp; break-even</strong>.
          </AlertBanner>
        </PageSection>
      ) : null}

      {/* Point de depart : ce sur quoi la projection s appuie */}
      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: colors.text }}>
            Point de depart de la projection
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              fontSize: 12.5,
              color: colors.textSecondary,
              lineHeight: 1.7,
            }}
          >
            <span>
              Publicite actuelle :{' '}
              <strong>{formatEuro(actuals?.monthlyAdSpend ?? 0)}</strong> / mois
            </span>
            <span>
              Chiffre d affaires actuel :{' '}
              <strong>{formatEuro(actuals?.monthlyRevenue ?? 0)}</strong> / mois
            </span>
            <span>
              Charges fixes saisies : <strong>{formatEuro(fixedMonthlyCosts)}</strong> / mois
            </span>
            <span>
              Cout variable : <strong>{formatEuro(variableCostPerBottle)}</strong> / bouteille
            </span>
            <span>
              Prix de vente moyen :{' '}
              <strong>{averageSellingPrice > 0 ? formatEuro(averageSellingPrice) : 'non renseigne'}</strong>
            </span>
            <span>
              Volume actuel :{' '}
              <strong>{formatNumber(actuals?.monthlyBottlesSold ?? 0)}</strong> bouteilles / mois
            </span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.textMuted }}>
            Les grandeurs mesurees sont normalisees sur 30 jours a partir de la periode selectionnee
            {actuals ? ` (${formatNumber(actuals.periodDays)} jours)` : ''}. Les charges viennent de la
            page Charges &amp; break-even.
          </p>
        </Card>
      </PageSection>

      <InvestorSimulator
        baseline={{
          monthlyAdSpend: actuals?.monthlyAdSpend ?? 0,
          monthlyRevenue: actuals?.monthlyRevenue ?? 0,
          averageSellingPrice,
          variableCostPerBottle,
          fixedMonthlyCosts,
        }}
      />
    </DashboardLayout>
  );
}
