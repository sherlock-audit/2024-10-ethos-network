import { css } from '@emotion/react';
import { type PendingInvitation } from '@ethos/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Flex, theme, Typography } from 'antd';
import { zeroAddress } from 'viem';
import { AvailableInvitesList } from '../available-invites-list.component';
import { OnboardingStep } from '../onboarding-step.component';
import { invalidate } from 'constant/queries/cache.invalidation';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { useCreateProfile } from 'hooks/api/blockchain-manager';
import { useEventsProcessSync } from 'hooks/api/echo.hooks';
import { eventBus } from 'utils/event-bus';

type Props = {
  stepCompleted: () => void;
  invitationHover?: (invitation: PendingInvitation | null) => void;
  setSelectedInvitation: (invitation: PendingInvitation) => void;
  selectedInvitation: PendingInvitation | null;
  inviterProfileId: number | null;
};

export function AcceptInviteStep({
  stepCompleted,
  invitationHover,
  setSelectedInvitation,
  selectedInvitation,
  inviterProfileId,
}: Props) {
  const queryClient = useQueryClient();
  const createProfile = useCreateProfile();
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const target = { address: connectedAddress ?? zeroAddress };
  const { token } = theme.useToken();
  const eventsProcess = useEventsProcessSync();

  async function doCreateProfile() {
    try {
      if (selectedInvitation) {
        const { hash } = await createProfile.mutateAsync(selectedInvitation.id);

        if (connectedAddress) {
          await invalidate(queryClient, [
            cacheKeys.score.history(target),
            cacheKeys.score.byTarget(target),
          ]);
        }

        const tx = eventsProcess.mutateAsync({ txHash: hash });
        tx.finally(() => {
          eventBus.emit('SCORE_UPDATED');
          stepCompleted();
        });
      }
    } catch {
      // No special cases to handle
    }
  }

  return (
    <OnboardingStep
      icon={
        <div
          css={css`
            position: relative;
            width: 150px;
            height: 150px;
          `}
        >
          <div
            css={css`
              width: 180px;
              height: 180px;
              background-color: #669daa;
              border-radius: 50%;
            `}
          />
        </div>
      }
      title={
        <>
          Accept an
          <br />
          Invite
        </>
      }
      description={
        <Flex
          justify="center"
          css={css`
            width: 374px;
          `}
        >
          <Typography.Paragraph
            css={css`
              font-size: ${token.fontSizeLG}px;
            `}
          >
            Invitations from members with higher scores will increase your Ethos score the most.
          </Typography.Paragraph>
        </Flex>
      }
    >
      <AvailableInvitesList
        inviteeAddress={connectedAddress ?? null}
        originalInviterProfileId={inviterProfileId}
        selectedInvitation={selectedInvitation}
        invitationSelected={setSelectedInvitation}
        invitationHover={invitationHover}
        preselectFirstInvitation
      />
      <div>
        <Button
          type="primary"
          onClick={async () => {
            await doCreateProfile();
          }}
          disabled={!selectedInvitation}
          loading={createProfile.isPending}
        >
          {connectedProfile ? 'Next' : 'Accept'}
        </Button>
      </div>
    </OnboardingStep>
  );
}
