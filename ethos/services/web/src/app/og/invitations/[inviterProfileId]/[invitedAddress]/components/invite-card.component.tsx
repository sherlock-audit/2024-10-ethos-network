import { type ActivityActor } from '@ethos/domain';
import { isAddressEqualSafe } from '@ethos/helpers';
import { type Address, zeroAddress } from 'viem';
import { Avatar } from '../../../../_components/avatar.component';
import { TestnetMark } from '../../../../_components/testnet-mark.component';
import { Button } from 'app/og/_components/button.component';
import { Card } from 'app/og/_components/card.component';
import { TestnetWarning } from 'app/og/_components/testnet-warning.component';
import { getAvatar } from 'app/og/utils/avatar';
import { LogoFullSvg, LogoInvertedSvg } from 'components/icons/logo.svg';
import { lightTheme } from 'config';

type InviteCardProps = {
  inviterProfile: ActivityActor;
  invitedAddress: Address;
};

const colorPrimary = lightTheme.token.colorPrimary;

export function InviteCard({ inviterProfile, invitedAddress }: InviteCardProps) {
  return (
    <Card elevated>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ display: 'flex', position: 'absolute', top: '23px' }}>
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
          marginTop: '60px',
        }}
      >
        {(inviterProfile.avatar ?? inviterProfile.primaryAddress) ? (
          <Avatar
            avatar={getAvatar(inviterProfile.avatar, inviterProfile.primaryAddress)}
            size="95px"
          />
        ) : (
          <LogoInvertedSvg />
        )}
        <span style={{ fontWeight: 400, fontFamily: 'Queens', fontSize: '30px' }}>
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
          marginTop: '130px',
        }}
      >
        <span style={{ fontWeight: 400, fontFamily: 'Queens', fontSize: '38px' }}>
          An invitation to Ethos {isAddressEqualSafe(invitedAddress, zeroAddress) ? '' : 'for'}
        </span>
        {!isAddressEqualSafe(invitedAddress, zeroAddress) && (
          <span style={{ fontWeight: 600, fontSize: '24px', color: colorPrimary }}>
            {invitedAddress}
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
      xmlns="http://www.w3.org/2000/svg"
      width="1155"
      height="287"
      viewBox="0 0 1155 287"
      fill="none"
    >
      <path d="M-4 2L574.5 284L1153 2" stroke="#1F2126" strokeOpacity="0.15" strokeWidth="4" />
    </svg>
  );
}

function LetterOutlineLeft() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="475"
      height="244"
      viewBox="0 0 475 244"
      fill="none"
    >
      <path d="M474 2L0 242" stroke="#1F2126" strokeOpacity="0.15" strokeWidth="4" />
    </svg>
  );
}

function LetterOutlineRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="477"
      height="244"
      viewBox="0 0 477 244"
      fill="none"
    >
      <path d="M1.00001 2L477 242" stroke="#1F2126" strokeOpacity="0.15" strokeWidth="4" />
    </svg>
  );
}
