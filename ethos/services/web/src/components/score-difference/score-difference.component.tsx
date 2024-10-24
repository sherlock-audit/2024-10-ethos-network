import { MinusOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { ScoreImpact } from '@ethos/domain';
import { Flex, theme } from 'antd';
import { AnimatedScore } from 'components/animated-number';
import { ArrowDownScoreIcon, ArrowUpScoreIcon, EthosStar, Logo } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { tokenCssVars } from 'config';

type ScoreDifferenceProps = {
  score: number;
  impact: ScoreImpact;
  iconType?: 'star' | 'logo';
  isLoading?: boolean;
};

export function ScoreDifference({
  score,
  impact,
  iconType = 'logo',
  isLoading,
}: ScoreDifferenceProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      css={css`
        font-size: ${token.fontSizeLG}px;
        font-weight: ${token.fontWeightStrong};
        align-items: center;

        color: ${impact === ScoreImpact.NEUTRAL
          ? tokenCssVars.colorTextSecondary
          : impact === ScoreImpact.POSITIVE
            ? tokenCssVars.colorSuccess
            : tokenCssVars.colorError};
      `}
    >
      {impact === ScoreImpact.POSITIVE ? (
        <ArrowUpScoreIcon
          css={css`
            color: ${tokenCssVars.colorSuccess};
            font-size: 20px;
          `}
        />
      ) : impact === ScoreImpact.NEGATIVE ? (
        <ArrowDownScoreIcon
          css={css`
            color: ${tokenCssVars.colorError};
            font-size: 20px;
          `}
        />
      ) : (
        <MinusOutlined
          css={css`
            width: 20px;
          `}
        />
      )}
      <Flex
        align="center"
        css={css`
          margin-left: 4px;
          margin-right: 7px;
        `}
      >
        <AnimatedScore score={score} animationVariant="scale" firstAnimationFromZero />
      </Flex>
      {isLoading ? (
        <LottieLoader size={18} />
      ) : (
        <>
          {iconType === 'logo' ? (
            <Logo
              css={css`
                font-size: 13px;
              `}
            />
          ) : null}
          {iconType === 'star' ? (
            <EthosStar
              css={css`
                font-size: 20px;
              `}
            />
          ) : null}
        </>
      )}
    </Flex>
  );
}
