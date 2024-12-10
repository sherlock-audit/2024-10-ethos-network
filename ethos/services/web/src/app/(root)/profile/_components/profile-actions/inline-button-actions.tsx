import { type Vouch, type VouchFunds } from '@ethos/blockchain-manager';
import { type LiteProfile } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Button, Flex, Tooltip } from 'antd';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { ReviewFilled, SlashFilled, VouchFilled, ManageAccounts } from 'components/icons';

type InlineButtonActionsProps = {
  isCurrentUser: boolean;
  targetProfile: LiteProfile | null | undefined;
  connectedProfile: LiteProfile | null | undefined;
  vouchByConnectedAddress: (Vouch & VouchFunds) | null;
  onReviewClick: () => void;
  onVouchClick: () => void;
  onUnvouchClick: () => void;
};

export function InlineButtonActions({
  isCurrentUser,
  targetProfile,
  connectedProfile,
  vouchByConnectedAddress,
  onReviewClick,
  onVouchClick,
  onUnvouchClick,
}: InlineButtonActionsProps) {
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
              <Button type="primary" icon={<VouchFilled />} onClick={onUnvouchClick}>
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
      </Flex>
    );
  }

  // If the current user is viewing their own profile and has a connected Ethos profile
  if (connectedProfile) {
    return (
      <Flex gap="small" align="center">
        <Button type="primary" icon={<VouchFilled />} href="/profile/vouches">
          Vouch balances
        </Button>
        <Button type="primary" icon={<ManageAccounts />} href="/profile/settings">
          Settings
        </Button>
      </Flex>
    );
  }

  // no actions to display
  return null;
}
