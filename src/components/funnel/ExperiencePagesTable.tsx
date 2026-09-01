import { StatusBadge, colors, radius } from '@/components/ui';
import type { ClarityLinks } from '@/lib/clarity';
import { formatNumber } from '@/lib/format';

/**
 * Tableau des pages de l etape 1.
 *
 * `DataTable` ne sait afficher que des valeurs scalaires ; cette vue a besoin
 * de boutons par ligne (heatmap et enregistrements Clarity). D ou un tableau
 * dedie, rendu cote serveur : il n y a aucune interaction a gerer, seulement
 * des liens.
 */

export type ExperiencePageRow = {
  pagePath: string;
  screenPageViews: number;
  totalUsers: number;
  engagementSecondsPerView: number | null;
  eventsPerView: number | null;
  lowEngagement: boolean;
  /** null quand CLARITY_PROJECT_ID n est pas configure. */
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

/** Petit lien-bouton vers la console Clarity. */
function ClarityButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: radius.sm,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        color: colors.brand,
        fontSize: 11,
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      {label}
    </a>
  );
}

export function ExperiencePagesTable({
  rows,
  engagementThresholdSeconds,
}: {
  rows: ExperiencePageRow[];
  /** Seuil sous lequel une page est signalee comme traversee. */
  engagementThresholdSeconds: number;
}) {
  if (!rows.length) {
    return (
      <div style={{ padding: 18, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
        Aucune page vue sur la periode.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={headerStyle}>Page</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Vues</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Utilisateurs</th>
            <th
              style={{ ...headerStyle, textAlign: 'right' }}
              title={`Secondes d engagement par vue. Sous ${engagementThresholdSeconds} s, la page est traversee sans etre lue.`}
            >
              Engagement / vue
            </th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Evenements / vue</th>
            <th style={headerStyle}>Etat</th>
            <th style={headerStyle}>Clarity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.pagePath} style={{ borderTop: `1px solid ${colors.border}`, background: colors.surface }}>
              <td style={{ ...cellStyle, color: colors.text, fontWeight: 600, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.pagePath}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatNumber(row.screenPageViews)}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatNumber(row.totalUsers)}</td>
              <td
                style={{
                  ...cellStyle,
                  textAlign: 'right',
                  color: row.lowEngagement ? colors.warning : colors.textSecondary,
                  fontWeight: row.lowEngagement ? 700 : 400,
                }}
              >
                {row.engagementSecondsPerView !== null ? `${formatNumber(row.engagementSecondsPerView, 1)} s` : '-'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                {row.eventsPerView !== null ? formatNumber(row.eventsPerView, 2) : '-'}
              </td>
              <td style={cellStyle}>
                {row.lowEngagement ? (
                  <StatusBadge status="warning" label="Traversee" />
                ) : (
                  <StatusBadge status="good" label="Lue" />
                )}
              </td>
              <td style={cellStyle}>
                {row.clarity ? (
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <ClarityButton href={row.clarity.heatmap} label="Heatmap" />
                    <ClarityButton href={row.clarity.recordings} label="Sessions" />
                  </span>
                ) : (
                  <span style={{ color: colors.textMuted, fontSize: 11 }}>non configure</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
