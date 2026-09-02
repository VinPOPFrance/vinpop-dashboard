import { ClarityButtons } from './ClarityButtons';
import { StatusBadge, colors } from '@/components/ui';
import type { ClarityLinks } from '@/lib/clarity';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

/**
 * Tableau des fiches produit de l etape 4.
 *
 * Comme pour l etape 1, chaque ligne porte des boutons Clarity : `DataTable`
 * n affiche que des valeurs scalaires. Rendu cote serveur, aucune interaction
 * hors liens.
 */

export type ProductTableRow = {
  productId: string;
  itemName: string;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  itemRevenue: number;
  shopifyQuantitySold: number | null;
  cartToViewRate: number | null;
  purchaseToViewRate: number | null;
  underperforming: boolean;
  /** null si CLARITY_PROJECT_ID manque ou si le handle Shopify est introuvable. */
  clarity: ClarityLinks | null;
};

const cellStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: colors.textSecondary,
  whiteSpace: 'nowrap',
};

const headerStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontWeight: 700,
  background: colors.surfaceMuted,
  color: colors.textSecondary,
  whiteSpace: 'nowrap',
};

export function ProductConversionTable({
  rows,
  conversionThreshold,
  viewsThreshold,
}: {
  rows: ProductTableRow[];
  /** Taux de conversion sous lequel une fiche a fort trafic est signalee. */
  conversionThreshold: number;
  /** Vues minimales pour qu une fiche soit jugee. */
  viewsThreshold: number;
}) {
  if (!rows.length) {
    return (
      <div style={{ padding: 18, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
        Aucune fiche produit vue sur la periode.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={headerStyle}>Produit</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Vues</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Ajouts panier</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Achats (GA4)</th>
            <th
              style={{ ...headerStyle, textAlign: 'right' }}
              title="Achats divises par vues, les deux mesures par GA4 sur la meme fenetre."
            >
              CVR
            </th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Panier / vue</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>CA (GA4)</th>
            <th
              style={{ ...headerStyle, textAlign: 'right' }}
              title="Quantite vendue selon Shopify. Controle de coherence : la synchronisation Shopify n a pas le meme rythme que GA4."
            >
              Vendus (Shopify)
            </th>
            <th style={headerStyle}>Etat</th>
            <th style={headerStyle}>Clarity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} style={{ borderTop: `1px solid ${colors.border}`, background: colors.surface }}>
              <td style={{ ...cellStyle, color: colors.text, fontWeight: 600, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.itemName}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatNumber(row.itemsViewed)}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatNumber(row.itemsAddedToCart)}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatNumber(row.itemsPurchased)}</td>
              <td
                style={{
                  ...cellStyle,
                  textAlign: 'right',
                  color: row.underperforming ? colors.warning : colors.textSecondary,
                  fontWeight: row.underperforming ? 700 : 400,
                }}
              >
                {formatPercent(row.purchaseToViewRate)}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatPercent(row.cartToViewRate)}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatEuro(row.itemRevenue)}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                {row.shopifyQuantitySold !== null ? formatNumber(row.shopifyQuantitySold) : '-'}
              </td>
              <td style={cellStyle}>
                {row.underperforming ? (
                  <StatusBadge status="warning" label="Ne convertit pas" />
                ) : row.itemsViewed < viewsThreshold ? (
                  <StatusBadge status="neutral" label="Trafic faible" />
                ) : (
                  <StatusBadge
                    status="good"
                    label={`CVR > ${conversionThreshold} %`}
                  />
                )}
              </td>
              <td style={cellStyle}>
                <ClarityButtons links={row.clarity} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
