'use client';

import { useEffect, useState } from 'react';
import { Card, DataTable, StatusBadge, colors, radius, type DataTableColumn } from '@/components/ui';
import { formatDate, formatEuro, formatNumber } from '@/lib/format';
import type { CustomerDetailedRatings, CustomerWineRecommendation, CustomerWineRating, CustomerWineReplacement } from '@/lib/db/types';

/**
 * Vue maitre-detail des etapes 5 et 6 : la liste des clients a gauche, le
 * detail de ses bouteilles a droite.
 *
 * Les deux etapes posaient la meme question sans pouvoir y repondre : "ce
 * client a trois bouteilles non notees, lesquelles ?". La liste seule ne le dit
 * pas, et ouvrir une page par client casserait le rythme de lecture du matin.
 * Le detail est donc charge a la demande via `/api/customers/ratings`, sans
 * rechargement : les agregats de la page, eux, sont lourds a recalculer.
 *
 * La mise en page 60 / 40 est obtenue par `flex-wrap` plutot que par une media
 * query : sous la largeur ou les deux panneaux ne tiennent plus cote a cote,
 * ils passent l un sous l autre en pleine largeur, sans point de rupture a
 * maintenir dans une feuille de style separee.
 */

type SplitViewRow = Record<string, unknown>;

export function CustomerRatingsSplitView<T extends SplitViewRow>({
  columns,
  rows,
  /** Colonne portant l identifiant du client (email, ou id a defaut). */
  identifierKey,
  initialSortKey,
  initialSortDirection = 'asc',
  searchPlaceholder = 'Filtrer un client...',
  emptyMessage,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  identifierKey: keyof T & string;
  initialSortKey?: keyof T & string;
  initialSortDirection?: 'asc' | 'desc';
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      {/* 60 % : la liste de relance, qui reste le point d entree */}
      <div style={{ flex: '6 1 460px', minWidth: 0 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={columns}
            rows={rows}
            initialSortKey={initialSortKey}
            initialSortDirection={initialSortDirection}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            getRowKey={(row) => String(row[identifierKey] ?? '')}
            selectedRowKey={selectedCustomerEmail ?? undefined}
            onRowClick={(row) => {
              const identifier = String(row[identifierKey] ?? '');
              // Un second clic sur la ligne deja ouverte referme le detail.
              setSelectedCustomerEmail((current) => (current === identifier ? null : identifier));
            }}
            maxHeight={620}
          />
        </Card>
      </div>

      {/* 40 % : le detail du client selectionne.
          Le panneau est remonte a chaque changement de client (`key`) plutot
          que remis a zero dans un effet : son etat initial est alors deja
          "chargement", et l effet n a plus qu a poser la reponse. */}
      <div style={{ flex: '4 1 340px', minWidth: 0 }}>
        {selectedCustomerEmail ? (
          <CustomerWinesPanel key={selectedCustomerEmail} email={selectedCustomerEmail} />
        ) : (
          <EmptySelectionPanel />
        )}
      </div>
    </div>
  );
}

/** Etat initial de la page : aucun client selectionne. */
function EmptySelectionPanel() {
  return (
    <Card
      style={{
        background: colors.surfaceMuted,
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
        Selectionnez un client dans la liste pour voir ses notes de vins.
      </p>
    </Card>
  );
}

type PanelState =
  | { status: 'loading' }
  | { status: 'ready'; detail: CustomerDetailedRatings }
  | { status: 'error'; reason: string };

/** Panneau de droite : resume du client puis tableau de ses vins. */
function CustomerWinesPanel({ email }: { email: string }) {
  const [state, setState] = useState<PanelState>({ status: 'loading' });
  const [selectedWine, setSelectedWine] = useState<CustomerWineRating | null>(null);
  const [recommendations, setRecommendations] = useState<
    | { status: 'idle' }
    | { status: 'loading'; wine: CustomerWineRating }
    | { status: 'ready'; wine: CustomerWineRating; items: CustomerWineRecommendation[] }
    | { status: 'empty'; wine: CustomerWineRating; reason: string }
  >({ status: 'idle' });
  const [replacements, setReplacements] = useState<
    | { status: 'idle' }
    | { status: 'loading'; wine: CustomerWineRating }
    | { status: 'ready'; wine: CustomerWineRating; items: CustomerWineReplacement[] }
    | { status: 'empty'; wine: CustomerWineRating }
  >({ status: 'idle' });

  useEffect(() => {
    // Un clic rapide sur plusieurs clients ne doit pas laisser une reponse
    // tardive s afficher sous le nom du client suivant.
    const controller = new AbortController();

    fetch(`/api/customers/ratings?email=${encodeURIComponent(email)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as
          | { ok: true; detail: CustomerDetailedRatings }
          | { ok: false; reason: string };

        if (!body.ok) {
          setState({ status: 'error', reason: body.reason });
          return;
        }

        setState({ status: 'ready', detail: body.detail });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', reason: 'connection-failed' });
      });

    return () => controller.abort();
  }, [email]);

  useEffect(() => {
    if (!selectedWine) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ email, productId: selectedWine.productId });
    fetch(`/api/customers/recommendations?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as
          | { ok: true; recommendations: CustomerWineRecommendation[] }
          | { ok: false; reason: string };

        if (!body.ok) {
          setRecommendations({ status: 'empty', wine: selectedWine, reason: body.reason });
          return;
        }

        setRecommendations({ status: 'ready', wine: selectedWine, items: body.recommendations });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRecommendations({ status: 'empty', wine: selectedWine, reason: 'connection-failed' });
      });

    return () => controller.abort();
  }, [email, selectedWine]);

  useEffect(() => {
    if (!selectedWine || selectedWine.ratingLabel !== 'Dislike') return;
    const controller = new AbortController();
    const query = new URLSearchParams({ email, productId: selectedWine.productId });
    fetch(`/api/customers/replacements?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as
          | { ok: true; replacements: CustomerWineReplacement[] }
          | { ok: false; reason: string };
        if (!body.ok || body.replacements.length === 0) {
          setReplacements({ status: 'empty', wine: selectedWine });
          return;
        }
        setReplacements({ status: 'ready', wine: selectedWine, items: body.replacements });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setReplacements({ status: 'empty', wine: selectedWine });
      });
    return () => controller.abort();
  }, [email, selectedWine]);

  if (state.status === 'loading') {
    return (
      <Card style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>Chargement des notes de {email}...</p>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card style={{ minHeight: 200 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.critical }}>Detail indisponible</p>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
          {state.reason === 'missing-url'
            ? 'DATABASE_URL n est pas configure.'
            : state.reason === 'unknown-customer'
              ? 'Aucun client ne correspond a cet identifiant.'
              : 'La lecture des bouteilles de ce client a echoue.'}
        </p>
      </Card>
    );
  }

  const { detail } = state;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border}` }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: colors.text, wordBreak: 'break-all' }}>
          {detail.email ?? detail.identifier}
        </p>
        {/* Un client sans compte VinPop n a pas d email : le dire evite de
            croire a une donnee manquante alors que c est le modele. */}
        {!detail.email ? (
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: colors.textMuted }}>
            Client sans compte VinPop — identifie par sa cle Shopify {detail.customerKey}.
          </p>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <SummaryChip label="Bouteilles recues" value={detail.bottlesReceived} />
          <SummaryChip label="Notees" value={detail.bottlesRated} tone="good" />
          <SummaryChip
            label="Restantes"
            value={detail.bottlesRemaining}
            tone={detail.bottlesRemaining > 0 ? 'warning' : 'good'}
          />
        </div>
      </div>

      {detail.wines.length === 0 ? (
        <p style={{ margin: 0, padding: '18px', fontSize: 12.5, color: colors.textMuted, textAlign: 'center' }}>
          Aucune bouteille rattachee a ce client.
        </p>
      ) : (
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: colors.surfaceMuted, color: colors.textSecondary, textAlign: 'left' }}>
                <th style={headerStyle}>Vin</th>
                <th style={headerStyle}>Appellation / profil labo</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Prix</th>
                <th style={headerStyle}>Note</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {detail.wines.map((wine) => (
                <WineRow
                  key={wine.productId || wine.wineName}
                  wine={wine}
                  selected={selectedWine?.productId === wine.productId}
                  onSelect={() => setSelectedWine(wine)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedWine ? (
        <RecommendationsPanel
          state={
            recommendations.status === 'idle' || recommendations.wine.productId !== selectedWine.productId
              ? { status: 'loading', wine: selectedWine }
              : recommendations
          }
        />
      ) : null}
      {selectedWine?.ratingLabel === 'Dislike' ? (
        <ReplacementPanel
          state={
            replacements.status === 'idle' || replacements.wine.productId !== selectedWine.productId
              ? { status: 'loading', wine: selectedWine }
              : replacements
          }
        />
      ) : null}
    </Card>
  );
}

const headerStyle: React.CSSProperties = {
  padding: '9px 14px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: colors.surfaceMuted,
  zIndex: 1,
};

const cellStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: colors.textSecondary,
  verticalAlign: 'top',
};

const recommendationHeaderStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

/** Une bouteille : nom, profil labo, note et date de la note. */
function WineRow({
  wine,
  selected,
  onSelect,
}: {
  wine: CustomerWineRating;
  selected: boolean;
  onSelect: () => void;
}) {
  // Le profil labo n est pas renseigne pour tous les vins : region, millesime
  // et astringence sont assembles a partir de ce qui existe reellement.
  const profile = [
    wine.colour,
    wine.vintage,
    wine.astringencyIndex !== null ? `astringence ${formatNumber(wine.astringencyIndex, 2)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <tr
      onClick={onSelect}
      style={{
        borderTop: `1px solid ${colors.border}`,
        background: selected ? colors.surfaceMuted : colors.surface,
        cursor: 'pointer',
      }}
    >
      <td style={{ ...cellStyle, color: colors.text, fontWeight: 700 }}>
        {wine.productUrl ? (
          <a
            href={wine.productUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onSelect}
            style={{ color: colors.text, textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            {wine.wineName}
          </a>
        ) : (
          wine.wineName
        )}
        {wine.quantity > 1 ? (
          <span style={{ marginLeft: 6, fontWeight: 400, color: colors.textMuted }}>x{formatNumber(wine.quantity)}</span>
        ) : null}
        {/* Une note sans ligne de commande signale un rapprochement incomplet,
            pas une erreur du client : elle reste visible et etiquetee. */}
        {!wine.purchased ? (
          <span style={{ display: 'block', fontWeight: 400, fontSize: 11, color: colors.warning, marginTop: 2 }}>
            Notee sans commande correspondante
          </span>
        ) : null}
      </td>
      <td style={cellStyle}>
        {wine.appellation ?? 'Appellation inconnue'}
        {profile ? (
          <span style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{profile}</span>
        ) : null}
      </td>
      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatEuro(wine.price)}</td>
      <td style={cellStyle}>
        <RatingBadge label={wine.ratingLabel} />
      </td>
      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {wine.ratingDate ? formatDate(wine.ratingDate) : '-'}
      </td>
    </tr>
  );
}

function RecommendationsPanel({
  state,
}: {
  state:
    | { status: 'loading'; wine: CustomerWineRating }
    | { status: 'ready'; wine: CustomerWineRating; items: CustomerWineRecommendation[] }
    | { status: 'empty'; wine: CustomerWineRating; reason: string };
}) {
  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, padding: '14px 18px 18px' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>Vins similaires en stock</p>
      <p style={{ margin: '4px 0 12px', fontSize: 11.5, color: colors.textMuted, lineHeight: 1.5 }}>
        Le score mesure la proximite avec le vin de la colonne Base : 90 % signifie que le vin est tres proche de cette base.
      </p>

      {state.status === 'loading' ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.textMuted }}>Recherche des vins similaires...</p>
      ) : state.status === 'empty' ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.textMuted }}>
          {state.reason === 'no-positive-ratings'
            ? 'Ce client n a pas encore note de vin Like ou Love.'
            : state.reason === 'no-in-stock-recommendations'
                ? 'Aucun vin similaire actif et en stock n a ete trouve pour ce vin.'
                : 'Les recommandations sont momentanement indisponibles.'}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: colors.surfaceMuted, color: colors.textSecondary, textAlign: 'left' }}>
              <th style={recommendationHeaderStyle}>Vin disponible</th>
              <th style={{ ...recommendationHeaderStyle, textAlign: 'right' }}>Prix</th>
              <th style={{ ...recommendationHeaderStyle, textAlign: 'right' }}>Proximite</th>
              <th style={recommendationHeaderStyle}>Compare a</th>
              <th style={{ ...recommendationHeaderStyle, textAlign: 'right' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((recommendation) => (
              <tr key={recommendation.productId} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ ...cellStyle, color: colors.text, fontWeight: 700 }}>
                  {recommendation.productUrl ? (
                    <a
                      href={recommendation.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: colors.text, textDecoration: 'underline', textUnderlineOffset: 2 }}
                    >
                      {recommendation.wineName}
                    </a>
                  ) : (
                    recommendation.wineName
                  )}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatEuro(recommendation.price)}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap', color: colors.good, fontWeight: 700 }}>
                  {formatNumber(recommendation.score, 1)}%
                </td>
                <td style={cellStyle}>{recommendation.basedOnWineName}</td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatNumber(recommendation.inventory)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReplacementPanel({
  state,
}: {
  state:
    | { status: 'loading'; wine: CustomerWineRating }
    | { status: 'ready'; wine: CustomerWineRating; items: CustomerWineReplacement[] }
    | { status: 'empty'; wine: CustomerWineRating };
}) {
  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, padding: '14px 18px 18px', background: '#FFF9F0' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>Remplacement satisfait ou rembourse</p>
      <p style={{ margin: '4px 0 12px', fontSize: 11.5, color: colors.textMuted, lineHeight: 1.5 }}>
        Meme couleur que le vin refuse, proche des vins aimes et suffisamment eloigne du vin Dislike.
      </p>
      {state.status === 'loading' ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.textMuted }}>Recherche des remplacements...</p>
      ) : state.status === 'empty' ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.textMuted }}>Aucun remplacement actif et en stock trouve pour cette couleur.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: colors.textSecondary, textAlign: 'left' }}>
              <th style={recommendationHeaderStyle}>Vin de remplacement</th>
              <th style={{ ...recommendationHeaderStyle, textAlign: 'right' }}>Prix</th>
              <th style={{ ...recommendationHeaderStyle, textAlign: 'right' }}>Compatibilite</th>
              <th style={recommendationHeaderStyle}>Base aimee</th>
              <th style={{ ...recommendationHeaderStyle, textAlign: 'right' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((replacement) => (
              <tr key={replacement.productId} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ ...cellStyle, color: colors.text, fontWeight: 700 }}>
                  {replacement.productUrl ? (
                    <a href={replacement.productUrl} target="_blank" rel="noreferrer" style={{ color: colors.text, textDecoration: 'underline' }}>
                      {replacement.wineName}
                    </a>
                  ) : replacement.wineName}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatEuro(replacement.price)}</td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap', color: colors.good, fontWeight: 700 }}>
                  {formatNumber(replacement.score, 1)}%
                </td>
                <td style={cellStyle}>{replacement.likedWineName}</td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(replacement.inventory)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Love / Like / Dislike en couleurs, et l attente de note en gris. */
function RatingBadge({ label }: { label: CustomerWineRating['ratingLabel'] }) {
  if (label === 'Love') return <StatusBadge status="good" label="Love" />;
  if (label === 'Like') return <StatusBadge status="info" label="Like" />;
  if (label === 'Dislike') return <StatusBadge status="critical" label="Dislike" />;
  return <StatusBadge status="neutral" label="A noter" />;
}

/** Compteur du bandeau de resume, au-dessus du tableau des vins. */
function SummaryChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'good' | 'warning';
}) {
  const color = tone === 'good' ? colors.good : tone === 'warning' ? colors.warning : colors.text;
  const background = tone === 'good' ? colors.goodSurface : tone === 'warning' ? colors.warningSurface : colors.surfaceMuted;

  return (
    <div style={{ padding: '7px 11px', borderRadius: radius.md, background, minWidth: 92 }}>
      <div style={{ fontSize: 10.5, color: colors.textSecondary, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 1 }}>{formatNumber(value)}</div>
    </div>
  );
}
