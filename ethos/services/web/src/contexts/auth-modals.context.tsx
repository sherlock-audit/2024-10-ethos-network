import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { AuthRequiredModals } from 'components/auth/auth-required-modals.component';

type ActiveModal = null | 'connect' | 'invite' | 'wrong-network';

type AuthModalsContextType = {
  activeModal: ActiveModal;
  setActiveModal: (state: ActiveModal) => void;
};

const AuthModalsContext = createContext<AuthModalsContextType>({
  activeModal: null,
  setActiveModal: () => null,
});

function AuthModalsProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ActiveModal>(null);

  return (
    <AuthModalsContext.Provider value={{ activeModal: state, setActiveModal: setState }}>
      {children}
      <AuthRequiredModals />
    </AuthModalsContext.Provider>
  );
}

function useAuthModals() {
  const context = useContext(AuthModalsContext);

  if (!context) {
    throw new Error('useAuthModals must be used within a AuthModalsProvider');
  }

  return context;
}

export { AuthModalsProvider, useAuthModals };
