import Icon from '@ant-design/icons';
import { css } from '@emotion/react';
import { Flex } from 'antd';
import { tokenCssVars } from 'config/theme';

function ScaledCaretIcon({ height, flip }: { height: number; flip?: boolean }) {
  const width = height * (380 / 656);

  return (
    <svg
      viewBox="0 0 380 656"
      focusable="false"
      data-icon="scaled-caret"
      width={`${width}px`}
      height={`${height}px`}
      fill="currentColor"
      aria-hidden="true"
      css={css({
        transform: flip ? 'scaleX(-1)' : undefined,
      })}
    >
      <path d="M380 328L0 0v656l380-328c11-9 11-27 0-37z" />
    </svg>
  );
}

export function FlexArrow({
  width = 80,
  size = 1,
  color = tokenCssVars.colorTextBase,
  direction = 'right',
}: {
  width?: number;
  size?: number;
  color?: string;
  direction?: 'right' | 'left';
}) {
  const height = 8 * size;

  return (
    <Flex
      css={css({
        width: `${width}px`,
        position: 'relative',
        height: `${height}px`,
      })}
    >
      <div
        css={css({
          position: 'absolute',
          top: '50%',
          left: direction === 'right' ? '0' : `${size * 2}px`,
          right: direction === 'right' ? `${size * 2}px` : '0',
          height: `${size * 2}px`,
          backgroundColor: color,
          transform: 'translateY(-50%)',
        })}
      />
      <Icon
        component={() => <ScaledCaretIcon height={height} flip={direction === 'left'} />}
        css={css({
          color,
          position: 'absolute',
          top: '50%',
          right: direction === 'right' ? '0' : undefined,
          left: direction === 'right' ? undefined : '0',
          transform: 'translateY(-50%)',
        })}
      />
    </Flex>
  );
}
