import { css } from '@emotion/react';
import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { Card, Flex, Tag, theme, Tooltip, Typography } from 'antd';
import Link from 'next/link';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { attestationIcons } from 'app/(root)/profile/_components/profile-card/profile-card.attestations';
import { UserAvatar } from 'components/avatar/avatar.component';
import { Groups, Logo, ReviewFilled, VouchFilled } from 'components/icons';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useMutualVouchers } from 'hooks/user/activities';
import { useExtendedAttestations, useReviewStats, useVouchStats } from 'hooks/user/lookup';
import { getServiceAccountUrl } from 'utils/routing';

type ContributorProfileCardProps = {
  actor: ActivityActor;
  showScoreInBody?: boolean;
  compact?: boolean;
  footer: React.ReactNode;
};
const { cardWidth, titleWidth } = getCardWidthStyles();

export function ContributorProfileCard({
  actor,
  footer,
  showScoreInBody = false,
  compact = false,
}: ContributorProfileCardProps) {
  const { token } = theme.useToken();
  const target = fromUserKey(actor.userkey);
  const reviewStats = useReviewStats(target).data;
  const { connectedProfile } = useCurrentUser();
  const { data: vouchStats } = useVouchStats(target);
  const vouchedInUsd = useEthToUSD(vouchStats?.staked.received ?? 0);
  const attestationsResults = useExtendedAttestations(target).data ?? [];

  const { data: mutualVouchers = [] } = useMutualVouchers(
    { profileId: connectedProfile?.id ?? -1 },
    { profileId: actor?.profileId ?? -1 },
  );

  const attestations = attestationsResults?.filter((item) => !item?.attestation.archived);

  return (
    <Card
      css={css`
        ${contributorModeCard}
        width: ${cardWidth};
        background-image: url('/assets/images/score/contributor-background.svg');
        background-repeat: no-repeat;
        background-position: top -22px left 0px;
        background-blend-mode: overlay;
      `}
    >
      <Flex vertical gap={token.marginXL} align="center">
        <Flex vertical justify="space-between" align="center" gap={16}>
          <UserAvatar
            actor={actor}
            size={140}
            showHoverCard={false}
            showScore={!showScoreInBody}
            wrapperCSS={css`
              @media (max-height: 800px) {
                .ant-avatar {
                  width: 100px !important;
                  height: 100px !important;
                }
              }
            `}
          />
          <Typography.Title
            level={2}
            ellipsis={{ tooltip: true }}
            css={css`
              max-width: ${titleWidth};
            `}
          >
            {actor.name}
          </Typography.Title>
          {showScoreInBody && (
            <Flex
              css={{
                gap: token.marginSM,
                color: token.colorPrimary,
                alignItems: 'center',
              }}
            >
              <Typography.Title
                level={2}
                css={css`
                  color: inherit;
                  font-size: 67px;
                  line-height: 1;
                  @media screen and (max-height: 800px) {
                    font-size: 40px;
                  }
                `}
              >
                {actor.score}
              </Typography.Title>
              <Logo
                css={css`
                  font-size: 45px;
                  @media screen and (max-height: 800px) {
                    font-size: 28px;
                  }
                `}
              />
            </Flex>
          )}
          <Flex justify="center" align="center" gap={16} wrap>
            <Tag css={{ background: tokenCssVars.colorBgLayout }} icon={<ReviewFilled />}>
              {(reviewStats?.positiveReviewPercentage ?? 0).toFixed(0)}% Positive
            </Tag>
            {mutualVouchers.length > 0 && !compact ? (
              <Tag css={{ background: tokenCssVars.colorBgLayout }} icon={<Groups />}>
                {mutualVouchers.length} mutual vouchers
              </Tag>
            ) : null}
            <Tag css={{ background: tokenCssVars.colorBgLayout }} icon={<VouchFilled />}>
              {vouchedInUsd}
            </Tag>
            {!compact &&
              attestations.map((attestation) => (
                <Link
                  key={`${attestation.attestation.service}-${attestation.attestation.account}`}
                  target="_blank"
                  href={getServiceAccountUrl({
                    service: attestation.attestation.service,
                    account: attestation.extra.username,
                  })}
                >
                  <Tooltip title={`@${attestation.extra.username}`}>
                    <Tag icon={attestationIcons[attestation.attestation.service]}>
                      {attestation.attestation.account}
                    </Tag>
                  </Tooltip>
                </Link>
              ))}
          </Flex>
        </Flex>
        {footer}
      </Flex>
    </Card>
  );
}
