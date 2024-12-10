import { type PropsWithChildren } from 'react';
import { AuthModalsProvider } from 'contexts/auth-modals.context';
import { CommentsDrawerProvider } from 'contexts/comments-drawer.context';
import { ContributorModeProvider } from 'contexts/contributor-mode.context';
import { UnvouchModalProvider } from 'contexts/unvouch-modal.context';

export function ModalProviders({ children }: PropsWithChildren) {
  return (
    <AuthModalsProvider>
      <UnvouchModalProvider>
        <CommentsDrawerProvider>
          <ContributorModeProvider>{children}</ContributorModeProvider>
        </CommentsDrawerProvider>
      </UnvouchModalProvider>
    </AuthModalsProvider>
  );
}
