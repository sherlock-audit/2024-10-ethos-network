import { css } from '@emotion/react';
import { Flex } from 'antd';
import Lottie from 'lottie-react';
import animationDataDark from './lottie-loader-dark.json';
import animationDataLight from './lottie-loader-light.json';
import { useThemeMode } from 'contexts/theme-manager.context';

type LottieLoaderProps = {
  size?: number;
  text?: string;
};

export function LottieLoader({ size = 40, text }: LottieLoaderProps) {
  const mode = useThemeMode();

  return (
    <Flex
      align="center"
      justify="center"
      gap={2}
      css={css`
        display: inline-flex;
      `}
    >
      <Lottie
        animationData={mode === 'dark' ? animationDataLight : animationDataDark}
        loop
        autoplay
        css={{
          width: size,
          height: size,
        }}
      />
      <span>{text}</span>
    </Flex>
  );
}

type CenteredLottieLoaderProps = {
  padding?: number;
  fullWidth?: boolean;
  fullHeight?: boolean;
} & LottieLoaderProps;

export function CenteredLottieLoader({
  size,
  text,
  padding,
  fullHeight,
  fullWidth,
}: CenteredLottieLoaderProps) {
  return (
    <Flex
      justify="center"
      align="center"
      css={css`
        width: ${fullWidth && '100%'};
        height: ${fullHeight && '100%'};
        padding-block: ${padding}px;
      `}
    >
      <LottieLoader size={size} text={text} />
    </Flex>
  );
}

export function PageLottieLoader() {
  return <CenteredLottieLoader size={48} fullWidth padding={200} />;
}
