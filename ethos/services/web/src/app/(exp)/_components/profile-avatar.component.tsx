import { css } from '@emotion/react';
import { Avatar, Flex } from 'antd';
import { type AvatarSize } from 'antd/es/avatar/AvatarContext';
import { ExpImpactDisplay, ScoreImpactDisplay } from './value-impact-display.component';
import { Score } from 'components/avatar/score.component';
import { tokenCssVars } from 'config/theme';

type AvatarProps = {
  avatarName: string;
  size?: AvatarSize;
  score?: number;
  scoreImpactValue?: number;
  expImpactValue?: number;
};

export function ProfileAvatar({
  avatarName,
  size,
  score,
  scoreImpactValue,
  expImpactValue,
}: AvatarProps) {
  return (
    <Flex
      vertical
      gap={12}
      justify="center"
      css={css({
        position: 'relative',
      })}
    >
      <div
        css={css({
          height: 'fit-content',
          position: 'relative',
        })}
      >
        <Avatar
          size={size}
          src={`/assets/images/exp-claim/${avatarName}.png`}
          css={css({
            border: `1px solid ${tokenCssVars.colorTextBase} !important`,
          })}
        />
        {score !== undefined && <Score size={size} score={score} />}
      </div>
      <div
        css={css({
          position: 'absolute',
          transform: 'translate(50%)',
          top: '120%',
          right: '50%',
        })}
      >
        {scoreImpactValue !== undefined && (
          <ScoreImpactDisplay value={scoreImpactValue} size="small" />
        )}
        {expImpactValue !== undefined && <ExpImpactDisplay value={expImpactValue} size="small" />}
      </div>
    </Flex>
  );
}
