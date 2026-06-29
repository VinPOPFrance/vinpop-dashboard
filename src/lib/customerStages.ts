export const CUSTOMER_STAGE_NAMES = [
  'Visitor',
  'Quiz Started',
  'Quiz Completed',
  'Email Lead',
  'Taste Kit Buyer',
  'Waiting for Delivery',
  'Needs to Rate Wines',
  'Rated At Least 1 Wine',
  'Ready for Smart Box',
  'Smart Box Customized',
  'Smart Box Buyer',
  'Repeat Buyer',
  'Ready for Subscription',
  'Subscriber',
  'Unknown / tracking missing',
] as const;

export type CustomerStageName = (typeof CUSTOMER_STAGE_NAMES)[number];
export type StageHealth = 'good' | 'warning' | 'critical' | 'missing';
export type DataConfidence = 'high' | 'medium' | 'low' | 'unavailable';

export type CustomerStageDefinition = {
  name: CustomerStageName;
  recommendedAction: string;
  emailAngle: string;
  socialAngle: string;
  offer: string;
  objection: string;
  confidence: DataConfidence;
  health: StageHealth;
  explanation: string;
};

export type CustomerStageSignals = {
  ordersCount: number;
  nonCancelledOrdersCount: number;
  bottlesBought: number;
  bottlesRated: number;
  ratingsCount: number;
  positiveRatingsCount: number;
  isStartupPackBuyer: boolean;
  isSmartBoxBuyer: boolean;
  isSubscriber: boolean;
  hasEmail: boolean;
  hasQuiz: boolean;
};

export const CUSTOMER_STAGE_DEFINITIONS: CustomerStageDefinition[] = [
  {
    name: 'Visitor',
    recommendedAction: 'Add visitor/session tracking before measuring anonymous visitors.',
    emailAngle: 'Unavailable until visitor identity is captured.',
    socialAngle: 'Awareness content: taste discovery without wine jargon.',
    offer: 'Quiz entry point.',
    objection: 'I do not know what wine I like.',
    confidence: 'unavailable',
    health: 'missing',
    explanation: 'Visitor/session tracking is not implemented yet.',
  },
  {
    name: 'Quiz Started',
    recommendedAction: 'Track quiz_started events.',
    emailAngle: 'Finish your taste profile.',
    socialAngle: 'Quick quiz, better wine matches.',
    offer: 'Complete quiz.',
    objection: 'This takes too long.',
    confidence: 'unavailable',
    health: 'missing',
    explanation: 'Quiz start events are not available yet.',
  },
  {
    name: 'Quiz Completed',
    recommendedAction: 'Convert quiz-completed users to Taste Kit buyers.',
    emailAngle: 'Your taste profile is ready.',
    socialAngle: 'From taste profile to bottles you will actually like.',
    offer: 'Taste Kit.',
    objection: 'Will this really match my taste?',
    confidence: 'medium',
    health: 'warning',
    explanation: 'Detected from public.quizz/public.users when linkable.',
  },
  {
    name: 'Email Lead',
    recommendedAction: 'Send Taste Kit conversion email.',
    emailAngle: 'Start with a small calibrated Taste Kit.',
    socialAngle: 'Stop guessing at wine.',
    offer: 'Taste Kit / Startup Pack.',
    objection: 'I am not ready to buy yet.',
    confidence: 'medium',
    health: 'warning',
    explanation: 'Detected from users with email but no order or rating.',
  },
  {
    name: 'Taste Kit Buyer',
    recommendedAction: 'Prepare delivery and rating reminder sequence.',
    emailAngle: 'Your kit is on the way; here is how to rate.',
    socialAngle: 'The first box is a calibration step.',
    offer: 'Rating flow.',
    objection: 'What do I do after tasting?',
    confidence: 'high',
    health: 'warning',
    explanation: 'Detected from Startup Pack/Taste Kit line item titles.',
  },
  {
    name: 'Waiting for Delivery',
    recommendedAction: 'Send pre-delivery expectation email.',
    emailAngle: 'Your wines are coming. Taste, rate, get matched.',
    socialAngle: 'Behind the scenes of calibration.',
    offer: 'Rating guide.',
    objection: 'I forgot why I ordered this.',
    confidence: 'low',
    health: 'warning',
    explanation: 'Delivery state is not directly available; inferred only weakly.',
  },
  {
    name: 'Needs to Rate Wines',
    recommendedAction: 'Send rating reminder email.',
    emailAngle: 'Rate your bottles so we can build your Smart Box.',
    socialAngle: 'Your next box gets better when you rate.',
    offer: 'Smart Box readiness.',
    objection: 'Rating feels like work.',
    confidence: 'high',
    health: 'critical',
    explanation: 'Bought more bottles than rated bottles.',
  },
  {
    name: 'Rated At Least 1 Wine',
    recommendedAction: 'Ask for remaining ratings.',
    emailAngle: 'One rating is useful. Three makes your match much better.',
    socialAngle: 'Every rating sharpens the match.',
    offer: 'Complete ratings.',
    objection: 'One rating should be enough.',
    confidence: 'high',
    health: 'warning',
    explanation: 'Has at least one rating but is not Smart Box ready.',
  },
  {
    name: 'Ready for Smart Box',
    recommendedAction: 'Send Smart Box ready email.',
    emailAngle: 'Your taste profile is ready for a Smart Box.',
    socialAngle: 'From ratings to a personalized wine box.',
    offer: 'Smart Box.',
    objection: 'Will the next box be better than the kit?',
    confidence: 'high',
    health: 'good',
    explanation: 'Has at least three ratings and has not bought a Smart Box.',
  },
  {
    name: 'Smart Box Customized',
    recommendedAction: 'Track customization events before using this stage.',
    emailAngle: 'Finish your custom box.',
    socialAngle: 'Build a box around your taste.',
    offer: 'Complete Smart Box.',
    objection: 'I am unsure about the selection.',
    confidence: 'unavailable',
    health: 'missing',
    explanation: 'Smart Box customization events are not available yet.',
  },
  {
    name: 'Smart Box Buyer',
    recommendedAction: 'Move customer into repeat/subscription nurture.',
    emailAngle: 'How did your Smart Box taste?',
    socialAngle: 'Personalized wine discovery that improves over time.',
    offer: 'Repeat Smart Box.',
    objection: 'I only wanted to try it once.',
    confidence: 'high',
    health: 'good',
    explanation: 'Detected from Smart Box / box line item titles.',
  },
  {
    name: 'Repeat Buyer',
    recommendedAction: 'Offer subscription or recurring Smart Box.',
    emailAngle: 'Make your next box automatic.',
    socialAngle: 'Never restart from zero with wine.',
    offer: 'Subscription.',
    objection: 'Subscription feels like a commitment.',
    confidence: 'high',
    health: 'good',
    explanation: 'Customer has two or more non-cancelled orders.',
  },
  {
    name: 'Ready for Subscription',
    recommendedAction: 'Send subscription offer.',
    emailAngle: 'Your taste profile is strong enough for recurring boxes.',
    socialAngle: 'A wine subscription that knows your taste.',
    offer: 'Subscription starter offer.',
    objection: 'Can I pause or change it?',
    confidence: 'medium',
    health: 'good',
    explanation: 'Repeat buyer with ratings or strong positive rating history.',
  },
  {
    name: 'Subscriber',
    recommendedAction: 'Monitor satisfaction and churn risk.',
    emailAngle: 'Keep improving your recurring box.',
    socialAngle: 'Personalized wine, month after month.',
    offer: 'Retention / upgrade.',
    objection: 'I may get bored or overloaded.',
    confidence: 'medium',
    health: 'good',
    explanation: 'Detected from subscription line item titles when present.',
  },
  {
    name: 'Unknown / tracking missing',
    recommendedAction: 'Improve tracking or identity matching.',
    emailAngle: 'Collect the missing lifecycle signal.',
    socialAngle: 'Not applicable.',
    offer: 'Not applicable.',
    objection: 'Missing data prevents precise action.',
    confidence: 'low',
    health: 'missing',
    explanation: 'Not enough data to classify this customer confidently.',
  },
];

export function getCustomerStageDefinition(stageName: string): CustomerStageDefinition {
  return (
    CUSTOMER_STAGE_DEFINITIONS.find((stage) => stage.name === stageName) ??
    CUSTOMER_STAGE_DEFINITIONS[CUSTOMER_STAGE_DEFINITIONS.length - 1]
  );
}

export function classifyCustomerStage(signals: CustomerStageSignals): CustomerStageDefinition {
  if (signals.isSubscriber) return getCustomerStageDefinition('Subscriber');
  if (
    signals.nonCancelledOrdersCount >= 2 &&
    (signals.ratingsCount >= 3 || signals.positiveRatingsCount >= 2)
  ) {
    return getCustomerStageDefinition('Ready for Subscription');
  }
  if (signals.nonCancelledOrdersCount >= 2) return getCustomerStageDefinition('Repeat Buyer');
  if (signals.isSmartBoxBuyer) return getCustomerStageDefinition('Smart Box Buyer');
  if (signals.ratingsCount >= 3) return getCustomerStageDefinition('Ready for Smart Box');
  if (signals.bottlesBought > signals.bottlesRated && signals.isStartupPackBuyer) {
    return getCustomerStageDefinition('Needs to Rate Wines');
  }
  if (signals.ratingsCount >= 1) return getCustomerStageDefinition('Rated At Least 1 Wine');
  if (signals.isStartupPackBuyer) return getCustomerStageDefinition('Taste Kit Buyer');
  if (signals.ordersCount > 0) return getCustomerStageDefinition('Needs to Rate Wines');
  if (signals.hasQuiz) return getCustomerStageDefinition('Quiz Completed');
  if (signals.hasEmail) return getCustomerStageDefinition('Email Lead');
  return getCustomerStageDefinition('Unknown / tracking missing');
}
