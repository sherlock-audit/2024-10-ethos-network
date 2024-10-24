import { AreaChartOutlined } from '@ant-design/icons';
import { type Vouch, type VouchFunds } from '@ethos/blockchain-manager';
import { type LiteProfile } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { useFeatureGate } from '@statsig/react-bindings';
import { Button, Flex, Tooltip } from 'antd';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { ReviewFilled, SlashFilled, VouchFilled, ManageAccounts } from 'components/icons';
import { featureGates } from 'constant/feature-flags';
import { useMarketExists } from 'hooks/market/market.hooks';
import { useRouteTo } from 'hooks/user/hooks';

type InlineButtonActionsProps = {
  isCurrentUser: boolean;
  targetProfile: LiteProfile | null | undefined;
  connectedProfile: LiteProfile | null | undefined;
  vouchByConnectedAddress: (Vouch & VouchFunds) | null;
  onReviewClick: () => void;
  onVouchClick: () => void;
};

export function InlineButtonActions({
  isCurrentUser,
  targetProfile,
  connectedProfile,
  vouchByConnectedAddress,
  onReviewClick,
  onVouchClick,
}: InlineButtonActionsProps) {
  const { value: isReputationMarketEnabled } = useFeatureGate(
    featureGates.isReputationMarketEnabled,
  );
  const isMarketCreated = useMarketExists(targetProfile?.id);
  const showMarketButton = isReputationMarketEnabled && isMarketCreated;
  const { data: routes } = useRouteTo({ profileId: targetProfile?.id ?? 0 });
  const vouchedAmount = vouchByConnectedAddress?.staked ?? 0n;

  // If the profile being viewed does not belong to the current user
  if (!isCurrentUser) {
    return (
      <Flex gap="small" align="center">
        <AuthMiddleware>
          <Button type="primary" icon={<ReviewFilled />} onClick={onReviewClick}>
            Review
          </Button>
        </AuthMiddleware>
        {vouchByConnectedAddress ? (
          <AuthMiddleware>
            <Tooltip title="Remove vouch?">
              <Button type="primary" icon={<VouchFilled />} onClick={onVouchClick}>
                Vouched · {formatEth(vouchedAmount)}
              </Button>
            </Tooltip>
          </AuthMiddleware>
        ) : (
          <AuthMiddleware>
            {!targetProfile ? (
              <CustomPopover
                content={
                  <div>
                    You cannot vouch for accounts who do not have connected Ethos profiles.
                    <br />
                    You can, however, review this user.
                  </div>
                }
                title="Account does not have an Ethos profile"
                trigger="click"
              >
                <Button type="primary" icon={<VouchFilled />}>
                  Vouch
                </Button>
              </CustomPopover>
            ) : (
              <Button type="primary" icon={<VouchFilled />} onClick={onVouchClick}>
                Vouch
              </Button>
            )}
          </AuthMiddleware>
        )}
        <CustomPopover
          content={<div>Slashing will be enabled for Ethos at a later date.</div>}
          title="Coming Soon"
          trigger="click"
        >
          <Button type="primary" icon={<SlashFilled />}>
            Slash
          </Button>
        </CustomPopover>
        {showMarketButton && (
          <Button type="primary" icon={<AreaChartOutlined />} href={routes.market}>
            Market
          </Button>
        )}
      </Flex>
    );
  }

  // If the current user is viewing their own profile and has a connected Ethos profile
  if (connectedProfile) {
    return (
      <Flex gap="small" align="center">
        {showMarketButton && (
          <Button type="primary" icon={<AreaChartOutlined />} href={routes.market}>
            Market
          </Button>
        )}
        <Button type="primary" icon={<VouchFilled />} href="/profile/vouches">
          Vouch balances
        </Button>
        <Button type="primary" icon={<ManageAccounts />} href="/profile/settings">
          Profile settings
        </Button>
      </Flex>
    );
  }

  // no actions to display
  return null;
}
