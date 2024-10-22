import { MinusOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { ScoreImpact } from '@ethos/domain';
import { Tag } from 'antd';
import { ArrowDownScoreIcon, ArrowUpScoreIcon, Logo } from '../icons';
import { tokenCssVars } from 'config';

type Props = { value: number | string; impact: `${ScoreImpact}` };

export function ScoreImpactTag({ value, impact }: Props) {
  return (
    <Tag
      color={tokenCssVars.colorBgElevated}
      css={css`
        color: ${tokenCssVars.colorText};
        font-weight: 600;
      `}
    >
      {impact === ScoreImpact.POSITIVE ? (
        <ArrowUpScoreIcon
          css={css`
            color: ${tokenCssVars.colorSuccess};
            font-size: 16px;
          `}
        />
      ) : impact === ScoreImpact.NEGATIVE ? (
        <ArrowDownScoreIcon
          css={css`
            color: ${tokenCssVars.colorError};
            font-size: 16px;
          `}
        />
      ) : (
        <MinusOutlined
          css={css`
            color: ${tokenCssVars.colorTextSecondary};
            width: 16px;
          `}
        />
      )}
      {value}
      <Logo
        css={css`
          font-size: 12px;
          margin-left: 3px;
        `}
      />
    </Tag>
  );
}
