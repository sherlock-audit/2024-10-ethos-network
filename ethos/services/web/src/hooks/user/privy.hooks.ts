import { extractEchoErrorMessage } from '@ethos/echo-client';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { App } from 'antd';
import { useEffect } from 'react';
import { useCreatePrivyLogin } from 'hooks/api/web.hooks';

const { useApp } = App;

export function useLoginEthosUser() {
  const { notification } = useApp();
  const { logout } = usePrivy();
  const createPrivyLogin = useCreatePrivyLogin({
    onError() {
      logout();
    },
  });

  const { login } = useLogin({
    onComplete(_user, _isNewUser, wasAlreadyAuthenticated) {
      if (wasAlreadyAuthenticated) return;

      createPrivyLogin.mutate();
    },
  });

  const { error: createPrivyLoginError } = createPrivyLogin;

  useEffect(() => {
    if (!createPrivyLoginError) return;

    notification.error({
      message: 'Failed to create Ethos login',
      description: extractEchoErrorMessage(createPrivyLoginError),
    });
  }, [createPrivyLoginError, notification]);

  return login;
}
