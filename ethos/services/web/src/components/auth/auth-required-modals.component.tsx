import { Modal } from 'antd';
import { InviteRequired } from './invite-required.component';
import { WalletNotConnected } from './wallet-not-connected.component';
import { WrongNetwork } from './wrong-network.component';
import { useAuthModals } from 'contexts/auth-modals.context';

export function AuthRequiredModals() {
  const { setActiveModal, activeModal } = useAuthModals();

  function onCancel() {
    setActiveModal(null);
  }

  return (
    <Modal
      open={Boolean(activeModal)}
      onCancel={onCancel}
      footer={null}
      centered
      styles={{
        content: {
          paddingBlock: 50,
        },
      }}
    >
      {activeModal === 'connect' && <WalletNotConnected />}
      {activeModal === 'invite' && <InviteRequired closeModal={onCancel} />}
      {activeModal === 'wrong-network' && <WrongNetwork />}
    </Modal>
  );
}
