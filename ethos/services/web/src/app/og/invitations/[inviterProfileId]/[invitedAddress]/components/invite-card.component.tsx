import { LogoFullSvg, LogoInvertedSvg } from '@ethos/common-ui';
import { type ActivityActor } from '@ethos/domain';
import { isAddressEqualSafe, shortenHash } from '@ethos/helpers';
import { type Address, zeroAddress } from 'viem';
import { Avatar } from '../../../../_components/avatar.component';
import { TestnetMark } from '../../../../_components/testnet-mark.component';
import { Button } from 'app/og/_components/button.component';
import { Card } from 'app/og/_components/card.component';
import { TestnetWarning } from 'app/og/_components/testnet-warning.component';
import { getAvatar } from 'app/og/utils/avatar';
import { lightTheme } from 'config/theme';

type InviteCardProps = {
  inviterProfile: ActivityActor;
  invitedAddress: Address;
};

const colorPrimary = lightTheme.token.colorPrimary;

export function InviteCard({ inviterProfile, invitedAddress }: InviteCardProps) {
  return (
    <Card elevated outerSpace={false}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ display: 'flex', position: 'absolute', left: '3px' }}>
          <LetterOutlineTop />
        </div>
        <div style={{ display: 'flex', position: 'absolute', bottom: '100px' }}>
          <LetterOutlineLeft />
        </div>
        <div style={{ display: 'flex', position: 'absolute', bottom: '98px', right: 0 }}>
          <LetterOutlineRight />
        </div>
        <TestnetMark />

        <Body inviterProfile={inviterProfile} invitedAddress={invitedAddress} />
        <Footer />
      </div>
    </Card>
  );
}

function Body({ inviterProfile, invitedAddress }: InviteCardProps) {
  return (
    <div
      style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          margin: 'auto',
          marginTop: '25px',
        }}
      >
        <div style={{ fontWeight: 400, fontFamily: 'Queens', fontSize: '65px' }}>
          Ethos invitation from
        </div>
        {(inviterProfile.avatar ?? inviterProfile.primaryAddress) ? (
          <Avatar
            avatar={getAvatar(inviterProfile.avatar, inviterProfile.primaryAddress)}
            size="60px"
          />
        ) : (
          <LogoInvertedSvg />
        )}
        <span
          style={{ fontWeight: 400, fontFamily: 'Queens', fontSize: '24px', color: colorPrimary }}
        >
          {inviterProfile?.name}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          margin: 'auto',
          marginTop: '100px',
        }}
      >
        <span style={{ fontWeight: 400, fontFamily: 'Queens', fontSize: '38px' }}>
          {isAddressEqualSafe(invitedAddress, zeroAddress) ? '' : 'for'}
        </span>
        {isAddressEqualSafe(invitedAddress, zeroAddress) ? null : (
          <Avatar avatar={getAvatar(null, invitedAddress)} size="60px" />
        )}
        {!isAddressEqualSafe(invitedAddress, zeroAddress) && (
          <span style={{ fontWeight: 500, fontSize: '20px', color: colorPrimary }}>
            {shortenHash(invitedAddress)}
          </span>
        )}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100px',
        padding: '0 35px',
        backgroundColor: lightTheme.token.colorBgLayout,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          fontSize: '45px',
          fontFamily: 'queens',
          color: lightTheme.token.colorText,
        }}
      >
        <LogoFullSvg />
      </div>
      <TestnetWarning />
      <Button color={lightTheme.token.colorPrimary} width="261px" height="61px">
        Accept an Invite
      </Button>
    </div>
  );
}

function LetterOutlineTop() {
  return (
    <svg
      width="1194"
      height="357"
      viewBox="0 0 1194 357"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.257812 0.570312L593.258 355.57M1193.26 1.42963L593.256 356.43"
        stroke="#1F2126"
        strokeOpacity="0.15"
        strokeWidth="4"
      />
    </svg>
  );
}

function LetterOutlineLeft() {
  return (
    <svg
      width="477"
      height="244"
      viewBox="0 0 477 244"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="0.772659"
        y1="243.555"
        x2="476.773"
        y2="0.554689"
        stroke="#1F2126"
        strokeOpacity="0.15"
        strokeWidth="4"
      />
    </svg>
  );
}

function LetterOutlineRight() {
  return (
    <svg
      width="486"
      height="245"
      viewBox="0 0 486 245"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="485.775"
        y1="244.447"
        x2="0.775257"
        y2="0.446654"
        stroke="#1F2126"
        strokeOpacity="0.15"
        strokeWidth="4"
      />
    </svg>
  );
}
