import { XOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { xComHelpers } from '@ethos/attestation';
import { useDebouncedValue } from '@ethos/common-ui';
import { X_SERVICE } from '@ethos/domain';
import { NetError } from '@ethos/echo-client';
import { duration } from '@ethos/helpers';
import {
  Alert,
  AutoComplete,
  Button,
  Flex,
  Input,
  notification,
  Space,
  theme,
  Typography,
} from 'antd';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { zeroAddress, type Address } from 'viem';
import { useSignMessage } from 'wagmi';
import { CheckIcon, Close, OpenInNewIcon } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useCreateAttestation } from 'hooks/api/blockchain-manager';
import {
  useEventsProcessSync,
  useGetSignatureForCreateAttestation,
  type useTwitterProfile,
  useTwitterUserSearch,
} from 'hooks/api/echo.hooks';
import { useSimplifiedXAttestation } from 'hooks/use-simplified-x-attestation';
import { useQueryAwaitDataUpdate } from 'hooks/useWaitForQueryDataUpdate';
import { useProfile } from 'hooks/user/lookup';
import { eventBus } from 'utils/event-bus';

const DEBOUNCE_DELAY = duration(1, 'second').toMilliseconds();

enum Steps {
  UserSelect,
  Tweet,
  VerifyTweet,
  Complete,
}

type Props = {
  connectCompleted?: () => void;
  connectSkipped?: () => void;
  selectedTwitterProfileId?: (profileId: string) => void;
};

type TwitterProfile = ReturnType<typeof useTwitterProfile>['data'];

export function TwitterConnectFlow({
  connectCompleted,
  connectSkipped,
  selectedTwitterProfileId,
}: Props) {
  const { token } = theme.useToken();
  const [currentStep, setCurrentStep] = useState<Steps>(Steps.UserSelect);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasSearchResultsEmpty, setHasSearchResultsEmpty] = useState(false);
  const [verificationErrorMsg, setVerificationErrorMsg] = useState<string>();
  const [selectedTwitterProfile, setSelectedTwitterProfile] = useState<TwitterProfile>();
  const [searchString, setSearchString] = useState('');

  const debouncedUsername = useDebouncedValue(searchString, DEBOUNCE_DELAY);
  const { signMessage } = useSignMessage();
  const { isSimplifiedXAttestationEnabled } = useSimplifiedXAttestation();
  const signatureForCreateAttestation = useGetSignatureForCreateAttestation();
  const eventsProcess = useEventsProcessSync();

  const { connectedAddress, connectedProfilePrimaryAddress } = useCurrentUser();
  const connectedAddressProfileQuery = useProfile(
    { address: connectedAddress ?? zeroAddress },
    false,
  );
  const { data: connectedProfile } = useQueryAwaitDataUpdate(
    connectedAddressProfileQuery,
    (data) => data.id ?? 0,
    ['PROFILE_CREATED'],
    { pollingRetryCount: 30, pollingInterval: 3000 },
  );

  const createAttestation = useCreateAttestation({
    onError() {
      setVerificationErrorMsg('Failed to connect social.');
      setIsVerifying(false);
    },
    onSuccess(isTxConfirmed, txHash) {
      setIsVerifying(false);
      setVerificationErrorMsg(undefined);

      if (isTxConfirmed) {
        const tx = eventsProcess.mutateAsync({ txHash });
        tx.finally(() => {
          eventBus.emit('ATTESTATIONS_UPDATED');
          connectCompleted?.();
          showConnectionSuccessMessage();
        });
      } else {
        setVerificationErrorMsg('Failed to connect social.');
      }
    },
  });

  const { data: twitterSearchResults, isPending: searchLoading } =
    useTwitterUserSearch(debouncedUsername);

  const options = useMemo(
    () =>
      twitterSearchResults?.map((result) => ({
        value: result.id,
        data: result,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [twitterSearchResults?.length],
  );

  useEffect(() => {
    setSuggestionsLoading(searchLoading);
  }, [searchLoading]);

  useEffect(() => {
    setHasSearchResultsEmpty(Boolean(searchString) && !suggestionsLoading && !options?.length);
  }, [searchString, suggestionsLoading, options?.length]);

  const next = useCallback(() => {
    setCurrentStep((prevValue) => prevValue + 1);
  }, []);

  function loadResults(text: string) {
    setSuggestionsLoading(true);
    const username = xComHelpers.extractAccount(text);
    setSearchString(username);
  }

  function selectProfile(profileId: string) {
    const selectedProfile = options?.find((option) => option.value === profileId);

    if (selectedProfile) {
      setSelectedTwitterProfile(selectedProfile.data);
      selectedTwitterProfileId?.(selectedProfile.data.id);

      next();
    }
  }

  function redirectToTwitter() {
    if (!connectedProfilePrimaryAddress) {
      return;
    }

    next();
    window.open(
      xComHelpers.generateIntentTweetUrl(
        xComHelpers.generateTweetContent(window.location.origin, connectedProfilePrimaryAddress),
      ),
    );
  }

  function clearSelection() {
    setVerificationErrorMsg(undefined);
    setSelectedTwitterProfile(undefined);
    setIsVerifying(false);
    setCurrentStep(Steps.UserSelect);
    selectedTwitterProfileId?.('');
  }

  function skipConnection() {
    selectedTwitterProfileId?.('');
    connectSkipped?.();
  }

  function showConnectionSuccessMessage() {
    notification.success({
      message: 'Successfully connected to x.com',
      description: (
        <Link href={`https://x.com/${selectedTwitterProfile?.username}`} target="_blank">
          {selectedTwitterProfile?.name} - @{selectedTwitterProfile?.username}
        </Link>
      ),
      placement: 'bottomLeft',
      duration: 30,
    });
  }

  const verifyAttestation = useCallback(async () => {
    setIsVerifying(true);
    setVerificationErrorMsg(undefined);
    const signature = await new Promise<Address | undefined>((resolve) => {
      if (!selectedTwitterProfile) {
        return;
      }

      signMessage(
        { message: xComHelpers.getVerifyMsg(selectedTwitterProfile.id) },
        {
          onError(error) {
            setIsVerifying(false);
            resolve(undefined);

            if (error.name === 'UserRejectedRequestError') {
              setVerificationErrorMsg('User rejected');
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

    if (!connectedProfile) {
      return;
    }

    if (!selectedTwitterProfile) {
      return;
    }

    let response: ReturnType<typeof useGetSignatureForCreateAttestation>['data'];

    try {
      response = await signatureForCreateAttestation.mutateAsync({
        service: X_SERVICE,
        account: selectedTwitterProfile.id,
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
      const { hash } = await createAttestation.mutateAsync({
        profileId: connectedProfile.id,
        randValue: response.randValue,
        account: response.account,
        service: 'x.com',
        evidence: response.evidence,
        signature: response.signature,
      });

      if (hash) {
        await eventsProcess.mutateAsync({ txHash: hash });
      }
    } catch {
      // No special cases to handle
    }
  }, [
    selectedTwitterProfile,
    signatureForCreateAttestation,
    isSimplifiedXAttestationEnabled,
    signMessage,
    createAttestation,
    connectedProfile,
    eventsProcess,
  ]);

  if (!connectedProfile) {
    return (
      <Flex vertical gap={25} align="center">
        <LottieLoader />
        <div>Profile creation in progress...</div>

        <Button
          type="text"
          css={css`
            color: ${tokenCssVars.colorPrimary};
          `}
          onClick={skipConnection}
        >
          Later
        </Button>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={25} align="center">
      <div
        css={css`
          width: 370px;
          margin: auto; // to be removed
          position: relative;
        `}
      >
        {verificationErrorMsg && (
          <Alert
            type="error"
            message={verificationErrorMsg ?? 'Something went wrong'}
            showIcon
            css={css`
              width: 100%;
              margin-bottom: ${token.margin}px;
            `}
          />
        )}
        {currentStep === Steps.UserSelect && (
          <>
            <AutoComplete
              options={options}
              css={css`
                width: 100%;
              `}
              onSearch={loadResults}
              onSelect={selectProfile}
              optionRender={(option) => <TwitterProfileResult user={option.data.data} />}
            >
              <Input
                placeholder="Type your x.com name/handle or paste profile url..."
                css={css`
                  background: ${tokenCssVars.colorBgLayout};
                  height: 32px;
                `}
                prefix={hasSearchResultsEmpty ? <Close /> : undefined}
                status={hasSearchResultsEmpty ? 'error' : undefined}
                suffix={
                  <Flex>
                    {suggestionsLoading && <LottieLoader size={22} />}
                    <XOutlined />
                  </Flex>
                }
              />
            </AutoComplete>
            {hasSearchResultsEmpty && (
              <Typography.Text type="danger">
                Twitter profile not found. Note: only public accounts supported.
              </Typography.Text>
            )}
          </>
        )}

        {(currentStep === Steps.Tweet || currentStep === Steps.VerifyTweet) && (
          <div
            css={css`
              position: relative;
              background: ${tokenCssVars.colorBgLayout};
              padding: ${token.paddingXXS}px ${token.paddingSM}px;
              border-radius: ${token.borderRadius}px;
              display: flex;
            `}
          >
            <TwitterProfileResult user={selectedTwitterProfile} type="primary" />
            <Button
              type="text"
              size="small"
              danger
              css={css`
                position: absolute;
                right: 4px;
                top: 4px;
              `}
              onClick={clearSelection}
              icon={<Close />}
            />
          </div>
        )}
      </div>
      {(currentStep === Steps.Tweet || currentStep === Steps.UserSelect) && (
        <>
          {selectedTwitterProfile && (
            <Alert
              message={
                <>
                  You will be taken to x.com, where you’ll need to
                  <br /> submit a post, and then return here to confirm.
                </>
              }
              css={css`
                font-size: 14px;
                line-height: 22px;
                padding: 8px 12px;
                box-shadow: ${tokenCssVars.boxShadowSecondary};

                & .ant-alert-icon {
                  font-size: 16px;
                  color: ${tokenCssVars.colorPrimary};
                }
              `}
              type="info"
              showIcon
            />
          )}
          <Button
            type="primary"
            icon={<OpenInNewIcon />}
            disabled={!selectedTwitterProfile}
            onClick={redirectToTwitter}
          >
            Post on x.com
          </Button>
          <Button
            type="text"
            css={css`
              color: ${tokenCssVars.colorPrimary};
            `}
            onClick={skipConnection}
          >
            Later
          </Button>
        </>
      )}
      {currentStep === Steps.VerifyTweet && (
        <>
          <Button
            type="primary"
            icon={<CheckIcon />}
            loading={isVerifying}
            onClick={verifyAttestation}
          >
            I’ve posted on x.com
          </Button>
          <Button
            type="text"
            css={css`
              color: ${tokenCssVars.colorError};
            `}
            onClick={clearSelection}
          >
            Back
          </Button>
        </>
      )}
    </Flex>
  );
}

function TwitterProfileResult({
  user,
  type = 'default',
}: {
  user: TwitterProfile;
  type?: 'primary' | 'default';
}) {
  const textColorMapping = {
    primary: tokenCssVars.colorPrimary,
    default: tokenCssVars.colorText,
  };

  return (
    <Space size="small">
      {user && (
        <Image
          src={user?.avatar ?? ''}
          alt={user?.username}
          width={24}
          height={24}
          css={css`
            border-radius: 100%;
            display: flex;
            align-items: center;
          `}
        />
      )}
      <span
        css={css`
          color: ${textColorMapping[type]};
        `}
      >
        {user?.name}
      </span>
      <span
        css={css`
          color: ${tokenCssVars.colorTextSecondary};
        `}
      >
        @{user?.username}
      </span>
    </Space>
  );
}
