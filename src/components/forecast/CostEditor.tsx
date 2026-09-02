'use client';

import { useMemo, useState } from 'react';
import { Card, PageSection, Section, StatCard, StatGrid, StatusBadge, colors, radius } from '@/components/ui';
import { calculateBreakEven, type CostItem } from '@/lib/forecast/breakEven';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

/**
 * Formulaire de saisie des charges, avec recalcul immediat.
 *
 * Les montants sont tenus en etat local et le point d equilibre est recalcule a
 * chaque frappe par `calculateBreakEven` — la meme fonction que celle utilisee
 * cote serveur. L utilisateur voit donc l effet de sa saisie sans attendre le
 * reseau ; l enregistrement, lui, part explicitement au clic sur Enregistrer.
 * Saisir et enregistrer sont deux gestes distincts : on peut explorer plusieurs
 * hypotheses sans rien ecrire en base.
 */

export type AssumptionItem = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

/** Grandeurs mesurees, injectees par le serveur. */
export type ActualsInput = {
  monthlyAdSpend: number;
  monthlyRevenue: number;
  monthlyBottlesSold: number;
  observedAveragePrice: number | null;
  periodLabel: string;
  periodDays: number;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const PRICE_KEY = 'average_selling_price_per_bottle';

export function CostEditor({
  initialFixedCosts,
  initialVariableCosts,
  initialAssumptions,
  actuals,
}: {
  initialFixedCosts: CostItem[];
  initialVariableCosts: CostItem[];
  initialAssumptions: AssumptionItem[];
  actuals: ActualsInput;
}) {
  const [fixedCosts, setFixedCosts] = useState(initialFixedCosts);
  const [variableCosts, setVariableCosts] = useState(initialVariableCosts);
  const [assumptions, setAssumptions] = useState(initialAssumptions);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const sellingPrice = assumptions.find((item) => item.key === PRICE_KEY)?.value ?? 0;

  const result = useMemo(
    () =>
      calculateBreakEven({
        fixedCosts,
        variableCosts,
        averageSellingPrice: sellingPrice,
        monthlyAdSpend: actuals.monthlyAdSpend,
        monthlyRevenue: actuals.monthlyRevenue,
        monthlyBottlesSold: actuals.monthlyBottlesSold,
      }),
    [fixedCosts, variableCosts, sellingPrice, actuals],
  );

  function updateCost(kind: 'fixed' | 'variable', id: number, raw: string) {
    // Un champ vide vaut zero : sinon la carte afficherait NaN pendant la saisie.
    const amount = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return;

    const apply = (items: CostItem[]) =>
      items.map((item) => (item.id === id ? { ...item, amount } : item));

    if (kind === 'fixed') setFixedCosts(apply);
    else setVariableCosts(apply);
    setSaveState('idle');
  }

  function updateAssumption(key: string, raw: string) {
    const value = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(value) || value < 0) return;

    setAssumptions((items) => items.map((item) => (item.key === key ? { ...item, value } : item)));
    setSaveState('idle');
  }

  async function save() {
    setSaveState('saving');
    setSaveError(null);

    try {
      const response = await fetch('/api/forecast/costs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costs: [...fixedCosts, ...variableCosts].map((item) => ({ id: item.id, amount: item.amount })),
          assumptions: assumptions.map((item) => ({ key: item.key, value: item.value })),
        }),
      });

      const json = (await response.json()) as { ok: boolean; reason?: string };
      if (!json.ok) {
        setSaveState('error');
        setSaveError(json.reason ?? 'unknown');
        return;
      }

      setSaveState('saved');
    } catch {
      setSaveState('error');
      setSaveError('network');
    }
  }

  return (
    <>
      <PageSection>
        <StatGrid>
          <StatCard
            label="Marge sur cout variable"
            value={formatEuro(result.contributionMargin)}
            tone={result.contributionMargin > 0 ? 'good' : 'critical'}
            hint={
              result.contributionMarginRate !== null
                ? `${formatPercent(result.contributionMarginRate)} du prix de vente`
                : 'Renseigner le prix de vente'
            }
          />
          <StatCard
            label="Bouteilles a vendre par mois"
            value={result.breakEvenBottles !== null ? formatNumber(result.breakEvenBottles) : 'Non calculable'}
            tone={result.breakEvenBottles !== null ? 'default' : 'warning'}
            hint="Volume mensuel pour couvrir toutes les charges"
          />
          <StatCard
            label="Chiffre d affaires d equilibre"
            value={result.breakEvenRevenue !== null ? formatEuro(result.breakEvenRevenue) : 'Non calculable'}
            hint="CA mensuel minimum"
          />
          <StatCard
            label="Charges mensuelles totales"
            value={formatEuro(result.totalMonthlyCharges)}
            hint={`Dont ${formatEuro(actuals.monthlyAdSpend)} de publicite`}
          />
          <StatCard
            label="Marge nette estimee"
            value={formatEuro(result.netMargin)}
            tone={result.profitable ? 'good' : 'critical'}
            hint={
              result.netMarginRate !== null
                ? `${formatPercent(result.netMarginRate)} du chiffre d affaires`
                : 'Au volume mensuel actuel'
            }
            badge={
              <StatusBadge
                status={result.profitable ? 'good' : 'critical'}
                label={result.profitable ? 'Rentable' : 'Deficitaire'}
              />
            }
          />
          <StatCard
            label="Ecart au point d equilibre"
            value={
              result.bottlesToBreakEven !== null
                ? `${result.bottlesToBreakEven > 0 ? '+' : ''}${formatNumber(result.bottlesToBreakEven)} bouteilles`
                : 'Non calculable'
            }
            tone={
              result.bottlesToBreakEven !== null && result.bottlesToBreakEven <= 0 ? 'good' : 'warning'
            }
            hint={`Volume actuel : ${formatNumber(actuals.monthlyBottlesSold)} bouteilles / mois`}
          />
        </StatGrid>
      </PageSection>

      {result.blockers.length > 0 ? (
        <PageSection>
          <Card style={{ borderLeft: `3px solid ${colors.warning}` }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: colors.warning }}>
              Point d equilibre non calculable
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.7 }}>
              {result.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </Card>
        </PageSection>
      ) : null}

      <Section
        title="Hypotheses"
        sub="Le prix de vente moyen determine la marge sur cout variable, donc tout le modele."
        bare
      >
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {assumptions.map((item) => (
              <NumberField
                key={item.key}
                label={item.label}
                value={item.value}
                suffix={item.unit === 'eur' ? '€' : item.unit === 'bottles' ? 'bouteilles' : item.unit}
                hint={
                  item.key === PRICE_KEY && actuals.observedAveragePrice !== null
                    ? `Observe sur la periode : ${formatEuro(actuals.observedAveragePrice)}`
                    : undefined
                }
                onChange={(raw) => updateAssumption(item.key, raw)}
              />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Charges fixes mensuelles" sub="Independantes du volume vendu." bare>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {fixedCosts.map((item) => (
              <NumberField
                key={item.id}
                label={item.label}
                value={item.amount}
                suffix="€ / mois"
                onChange={(raw) => updateCost('fixed', item.id, raw)}
              />
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: colors.textSecondary }}>
            Total des charges fixes saisies : <strong>{formatEuro(result.totalFixedCosts)}</strong> par mois.
            La publicite ({formatEuro(actuals.monthlyAdSpend)}) s y ajoute automatiquement.
          </p>
        </Card>
      </Section>

      <Section title="Charges variables par bouteille" sub="Proportionnelles au volume vendu." bare>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {variableCosts.map((item) => (
              <NumberField
                key={item.id}
                label={item.label}
                value={item.amount}
                suffix="€ / bouteille"
                onChange={(raw) => updateCost('variable', item.id, raw)}
              />
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: colors.textSecondary }}>
            Cout variable total : <strong>{formatEuro(result.variableCostPerBottle)}</strong> par bouteille.
          </p>
        </Card>
      </Section>

      <PageSection>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={save}
              disabled={saveState === 'saving'}
              style={{
                padding: '10px 20px',
                borderRadius: radius.md,
                border: 'none',
                background: colors.brand,
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: saveState === 'saving' ? 'wait' : 'pointer',
                opacity: saveState === 'saving' ? 0.7 : 1,
              }}
            >
              {saveState === 'saving' ? 'Enregistrement...' : 'Enregistrer les charges'}
            </button>

            {saveState === 'saved' ? <StatusBadge status="good" label="Enregistre" /> : null}
            {saveState === 'error' ? (
              <StatusBadge status="critical" label={`Echec : ${saveError ?? 'inconnu'}`} />
            ) : null}

            <span style={{ fontSize: 12, color: colors.textMuted }}>
              Les chiffres ci-dessus se recalculent a chaque frappe. L enregistrement les rend
              persistants et visibles au prochain chargement.
            </span>
          </div>
        </Card>
      </PageSection>
    </>
  );
}

/** Champ numerique avec libelle, suffixe d unite et aide facultative. */
function NumberField({
  label,
  value,
  suffix,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  hint?: string;
  onChange: (raw: string) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value === 0 ? '' : String(value)}
          placeholder="0"
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: '100%',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: '9px 10px',
            fontSize: 14,
            color: colors.text,
            background: colors.surfaceInput,
          }}
        />
        <span style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' }}>{suffix}</span>
      </span>
      {hint ? (
        <span style={{ display: 'block', fontSize: 11.5, color: colors.textMuted, marginTop: 4 }}>{hint}</span>
      ) : null}
    </label>
  );
}
