import { type SerializedStyles } from '@emotion/react';

export enum FeedActionSizes {
  SMALL = 'small',
  MEDIUM = 'medium',
}

export type StyleProps = { buttonStyle: SerializedStyles; iconStyle: SerializedStyles };
