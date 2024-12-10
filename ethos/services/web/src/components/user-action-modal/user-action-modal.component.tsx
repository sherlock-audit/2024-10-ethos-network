import { css } from '@emotion/react';
import { type Review } from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { Button, Flex, Typography } from 'antd';
import { type UseFormReturn } from 'react-hook-form';
import { type ActivityTypeIconProps } from '../activity-cards/card-header-title.component';
import { ErrorList } from './error-list.component';
import { ReviewInputBlock } from './user-action-input-block.component';
import { type FormInputs } from './user-action-modal.types';
import { tokenCssVars } from 'config/theme';
import { type ScoreSimulationResult } from 'types/activity';

type Props = ActivityTypeIconProps & {
  target: EthosUserTarget;
  customInputBlock?: React.ReactNode;
  actionComponent?: React.ReactNode;
  isSubmitting: boolean;
  form: UseFormReturn<FormInputs>;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  title: string;
  score?: Review['score'];
  simulationChanged: (simulation: ScoreSimulationResult) => void;
};

const { Title } = Typography;

export function UserActionModal({
  target,
  customInputBlock,
  actionComponent,
  form,
  isSubmitting,
  handleSubmit,
  title,
  type,
  score,
  simulationChanged,
}: Props) {
  return (
    <form
      onSubmit={handleSubmit}
      css={css`
        height: 100%;
        cursor: ${isSubmitting ? 'not-allowed' : 'auto'};
      `}
    >
      <div
        css={css`
          pointer-events: ${isSubmitting ? 'none' : 'auto'};
        `}
      >
        <Title
          level={1}
          css={css`
            padding-top: 32px;
            padding-bottom: 32px;
            font-size: 64px;
            text-align: center;
            line-height: 1;
          `}
        >
          {title}
        </Title>
        <ReviewInputBlock
          type={type}
          customInputBlock={customInputBlock}
          score={score}
          target={target}
          actionComponent={actionComponent}
          form={form}
          simulationChanged={simulationChanged}
        />
        <ErrorList form={form} />
        <Flex align="center" justify="center">
          <Button
            key="back"
            type="primary"
            htmlType="submit"
            size="large"
            loading={isSubmitting}
            css={css`
              background: ${tokenCssVars.colorInfo};
            `}
          >
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </Button>
        </Flex>
      </div>
    </form>
  );
}
