import { DiscordFilled, XOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { useCopyToClipboard } from '@ethos/common-ui';
import { type LiteProfile, type EthosUserTarget } from '@ethos/domain';
import { isValidAddress } from '@ethos/helpers';
import { Button, Tooltip } from 'antd';
import Link from 'next/link';
import { type Address } from 'viem';
import { Wallet } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { type ExtendedAttestation } from 'hooks/user/lookup';
import { type echoApi } from 'services/echo';
import { getServiceAccountUrl } from 'utils/routing';

type ProfileCardAttestationProps = {
  profile: LiteProfile | undefined | null;
  twitterProfile?: NonNullable<Awaited<ReturnType<typeof echoApi.twitter.user.get>>>;
  target: EthosUserTarget;
  attestations: ExtendedAttestation[];
  displayAddress: Address | undefined | null;
};

const iconClassName = css`
  color: ${tokenCssVars.colorTextTertiary};
`;

export const attestationIcons = {
  'x.com': <XOutlined css={iconClassName} />,
  discord: <DiscordFilled css={iconClassName} />,
};

export function ProfileCardAttestations({
  profile,
  twitterProfile,
  target,
  attestations,
  displayAddress,
}: ProfileCardAttestationProps) {
  const copyToClipboard = useCopyToClipboard();

  async function copyAddress(address: string) {
    if (address) {
      await copyToClipboard(address, 'Wallet address successfully copied');
    }
  }

  return (
    <>
      {/* Show attestation icons for Ethos users with profiles */}
      {profile &&
        attestations?.map((item) => (
          <Link
            key={`${item.attestation.service}-${item.attestation.account}`}
            target="_blank"
            href={getServiceAccountUrl({
              service: item.attestation.service,
              account: item.extra.username,
            })}
          >
            <Tooltip title={`@${item.extra.username}`}>
              <Button type="text" icon={attestationIcons[item.attestation.service]} />
            </Tooltip>
          </Link>
        ))}
      {/* Show attestation icon if this is (not yet) an Ethos user with a profile */}
      {!profile &&
        'service' in target &&
        twitterProfile &&
        Object.keys(attestationIcons).includes(target.service) && (
          <Link
            target="_blank"
            href={getServiceAccountUrl({
              service: target.service,
              account: twitterProfile.username,
            })}
          >
            <Tooltip title={`@${twitterProfile.username}`}>
              <Button
                type="text"
                icon={attestationIcons[target.service as keyof typeof attestationIcons]}
              />
            </Tooltip>
          </Link>
        )}
      {/* Show wallet icon if user has a valid address */}
      {isValidAddress(displayAddress) && (
        <Tooltip title={displayAddress}>
          <Button
            onClick={async () => {
              await copyAddress(displayAddress?.toString());
            }}
            icon={<Wallet css={iconClassName} />}
            type="text"
          />
        </Tooltip>
      )}
    </>
  );
}
