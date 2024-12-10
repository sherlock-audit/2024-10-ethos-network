import { css } from '@emotion/react';
import { type AvatarSize } from 'antd/es/avatar/AvatarContext';
import { PersonScore } from 'components/person-score/person-score.component';

type Props = {
  score: number;
  elevated?: boolean;
  size?: AvatarSize;
};

export function Score({ score, size, elevated }: Props) {
  const positionStyles =
    size === 'default'
      ? css`
          bottom: 0;
          top: 40%;
          right: 12%;
        `
      : css`
          bottom: 0;
          right: 50%;
        `;

  return (
    <div
      css={css`
        ${positionStyles};
        position: absolute;
        transform: translate(50%, 50%);
      `}
    >
      <PersonScore score={score} size={size} variant={elevated ? 'elevated' : 'flat'} />
    </div>
  );
}
