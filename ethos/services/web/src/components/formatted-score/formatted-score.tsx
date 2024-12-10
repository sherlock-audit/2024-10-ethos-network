import { css } from '@emotion/react';
import { Logo } from '@ethos/common-ui';
import { formatXPScore } from '@ethos/helpers';
import { Flex, Typography } from 'antd';
import { AwardIcon, EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useScoreCategory } from 'utils/scoreCategory';

type Props = {
  value: number;
  valueType?: 'score' | 'xp-points';
  showAwards?: boolean;
  position?: number;
};

export function FormattedScore({ value, valueType, showAwards, position }: Props) {
  return (
    <Typography.Text
      css={css`
        margin-left: auto;
        font-size: 14px;
        min-width: 85px;
        text-align: right;
        display: flex;
        justify-content: flex-end;
      `}
      strong
    >
      <Flex gap={4}>
        {showAwards && position !== undefined && position <= 3 && (
          <AwardIcon
            css={{
              fontSize: 18,
              color:
                position === 1
                  ? tokenCssVars.colorAwardGold
                  : position === 2
                    ? tokenCssVars.colorAwardSilver
                    : position === 3
                      ? tokenCssVars.colorAwardBronze
                      : undefined,
            }}
          />
        )}
        {valueType === 'score' ? <EthosScore value={value} /> : <EthosPoints value={value} />}
      </Flex>
    </Typography.Text>
  );
}

function EthosScore({ value }: { value: number }) {
  const [scoreCategory] = useScoreCategory(value);

  return (
    <Flex
      css={css`
        color: ${scoreCategory.color};
      `}
      gap={4}
    >
      {value} <Logo />
    </Flex>
  );
}

function EthosPoints({ value }: { value: number }) {
  return (
    <Flex gap={4}>
      {formatXPScore(value)}{' '}
      <EthosStar
        css={css`
          color: ${tokenCssVars.orange8};
        `}
      />
    </Flex>
  );
}
