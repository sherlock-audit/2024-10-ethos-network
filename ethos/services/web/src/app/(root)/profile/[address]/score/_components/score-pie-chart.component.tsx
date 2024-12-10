import { scoreRanges, convertScoreToLevel } from '@ethos/score';
import { ResponsivePie } from '@nivo/pie';
import { theme } from 'antd';
import { Logo } from 'components/icons';
import { getColorFromScoreLevel } from 'utils/score';

type ScorePieChartProps = {
  data: Array<{
    id: string;
    label: string;
    totalScore: number;
    value: number;
  }>;
  totalScore: number;
};

const MAX_SCORE = scoreRanges.exemplary.max;

function GaugeSvg({ color }: { color: string }) {
  return (
    <svg
      width="11"
      height="113"
      viewBox="0 0 11 113"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.386 107.284C10.386 110.202 8.06099 112.568 5.19299 112.568C2.32498 112.568 0 110.202 0 107.284C0 104.366 2.32498 102 5.19299 102C8.06099 102 10.386 104.366 10.386 107.284ZM2.0772 107.284C2.0772 109.035 3.47218 110.454 5.19299 110.454C6.91379 110.454 8.30878 109.035 8.30878 107.284C8.30878 105.533 6.91379 104.114 5.19299 104.114C3.47218 104.114 2.0772 105.533 2.0772 107.284Z"
        fill={color}
      />
      <path d="M5 1.34766L5 102.348" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Calculate angle: maps 0-2800 to -90-90 degrees
function calculateAngle(score: number) {
  const normalizedScore = Math.min(Math.max(score, 0), MAX_SCORE); // Clamp between 0 and MAX_SCORE

  return -90 + (normalizedScore / MAX_SCORE) * 180;
}

export function ScorePieChart({ data, totalScore }: ScorePieChartProps) {
  const { token } = theme.useToken();

  if (!data) {
    return null;
  }

  const scoreLevel = convertScoreToLevel(totalScore);
  const scoreColor = getColorFromScoreLevel(scoreLevel, token);

  return (
    <ResponsivePie
      data={data}
      margin={{ top: token.marginLG, right: 70, bottom: 8, left: 70 }}
      startAngle={-90}
      endAngle={90}
      innerRadius={0.85}
      padAngle={1}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      colors={[
        token.colorError,
        token.colorWarning,
        token.colorTextBase,
        token.colorPrimary,
        token.colorSuccess,
      ]}
      motionConfig="wobbly"
      arcLinkLabelsTextColor={token.colorTextBase}
      arcLinkLabelsStraightLength={12}
      arcLinkLabelsDiagonalLength={12}
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: 'color' }}
      arcLabelsSkipAngle={10}
      tooltip={({ datum }) => (
        <div
          css={{
            background: token.colorBgContainer,
            padding: '8px 12px',
            border: `1px solid ${token.colorBorderBg}`,
            borderRadius: token.borderRadius,
          }}
        >
          {datum.data.label} <Logo css={{ color: datum.color }} />
        </div>
      )}
      enableArcLabels={false}
      arcLabelsTextColor={{
        from: 'color',
      }}
      layers={[
        'arcs',
        'arcLabels',
        'arcLinkLabels',
        'legends',

        ({ centerX, centerY }) => (
          <g
            transform={`
              translate(${centerX - 5.5}, ${centerY - 113})
              rotate(${calculateAngle(totalScore)}, 5.5, 113)
            `}
          >
            <GaugeSvg color={scoreColor} />
          </g>
        ),
      ]}
    />
  );
}
