import { css } from '@emotion/react';
import { ScoreByValue, type ScoreValue } from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { Flex, Col, Row, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import {
  CardHeaderTitle,
  type ActivityTypeIconProps,
} from '../activity-cards/card-header-title.component';
import { CardHeader } from '../activity-cards/card-header.component';
import { ReviewInput } from './user-action-input.component';
import { type FormInputs } from './user-action-modal.types';
import { UserActionScoreImpact } from './user-action-score-impact.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { tokenCssVars } from 'config';
import { MAX_TITLE_LENGTH } from 'constant/restrictions.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useDebouncedValue } from 'hooks/useDebounce';
import { useActor } from 'hooks/user/activities';
import { useScoreSimulation } from 'hooks/user/lookup';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';

type Props = ActivityTypeIconProps & {
  target: EthosUserTarget;
  customInputBlock?: React.ReactNode;
  actionComponent: React.ReactNode;
  form: UseFormReturn<FormInputs<ScoreValue>>;
};

export function ReviewInputBlock({
  target,
  customInputBlock,
  actionComponent,
  form,
  type,
  score,
}: Props) {
  const { connectedActor: author } = useCurrentUser();
  const { COLOR_BY_SCORE } = useScoreIconAndColor();
  const subject = useActor(target);
  const [titleValueLength, setTitleValueLength] = useState(0);

  const onTitleChange = useCallback(
    (value: string) => {
      setTitleValueLength(value.length);
    },
    [setTitleValueLength],
  );

  const mode = useThemeMode();
  const customShadow =
    mode === 'light'
      ? 'drop-shadow(0px 4px 9px rgba(0, 0, 0, 0.06)) drop-shadow(0px 17px 17px rgba(0, 0, 0, 0.05)) drop-shadow(0px 37px 22px rgba(0, 0, 0, 0.03)) drop-shadow(0px 66px 26px rgba(0, 0, 0, 0.01)) drop-shadow(0px 103px 29px rgba(0, 0, 0, 0))'
      : 'drop-shadow(0px 27px 36.4px rgba(0, 0, 0, 0.35))';

  const debouncedValue = useDebouncedValue(form.watch('value'), 300, true);
  const scoreSimulationInput: Record<string, number> = {};

  if (type === 'vouch') {
    scoreSimulationInput.vouchAmount = debouncedValue;
  } else if (type === 'review') {
    const scoreType = ScoreByValue[debouncedValue];

    if (scoreType) {
      scoreSimulationInput.positiveReviews = scoreType === 'positive' ? 1 : 0;
      scoreSimulationInput.negativeReviews = scoreType === 'negative' ? 1 : 0;
      scoreSimulationInput.neutralReviews = scoreType === 'neutral' ? 1 : 0;
    }
  }

  const { data: scoreSimulationData, isFetching: isCalculatingScoreImpact } = useScoreSimulation(
    target,
    scoreSimulationInput,
  );

  return (
    <Flex
      vertical
      css={css`
        z-index: 9;
      `}
    >
      {customInputBlock}
      <Flex justify="center" align="center" gap="small">
        <Row
          css={css`
            border-radius: 15px;
            width: 100%;
            overflow: hidden;
            background: ${tokenCssVars.colorBgContainer};
            color: ${tokenCssVars.colorTextSecondary};
            filter: ${customShadow};
          `}
        >
          <Col span={24}>
            <CardHeader
              isPreview
              title={
                <CardHeaderTitle
                  author={author}
                  subject={subject}
                  type={type}
                  score={score}
                  color={COLOR_BY_SCORE[score ?? 'neutral']}
                />
              }
            />
            <Flex
              css={css`
                padding: 11px 18px;
              `}
              gap={12}
              flex={1}
            >
              <UserAvatar size="large" actor={author} />
              <Flex vertical flex={1}>
                <Flex justify="space-between" align="flex-start">
                  <ReviewInput control={form.control} onTitleChange={onTitleChange} />
                  {actionComponent}
                </Flex>
              </Flex>
            </Flex>
          </Col>
          {scoreSimulationData?.simulation && scoreSimulationData?.simulation.value > 0 && (
            <UserActionScoreImpact
              provisionalScoreImpact={scoreSimulationData.simulation}
              isLoading={isCalculatingScoreImpact}
              targetActor={subject}
            />
          )}
        </Row>
      </Flex>

      <Typography.Text
        type={titleValueLength >= MAX_TITLE_LENGTH ? 'danger' : 'secondary'}
        css={css`
          margin-top: 8px;
          margin-left: auto;
          font-size: 12px;
          letter-spacing: 0.5px;
        `}
      >
        {titleValueLength}/{MAX_TITLE_LENGTH}
      </Typography.Text>
    </Flex>
  );
}
