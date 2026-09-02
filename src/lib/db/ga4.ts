/**
 * Google Analytics 4 : acquisition, comportement sur le site, pages
 * d atterrissage et conversions.
 */

import 'server-only';
import { getPool, numberFromPg } from './client';
import { type SiteExperiencePage, type SiteExperienceResult, type SiteExperienceSource } from './types';
import { dateToGa4, type DateRange } from '@/lib/analytics/dateRanges';

export function ga4Bounds(range: DateRange) {
  return {
    start: dateToGa4(range.start),
    end: dateToGa4(range.end),
  };
}

const BOUNCE_ALERT_THRESHOLD = 60;

/**
 * Sous ce nombre de secondes d engagement par vue, une page est signalee.
 * Une page traversee sans lecture tourne autour de 1 a 3 secondes.
 */
const ENGAGEMENT_ALERT_SECONDS = 5;

/** Une source trop petite n a pas de taux de rebond interpretable. */
const MINIMUM_SESSIONS_FOR_BOUNCE = 5;

type TrafficSourceBounceRow = {
  session_source: string | null;
  session_medium: string | null;
  sessions: string | null;
  bounce_rate: string | null;
  screen_page_views: string | null;
  average_session_duration: string | null;
};

type PagePathRow = {
  page_path: string | null;
  screen_page_views: string | null;
  total_users: string | null;
  new_users: string | null;
  engagement_seconds_per_view: string | null;
  events_per_view: string | null;
};

/**
 * Etape 1 du funnel : experience et rebond sur le site.
 *
 * Deux mailles, deux tables, deux niveaux de certitude :
 *
 *  - `public.traffic_sources` porte un vrai `bounceRate` GA4, par couple
 *    source/medium. C est de la donnee GA4 native, pas un calcul maison.
 *  - `public.pages_path_report` ne contient ni sessions ni engagedSessions :
 *    GA4 n expose pas de taux de rebond par page dans cet entrepot. On y lit
 *    donc l engagement par vue, qui repond a la meme question ("la page
 *    est-elle lue ou traversee ?") sans se faire passer pour un rebond.
 */
export async function getSiteExperience(range: DateRange): Promise<SiteExperienceResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  const { start, end } = ga4Bounds(range);

  try {
    const pool = getPool(databaseUrl);

    const [sourcesResult, pagesResult] = await Promise.all([
      // Le taux de rebond global doit etre pondere par les sessions : faire une
      // moyenne des taux journaliers donnerait autant de poids a un jour a
      // 2 sessions qu a un jour a 200.
      pool.query<TrafficSourceBounceRow>(
        `SELECT
           "sessionSource" AS session_source,
           "sessionMedium" AS session_medium,
           SUM(sessions::numeric)::text AS sessions,
           (SUM("bounceRate"::numeric * sessions::numeric)
             / NULLIF(SUM(sessions::numeric), 0) * 100)::text AS bounce_rate,
           SUM("screenPageViews"::numeric)::text AS screen_page_views,
           (SUM("averageSessionDuration"::numeric * sessions::numeric)
             / NULLIF(SUM(sessions::numeric), 0))::text AS average_session_duration
         FROM public.traffic_sources
         WHERE date BETWEEN $1 AND $2
         GROUP BY 1, 2
         HAVING SUM(sessions::numeric) > 0
         ORDER BY SUM(sessions::numeric) DESC`,
        [start, end],
      ),
      pool.query<PagePathRow>(
        `SELECT
           "pagePath" AS page_path,
           SUM("screenPageViews"::numeric)::text AS screen_page_views,
           SUM("totalUsers"::numeric)::text AS total_users,
           SUM("newUsers"::numeric)::text AS new_users,
           (SUM("userEngagementDuration"::numeric)
             / NULLIF(SUM("screenPageViews"::numeric), 0))::text AS engagement_seconds_per_view,
           (SUM("eventCount"::numeric)
             / NULLIF(SUM("screenPageViews"::numeric), 0))::text AS events_per_view
         FROM public.pages_path_report
         WHERE date BETWEEN $1 AND $2
         GROUP BY 1
         HAVING SUM("screenPageViews"::numeric) > 0
         ORDER BY SUM("screenPageViews"::numeric) DESC
         LIMIT 100`,
        [start, end],
      ),
    ]);

    const sources: SiteExperienceSource[] = sourcesResult.rows.map((row) => {
      const sessions = numberFromPg(row.sessions);
      return {
        sourceMedium: `${row.session_source || '(non defini)'} / ${row.session_medium || '(non defini)'}`,
        sessions,
        // Sous le seuil de volume, le taux est trop bruite pour etre affiche.
        bounceRate: sessions >= MINIMUM_SESSIONS_FOR_BOUNCE ? numberFromPg(row.bounce_rate) : null,
        screenPageViews: numberFromPg(row.screen_page_views),
        averageSessionDuration: row.average_session_duration ? numberFromPg(row.average_session_duration) : null,
      };
    });

    const totalSessions = sources.reduce((sum, source) => sum + source.sessions, 0);
    const totalPageViews = sources.reduce((sum, source) => sum + source.screenPageViews, 0);

    // Rebond global : reponderation sur l ensemble des sources, y compris celles
    // trop petites pour etre affichees individuellement.
    const weightedBounce = sourcesResult.rows.reduce((sum, row) => {
      return sum + numberFromPg(row.bounce_rate) * numberFromPg(row.sessions);
    }, 0);
    const weightedDuration = sourcesResult.rows.reduce((sum, row) => {
      return sum + numberFromPg(row.average_session_duration) * numberFromPg(row.sessions);
    }, 0);

    const pages: SiteExperiencePage[] = pagesResult.rows.map((row) => {
      const engagementSecondsPerView = row.engagement_seconds_per_view
        ? numberFromPg(row.engagement_seconds_per_view)
        : null;

      return {
        pagePath: row.page_path || '(inconnu)',
        screenPageViews: numberFromPg(row.screen_page_views),
        totalUsers: numberFromPg(row.total_users),
        newUsers: numberFromPg(row.new_users),
        engagementSecondsPerView,
        eventsPerView: row.events_per_view ? numberFromPg(row.events_per_view) : null,
        lowEngagement:
          engagementSecondsPerView !== null && engagementSecondsPerView < ENGAGEMENT_ALERT_SECONDS,
      };
    });

    const highBounceSources = sources
      .filter((source) => source.bounceRate !== null && source.bounceRate > BOUNCE_ALERT_THRESHOLD)
      .sort((a, b) => b.sessions - a.sessions);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: totalSessions > 0,
        totalSessions,
        bounceRate: totalSessions > 0 ? weightedBounce / totalSessions : null,
        bounceAlertThreshold: BOUNCE_ALERT_THRESHOLD,
        totalPageViews,
        averageSessionDuration: totalSessions > 0 ? weightedDuration / totalSessions : null,
        sources,
        highBounceSources,
        pages,
        engagementAlertThresholdSeconds: ENGAGEMENT_ALERT_SECONDS,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Site experience lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
