import { MinusOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { ScoreImpact } from '@ethos/domain';
import { Tag, Typography } from 'antd';
import { Logo } from '../icons';
import { tokenCssVars } from 'config/theme';

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
        <Typography.Text type="success">↑ </Typography.Text>
      ) : impact === ScoreImpact.NEGATIVE ? (
        <Typography.Text type="danger">↓ </Typography.Text>
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
