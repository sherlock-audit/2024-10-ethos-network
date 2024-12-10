import { css } from '@emotion/react';
import { Button, Card, Flex, Typography } from 'antd';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { CheckWindow, PersonOff } from 'components/icons';
import { tokenCssVars } from 'config/theme';

const { Text } = Typography;

export function MostCredibleVouchersPlug() {
  return (
    <Card
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `}
    >
      <Flex
        css={css`
          height: 100%;
        `}
        gap={11}
        vertical
        align="center"
        justify="center"
      >
        <PersonOff
          css={css`
            fill: ${tokenCssVars.colorTextSecondary};
            font-size: 32px;
            opacity: 0.65;
          `}
        />
        <Text
          css={css`
            text-align: center;
          `}
        >
          This account has not been connected to an Ethos profile. Click below to vote that you
          would like to see this account connected.
        </Text>
        <CustomPopover
          title="Coming soon"
          content="Voting on profiles to join Ethos will be coming soon."
          trigger="click"
        >
          <Button
            size="small"
            css={css`
              display: flex;
              align-items: center;
            `}
            icon={<CheckWindow />}
            type="default"
          >
            Vote
          </Button>
        </CustomPopover>
      </Flex>
    </Card>
  );
}
