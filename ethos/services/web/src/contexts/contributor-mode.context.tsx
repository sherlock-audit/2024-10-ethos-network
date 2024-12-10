import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { ContributorMode } from 'app/(root)/_feed-features/contributor-mode/contributor-mode.component';

const ContributorModeContext = createContext<{
  isContributorModeOpen: boolean;
  setIsContributorModeOpen: (isContributorModeOpen: boolean) => void;
}>({ isContributorModeOpen: false, setIsContributorModeOpen: () => null });

export function ContributorModeProvider({ children }: PropsWithChildren) {
  const [isContributorModeOpen, setIsContributorModeOpen] = useState(false);

  return (
    <ContributorModeContext.Provider value={{ isContributorModeOpen, setIsContributorModeOpen }}>
      {children}
      <ContributorMode />
    </ContributorModeContext.Provider>
  );
}

export function useContributorMode() {
  const context = useContext(ContributorModeContext);

  if (context === undefined) {
    throw new Error('useContributorMode must be used within a ContributorModeProvider');
  }

  return context;
}
