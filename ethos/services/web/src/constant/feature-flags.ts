export const featureGates = {
  chromeExtensionBanner: 'show_chrome_extension_banner',
  profileReviewPrompts: 'profile_review_prompts',
  directoryPage: 'show_directory_page',
  isReputationMarketEnabled: 'show_reputation_market',
  isAdminPageEnabled: 'show_admin_page',
  showVouchReviewShareModal: 'show_vouch_review_share_modal',
  showContributorMode: 'show_contributor_mode',
} as const;

/**
 * Add any feature gates to this list that should not be visible to end users prior to release.
 * For Example, the dev modal lists feature gates even in public testnet releases.
 */
export const sensitiveFeatureGates = new Set<(typeof featureGates)[keyof typeof featureGates]>([
  'show_reputation_market',
]);

export const dynamicConfigs = {
  onboardingProfilesToReview: 'onboarding_profiles_to_review',
  profilesToReview: 'profiles_to_review',
  reactQueryCache: 'react-query-cache',
} as const;

export type DynamicConfigValues = (typeof dynamicConfigs)[keyof typeof dynamicConfigs];
