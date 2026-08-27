/**
 * Homepage hero copy versions.
 *
 * The dashboard cannot read the Shopify theme repository at runtime, so this
 * registry is maintained by hand from the theme's Git history. Every entry was
 * extracted from `locales/en.default.json`
 * (keys `vinpop_smart_box_landing.hero.*` / `.cta.*`) at the commit that changed it.
 *
 * `committedOn` is a COMMIT date, not a publish date. Theme deploys are manual,
 * so a version can sit in Git for days before it reaches vinpop.nl — which is
 * exactly the case for v6 below. Periods derived from these dates are therefore
 * approximations, and the page says so.
 *
 * To add a version: append it, set the previous entry's status to 'replaced',
 * and keep the array sorted oldest first.
 */

export type CopyVersionStatus = 'replaced' | 'live' | 'unpublished';

export type CopyVersionField =
  | 'eyebrow'
  | 'audience'
  | 'title'
  | 'lead'
  | 'ctaPrimary'
  | 'ctaSecondary';

export type CopyVersion = {
  id: string;
  label: string;
  surface: 'homepage-hero';
  status: CopyVersionStatus;
  committedOn: string;
  commitSha: string;
  commitSubject: string;
  eyebrow: string | null;
  audience: string | null;
  titleBefore: string;
  titleHighlight: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  changedFields: CopyVersionField[];
  /** Short plain-language note on the editorial intent of the change. */
  angle: string;
};

export const homepageHeroVersions: CopyVersion[] = [
  {
    id: 'home_hero_v1',
    label: 'v1',
    surface: 'homepage-hero',
    status: 'replaced',
    committedOn: '2026-06-23',
    commitSha: '49e0a07',
    commitSubject: 'Add VinPop Smart Box landing section with animations and dynamic content',
    eyebrow: 'Lab-analyzed wines • Built by a former winemaker',
    audience: null,
    titleBefore: 'Stop wasting money on wines you',
    titleHighlight: 'don’t like.',
    lead:
      'Start with 3 wines, rate what you receive, and unlock Smart Wine Boxes matched through lab analysis — not subjective tasting notes or wine snobbery.',
    ctaPrimary: 'Start with the Taste Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: [],
    angle: 'First version of the section. Pain-led angle, lab credibility in the eyebrow.',
  },
  {
    id: 'home_hero_v2',
    label: 'v2',
    surface: 'homepage-hero',
    status: 'replaced',
    committedOn: '2026-07-14',
    commitSha: 'e7fa191',
    commitSubject: 'Refactor Taste Kit terminology to Test Kit across multiple sections and localization files',
    eyebrow: 'Lab-analyzed wines • Built by a former winemaker',
    audience: null,
    titleBefore: 'Stop wasting money on wines you',
    titleHighlight: 'don’t like.',
    lead:
      'Start with 3 wines, rate what you receive, and unlock Smart Wine Boxes matched through lab analysis — not subjective tasting notes or wine snobbery.',
    ctaPrimary: 'Start with the Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['ctaPrimary'],
    angle: 'Naming only: "Taste Kit" became "Test Kit". The headline did not move.',
  },
  {
    id: 'home_hero_v3',
    label: 'v3',
    surface: 'homepage-hero',
    status: 'replaced',
    committedOn: '2026-07-15',
    commitSha: '19f5cb7',
    commitSubject: 'Update copywriting and brand color rules in development guidelines',
    eyebrow: 'Lab-analyzed wines • Built by a former winemaker',
    audience: null,
    titleBefore: 'Stop wasting money on wines you',
    titleHighlight: 'don’t like.',
    lead:
      'Start with 3 wines, rate what you receive, and unlock Smart Wine Boxes matched through lab analysis, not subjective tasting notes or wine snobbery.',
    ctaPrimary: 'Start with the Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['lead'],
    angle: 'Punctuation only: an em dash became a comma. Same message as v1 and v2.',
  },
  {
    id: 'home_hero_v4',
    label: 'v4',
    surface: 'homepage-hero',
    status: 'replaced',
    committedOn: '2026-08-17',
    commitSha: 'c9fc6c1',
    commitSubject: 'Enhance landing page with new offer details and dynamic CTA updates',
    eyebrow: '150+ wines rated by customers • 99% happy with at least one bottle',
    audience: null,
    titleBefore: 'Tired of guessing which wine to buy?',
    titleHighlight: 'Start with your taste.',
    lead:
      'Three bottles. Honest ratings. A Smart Wine Box built around what you actually enjoy. Real customers have already rated more than 150 wines.',
    ctaPrimary: 'Start with the Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'title', 'lead'],
    angle: 'First real message change in 55 days. Swaps lab credibility for customer proof.',
  },
  {
    id: 'home_hero_v5',
    label: 'v5',
    surface: 'homepage-hero',
    status: 'live',
    committedOn: '2026-08-18',
    commitSha: '6d6c3c5',
    commitSubject: 'Add comparison table and update landing page content for improved user engagement',
    eyebrow: 'Step 1 of 3 • Your 4th bottle is free',
    audience: null,
    titleBefore: 'Find the wines you will love.',
    titleHighlight: 'It starts with 3 bottles for €29.90.',
    lead:
      'Taste them at home and rate each one in ten seconds: Dislike, Like or Love. We measure your taste in our lab, and from then on every bottle we send is matched to it. No critics, no guessing. Free shipping and a Taste Guarantee.',
    ctaPrimary: 'Get my Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'title', 'lead', 'ctaPrimary'],
    angle: 'Desire-led instead of pain-led, price in the headline, free 4th bottle in the eyebrow.',
  },
  {
    id: 'home_hero_v6',
    label: 'v6',
    surface: 'homepage-hero',
    status: 'unpublished',
    committedOn: '2026-08-24',
    commitSha: '33b9ec9',
    commitSubject: 'Update Smart Wine Box builder to hide unavailable preferences and enhance landing page content',
    eyebrow: 'Step 1 of 3',
    audience: 'For people who love wine, not wine status.',
    titleBefore: 'Stop wasting money on wine you don\'t like.',
    titleHighlight: 'Drink what you actually like.',
    lead:
      '3 wines for €29.90 to understand your taste. Then get a Smart Wine Box matched to what you like.',
    ctaPrimary: 'Get my Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'audience', 'title', 'lead'],
    angle: 'Returns to the v1 pain angle, shorter, with a new audience line above the headline.',
  },
];

export type CopyVersionPeriod = {
  version: CopyVersion;
  /** Inclusive start date, YYYY-MM-DD. */
  start: string;
  /** Exclusive end date, YYYY-MM-DD, or null while the version is still live. */
  end: string | null;
  /** Null for a version that never reached the live theme. */
  liveDays: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(start: string, end: string): number {
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / MS_PER_DAY));
}

/**
 * Turns the version list into the periods each version was (approximately) live.
 * A version ends when the next published version is committed. Unpublished
 * versions get no period at all.
 */
export function buildCopyVersionPeriods(versions: CopyVersion[], today: string): CopyVersionPeriod[] {
  const published = versions.filter((version) => version.status !== 'unpublished');

  return versions.map((version) => {
    if (version.status === 'unpublished') {
      return { version, start: version.committedOn, end: null, liveDays: null };
    }

    const index = published.findIndex((entry) => entry.id === version.id);
    const next = index >= 0 ? published[index + 1] : undefined;
    const end = next ? next.committedOn : null;

    return {
      version,
      start: version.committedOn,
      end,
      liveDays: daysBetween(version.committedOn, end ?? today),
    };
  });
}
