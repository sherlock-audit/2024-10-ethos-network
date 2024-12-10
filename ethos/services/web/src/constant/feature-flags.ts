export const featureGates = {
  chromeExtensionBanner: 'show_chrome_extension_banner',
  profileReviewPrompts: 'profile_review_prompts',
  isAdminPageEnabled: 'show_admin_page',
  showVouchReviewShareModal: 'show_vouch_review_share_modal',
  showContributorMode: 'show_contributor_mode',
  privyIntegration: 'privy_integration',
  useUnifiedActivites: 'use_unified_activites',
  showExpClaimPage: 'show_exp_claim_page',
  useSmartWalletForReview: 'use_smart_wallet_for_review',
  showScoreMetadata: 'show_score_history_metadata',
} as const;

/**
 * Add any feature gates to this list that should not be visible to end users prior to release.
 * For Example, the dev modal lists feature gates even in public testnet releases.
 */
export const sensitiveFeatureGates = new Set<(typeof featureGates)[keyof typeof featureGates]>([]);

export const dynamicConfigs = {
  onboardingProfilesToReview: 'onboarding_profiles_to_review',
  activityCtaDefaultProfiles: 'activity_cta_default_profiles',
  profilesToReview: 'profiles_to_review',
  reactQueryCache: 'react-query-cache',
} as const;

export type DynamicConfigValues = (typeof dynamicConfigs)[keyof typeof dynamicConfigs];
