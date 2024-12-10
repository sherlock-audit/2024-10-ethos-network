import { CloseCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type Fees } from '@ethos/blockchain-manager';
import { formatEth } from '@ethos/helpers';
import { Flex, InputNumber, Typography } from 'antd';
import { useEffect } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useBalance } from 'wagmi';
import { type GetBalanceData } from 'wagmi/query';
import { calculateVouchAmounts, formatVouchAmounts } from './vouch-form.utils';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { Ethereum } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { type FormInputs } from 'components/user-action-modal/user-action-modal.types';
import { tokenCssVars } from 'config/theme';
import { ethosFeesHelpPageLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';

const MINIMUM_VOUCH_AMOUNT = 0.001;
const MAXIMUM_VOUCH_AMOUNT = 1000;

type FeesPopoverContentProps = {
  formattedAmounts: ReturnType<typeof formatVouchAmounts>;
};

function FeesPopoverContent({ formattedAmounts }: FeesPopoverContentProps) {
  return (
    <div>
      <Typography.Text>
        <strong> Total fee breakdown of {formattedAmounts.formattedTotalAmountWithFees}:</strong>
      </Typography.Text>
      <Typography.Paragraph
        css={css`
          padding: 10px;
          margin: 0px;
        `}
      >
        <ul
          css={css`
            list-style-type: disc;
            margin: 0px;
          `}
        >
          {formattedAmounts.formattedAmount && (
            <li>
              <strong>{formattedAmounts.formattedAmount}</strong>
              <Typography.Text type="secondary"> vouched in this person</Typography.Text>
            </li>
          )}

          {formattedAmounts.formattedEntryProtocolFee && (
            <li>
              <strong>{formattedAmounts.formattedEntryProtocolFee}</strong>
              <Typography.Text type="secondary"> fee goes to Ethos</Typography.Text>
            </li>
          )}
          {formattedAmounts.formattedEntryVouchersPoolFee && (
            <li>
              <strong>{formattedAmounts.formattedEntryVouchersPoolFee}</strong>
              <Typography.Text type="secondary"> fee goes to previous vouchers</Typography.Text>
            </li>
          )}
          {formattedAmounts.formattedEntryDonationFee && (
            <li>
              <strong>{formattedAmounts.formattedEntryDonationFee}</strong>
              <Typography.Text type="secondary"> fee goes to this person</Typography.Text>
            </li>
          )}
        </ul>
      </Typography.Paragraph>
      <Typography.Text type="secondary" italic>
        Learn more about{' '}
        <Typography.Link
          href={ethosFeesHelpPageLink}
          target="__blank"
          css={{ color: tokenCssVars.colorPrimary }}
        >
          fees
        </Typography.Link>
      </Typography.Text>
    </div>
  );
}

type InputSummaryProps = {
  value: number;
  fees: Fees | undefined;
  balance: GetBalanceData | undefined;
};

function InputSummary({ fees, value, balance }: InputSummaryProps) {
  if (value === undefined || value <= 0 || balance === undefined || fees === undefined) return;

  const amounts = calculateVouchAmounts(value, fees);
  const formattedAmounts = formatVouchAmounts(amounts);

  return (
    <Flex
      css={css`
        margin-top: 4px;
      `}
      gap={3}
    >
      <Typography.Text
        css={css`
          font-size: 10px;
          color: ${tokenCssVars.colorTextDescription};
        `}
      >
        Total:{' '}
        <span
          css={css`
            text-wrapping: no-wrap;
          `}
        >
          {formattedAmounts.formattedTotalAmountWithFees}
        </span>
      </Typography.Text>
      <CustomPopover
        content={<FeesPopoverContent formattedAmounts={formattedAmounts} />}
        placement="bottom"
      >
        <InfoCircleOutlined
          css={css`
            font-size: 10px;
          `}
        />
      </CustomPopover>
    </Flex>
  );
}

type VouchActionProps = {
  form: UseFormReturn<FormInputs<number>>;
  fees?: Fees;
};

export function VouchAction({ form, fees }: VouchActionProps) {
  const { connectedAddress } = useCurrentUser();
  const { data: balanceData, isPending: isLoadingBalance } = useBalance({
    address: connectedAddress,
  });

  const { setError, clearErrors, watch, formState } = form;
  const isFeesStructureAvailable = fees !== undefined;
  const value = watch('value');
  const isErrored = Boolean(formState.errors.value);

  useEffect(() => {
    if (isLoadingBalance || !isFeesStructureAvailable || !balanceData) {
      return;
    }

    const balanceInETH = Number(balanceData.value) / 10 ** balanceData.decimals;
    const amounts = calculateVouchAmounts(form.getValues('value'), fees);

    if (balanceInETH < amounts.totalAmountWithFees) {
      setError('value', {
        type: 'manual',
        message: `Low balance, you need ${formatEth(amounts.totalAmountWithFees, 'eth')} to vouch this amount`,
      });
    } else {
      clearErrors('value');
    }
  }, [
    balanceData,
    fees,
    isLoadingBalance,
    setError,
    clearErrors,
    value,
    form,
    isFeesStructureAvailable,
  ]);

  if (isLoadingBalance || !isFeesStructureAvailable) {
    return <LottieLoader />;
  }

  return (
    <Flex vertical align="flex-end">
      <Controller
        control={form.control}
        name="value"
        rules={{ required: 'Amount is required' }}
        render={({ field: { onChange, value } }) => {
          return (
            <>
              <Flex align="center" justify="flex-end">
                <InputNumber
                  status={isErrored ? 'error' : undefined}
                  css={css`
                    ${!isErrored
                      ? css`
                          border: 1px solid transparent;
                        `
                      : undefined}

                    border-radius: 8px;

                    & .ant-input-number-handler-wrap {
                      display: none;
                    }

                    &:hover .ant-input-number-suffix {
                      margin-inline-end: var(--ant-input-number-padding-inline);
                    }

                    &:focus,
                    &:focus-within {
                      box-shadow: none;
                    }
                  `}
                  value={value}
                  onChange={onChange}
                  placeholder="0"
                  size="large"
                  min={MINIMUM_VOUCH_AMOUNT}
                  max={MAXIMUM_VOUCH_AMOUNT}
                  suffix={
                    isErrored ? (
                      <CloseCircleFilled
                        css={css`
                          font-size: 14px;
                          color: ${tokenCssVars.colorError};
                        `}
                      />
                    ) : (
                      <Ethereum
                        css={css`
                          font-size: 18px;
                          color: ${tokenCssVars.colorText};
                        `}
                      />
                    )
                  }
                />
              </Flex>
              <InputSummary fees={fees} balance={balanceData} value={value} />
            </>
          );
        }}
      />
    </Flex>
  );
}
