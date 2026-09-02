/**
 * Donnees propres a VinPop : quiz, notes clients, vins, accords mets-vins et
 * evenements collectes sur le site.
 */

import 'server-only';
import { dateFromPg, getPool, numberFromPg, rate, ratio } from './client';
import { type CustomerProductSummary, type CustomerRatingsSummary, type FoodPairingIntelligenceResult, type QuizFunnelResult, type QuizFunnelSegment, type RatedWineDetail, type RatingsIntelligenceResult, type SiteEventInsertInput, type SiteEventInsertResult, type WineRatingSummary } from './types';
import { dateToSql, type DateRange } from '@/lib/analytics/dateRanges';
import { classifyCustomerStage } from '@/lib/customerStages';

export async function insertSiteEvent(input: SiteEventInsertInput): Promise<SiteEventInsertResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    // Documentation-only schema reference. This is intentionally not executed automatically.
    // CREATE TABLE IF NOT EXISTS public.site_events (
    //   id bigserial PRIMARY KEY,
    //   event_name text NOT NULL,
    //   event_time timestamptz NOT NULL DEFAULT now(),
    //   visitor_id text,
    //   session_id text,
    //   customer_id text,
    //   email text,
    //   email_hash text,
    //   page_url text,
    //   referrer text,
    //   utm_source text,
    //   utm_medium text,
    //   utm_campaign text,
    //   utm_content text,
    //   utm_term text,
    //   fbclid text,
    //   payload jsonb,
    //   created_at timestamptz NOT NULL DEFAULT now()
    // );
    await getPool(databaseUrl).query(
      `
        INSERT INTO public.site_events (
          event_name,
          event_time,
          visitor_id,
          session_id,
          customer_id,
          email,
          email_hash,
          page_url,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          fbclid,
          payload
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16
        )
      `,
      [
        input.eventName,
        input.eventTime,
        input.visitorId,
        input.sessionId,
        input.customerId,
        input.email,
        input.emailHash,
        input.pageUrl,
        input.referrer,
        input.utmSource,
        input.utmMedium,
        input.utmCampaign,
        input.utmContent,
        input.utmTerm,
        input.fbclid,
        input.payload,
      ],
    );

    return { ok: true };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    if (errorCode === '42P01') {
      console.error('Site event insert failed: table missing', { code: errorCode });
      return { ok: false, reason: 'table-missing' };
    }

    console.error('Site event insert failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getRatingsIntelligence(): Promise<RatingsIntelligenceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const mappedRatingsCte = `
      WITH wine_pairings AS (
        SELECT
          wine_id::text AS wine_id,
          CONCAT_WS(', ',
            CASE WHEN BOOL_OR(COALESCE(red_meat, false)) THEN 'red meat' END,
            CASE WHEN BOOL_OR(COALESCE(white_meat, false)) THEN 'white meat' END,
            CASE WHEN BOOL_OR(COALESCE(fish_seafood, false)) THEN 'fish/seafood' END,
            CASE WHEN BOOL_OR(COALESCE(cheese, false)) THEN 'cheese' END,
            CASE WHEN BOOL_OR(COALESCE(aperitif, false)) THEN 'aperitif' END
          ) AS pairing_tags
        FROM public.food_pairing
        GROUP BY wine_id
      ),
      mapped_ratings AS (
        SELECT
          ratings.customer_id,
          users.email,
          ratings.rating,
          CASE
            WHEN ratings.rating = 3 THEN 'Love'
            WHEN ratings.rating = 2 THEN 'Like'
            WHEN ratings.rating = 1 THEN 'Dislike'
            ELSE 'Unknown'
          END AS rating_label,
          CASE
            WHEN ratings.rating = 3 THEN 2
            WHEN ratings.rating = 2 THEN 1
            WHEN ratings.rating = 1 THEN 0
            ELSE NULL
          END AS rating_score,
          ratings.created_at,
          public.mapping.vp_id::text AS shopify_product_id,
          wines.id::text AS wine_id,
          COALESCE(wines.name, public.mapping.name, 'Unknown wine') AS wine_name,
          COALESCE(NULLIF(wines.wine->>'colour', ''), 'Unknown color') AS color,
          COALESCE(NULLIF(wine_pairings.pairing_tags, ''), 'No pairing tags') AS pairing_tags
        FROM public.ratings AS ratings
        LEFT JOIN public.users AS users ON users.id = ratings.customer_id
        LEFT JOIN public.mapping ON public.mapping.vp_id::text = ratings.id::text
        LEFT JOIN public.wines AS wines ON wines.id::text = public.mapping.wl_id::text
        LEFT JOIN wine_pairings ON wine_pairings.wine_id = wines.id::text
      )
    `;
    const summaryResult = await pool.query<Record<string, string | Date | null>>(`
        ${mappedRatingsCte},
        user_counts AS (
          SELECT customer_id, COUNT(*) AS ratings_count
          FROM mapped_ratings
          GROUP BY customer_id
        ),
        wine_rollups AS (
          SELECT
            wine_id,
            COUNT(*) AS total_ratings,
            COUNT(*) FILTER (WHERE rating_label = 'Love') AS love_count,
            COUNT(*) FILTER (WHERE rating_label = 'Like') AS like_count,
            COUNT(*) FILTER (WHERE rating_label = 'Dislike') AS dislike_count
          FROM mapped_ratings
          WHERE wine_id IS NOT NULL
          GROUP BY wine_id
        )
        SELECT
          (SELECT COUNT(*) FROM public.users)::text AS total_users,
          COUNT(*)::text AS total_ratings,
          COUNT(DISTINCT wine_id)::text AS unique_rated_wines,
          COUNT(DISTINCT customer_id)::text AS users_with_ratings,
          (SELECT COUNT(*) FROM user_counts WHERE ratings_count >= 3)::text AS users_with_three_plus_ratings,
          COUNT(*) FILTER (WHERE rating_label = 'Love')::text AS love_count,
          COUNT(*) FILTER (WHERE rating_label = 'Like')::text AS like_count,
          COUNT(*) FILTER (WHERE rating_label = 'Dislike')::text AS dislike_count,
          (SELECT COUNT(*) FROM wine_rollups WHERE love_count > 0)::text AS wines_with_love,
          (SELECT COUNT(*) FROM wine_rollups WHERE dislike_count > 0)::text AS wines_with_dislike,
          (SELECT COUNT(*) FROM wine_rollups WHERE ((love_count + like_count)::numeric / NULLIF(total_ratings, 0)) >= 0.8)::text AS wines_with_high_satisfaction,
          (SELECT COUNT(*) FROM wine_rollups WHERE (dislike_count::numeric / NULLIF(total_ratings, 0)) >= 0.3)::text AS wines_with_high_disappointment,
          MIN(created_at) AS first_rating_date,
          MAX(created_at) AS latest_rating_date
        FROM mapped_ratings
      `);
    const wineResult = await pool.query<Record<string, string | null>>(`
      ${mappedRatingsCte}
      SELECT
        COALESCE(shopify_product_id, 'Unmapped') AS shopify_product_id,
        wine_id,
        wine_name,
        color,
        pairing_tags,
        COUNT(*)::text AS total_ratings,
        COUNT(DISTINCT customer_id)::text AS unique_customers,
        COUNT(*) FILTER (WHERE rating_label = 'Love')::text AS love_count,
        COUNT(*) FILTER (WHERE rating_label = 'Like')::text AS like_count,
        COUNT(*) FILTER (WHERE rating_label = 'Dislike')::text AS dislike_count,
        AVG(rating_score)::text AS average_rating_score
      FROM mapped_ratings
      WHERE wine_id IS NOT NULL
      GROUP BY shopify_product_id, wine_id, wine_name, color, pairing_tags
      ORDER BY COUNT(*) DESC, wine_name
      LIMIT 100
    `);
    const customerResult = await pool.query<Record<string, string | Date | null>>(`
      ${mappedRatingsCte},
      rating_rollups AS (
        SELECT
          customer_id,
          COUNT(*)::text AS total_ratings,
          COUNT(*) FILTER (WHERE rating_label = 'Love')::text AS love_count,
          COUNT(*) FILTER (WHERE rating_label = 'Like')::text AS like_count,
          COUNT(*) FILTER (WHERE rating_label = 'Dislike')::text AS dislike_count,
          COUNT(DISTINCT wine_id)::text AS bottles_rated,
          MAX(created_at) AS last_rating_date,
          STRING_AGG(DISTINCT color, ', ' ORDER BY color) AS wine_colors_rated
        FROM mapped_ratings
        GROUP BY customer_id
      ),
      order_rollups AS (
        SELECT
          lower(email) AS email,
          COUNT(DISTINCT id)::text AS orders_count,
          COUNT(DISTINCT id) FILTER (WHERE cancelled_at IS NULL)::text AS non_cancelled_orders_count,
          COALESCE(SUM(total_price), 0)::text AS total_spent,
          MIN(created_at) AS first_order_date,
          MAX(created_at) AS last_order_date
        FROM public.orders
        WHERE email IS NOT NULL
        GROUP BY lower(email)
      ),
      bottle_rollups AS (
        SELECT
          lower(orders.email) AS email,
          COALESCE(SUM(
            CASE
              WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
              ELSE 0
            END
          ), 0)::text AS bottles_bought,
          BOOL_OR(
            COALESCE(item->>'title', item->>'name', '') ILIKE '%starter pack%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%startup pack%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%taste kit%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%tasting kit%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%calibration kit%'
          )::text AS startup_pack_buyer,
          BOOL_OR(
            COALESCE(item->>'title', item->>'name', '') ILIKE '%smart box%'
            OR COALESCE(item->>'title', item->>'name', '') ILIKE '%box%'
          )::text AS smart_box_buyer,
          BOOL_OR(COALESCE(item->>'title', item->>'name', '') ILIKE '%subscription%')::text AS subscriber
        FROM public.orders AS orders
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
        WHERE orders.email IS NOT NULL
        GROUP BY lower(orders.email)
      ),
      quiz_rollups AS (
        SELECT customer_id, COUNT(*)::text AS quiz_count
        FROM public.quizz
        GROUP BY customer_id
      ),
      customer_base AS (
        SELECT users.id::text AS customer_id, users.email AS email, lower(users.email) AS email_key
        FROM public.users AS users
        WHERE users.email IS NOT NULL
        UNION
        SELECT 'order:' || order_rollups.email AS customer_id, order_rollups.email AS email, order_rollups.email AS email_key
        FROM order_rollups
        WHERE order_rollups.email IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.users AS u WHERE lower(u.email) = order_rollups.email)
      )
      SELECT
        customer_base.customer_id AS customer_id,
        customer_base.email,
        COALESCE(order_rollups.total_spent, '0') AS total_spent,
        COALESCE(order_rollups.orders_count, '0') AS orders_count,
        COALESCE(order_rollups.non_cancelled_orders_count, '0') AS non_cancelled_orders_count,
        COALESCE(bottle_rollups.bottles_bought, '0') AS bottles_bought,
        COALESCE(bottle_rollups.startup_pack_buyer, 'false') AS startup_pack_buyer,
        COALESCE(bottle_rollups.smart_box_buyer, 'false') AS smart_box_buyer,
        COALESCE(bottle_rollups.subscriber, 'false') AS subscriber,
        COALESCE(rating_rollups.bottles_rated, '0') AS bottles_rated,
        COALESCE(rating_rollups.total_ratings, '0') AS total_ratings,
        COALESCE(rating_rollups.love_count, '0') AS love_count,
        COALESCE(rating_rollups.like_count, '0') AS like_count,
        COALESCE(rating_rollups.dislike_count, '0') AS dislike_count,
        order_rollups.first_order_date,
        order_rollups.last_order_date,
        rating_rollups.last_rating_date,
        COALESCE(quiz_rollups.quiz_count, '0') AS quiz_count,
        COALESCE(rating_rollups.wine_colors_rated, 'None') AS wine_colors_rated
      FROM customer_base
      LEFT JOIN order_rollups ON order_rollups.email = customer_base.email_key
      LEFT JOIN bottle_rollups ON bottle_rollups.email = customer_base.email_key
      LEFT JOIN rating_rollups ON rating_rollups.customer_id::text = customer_base.customer_id
      LEFT JOIN quiz_rollups ON quiz_rollups.customer_id::text = customer_base.customer_id
      WHERE (
          COALESCE(order_rollups.orders_count, '0') <> '0'
          OR COALESCE(rating_rollups.total_ratings, '0') <> '0'
          OR COALESCE(quiz_rollups.quiz_count, '0') <> '0'
        )
      ORDER BY COALESCE(order_rollups.total_spent, '0')::numeric DESC, customer_base.email
      LIMIT 200
    `);
    const customerProductResult = await pool.query<Record<string, string | null>>(`
      WITH order_items AS (
        SELECT
          COALESCE(users.id::text, 'order:' || lower(orders.email)) AS customer_id,
          COALESCE(NULLIF(item->>'product_id', ''), 'Unmapped') AS shopify_product_id,
          COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
          CASE WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric ELSE 0 END AS quantity_value,
          CASE WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric ELSE 0 END AS price_value,
          CASE
            WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
            ELSE 0
          END AS discount_value
        FROM public.orders AS orders
        LEFT JOIN public.users AS users ON lower(users.email) = lower(orders.email)
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
        WHERE orders.email IS NOT NULL
      ),
      rated_products AS (
        SELECT
          ratings.customer_id,
          public.mapping.vp_id::text AS shopify_product_id,
          COUNT(*) AS rated_count
        FROM public.ratings AS ratings
        JOIN public.mapping ON public.mapping.vp_id::text = ratings.id::text
        GROUP BY ratings.customer_id, public.mapping.vp_id
      )
      SELECT
        order_items.customer_id,
        order_items.shopify_product_id,
        order_items.product_name,
        COALESCE(SUM(quantity_value), 0)::text AS quantity_bought,
        COALESCE(SUM(quantity_value * price_value), 0)::text AS gross_revenue,
        COALESCE(SUM(discount_value), 0)::text AS discount,
        COALESCE(SUM(GREATEST(quantity_value * price_value - discount_value, 0)), 0)::text AS net_revenue,
        COALESCE(MAX(rated_products.rated_count), 0)::text AS rated_count
      FROM order_items
      LEFT JOIN rated_products ON rated_products.customer_id::text = order_items.customer_id
        AND rated_products.shopify_product_id = order_items.shopify_product_id
      GROUP BY order_items.customer_id, order_items.shopify_product_id, order_items.product_name
      ORDER BY order_items.customer_id, SUM(quantity_value) DESC
    `);
    const customerRatedWineResult = await pool.query<Record<string, string | Date | null>>(`
      ${mappedRatingsCte}
      SELECT
        customer_id,
        wine_name,
        COALESCE(shopify_product_id, 'Unmapped') AS shopify_product_id,
        color,
        rating_label,
        created_at AS rating_date
      FROM mapped_ratings
      WHERE customer_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `);
    const row = summaryResult.rows[0];
    const totalRatings = numberFromPg(row?.total_ratings as string | null);
    const loveCount = numberFromPg(row?.love_count as string | null);
    const likeCount = numberFromPg(row?.like_count as string | null);
    const dislikeCount = numberFromPg(row?.dislike_count as string | null);
    const totalUsers = numberFromPg(row?.total_users as string | null);
    const usersWithRatings = numberFromPg(row?.users_with_ratings as string | null);
    const usersWithThreePlusRatings = numberFromPg(row?.users_with_three_plus_ratings as string | null);
    const wines: WineRatingSummary[] = wineResult.rows.map((wineRow) => {
      const total = numberFromPg(wineRow.total_ratings);
      const love = numberFromPg(wineRow.love_count);
      const like = numberFromPg(wineRow.like_count);
      const dislike = numberFromPg(wineRow.dislike_count);
      const positive = rate(love + like, total);
      const dislikeRate = rate(dislike, total);

      return {
        wineId: wineRow.wine_id || 'Unknown',
        shopifyProductId: wineRow.shopify_product_id || 'Unmapped',
        wineName: wineRow.wine_name || 'Unknown wine',
        color: wineRow.color || 'Unknown color',
        pairingTags: wineRow.pairing_tags || 'No pairing tags',
        totalRatings: total,
        uniqueCustomers: numberFromPg(wineRow.unique_customers),
        loveCount: love,
        likeCount: like,
        dislikeCount: dislike,
        loveRate: rate(love, total),
        likeRate: rate(like, total),
        dislikeRate,
        positiveRate: positive,
        averageRatingScore: wineRow.average_rating_score === null ? null : numberFromPg(wineRow.average_rating_score),
        recommendationLabel:
          total < 3 ? 'Needs more ratings' : (dislikeRate ?? 0) >= 30 ? 'Risk' : (positive ?? 0) >= 80 ? 'Promote' : 'Watch',
      };
    });
    const productsByCustomer = new Map<string, CustomerProductSummary[]>();
    for (const productRow of customerProductResult.rows) {
      const customerId = productRow.customer_id || '';
      const quantityBought = numberFromPg(productRow.quantity_bought);
      const ratedCount = numberFromPg(productRow.rated_count);
      const unratedCount = Math.max(quantityBought - ratedCount, 0);
      const product: CustomerProductSummary = {
        productName: productRow.product_name || 'Unknown product',
        shopifyProductId: productRow.shopify_product_id || 'Unmapped',
        quantityBought,
        grossRevenue: numberFromPg(productRow.gross_revenue),
        discount: numberFromPg(productRow.discount),
        netRevenue: numberFromPg(productRow.net_revenue),
        ratedCount,
        unratedCount,
        ratingStatus: ratedCount === 0 ? 'Not rated' : unratedCount > 0 ? 'Partially rated' : 'Rated',
      };
      productsByCustomer.set(customerId, [...(productsByCustomer.get(customerId) ?? []), product]);
    }
    const ratedWinesByCustomer = new Map<string, RatedWineDetail[]>();
    for (const ratedWineRow of customerRatedWineResult.rows) {
      const customerId = ratedWineRow.customer_id as string;
      const detail: RatedWineDetail = {
        wineName: (ratedWineRow.wine_name as string | null) || 'Unknown wine',
        shopifyProductId: (ratedWineRow.shopify_product_id as string | null) || 'Unmapped',
        color: (ratedWineRow.color as string | null) || 'Unknown color',
        ratingLabel:
          ratedWineRow.rating_label === 'Like'
            ? 'Like'
            : ratedWineRow.rating_label === 'Dislike'
              ? 'Dislike'
              : 'Love',
        ratingDate: dateFromPg((ratedWineRow.rating_date as Date | string | null) ?? null),
      };
      ratedWinesByCustomer.set(customerId, [...(ratedWinesByCustomer.get(customerId) ?? []), detail]);
    }
    const customers: CustomerRatingsSummary[] = customerResult.rows.map((customerRow) => {
      const customerId = (customerRow.customer_id as string | null) || '';
      const bottlesBought = numberFromPg(customerRow.bottles_bought as string | null);
      const bottlesRated = numberFromPg(customerRow.bottles_rated as string | null);
      const unrated = Math.max(bottlesBought - bottlesRated, 0);
      const ordersCount = numberFromPg(customerRow.orders_count as string | null);
      const nonCancelledOrdersCount = numberFromPg(customerRow.non_cancelled_orders_count as string | null);
      const ratedPercentage = rate(bottlesRated, bottlesBought);
      const totalCustomerRatings = numberFromPg(customerRow.total_ratings as string | null);
      const loveForCustomer = numberFromPg(customerRow.love_count as string | null);
      const likeForCustomer = numberFromPg(customerRow.like_count as string | null);
      const startupPackBuyer = customerRow.startup_pack_buyer === 'true';
      const smartBoxBuyer = customerRow.smart_box_buyer === 'true';
      const subscriber = customerRow.subscriber === 'true';
      const repeatCustomer = nonCancelledOrdersCount >= 2;
      const stage = classifyCustomerStage({
        ordersCount,
        nonCancelledOrdersCount,
        bottlesBought,
        bottlesRated,
        ratingsCount: totalCustomerRatings,
        positiveRatingsCount: loveForCustomer + likeForCustomer,
        isStartupPackBuyer: startupPackBuyer,
        isSmartBoxBuyer: smartBoxBuyer,
        isSubscriber: subscriber,
        hasEmail: Boolean(customerRow.email),
        hasQuiz: numberFromPg(customerRow.quiz_count as string | null) > 0,
      });
      const smartBoxReady = stage.name === 'Ready for Smart Box' || totalCustomerRatings >= 3;
      const subscriptionReady = stage.name === 'Ready for Subscription';

      return {
        customerId,
        email: (customerRow.email as string | null) || 'Unknown email',
        totalSpent: numberFromPg(customerRow.total_spent as string | null),
        ordersCount,
        bottlesBought,
        bottlesRated,
        ratedPercentage,
        unratedBottlesRemaining: unrated,
        firstOrderDate: dateFromPg((customerRow.first_order_date as Date | string | null) ?? null),
        lastOrderDate: dateFromPg((customerRow.last_order_date as Date | string | null) ?? null),
        lastRatingDate: dateFromPg((customerRow.last_rating_date as Date | string | null) ?? null),
        repeatCustomer,
        startupPackBuyer,
        smartBoxReady,
        smartBoxBuyer,
        subscriptionReady,
        subscriber,
        funnelStage: stage.name,
        nextAction: stage.recommendedAction,
        emailAngle: stage.emailAngle,
        socialAngle: stage.socialAngle,
        suggestedOffer: stage.offer,
        objectionToHandle: stage.objection,
        dataConfidence: stage.confidence,
        stageHealth: stage.health,
        stageExplanation: stage.explanation,
        loveCount: loveForCustomer,
        likeCount: likeForCustomer,
        dislikeCount: numberFromPg(customerRow.dislike_count as string | null),
        wineColorsRated: (customerRow.wine_colors_rated as string | null) || 'None',
        ratedWines: ratedWinesByCustomer.get(customerId) ?? [],
        purchasedProducts: productsByCustomer.get(customerId) ?? [],
      };
    });
    const positiveRatingRate = rate(loveCount + likeCount, totalRatings);
    const recommendedActions: string[] = [];

    if (totalUsers > 0 && usersWithRatings / totalUsers < 0.5) {
      recommendedActions.push('Improve post-delivery rating emails.');
    }

    if (totalRatings > 0) {
      recommendedActions.push('Use wine-level Love/Like/Dislike signals to improve Smart Box recommendations.');
    }

    if ((positiveRatingRate ?? 0) >= 95 && totalRatings > 0) {
      recommendedActions.push('Check whether Dislike is being correctly captured.');
    }

    if (usersWithThreePlusRatings > 0) {
      recommendedActions.push('Create a Smart Box Ready segment for users with 3+ ratings.');
    }

    return {
      ok: true,
      metrics: {
        totalUsers,
        totalRatings,
        uniqueRatedWines: numberFromPg(row?.unique_rated_wines as string | null),
        usersWithRatings,
        usersWithThreePlusRatings,
        averageRatingsPerRatedUser: ratio(totalRatings, usersWithRatings),
        loveCount,
        likeCount,
        dislikeCount,
        loveRate: rate(loveCount, totalRatings),
        likeRate: rate(likeCount, totalRatings),
        dislikeRate: rate(dislikeCount, totalRatings),
        positiveRatingRate,
        winesWithLove: numberFromPg(row?.wines_with_love as string | null),
        winesWithDislike: numberFromPg(row?.wines_with_dislike as string | null),
        winesWithHighSatisfaction: numberFromPg(row?.wines_with_high_satisfaction as string | null),
        winesWithHighDisappointment: numberFromPg(row?.wines_with_high_disappointment as string | null),
        firstRatingDate: dateFromPg((row?.first_rating_date as Date | string | null) ?? null),
        latestRatingDate: dateFromPg((row?.latest_rating_date as Date | string | null) ?? null),
        wines,
        customers,
        interpretation: [
          'Wine-level ratings are available through public.mapping from VinPop product IDs to wine IDs.',
          'Love/Like/Dislike distribution can guide Smart Box product ranking and product page confidence.',
          'Keep monitoring wines with low rating counts before making strong assortment decisions.',
        ],
        recommendedActions,
        missingData: [
          'public.ratings.id maps to public.mapping.vp_id, then public.mapping.wl_id maps to public.wines.id.',
          'Need rating timestamp, already available as created_at.',
          'Need rating value mapped to Love / Like / Dislike, currently inferred from numeric rating values.',
        ],
        wineLevelAnalysisAvailable: wines.length > 0,
        wineLevelUnavailableReason:
          wines.length > 0
            ? null
            : 'No wine-level ratings matched through public.mapping.vp_id to public.wines.id.',
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Ratings intelligence failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getFoodPairingIntelligence(): Promise<FoodPairingIntelligenceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [summaryResult, pairingResult, wineResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
        WITH wine_pairings AS (
          SELECT
            wines.id::text AS wine_id,
            BOOL_OR(COALESCE(food_pairing.red_meat, false)) AS red_meat,
            BOOL_OR(COALESCE(food_pairing.white_meat, false)) AS white_meat,
            BOOL_OR(COALESCE(food_pairing.fish_seafood, false)) AS fish_seafood,
            BOOL_OR(COALESCE(food_pairing.cheese, false)) AS cheese,
            BOOL_OR(COALESCE(food_pairing.aperitif, false)) AS aperitif
          FROM public.wines
          LEFT JOIN public.food_pairing ON food_pairing.wine_id::text = wines.id::text
            OR food_pairing.wine_id::text = wines.wine_id::text
          GROUP BY wines.id
        )
        SELECT
          (SELECT COUNT(*) FROM public.food_pairing)::text AS food_pairing_rows,
          (
            SELECT COUNT(*)
            FROM public.food_pairing
            WHERE COALESCE(red_meat, false)
               OR COALESCE(white_meat, false)
               OR COALESCE(fish_seafood, false)
               OR COALESCE(cheese, false)
               OR COALESCE(aperitif, false)
          )::text AS populated_pairing_rows,
          COUNT(*)::text AS total_wines,
          COUNT(*) FILTER (WHERE red_meat OR white_meat OR fish_seafood OR cheese OR aperitif)::text AS wines_with_pairing_data,
          COUNT(*) FILTER (WHERE red_meat)::text AS red_meat_wines,
          COUNT(*) FILTER (WHERE white_meat)::text AS white_meat_wines,
          COUNT(*) FILTER (WHERE fish_seafood)::text AS fish_seafood_wines,
          COUNT(*) FILTER (WHERE cheese)::text AS cheese_wines,
          COUNT(*) FILTER (WHERE aperitif)::text AS aperitif_wines,
          COUNT(*) FILTER (WHERE ((red_meat::int + white_meat::int + fish_seafood::int + cheese::int + aperitif::int) > 1))::text AS wines_with_multiple_pairings,
          COUNT(*) FILTER (WHERE NOT (red_meat OR white_meat OR fish_seafood OR cheese OR aperitif))::text AS wines_without_pairing
        FROM wine_pairings
      `),
      pool.query<Record<string, string | null>>(`
        WITH pairings AS (
          SELECT 'Red meat' AS category, wine_id FROM public.food_pairing WHERE red_meat
          UNION ALL SELECT 'White meat', wine_id FROM public.food_pairing WHERE white_meat
          UNION ALL SELECT 'Fish/seafood', wine_id FROM public.food_pairing WHERE fish_seafood
          UNION ALL SELECT 'Cheese', wine_id FROM public.food_pairing WHERE cheese
          UNION ALL SELECT 'Aperitif', wine_id FROM public.food_pairing WHERE aperitif
        )
        SELECT
          category,
          COUNT(DISTINCT wine_id)::text AS wines_count,
          NULL::text AS ratings_count,
          NULL::text AS love_count,
          NULL::text AS like_count,
          NULL::text AS dislike_count
        FROM pairings
        GROUP BY category
        ORDER BY wines_count DESC
      `),
      pool.query<Record<string, string | null>>(`
        WITH wine_pairings AS (
          SELECT
            wines.id::text AS wine_id,
            wines.name AS wine_name,
            COALESCE(wines.wine->>'vendor', wines.wine->>'producer', 'Unknown vendor') AS vendor,
            CONCAT_WS(', ',
              CASE WHEN BOOL_OR(COALESCE(food_pairing.red_meat, false)) THEN 'red meat' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.white_meat, false)) THEN 'white meat' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.fish_seafood, false)) THEN 'fish/seafood' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.cheese, false)) THEN 'cheese' END,
              CASE WHEN BOOL_OR(COALESCE(food_pairing.aperitif, false)) THEN 'aperitif' END
            ) AS pairing_tags
          FROM public.wines
          LEFT JOIN public.food_pairing ON food_pairing.wine_id::text = wines.id::text
            OR food_pairing.wine_id::text = wines.wine_id::text
          GROUP BY wines.id, wines.name, wines.wine
        )
        SELECT
          wine_name,
          vendor,
          NULLIF(pairing_tags, '') AS pairing_tags,
          0::text AS total_ratings,
          0::text AS love_count,
          0::text AS like_count,
          0::text AS dislike_count
        FROM wine_pairings
        GROUP BY wine_name, vendor, pairing_tags
        ORDER BY wine_name
        LIMIT 100
      `),
    ]);
    const summary = summaryResult.rows[0];
    const totalWines = numberFromPg(summary?.total_wines);
    const winesWithPairingData = numberFromPg(summary?.wines_with_pairing_data);
    const foodPairingRows = numberFromPg(summary?.food_pairing_rows);
    const populatedPairingRows = numberFromPg(summary?.populated_pairing_rows);
    const coverageGapReason =
      foodPairingRows === 0
        ? 'public.food_pairing table is empty.'
        : populatedPairingRows === 0
          ? 'public.food_pairing exists, but pairing booleans are not populated.'
          : winesWithPairingData === 0
            ? 'Food pairing rows exist, but the join to public.wines is not matching.'
            : null;
    const pairings = pairingResult.rows.map((row) => {
      const ratingsCount = row.ratings_count === null ? null : numberFromPg(row.ratings_count);
      const loveCount = row.love_count === null ? null : numberFromPg(row.love_count);
      const likeCount = row.like_count === null ? null : numberFromPg(row.like_count);
      const dislikeCount = row.dislike_count === null ? null : numberFromPg(row.dislike_count);
      const positiveRate = ratingsCount === null || loveCount === null || likeCount === null ? null : rate(loveCount + likeCount, ratingsCount);
      return {
        pairingCategory: row.category || 'Unknown pairing',
        winesCount: numberFromPg(row.wines_count),
        ratingsCount,
        loveCount,
        likeCount,
        dislikeCount,
        positiveRate,
        suggestedAction:
          ratingsCount === null ? 'Use in product page messaging' : ratingsCount < 5 ? 'Needs more ratings' : (rate(dislikeCount ?? 0, ratingsCount) ?? 0) >= 30 ? 'Monitor dislikes' : 'Use in product page messaging',
      };
    });

    return {
      ok: true,
      metrics: {
        totalWines,
        foodPairingRows,
        populatedPairingRows,
        winesWithPairingData,
        redMeatWines: numberFromPg(summary?.red_meat_wines),
        whiteMeatWines: numberFromPg(summary?.white_meat_wines),
        fishSeafoodWines: numberFromPg(summary?.fish_seafood_wines),
        cheeseWines: numberFromPg(summary?.cheese_wines),
        aperitifWines: numberFromPg(summary?.aperitif_wines),
        winesWithMultiplePairings: numberFromPg(summary?.wines_with_multiple_pairings),
        winesWithoutPairing: numberFromPg(summary?.wines_without_pairing),
        pairingCoverageRate: rate(winesWithPairingData, totalWines),
        pairings,
        wines: wineResult.rows.map((row) => {
          const totalRatings = numberFromPg(row.total_ratings);
          const loveCount = numberFromPg(row.love_count);
          const likeCount = numberFromPg(row.like_count);
          const dislikeCount = numberFromPg(row.dislike_count);
          const positiveRate = rate(loveCount + likeCount, totalRatings);
          const dislikeRate = rate(dislikeCount, totalRatings);
          return {
            wineName: row.wine_name || 'Unknown wine',
            vendor: row.vendor || 'Unknown vendor',
            pairingTags: row.pairing_tags || 'No pairing tags',
            totalRatings,
            positiveRate,
            dislikeRate,
            actionLabel: totalRatings < 3 ? 'Needs more ratings' : (dislikeRate ?? 0) >= 30 ? 'Monitor dislikes' : 'Use in product page messaging',
          };
        }),
        coverageGapReason,
        nextDataFixes: [
          'Ensure every wine has at least one pairing.',
          'Connect pairing tags to product recommendation logic.',
          'Use pairing labels on product cards and Smart Box explanations.',
        ],
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Food pairing intelligence failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

/** Au-dela de ce taux d abandon, le funnel quiz declenche une alerte. */
const QUIZ_DROP_OFF_ALERT_THRESHOLD = 80;

type QuizSegmentRow = {
  label: string | null;
  started_sessions: string | null;
  completed_sessions: string | null;
};

type QuizTotalsRow = {
  started_sessions: string | null;
  completed_sessions: string | null;
  started_visitors: string | null;
};

type QuizDailyRow = {
  date: string | null;
  started_sessions: string | null;
  completed_sessions: string | null;
};

/**
 * Construit un segment a partir d une ligne agregee.
 *
 * Le taux de completion reste `null` quand aucune session n a demarre : afficher
 * 0 % laisserait croire a un echec alors qu il n y a rien a mesurer.
 */
function toQuizSegment(row: QuizSegmentRow, fallbackLabel: string): QuizFunnelSegment {
  const startedSessions = numberFromPg(row.started_sessions);
  const completedSessions = numberFromPg(row.completed_sessions);
  const completionRate = rate(completedSessions, startedSessions);

  return {
    label: row.label || fallbackLabel,
    startedSessions,
    completedSessions,
    completionRate,
    dropOffRate: completionRate === null ? null : 100 - completionRate,
  };
}

/**
 * Etape 3 du funnel : quiz demarres contre quiz termines.
 *
 * La source est `public.site_events`, alimentee en direct par le theme Shopify.
 * On compte des SESSIONS distinctes, pas des evenements : un visiteur qui
 * relance le quiz dans la meme session ne doit pas gonfler le denominateur.
 *
 * La table `public.quizz` n alimente pas le funnel : elle ne contient que les
 * resultats enregistres, sans trace des abandons. Elle sert de controle de
 * coherence via `storedQuizResults`.
 */
export async function getQuizFunnel(range: DateRange): Promise<QuizFunnelResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  const start = dateToSql(range.start);
  const end = dateToSql(range.end);

  try {
    const pool = getPool(databaseUrl);

    // Les six lectures portent sur la meme fenetre : les lancer en parallele
    // evite d additionner six allers-retours reseau.
    const [totalsResult, byTypeResult, bySourceResult, byPageResult, dailyResult, storedResult] =
      await Promise.all([
        pool.query<QuizTotalsRow>(
          `SELECT
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_started')::text AS started_sessions,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_completed')::text AS completed_sessions,
             COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'vinpop_quiz_started')::text AS started_visitors
           FROM public.site_events
           WHERE event_name IN ('vinpop_quiz_started', 'vinpop_quiz_completed')
             AND event_time::date BETWEEN $1::date AND $2::date`,
          [start, end],
        ),
        pool.query<QuizSegmentRow>(
          `SELECT
             payload->'payload'->>'quiz_type' AS label,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_started')::text AS started_sessions,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_completed')::text AS completed_sessions
           FROM public.site_events
           WHERE event_name IN ('vinpop_quiz_started', 'vinpop_quiz_completed')
             AND event_time::date BETWEEN $1::date AND $2::date
           GROUP BY 1
           ORDER BY 2 DESC`,
          [start, end],
        ),
        pool.query<QuizSegmentRow>(
          `SELECT
             COALESCE(NULLIF(utm_source, ''), '(direct)') AS label,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_started')::text AS started_sessions,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_completed')::text AS completed_sessions
           FROM public.site_events
           WHERE event_name IN ('vinpop_quiz_started', 'vinpop_quiz_completed')
             AND event_time::date BETWEEN $1::date AND $2::date
           GROUP BY 1
           ORDER BY 2 DESC`,
          [start, end],
        ),
        // Les URL portent des parametres UTM : on ne garde que le chemin, sinon
        // chaque campagne creerait sa propre page d entree.
        pool.query<QuizSegmentRow>(
          `SELECT
             regexp_replace(split_part(COALESCE(page_url, ''), '?', 1), '^https?://[^/]+', '') AS label,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_started')::text AS started_sessions,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_completed')::text AS completed_sessions
           FROM public.site_events
           WHERE event_name IN ('vinpop_quiz_started', 'vinpop_quiz_completed')
             AND event_time::date BETWEEN $1::date AND $2::date
           GROUP BY 1
           ORDER BY 2 DESC
           LIMIT 25`,
          [start, end],
        ),
        pool.query<QuizDailyRow>(
          `SELECT
             event_time::date::text AS date,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_started')::text AS started_sessions,
             COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'vinpop_quiz_completed')::text AS completed_sessions
           FROM public.site_events
           WHERE event_name IN ('vinpop_quiz_started', 'vinpop_quiz_completed')
             AND event_time::date BETWEEN $1::date AND $2::date
           GROUP BY 1
           ORDER BY 1`,
          [start, end],
        ),
        pool.query<{ stored: string | null }>(
          `SELECT COUNT(*)::text AS stored
           FROM public.quizz
           WHERE created_at::date BETWEEN $1::date AND $2::date`,
          [start, end],
        ),
      ]);

    const totals = totalsResult.rows[0];
    const startedSessions = numberFromPg(totals?.started_sessions);
    const completedSessions = numberFromPg(totals?.completed_sessions);
    const completionRate = rate(completedSessions, startedSessions);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: startedSessions > 0,
        startedSessions,
        completedSessions,
        startedVisitors: numberFromPg(totals?.started_visitors),
        completionRate,
        dropOffRate: completionRate === null ? null : 100 - completionRate,
        dropOffAlertThreshold: QUIZ_DROP_OFF_ALERT_THRESHOLD,
        byQuizType: byTypeResult.rows.map((row) => toQuizSegment(row, '(type non renseigne)')),
        bySource: bySourceResult.rows.map((row) => toQuizSegment(row, '(direct)')),
        byEntryPage: byPageResult.rows.map((row) => toQuizSegment(row, '(page inconnue)')),
        daily: dailyResult.rows.map((row) => ({
          date: row.date ?? '',
          startedSessions: numberFromPg(row.started_sessions),
          completedSessions: numberFromPg(row.completed_sessions),
        })),
        storedQuizResults: numberFromPg(storedResult.rows[0]?.stored),
        // Le payload des evenements ne transporte que `quiz_type` : il n existe
        // aucune trace de la question atteinte avant l abandon. Passer ce drapeau
        // a true demandera d emettre un evenement par question depuis le theme.
        perQuestionAvailable: false,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Quiz funnel lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
