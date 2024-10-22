import { type PropsWithChildren } from 'react';
import { AuthModalsProvider } from 'contexts/auth-modals.context';
import { ContributorModeProvider } from 'contexts/contributor-mode.context';
import { UnvouchModalProvider } from 'contexts/unvouch-modal.context';

export function ModalProviders({ children }: PropsWithChildren) {
  return (
    <AuthModalsProvider>
      <UnvouchModalProvider>
        <ContributorModeProvider>{children}</ContributorModeProvider>
      </UnvouchModalProvider>
    </AuthModalsProvider>
  );
}
