'use client';
import { css } from '@emotion/react';
import { type VouchFunds, type Vouch } from '@ethos/blockchain-manager';
import { useCopyToClipboard } from '@ethos/common-ui';
import { type LiteProfile, type EthosUserTarget } from '@ethos/domain';
import { isAddressEqualSafe, isValidAddress } from '@ethos/helpers';
import { useFeatureGate } from '@statsig/react-bindings';
import { Flex, Col, Button, Typography, Row, Skeleton, Tooltip, theme } from 'antd';
import { useEffect, useState } from 'react';
import { type Address, zeroAddress } from 'viem';
import { type ProfilePageOptions } from '../profile-page.utils';
import { UnvouchModalComponent } from '../vouches/_components/unvouch-modal.component';
import { Activities } from './activities/activities.component';
import { EarnMoreExp } from './ear-more-exp/earn-more-exp.component';
import { Highlights } from './highlights/highlights.component';
import { MostCredibleVouchersPlug } from './most-credible/most-credible-disabled.component';
import { MostCredibleVouchers } from './most-credible/most-credible.component';
import { ProfileActions } from './profile-actions';
import { ProfileCard } from './profile-card/profile-card.component';
import { ReviewModal } from './review-modal/review-modal.component';
import { TopReviews } from './top-reviews/top-reviews.component';
import { VouchModal } from './vouch-modal/vouch-modal.component';
import { InviteModal } from 'app/(root)/invite/_components/invite-modal.component';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { InviteFilled } from 'components/icons';
import { PersonName } from 'components/person-name/person-name.component';
import { tokenCssVars } from 'config/theme';
import { featureGates } from 'constant/feature-flags';
import { useCurrentUser, useIsTargetCurrentUser } from 'contexts/current-user.context';
import { useAuthMiddleware } from 'hooks/use-auth-middleware';
import { useActor, useInvitesAcceptedBy, useMutualVouchers } from 'hooks/user/activities';
import {
  useProfile,
  useReviewStats,
  useVouchStats,
  usePrimaryAddress,
  useVouchesBySubject,
} from 'hooks/user/lookup';
import { type echoApi } from 'services/echo';
import { generateProfileInviteUrl } from 'utils/routing';

const { Title, Text } = Typography;

type Props = {
  target: EthosUserTarget;
  twitterProfile?: NonNullable<Awaited<ReturnType<typeof echoApi.twitter.user.get>>>;
  name: string;
  options?: ProfilePageOptions;
};

/**
 * Custom hook to retrieve invitation information for a user.
 *
 * @param target - The target user for which to retrieve invitation information.
 * @returns An object containing the name and address of the user who invited the target user.
 */
function useInvitationInfo(target: EthosUserTarget) {
  const originInvitationAddress = '0x7568033fa1C69BB90bCD8e28432E243Ffb1C65b4';

  const profile = useProfile(target).data;
  const invitedBy = profile?.invitedBy ?? 0;
  const invitedByAddress = usePrimaryAddress({ profileId: invitedBy }).data ?? zeroAddress;
  const invitedByName = useActor({ profileId: invitedBy }).name;
  const name = isAddressEqualSafe(originInvitationAddress, invitedByAddress)
    ? 'Ethos Origin Contract'
    : invitedByName;

  if (!profile || typeof profile.id !== 'number') {
    return null;
  }

  return {
    name,
    address: invitedByAddress,
  };
}

function useHasVouchedForUser(target: EthosUserTarget): (Vouch & VouchFunds) | null {
  const { connectedProfile } = useCurrentUser();
  const { data: vouches } = useVouchesBySubject(target);

  return (
    vouches?.values.find(
      (vouch) => vouch.authorProfileId === connectedProfile?.id && !vouch.archived,
    ) ?? null
  );
}

function InviteButton({
  target,
  targetProfile,
  connectedProfile,
  isTargetProfilePending,
  connectedProfileLoading,
  showInviteModal,
  isInviteModalOpen,
  hideInviteModal,
}: {
  target: EthosUserTarget;
  targetProfile: LiteProfile | null | undefined;
  connectedProfile: LiteProfile | null | undefined;
  isTargetProfilePending: boolean;
  connectedProfileLoading: boolean;
  showInviteModal: () => void;
  isInviteModalOpen: boolean;
  hideInviteModal: () => void;
}) {
  const targetAddress = 'address' in target ? target.address : zeroAddress;
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const copyToClipboard = useCopyToClipboard();

  const style = css`
    margin-left: 8px;
    margin-top: 6px;
  `;

  // TODO: CORE-1117 - followup. We no longer have inviteInfo on profile.
  const invitedByConnectedAddress = false;
  // connectedProfile?.inviteInfo.sent.some((address) =>
  //   isAddressEqualSafe(address, targetAddress),
  // );

  useEffect(() => {
    if (connectedProfile && invitedByConnectedAddress) {
      generateProfileInviteUrl(connectedProfile.id, targetAddress).then(async (link) => {
        setInvitationLink(link);
      });
    }
  }, [connectedProfile, targetAddress, invitedByConnectedAddress]);

  // can't invite via attestation (ie, profile/x/etc) only an address (ie, profile/0x123)
  if (!isValidAddress(targetAddress)) return null;
  // show loading state if the profiles are still loading
  // TODO this loading state is kind of ugly
  if (isTargetProfilePending) return <Skeleton.Button active size="small" css={style} />;
  if (connectedProfileLoading) return <Skeleton.Button active size="small" css={style} />;

  // if the target user has an ethos profile, don't show the invite button
  if (targetProfile) return null;

  // can't invite if you don't have an ethos profile
  if (!connectedProfile) return null;

  // if this user invited the target user, show a disabled invite button
  if (invitedByConnectedAddress) {
    return (
      <Button
        onClick={async () => {
          if (invitationLink) {
            await copyToClipboard(invitationLink, 'Link successfully copied');
          }
        }}
        css={style}
        type="primary"
        size="small"
        icon={<InviteFilled />}
        ghost
      >
        {invitationLink ? 'Copy invitation link' : 'Invitation sent'}
      </Button>
    );
  }

  // if the user has no invitations to send, show a disabled invite button
  if (connectedProfile.invitesAvailable <= 0) {
    return (
      <CustomPopover content="You have no invitations to send" trigger="click">
        <Button css={style} type="primary" size="small" icon={<InviteFilled />} ghost>
          Invite to Ethos
        </Button>
      </CustomPopover>
    );
  }

  // after all that, show the invite button
  return (
    <Tooltip title="Send an invitation">
      <Button
        css={style}
        type="primary"
        size="small"
        icon={<InviteFilled />}
        onClick={showInviteModal}
      >
        Invite to Ethos
      </Button>
      <InviteModal isOpen={isInviteModalOpen} close={hideInviteModal} address={targetAddress} />
    </Tooltip>
  );
}

function InvitedByInfo({
  invitedBy,
  invitedByProfile,
}: {
  invitedBy: { address: Address } | null | undefined;
  invitedByProfile: ReturnType<typeof useActor>;
}) {
  if (!invitedBy) return null;

  return (
    <Text
      type="secondary"
      css={css`
        font-size: 14px;
        margin-top: 8px;
      `}
    >
      <InviteFilled /> Invited by{' '}
      <PersonName target={invitedByProfile} weight="default" color="colorPrimary" openInNewTab />
    </Text>
  );
}

export function ProfilePage({ target, twitterProfile, name, options = {} }: Props) {
  const { token } = theme.useToken();
  const { handleAuth } = useAuthMiddleware();

  const showExpClaimPage = useFeatureGate(featureGates.showExpClaimPage).value;

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isVouchModalOpen, setIsVouchModalOpen] = useState(false);
  const [isUnvouchModalOpen, setIsUnvouchModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const isCurrentUser = useIsTargetCurrentUser(target);
  const vouchByConnectedAddress = useHasVouchedForUser(target);

  const reviewStats = useReviewStats(target).data;
  const vouchStats = useVouchStats(target).data;
  const { data: targetProfile, isPending: isTargetProfilePending } = useProfile(target);

  const invitedBy = useInvitationInfo(target);

  const invitedByProfile = useActor({ address: invitedBy?.address ?? zeroAddress });

  // Limiting at an arbitrary number for now during testnet to mitigate unnecessary data tx from echo.
  const { data: invitesAcceptedBy = [] } = useInvitesAcceptedBy(targetProfile?.id, 20);

  const { connectedProfile, isConnectedProfileLoading } = useCurrentUser();

  const { data: mutualVouchers = [] } = useMutualVouchers(
    { profileId: connectedProfile?.id ?? -1 },
    { profileId: targetProfile?.id ?? -1 },
  );

  function showReviewModal() {
    setIsReviewModalOpen(true);
  }

  function hideReviewModal() {
    setIsReviewModalOpen(false);
  }

  function showVouchModal() {
    setIsVouchModalOpen(true);
  }

  function hideVouchModal() {
    setIsVouchModalOpen(false);
  }

  function showUnvouchModal() {
    setIsUnvouchModalOpen(true);
  }

  function hideUnvouchModal() {
    setIsUnvouchModalOpen(false);
  }

  function showInviteModal() {
    setIsInviteModalOpen(true);
  }

  function hideInviteModal() {
    setIsInviteModalOpen(false);
  }

  useEffect(() => {
    if (!options?.modal) return;

    handleAuth().then((result) => {
      if (!result) return;

      if (options.modal === 'review') {
        setIsReviewModalOpen(true);
      } else if (options.modal === 'vouch') {
        setIsVouchModalOpen(true);
      }
    });
  }, [options?.modal, handleAuth]);

  return (
    <Row gutter={[23, 28]}>
      {showExpClaimPage && (
        <Col span={24}>
          <EarnMoreExp />
        </Col>
      )}
      <Col span={24}>
        <Flex
          css={css`
            background: ${tokenCssVars.colorBgLayout};
            padding: 12px 0;
          `}
          justify="space-between"
          align="center"
        >
          <Flex
            align="flex-start"
            css={css`
              padding-top: 4px;
              padding-bottom: 4px;
            `}
          >
            <Flex
              align="center"
              gap="small"
              css={css`
                @media (max-width: ${token.screenSM}px) {
                  flex-direction: column;
                  align-items: flex-start;
                  gap: 0;
                }
              `}
            >
              <Title
                level={2}
                css={css`
                  margin-bottom: 0;
                `}
              >
                {!isCurrentUser ? (
                  name ? (
                    `${name}'s profile`
                  ) : (
                    <Skeleton.Input active />
                  )
                ) : (
                  'My profile'
                )}
              </Title>
              <InvitedByInfo invitedBy={invitedBy} invitedByProfile={invitedByProfile} />
            </Flex>
            <InviteButton
              target={target}
              targetProfile={targetProfile}
              connectedProfile={connectedProfile}
              isTargetProfilePending={isTargetProfilePending}
              connectedProfileLoading={isConnectedProfileLoading}
              showInviteModal={showInviteModal}
              isInviteModalOpen={isInviteModalOpen}
              hideInviteModal={hideInviteModal}
            />
          </Flex>
          <ProfileActions
            isCurrentUser={isCurrentUser}
            targetProfile={targetProfile}
            connectedProfile={connectedProfile}
            onReviewClick={showReviewModal}
            onVouchClick={showVouchModal}
            onUnvouchClick={showUnvouchModal}
            vouchByConnectedAddress={vouchByConnectedAddress}
          />
        </Flex>
        <Row gutter={[23, 38]}>
          <Col xs={{ span: 24 }} md={{ span: 24 }} lg={{ span: 12 }}>
            <ProfileCard
              target={target}
              twitterProfile={twitterProfile}
              isScoreAnimationEnabled={true}
            />
          </Col>
          <Col xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 6 }}>
            {!targetProfile ? (
              <MostCredibleVouchersPlug />
            ) : (
              <MostCredibleVouchers target={target} />
            )}
          </Col>
          <Col xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 6 }}>
            <Highlights
              positiveReviewsPercentage={reviewStats?.positiveReviewPercentage ?? 0}
              reviewsPercentile={reviewStats?.percentile ?? 0}
              vouchedInOthers={vouchStats?.staked.deposited ?? 0}
              vouchedInOthersPercentile={vouchStats?.percentile.deposited ?? 0}
              numReviews={reviewStats?.received ?? 0}
              numVouched={vouchStats?.count.received ?? 0}
              vouched={vouchStats?.staked.received ?? 0}
              vouchedPercentile={vouchStats?.percentile.received ?? 0}
              acceptedActors={invitesAcceptedBy}
              mutualVouchers={mutualVouchers}
              mutualVouchersPercentile={vouchStats?.percentile.mutual ?? 0}
              mutualVouchersVisible={!isCurrentUser}
              dateJoinedVisible={isCurrentUser}
            />
          </Col>
        </Row>
      </Col>
      <Col span={24}>
        <Title
          css={css`
            margin-bottom: 12px;
          `}
          level={3}
        >
          What people are saying...
        </Title>
        <TopReviews target={target} />
      </Col>
      <Col span={24}>
        <Flex
          align="center"
          justify="space-between"
          css={css`
            margin-bottom: 12px;
          `}
        >
          <Title level={3}>Ethos activity</Title>
        </Flex>
        <Activities target={target} />
      </Col>
      <Col>
        <UnvouchModalComponent
          close={hideUnvouchModal}
          isOpen={isUnvouchModalOpen}
          vouch={vouchByConnectedAddress}
        />
        <VouchModal target={target} isOpen={isVouchModalOpen} close={hideVouchModal} />
        <ReviewModal target={target} isOpen={isReviewModalOpen} close={hideReviewModal} />
      </Col>
    </Row>
  );
}
