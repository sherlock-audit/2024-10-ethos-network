// types.ts

export enum StorageKeys {
  ShowCredibilityScoreBorders = 'isShowCredibilityScoreBorders',
  ShowCredibilityScoreLabels = 'isShowCredibilityScoreLabels',
}

export type StorageData = {
  [StorageKeys.ShowCredibilityScoreBorders]: boolean;
  [StorageKeys.ShowCredibilityScoreLabels]: boolean;
};
