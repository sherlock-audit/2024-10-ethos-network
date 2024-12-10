import { ArrowRightOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Checkbox, Flex, List, Progress, Space, Tooltip, Typography, Card } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Logo } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { chromeExtensionLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';
import { useCheckExtensionInstalled } from 'hooks/use-check-extension-installed';
import { useOnboardingStatus } from 'hooks/user/onboarding';
import { routeTo } from 'utils/routing';

type OnboardingChecklistItems = Array<{
  tooltip: string;
  done?: boolean;
  label: string | JSX.Element;
  actionLink?: string;
}>;
const TARGET_SCORE = 1200;

export function OnboardingChecklist({
  onCountChanged = () => {},
}: {
  onCountChanged?: (remainingTasks: number) => void;
}) {
  const { connectedProfile, connectedProfilePrimaryAddress } = useCurrentUser();
  const { data } = useOnboardingStatus(connectedProfile?.id, TARGET_SCORE);
  const isExtensionInstalled = useCheckExtensionInstalled();

  const checklistItems = useMemo<OnboardingChecklistItems>(
    () => [
      {
        done: data?.didAttest,
        label: 'Connect X/Twitter',
        tooltip: 'Connect a wallet and X/Twitter from your profile settings page',
        actionLink: '/profile/settings',
      },
      {
        done: data?.didReview,
        label: 'Write a review',
        tooltip: 'Write a review for any other user on Ethos.',
      },
      {
        done: data?.didVouch,
        label: 'Vouch for someone',
        tooltip: 'Vouch for any other user on Ethos, with any amount.',
      },
      {
        done: data?.didVouchReciprocation,
        label: 'Get a vouch reciprocated',
        tooltip:
          'For any vouch you have, get one back from the person you vouched for to complete this task.',
        actionLink: '/profile/vouches',
      },
      {
        done: data?.didSendAcceptedInvite,
        label: 'Get an invite accepted',
        tooltip: 'Send an invite to a non Ethos user and get them to accept it.',
        actionLink: '/invite',
      },
      {
        done: isExtensionInstalled,
        label: 'Get the Chrome app',
        tooltip: 'Install the Chrome extension and make sure it is enabled.',
        actionLink: chromeExtensionLink,
      },
      {
        done: data?.isScoreTargetReached,
        label: (
          <>
            Maintain at least {TARGET_SCORE} <Logo />
          </>
        ),
        tooltip: `Maintain a score of ${TARGET_SCORE} or higher to complete this task.`,
        actionLink: routeTo(
          connectedProfilePrimaryAddress ? { address: connectedProfilePrimaryAddress } : null,
        ).profile,
      },
    ],
    [data, connectedProfilePrimaryAddress, isExtensionInstalled],
  );

  const completedCount = checklistItems.reduce((acc, item) => acc + (item.done ? 1 : 0), 0);
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  useEffect(() => {
    if (data) {
      const falseCount = Object.values(data).filter(
        (value) => typeof value === 'boolean' && !value,
      ).length;
      onCountChanged(falseCount);
    }
  }, [data, onCountChanged]);

  return (
    <Space
      direction="vertical"
      size={16}
      css={css`
        width: 100%;
      `}
    >
      <Card
        css={css`
          background-color: ${tokenCssVars.colorBgElevated};
          margin-top: 12px;
          .ant-card-body {
            padding: 10px;
          }
        `}
      >
        <Flex align="center" gap={15}>
          <Progress type="circle" percent={progressPercent} size={60} />
          <Typography.Text>
            {progressPercent === 100
              ? 'You are on track to unlock Ethos testnet sticker pack!'
              : 'Complete all tasks to unlock Ethos testnet sticker pack.'}
          </Typography.Text>
        </Flex>
      </Card>

      <List
        size="small"
        bordered
        dataSource={checklistItems}
        renderItem={(item) => (
          <List.Item
            css={css`
              padding: 4px 0px 8px 0px;
              position: relative;
            `}
          >
            <Tooltip title={item.tooltip}>
              <Space>
                <Checkbox checked={item.done} />
                <Typography.Text
                  type={item.done ? 'secondary' : undefined}
                  css={css`
                    text-decoration: ${item.done ? 'line-through' : undefined};
                  `}
                >
                  {item.label}
                </Typography.Text>
              </Space>
            </Tooltip>
            {item.actionLink && !item.done && (
              <Link
                href={item.actionLink}
                css={css`
                  right: 0;
                `}
              >
                <ArrowRightOutlined />
              </Link>
            )}
          </List.Item>
        )}
        css={css`
          width: 100%;
          max-width: 300px;
          margin: 0 auto;
        `}
      />
    </Space>
  );
}
