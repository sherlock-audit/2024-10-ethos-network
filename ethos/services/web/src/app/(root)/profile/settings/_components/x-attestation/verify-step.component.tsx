import { css } from '@emotion/react';
import { Alert, Flex, Spin, Typography } from 'antd';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { useSimplifiedXAttestation } from 'hooks/use-simplified-x-attestation';

const { Text } = Typography;

export function VerifyStep({
  isVerifying,
  verificationErrorMsg,
}: {
  isVerifying: boolean;
  verificationErrorMsg?: string;
}) {
  const { isSimplifiedXAttestationEnabled } = useSimplifiedXAttestation();

  if (isSimplifiedXAttestationEnabled) {
    return (
      <Flex justify="center">
        {isVerifying ? (
          <Spin indicator={<LottieLoader css={{ fontSize: 24 }} />} />
        ) : (
          <Alert
            type="error"
            message={verificationErrorMsg ?? 'Something went wrong'}
            showIcon
            css={css`
              width: 100%;
            `}
          />
        )}
      </Flex>
    );
  }

  if (isVerifying) {
    return (
      <Flex justify="center">
        <Spin indicator={<LottieLoader css={{ fontSize: 24 }} />} />
      </Flex>
    );
  }

  if (verificationErrorMsg) {
    return (
      <Flex justify="center">
        <Alert
          type="error"
          message={verificationErrorMsg}
          showIcon
          css={css`
            width: 100%;
          `}
        />
      </Flex>
    );
  }

  return (
    <Flex>
      <Text
        css={css`
          font-size: 14px;
        `}
      >
        Once you have tweeted, please click &ldquo;Verify&rdquo; below.
        <br />
        This will trigger an onchain transaction to connect your profile.
      </Text>
    </Flex>
  );
}
