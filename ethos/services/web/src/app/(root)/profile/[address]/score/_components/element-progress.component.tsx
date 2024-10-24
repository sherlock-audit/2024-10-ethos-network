import { css } from '@emotion/react';
import { type CredibilityFactor } from '@ethos/score';
import { Progress, Row } from 'antd';
import { tokenCssVars } from 'config';

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
  const maxRange = factor.range.max - factor.range.min;

  const baseHeight = 5; // Minimum height in pixels
  const heightMultiplier = 0.02; // Adjust this value to control the height difference
  const height = baseHeight + maxRange * heightMultiplier;

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
        size={{ height }}
      />
    </Row>
  );
}
