import { css } from '@emotion/react';
import { Button, Tooltip, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { Close } from 'components/icons';
import { ONBOARDING_SKIP_SESSION_KEY } from 'constant/constants';
import { useSessionStorage } from 'hooks/use-storage';

export function SkipOnboardingButton({ isMobile }: { isMobile?: boolean }) {
  const { token } = theme.useToken();
  const [, setSkipOnboardingValue] = useSessionStorage<boolean>(ONBOARDING_SKIP_SESSION_KEY);
  const router = useRouter();

  return (
    <Tooltip
      title="Onboard later"
      css={
        isMobile &&
        css`
          @media (min-width: ${token.screenLG}px) {
            display: none;
          }
        `
      }
    >
      <Button
        type="text"
        size="large"
        onClick={() => {
          setSkipOnboardingValue(true);

          if (window.history.length > 2) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        css={css`
          position: absolute;
          top: ${isMobile ? 20 : 32}px;
          right: ${isMobile ? 20 : 40}px;
        `}
        icon={<Close />}
      />
    </Tooltip>
  );
}
