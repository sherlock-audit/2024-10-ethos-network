import { convertScoreToLevel } from '@ethos/score';
import { type CSSProperties } from 'react';
import { LogoSvg } from 'components/icons/logo.svg';
import { getWebServerUrl, lightTheme } from 'config';
import { getColorFromScoreLevelSSR } from 'utils/score';

const fallbackAvatar = new URL(
  '/assets/images/og/avatar-placeholder.svg',
  getWebServerUrl(),
).toString();

export function Avatar({
  avatar,
  size,
  score,
  style,
  avatarStyle,
}: {
  avatar: string | null;
  size: string | number;
  score?: number;
  style?: CSSProperties;
  avatarStyle?: CSSProperties;
}) {
  const scoreColor =
    typeof score === 'number' ? getColorFromScoreLevelSSR(convertScoreToLevel(score)) : undefined;

  return (
    <div
      style={{
        display: 'flex',
        width: size,
        height: size,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          borderRadius: '50%',
          overflow: 'hidden',
          ...avatarStyle,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar ?? fallbackAvatar} style={{ width: '100%', height: '100%' }} />
      </div>
      {typeof score === 'number' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: lightTheme.token.colorBgLayout,
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0px 11px',
            borderRadius: '23px',
            border: `4px solid ${lightTheme.token.colorBgContainer}`,
            fontSize: '19px',
          }}
        >
          {score}
          <span style={{ fontSize: '16px', color: scoreColor }}>
            <LogoSvg />
          </span>
        </div>
      ) : null}
    </div>
  );
}
