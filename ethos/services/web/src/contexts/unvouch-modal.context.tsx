import { type Vouch } from '@ethos/blockchain-manager';
import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { UnvouchModalComponent } from 'app/(root)/profile/vouches/_components/unvouch-modal.component';

type SelectedVouch = Vouch | null;

type UnvouchModalContextType = {
  selectedVouch: SelectedVouch;
  setSelectedVouch: (vouch: SelectedVouch) => void;
};

const UnvouchModalContext = createContext<UnvouchModalContextType>({
  selectedVouch: null,
  setSelectedVouch: () => null,
});

export function UnvouchModalProvider({ children }: PropsWithChildren) {
  const [selectedVouch, setSelectedVouch] = useState<SelectedVouch>(null);

  return (
    <UnvouchModalContext.Provider value={{ selectedVouch, setSelectedVouch }}>
      {children}
      <UnvouchModalComponent
        isOpen={Boolean(selectedVouch)}
        vouch={selectedVouch}
        close={() => {
          setSelectedVouch(null);
        }}
      />
    </UnvouchModalContext.Provider>
  );
}

export function useUnvouchModal() {
  const context = useContext(UnvouchModalContext);

  if (!context) {
    throw new Error('useUnvouchModal must be used within a UnvouchModalProvider');
  }

  return {
    openUnvouchModal: context.setSelectedVouch,
  };
}
