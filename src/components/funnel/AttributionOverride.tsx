'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { colors, radius } from '@/components/ui';
import { formatDate, formatEuro } from '@/lib/format';
import type { ManualAttributionChannel } from '@/lib/db/types';

const CHANNEL_LABEL: Record<ManualAttributionChannel, string> = {
  meta: 'Meta',
  'google-ads': 'Google Ads',
  organic: 'Organique',
};

const CHANNEL_OPTIONS: ManualAttributionChannel[] = ['meta', 'google-ads', 'organic'];

export type UnattributedOrderRow = {
  orderId: string;
  orderName: string;
  createdAt: string | null;
  revenue: number;
  landingPath: string | null;
  currentOverride: ManualAttributionChannel | null;
};

/**
 * Ventes sans preuve dans l URL, avec un choix manuel du canal reel.
 *
 * Ce sont exactement les commandes qui gonflent le "Direct / inconnu" et
 * font passer, a tort, le cout par vente de Meta pour trop eleve : la vente a
 * bien ete generee par une publicite, l URL n en garde simplement pas la
 * trace. La correction est enregistree a part (`dashboard.order_channel_overrides`)
 * et rejoue au prochain chargement, elle ne modifie jamais la commande Shopify.
 */
export function UnattributedOrdersPanel({ orders }: { orders: UnattributedOrderRow[] }) {
  if (orders.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px 100px 1fr 260px',
          gap: 8,
          fontSize: 11,
          color: colors.textSecondary,
          padding: '0 4px',
        }}
      >
        <span>Commande</span>
        <span>Date</span>
        <span>Montant</span>
        <span>Page d arrivee</span>
        <span>Cocher le canal reel</span>
      </div>
      {orders.map((order) => (
        <OrderOverrideRow key={order.orderId} order={order} />
      ))}
    </div>
  );
}

function OrderOverrideRow({ order }: { order: UnattributedOrderRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(channel: ManualAttributionChannel) {
    // Recliquer la case deja cochee decoche : on revient au classement automatique.
    const next = order.currentOverride === channel ? '' : channel;
    setSaving(true);
    setError(null);
    try {
      if (next === '') {
        const response = await fetch(`/api/orders/attribution?orderId=${encodeURIComponent(order.orderId)}`, {
          method: 'DELETE',
        });
        const result = (await response.json()) as { ok?: boolean };
        if (!result.ok) throw new Error('delete-failed');
      } else {
        const response = await fetch('/api/orders/attribution', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.orderId, channel: next }),
        });
        const result = (await response.json()) as { ok?: boolean };
        if (!result.ok) throw new Error('save-failed');
      }
      router.refresh();
    } catch {
      setError('Echec de l enregistrement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 1fr 260px',
        gap: 8,
        alignItems: 'center',
        padding: '8px 4px',
        borderTop: `1px solid ${colors.border}`,
        fontSize: 12.5,
      }}
    >
      <span style={{ fontWeight: 600, color: colors.text }}>{order.orderName}</span>
      <span style={{ color: colors.textSecondary }}>{order.createdAt ? formatDate(order.createdAt) : '-'}</span>
      <span style={{ color: colors.textSecondary }}>{formatEuro(order.revenue)}</span>
      <span style={{ color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.landingPath || '-'}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {CHANNEL_OPTIONS.map((channel) => {
          const checked = order.currentOverride === channel;
          return (
            <label
              key={channel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: radius.sm,
                border: `1px solid ${checked ? colors.brand : colors.border}`,
                background: checked ? colors.brand : colors.surface,
                color: checked ? '#fff' : colors.text,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={saving}
                onChange={() => apply(channel)}
                style={{ margin: 0 }}
              />
              {CHANNEL_LABEL[channel]}
            </label>
          );
        })}
        {error ? <span style={{ color: colors.critical, fontSize: 11 }}>{error}</span> : null}
      </span>
    </div>
  );
}
