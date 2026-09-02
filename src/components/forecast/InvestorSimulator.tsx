'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertBanner,
  Card,
  ChartFrame,
  PageSection,
  Section,
  StatCard,
  StatGrid,
  colors,
  radius,
} from '@/components/ui';
import { milestones, observedRoas, projectInvestment } from '@/lib/forecast/projection';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

/**
 * Simulateur d injection de capital.
 *
 * Entierement client : les trois curseurs recalculent la projection complete a
 * chaque mouvement, sans aller-retour serveur, pour que le fondateur puisse
 * ajuster les hypotheses en direct devant un investisseur.
 *
 * Le calcul vient de `projectInvestment`, fonction pure partagee — aucune
 * formule n est reecrite ici.
 */

/** Grandeurs mesurees et charges saisies, injectees par le serveur. */
export type SimulatorBaseline = {
  monthlyAdSpend: number;
  monthlyRevenue: number;
  averageSellingPrice: number;
  variableCostPerBottle: number;
  fixedMonthlyCosts: number;
};

/**
 * Formateurs d info-bulle.
 *
 * Recharts type la valeur recue comme potentiellement indefinie : on l accepte
 * en `unknown` et on convertit, plutot que de forcer le type.
 */
const euroTooltip = (value: unknown) => formatEuro(Number(value));
const bottleTooltip = (value: unknown) => `${formatNumber(Number(value))} bouteilles`;

const HORIZON_MONTHS = 12;

/** Capacite logistique par defaut, au-dela de laquelle l entrepot ne suit plus. */
const DEFAULT_CAPACITY = 10000;

export function InvestorSimulator({ baseline }: { baseline: SimulatorBaseline }) {
  const [capital, setCapital] = useState(100000);
  const [deploymentMonths, setDeploymentMonths] = useState(6);
  const [targetRoas, setTargetRoas] = useState(2.5);
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);

  const historicalRoas = observedRoas(baseline.monthlyRevenue, baseline.monthlyAdSpend);

  const projection = useMemo(
    () =>
      projectInvestment({
        capital,
        deploymentMonths,
        targetRoas,
        baselineMonthlyAdSpend: baseline.monthlyAdSpend,
        baselineMonthlyRevenue: baseline.monthlyRevenue,
        averageSellingPrice: baseline.averageSellingPrice,
        variableCostPerBottle: baseline.variableCostPerBottle,
        fixedMonthlyCosts: baseline.fixedMonthlyCosts,
        horizonMonths: HORIZON_MONTHS,
        capacityBottlesPerMonth: capacity,
      }),
    [capital, deploymentMonths, targetRoas, capacity, baseline],
  );

  const keyMonths = milestones(projection);

  const chartData = projection.months.map((entry) => ({
    mois: `M${entry.month}`,
    'CA projete': Math.round(entry.revenue),
    'CA actuel': Math.round(entry.baselineRevenue),
    Bouteilles: Math.round(entry.bottles),
    'Marge nette': Math.round(entry.netMargin),
    'Marge cumulee': Math.round(entry.cumulativeNetMargin),
  }));

  if (projection.blockers.length > 0) {
    return (
      <>
        <Controls
          capital={capital}
          setCapital={setCapital}
          deploymentMonths={deploymentMonths}
          setDeploymentMonths={setDeploymentMonths}
          targetRoas={targetRoas}
          setTargetRoas={setTargetRoas}
          capacity={capacity}
          setCapacity={setCapacity}
          historicalRoas={historicalRoas}
        />
        <PageSection>
          <AlertBanner tone="warning" title="Projection non calculable">
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              {projection.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </AlertBanner>
        </PageSection>
      </>
    );
  }

  return (
    <>
      <Controls
        capital={capital}
        setCapital={setCapital}
        deploymentMonths={deploymentMonths}
        setDeploymentMonths={setDeploymentMonths}
        targetRoas={targetRoas}
        setTargetRoas={setTargetRoas}
        capacity={capacity}
        setCapacity={setCapacity}
        historicalRoas={historicalRoas}
      />

      {/* Ecart entre l hypothese et la realite mesuree : le point que tout
          investisseur serieux soulevera en premier. */}
      {historicalRoas !== null && targetRoas > historicalRoas * 2 ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`Le ROAS cible (${formatNumber(targetRoas, 2)}) est ${formatNumber(targetRoas / historicalRoas, 1)} fois superieur au ROAS historique (${formatNumber(historicalRoas, 2)})`}
          >
            Toute la projection repose sur cette hypothese. Elle suppose que les campagnes sont
            optimisees AVANT l injection : sans cela, injecter du capital ne fait qu accelerer la perte.
            C est l hypothese a defendre en priorite devant un investisseur.
          </AlertBanner>
        </PageSection>
      ) : null}

      {projection.firstOverCapacityMonth !== null ? (
        <PageSection>
          <AlertBanner
            tone="critical"
            title={`Capacite logistique depassee des le mois ${projection.firstOverCapacityMonth}`}
          >
            Le volume atteint {formatNumber(projection.peakMonthlyBottles)} bouteilles par mois au pic,
            au-dela des {formatNumber(capacity)} bouteilles declarees. Il faudra un entrepot plus grand :
            les charges fixes du modele doivent etre revues a la hausse avant de presenter ces chiffres.
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard
            label="Retour sur investissement"
            value={projection.roi !== null ? formatPercent(projection.roi) : 'Non calculable'}
            tone={projection.roi !== null && projection.roi > 0 ? 'good' : 'critical'}
            hint={`Marge cumulee sur ${HORIZON_MONTHS} mois rapportee au capital`}
          />
          <StatCard
            label="Mois du point d equilibre"
            value={projection.breakEvenMonth !== null ? `M${projection.breakEvenMonth}` : 'Jamais atteint'}
            tone={projection.breakEvenMonth !== null ? 'good' : 'critical'}
            hint="Premier mois a marge nette mensuelle positive"
          />
          <StatCard
            label="Remboursement du capital"
            value={projection.paybackMonth !== null ? `M${projection.paybackMonth}` : `Au-dela de ${HORIZON_MONTHS} mois`}
            tone={projection.paybackMonth !== null ? 'good' : 'warning'}
            hint="Mois ou la marge cumulee couvre l injection"
          />
          <StatCard
            label="CA cumule projete"
            value={formatEuro(projection.totalRevenue)}
            hint={`Scenario actuel : ${formatEuro(projection.baselineTotalRevenue)}`}
          />
          <StatCard
            label="Marge nette cumulee"
            value={formatEuro(projection.totalNetMargin)}
            tone={projection.totalNetMargin > 0 ? 'good' : 'critical'}
            hint={`Scenario actuel : ${formatEuro(projection.baselineTotalNetMargin)}`}
          />
          <StatCard
            label="Bouteilles a sourcer"
            value={formatNumber(projection.totalBottles)}
            hint={`Pic de ${formatNumber(projection.peakMonthlyBottles)} par mois`}
          />
        </StatGrid>
      </PageSection>

      <Section title="Jalons 3, 6 et 12 mois" sub="Les trois horizons attendus dans un dossier d investissement." bare>
        <StatGrid min={260}>
          {keyMonths.map((entry) => (
            <Card key={entry.month}>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                Mois {entry.month}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>
                {formatEuro(entry.revenue)}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 1.7 }}>
                {formatNumber(entry.bottles)} bouteilles · {formatEuro(entry.adSpend)} de publicite
                <br />
                Marge nette :{' '}
                <strong style={{ color: entry.netMargin > 0 ? colors.good : colors.critical }}>
                  {formatEuro(entry.netMargin)}
                </strong>
              </div>
            </Card>
          ))}
        </StatGrid>
      </Section>

      <PageSection>
        <ChartFrame
          title="Croissance du chiffre d affaires"
          sub="Scenario avec injection contre scenario actuel, sur 12 mois"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mois" stroke={colors.textMuted} fontSize={11} tickLine={false} />
              <YAxis stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={euroTooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="CA projete"
                stroke={colors.brand}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="CA actuel"
                stroke={colors.textMuted}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </PageSection>

      <PageSection>
        <ChartFrame
          title="Volume de bouteilles a sourcer"
          sub="Le dimensionnement logistique mois par mois"
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mois" stroke={colors.textMuted} fontSize={11} tickLine={false} />
              <YAxis stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={bottleTooltip} />
              {capacity > 0 ? (
                <ReferenceLine
                  y={capacity}
                  stroke={colors.critical}
                  strokeDasharray="5 3"
                  label={{ value: 'Capacite', fontSize: 11, fill: colors.critical, position: 'insideTopRight' }}
                />
              ) : null}
              <Bar dataKey="Bouteilles" fill={colors.brand} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </PageSection>

      <PageSection>
        <ChartFrame
          title="Marge nette mensuelle et cumulee"
          sub="La vallee de la mort marketing, puis le point de bascule"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mois" stroke={colors.textMuted} fontSize={11} tickLine={false} />
              <YAxis stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={euroTooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* Le zero est la ligne qui compte : au-dessus, le modele gagne de l argent. */}
              <ReferenceLine y={0} stroke={colors.text} strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="Marge cumulee"
                stroke={colors.info}
                fill={colors.infoSurface}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Marge nette"
                stroke={colors.brand}
                fill="transparent"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: colors.text }}>
            Hypotheses du modele
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.8 }}>
            <li>Le capital est depense lineairement sur la duree de deploiement choisie.</li>
            <li>
              Le chiffre d affaires d un mois vaut depense publicitaire x ROAS cible. Le ROAS optimise
              s applique a toute la depense, y compris la part actuelle : c est l hypothese optimiste.
            </li>
            <li>
              Aucun effet de trainee : le chiffre d affaires d un mois ne depend que de la depense de ce
              mois. Ni recurrence, ni LTV differee — le modele sous-estime donc un abonnement qui marche.
            </li>
            <li>Prix de vente et cout variable constants : aucune economie d echelle supposee.</li>
            <li>Les charges fixes ne bougent pas avec le volume, jusqu au seuil de capacite declare.</li>
          </ul>
        </Card>
      </PageSection>
    </>
  );
}

/** Les curseurs du simulateur. */
function Controls({
  capital,
  setCapital,
  deploymentMonths,
  setDeploymentMonths,
  targetRoas,
  setTargetRoas,
  capacity,
  setCapacity,
  historicalRoas,
}: {
  capital: number;
  setCapital: (value: number) => void;
  deploymentMonths: number;
  setDeploymentMonths: (value: number) => void;
  targetRoas: number;
  setTargetRoas: (value: number) => void;
  capacity: number;
  setCapacity: (value: number) => void;
  historicalRoas: number | null;
}) {
  return (
    <Section title="Hypotheses de simulation" sub="Ajuster les curseurs recalcule immediatement toute la projection." bare>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <SliderField
            label="Capital injecte"
            value={capital}
            min={0}
            max={500000}
            step={5000}
            onChange={setCapital}
            display={formatEuro(capital)}
          />
          <SliderField
            label="Duree de deploiement"
            value={deploymentMonths}
            min={1}
            max={24}
            step={1}
            onChange={setDeploymentMonths}
            display={`${deploymentMonths} mois`}
            hint={
              capital > 0
                ? `Budget publicitaire mensuel ajoute : ${formatEuro(capital / deploymentMonths)}`
                : undefined
            }
          />
          <SliderField
            label="ROAS cible"
            value={targetRoas}
            min={0.1}
            max={10}
            step={0.1}
            onChange={setTargetRoas}
            display={formatNumber(targetRoas, 2)}
            hint={
              historicalRoas !== null
                ? `ROAS historique mesure : ${formatNumber(historicalRoas, 2)}`
                : 'Aucune depense publicitaire mesuree'
            }
          />
          <SliderField
            label="Capacite logistique"
            value={capacity}
            min={0}
            max={50000}
            step={500}
            onChange={setCapacity}
            display={`${formatNumber(capacity)} bouteilles / mois`}
            hint="Au-dela, il faut un entrepot plus grand"
          />
        </div>
      </Card>
    </Section>
  );
}

/** Curseur avec valeur lisible et aide de calibrage. */
function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
  hint?: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: colors.textSecondary }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: colors.brand }}>{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: colors.brand, cursor: 'pointer' }}
      />
      <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          style={{
            width: 130,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            padding: '5px 8px',
            fontSize: 12,
            color: colors.text,
            background: colors.surfaceInput,
          }}
        />
        {hint ? <span style={{ fontSize: 11.5, color: colors.textMuted, textAlign: 'right' }}>{hint}</span> : null}
      </span>
    </label>
  );
}
