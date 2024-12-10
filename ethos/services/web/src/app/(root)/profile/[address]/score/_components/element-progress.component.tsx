import { css } from '@emotion/react';
import { type CredibilityFactor } from '@ethos/score';
import { Progress, Row } from 'antd';
import { tokenCssVars } from 'config/theme';

type ElementProgressProps = {
  factor: CredibilityFactor;
};

function getColorForPercentage(percentage: number) {
  if (percentage <= 5) {
    return tokenCssVars.colorError;
  } else if (percentage <= 20) {
    return tokenCssVars.colorWarning;
  } else {
    return tokenCssVars.colorSuccess;
  }
}

export function ElementProgress({ factor }: ElementProgressProps) {
  const percentage = (factor.weighted / factor.range.max) * 100;
  const color = getColorForPercentage(percentage);

  return (
    <Row
      css={css`
        width: 100%;
      `}
    >
      <Progress
        percent={Math.abs(percentage)}
        showInfo={false}
        strokeColor={percentage >= 0 ? color : tokenCssVars.colorError}
        strokeLinecap="round"
      />
    </Row>
  );
}
