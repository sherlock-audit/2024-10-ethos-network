import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { css, keyframes } from '@emotion/react';
import { Flex, theme } from 'antd';
import { AnimatedScore } from 'components/animated-number';
import { EthosStar, Logo } from 'components/icons';
import { tokenCssVars } from 'config/theme';

type ValueImpactDisplayProps = {
  value: number;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  endIcon?: React.ReactNode;
  colorScheme?: {
    positive: string;
    neutral: string;
    negative: string;
  };
};

const blinkAnimation = keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0.5 },
  '100%': { opacity: 1 },
});

const sizeStyles = {
  small: {
    fontSize: 12,
    iconSize: 12,
    gap: 2,
  },
  medium: {
    fontSize: 16,
    iconSize: 16,
    gap: 2,
  },
  large: {
    fontSize: 20,
    iconSize: 20,
    gap: 2,
  },
};

export function ValueImpactDisplay({
  value,
  size = 'medium',
  isLoading,
  endIcon,
  colorScheme = {
    positive: tokenCssVars.colorSuccess,
    neutral: tokenCssVars.colorTextSecondary,
    negative: tokenCssVars.colorError,
  },
}: ValueImpactDisplayProps) {
  const { token } = theme.useToken();
  const styles = sizeStyles[size];

  function getColor() {
    if (value > 0) return colorScheme.positive;
    if (value < 0) return colorScheme.negative;

    return colorScheme.neutral;
  }

  return (
    <Flex
      justify="center"
      align="center"
      gap={styles.gap}
      css={css({
        fontSize: styles.fontSize,
        fontWeight: token.fontWeightStrong,
        color: getColor(),
        animation: isLoading ? `${blinkAnimation} 2s ease-in-out infinite` : undefined,
      })}
    >
      {value > 0 ? (
        <ArrowUpOutlined
          css={css({
            fontSize: styles.iconSize,
          })}
        />
      ) : value < 0 ? (
        <ArrowDownOutlined
          css={css({
            fontSize: styles.iconSize,
          })}
        />
      ) : null}
      <AnimatedScore
        score={Math.abs(value)}
        animationVariant="scale"
        animationDelay={0}
        firstAnimationFromZero
        animationDuration={0.5}
      />
      {endIcon && (
        <span
          css={css({
            display: 'contents',
            fontSize: styles.iconSize,
          })}
        >
          {endIcon}
        </span>
      )}
    </Flex>
  );
}

type ScoreImpactDisplayProps = {
  value: number;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
};

export function ScoreImpactDisplay({ value, size = 'medium', isLoading }: ScoreImpactDisplayProps) {
  return (
    <ValueImpactDisplay
      value={value}
      size={size}
      isLoading={isLoading}
      endIcon={
        <span
          css={css({
            display: 'contents',
            fontSize: '80%',
          })}
        >
          <Logo />
        </span>
      }
      colorScheme={{
        positive: tokenCssVars.colorSuccess,
        neutral: tokenCssVars.colorTextSecondary,
        negative: tokenCssVars.colorError,
      }}
    />
  );
}

export function ExpImpactDisplay({ value, size = 'medium', isLoading }: ScoreImpactDisplayProps) {
  return (
    <ValueImpactDisplay
      value={value}
      size={size}
      isLoading={isLoading}
      endIcon={<EthosStar />}
      colorScheme={{
        positive: tokenCssVars.colorWarning,
        neutral: tokenCssVars.colorTextSecondary,
        negative: tokenCssVars.colorError,
      }}
    />
  );
}
