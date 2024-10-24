import { XOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { xComHelpers } from '@ethos/attestation';
import { type ProfileId } from '@ethos/blockchain-manager';
import { X_SERVICE } from '@ethos/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Modal, Popconfirm, Row, Steps } from 'antd';
import { useCallback, useState } from 'react';
import { type Address } from 'viem';
import { useSignMessage } from 'wagmi';
import { CompleteStep } from './complete.component';
import { ProfileStep } from './profile-step.component';
import { VerifyStep } from './verify-step.component';
import { cacheKeysFor, invalidate } from 'constant/queries/cache.invalidation';
import { useCurrentUser } from 'contexts/current-user.context';
import { useCreateAttestation } from 'hooks/api/blockchain-manager';
import { useGetSignatureForCreateAttestation, type useTwitterProfile } from 'hooks/api/echo.hooks';
import { useSimplifiedXAttestation } from 'hooks/use-simplified-x-attestation';
import { explodeUserTargets } from 'hooks/user/utils';
import { NetError } from 'utils/request-utils';

type Props = {
  close: () => void;
  isOpen: boolean;
  profileId: ProfileId;
};

type TwitterProfile = ReturnType<typeof useTwitterProfile>['data'];

export function XAttestationModal({ close, isOpen, profileId }: Props) {
  const [step, setStep] = useState(0);
  const [accountInput, setAccountInput] = useState('');
  const [twitterProfile, setTwitterProfile] = useState<TwitterProfile>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationErrorMsg, setVerificationErrorMsg] = useState<string>();
  const { connectedAddress } = useCurrentUser();
  const { isSimplifiedXAttestationEnabled } = useSimplifiedXAttestation();
  const [isConfirmToTweetOpen, setIsConfirmToTweetOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleLoadTwitterProfile = useCallback((profile: TwitterProfile) => {
    setTwitterProfile(profile);
  }, []);

  const { signMessage } = useSignMessage();
  const signatureForCreateAttestation = useGetSignatureForCreateAttestation();
  const createAttestation = useCreateAttestation({
    onError() {
      setVerificationErrorMsg('Failed to create attestation');
      setIsVerifying(false);
    },
    onSuccess(isTxConfirmed) {
      setIsVerifying(false);
      setVerificationErrorMsg(undefined);

      if (isTxConfirmed) {
        next();
      } else {
        prev();
      }
    },
  });

  const username = xComHelpers.extractAccount(accountInput);

  const next = useCallback(() => {
    setStep((prevValue) => prevValue + 1);
  }, []);

  const prev = useCallback(() => {
    setStep((preValue) => preValue - 1);
  }, []);

  const verifyAttestation = useCallback(async () => {
    setIsVerifying(true);

    if (!twitterProfile) {
      setIsVerifying(false);
      setVerificationErrorMsg('Couldn’t find a x.com profile');

      return;
    }

    const signature = await new Promise<Address | undefined>((resolve) => {
      signMessage(
        { message: xComHelpers.getVerifyMsg(twitterProfile.id) },
        {
          onError(error) {
            setIsVerifying(false);
            resolve(undefined);

            if (error.name === 'UserRejectedRequestError') {
              prev();
            }
          },
          async onSuccess(msgSignature) {
            resolve(msgSignature);
          },
        },
      );
    });

    if (!signature) {
      return;
    }

    let response: ReturnType<typeof useGetSignatureForCreateAttestation>['data'];

    try {
      response = await signatureForCreateAttestation.mutateAsync({
        service: X_SERVICE,
        account: twitterProfile.id,
        signature,
        isSimplified: isSimplifiedXAttestationEnabled,
      });
    } catch (error) {
      const errorMessage: string = error instanceof NetError && error.body?.error?.message;

      setIsVerifying(false);
      setVerificationErrorMsg(errorMessage ?? 'Failed to verify your x.com account');

      return;
    }

    try {
      await createAttestation.mutateAsync({
        profileId,
        randValue: response.randValue,
        account: response.account,
        service: X_SERVICE,
        evidence: response.evidence,
        signature: response.signature,
      });

      const allTargets = await explodeUserTargets([
        { profileId },
        { service: response.account, account: X_SERVICE },
      ]);
      allTargets.forEach((target) => {
        invalidate(queryClient, cacheKeysFor.AttestationChange(target));
      });
    } catch {
      // No special cases to handle
    }
  }, [
    twitterProfile,
    signatureForCreateAttestation,
    isSimplifiedXAttestationEnabled,
    signMessage,
    prev,
    createAttestation,
    profileId,
    queryClient,
  ]);

  const items = [
    {
      title: 'Profile',
      actions: [
        <Button key="profile-cancel" onClick={close}>
          Cancel
        </Button>,
        <Popconfirm
          key="profile-verify"
          title="You are about to open X.com"
          description={
            <span>
              Please tweet & return once
              <br />
              you’re done.
            </span>
          }
          icon={<XOutlined />}
          open={isConfirmToTweetOpen}
          okText="Tweet"
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              return;
            }

            if (isSimplifiedXAttestationEnabled) {
              verifyAttestation();
              next();
            } else {
              setIsConfirmToTweetOpen(true);
            }
          }}
          onCancel={() => {
            setIsConfirmToTweetOpen(false);
          }}
          onConfirm={() => {
            if (!connectedAddress) {
              console.error('Connected address is not available');

              return;
            }

            setIsConfirmToTweetOpen(false);
            next();

            window.open(
              xComHelpers.generateIntentTweetUrl(
                xComHelpers.generateTweetContent(window.location.origin, connectedAddress),
              ),
            );
          }}
        >
          <Button type="primary" disabled={!twitterProfile}>
            {isSimplifiedXAttestationEnabled ? 'Verify' : 'Next'}
          </Button>
        </Popconfirm>,
      ],
      content: (
        <ProfileStep
          value={accountInput}
          onChange={(value) => {
            setAccountInput(value);
          }}
          onTwitterProfileLoad={handleLoadTwitterProfile}
        />
      ),
    },
    {
      title: 'Verify',
      actions: [
        <Button key="verify-cancel" onClick={prev}>
          Back
        </Button>,
        !isSimplifiedXAttestationEnabled && (
          <Button
            key="verify-start"
            onClick={() => {
              verifyAttestation();
            }}
            type="primary"
            loading={isVerifying}
          >
            {isVerifying ? 'Verifying' : 'Verify'}
          </Button>
        ),
      ],
      content: <VerifyStep isVerifying={isVerifying} verificationErrorMsg={verificationErrorMsg} />,
    },
    {
      title: 'Complete',
      actions: [
        <Button
          key="complete-done"
          onClick={() => {
            close();
            setStep(0);
            setAccountInput('');
          }}
          type="primary"
        >
          Done
        </Button>,
      ],
      content: <CompleteStep username={username} />,
    },
  ];

  return (
    <Modal
      title="X.com/Twitter social connection"
      open={isOpen}
      onCancel={close}
      footer={items[step].actions}
    >
      <Steps current={step} items={items.map((item) => ({ title: item.title }))} />
      <Row
        css={css`
          padding-block: 32px;
        `}
      >
        <Col span={24}>{items[step].content}</Col>
      </Row>
    </Modal>
  );
}
