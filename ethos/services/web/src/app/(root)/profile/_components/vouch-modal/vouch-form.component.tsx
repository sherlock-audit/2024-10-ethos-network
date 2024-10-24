import { InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type Fees } from '@ethos/blockchain-manager';
import { formatEth } from '@ethos/helpers';
import { Flex, InputNumber, Popover, Typography } from 'antd';
import { type UseFormReturn, Controller } from 'react-hook-form';
import { useBalance } from 'wagmi';
import { type GetBalanceData } from 'wagmi/query';
import { calculateVouchAmounts, formatVouchAmounts } from './vouch-form.utils';
import { Ethereum } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { type FormInputs } from 'components/user-action-modal/user-action-modal.types';
import { tokenCssVars } from 'config';
import { ethosFeesHelpPageLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';

const MINIMUM_VOUCH_AMOUNT = 0.001;
const MAXIMUM_VOUCH_AMOUNT = 1000;

type LowBalanceToolTipContentProps = {
  balance: string;
  totalAmount: string;
};

function LowBalanceToolTipContent({ balance, totalAmount }: LowBalanceToolTipContentProps) {
  return (
    <Typography.Text>
      <div>Your current balance is {balance}.</div>
      <div>With fees the total required to vouch is {totalAmount}.</div>
    </Typography.Text>
  );
}

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
  const balanceInETH = Number(balance.value) / 10 ** balance.decimals;
  const isLowBalance = balanceInETH < amounts.totalAmountWithFees;

  if (isLowBalance) {
    return (
      <Flex
        css={css`
          margin-top: 4px;
        `}
        gap={3}
      >
        <Typography.Text
          type="danger"
          css={css`
            font-size: 10px;
          `}
        >
          Low balance
        </Typography.Text>
        <Popover
          content={
            <LowBalanceToolTipContent
              balance={formatEth(balance.value, 'wei')}
              totalAmount={formattedAmounts.formattedTotalAmountWithFees}
            />
          }
          placement="bottom"
        >
          <InfoCircleOutlined
            css={css`
              font-size: 10px;
            `}
          />
        </Popover>
      </Flex>
    );
  }

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
      <Popover
        content={<FeesPopoverContent formattedAmounts={formattedAmounts} />}
        placement="bottom"
      >
        <InfoCircleOutlined
          css={css`
            font-size: 10px;
          `}
        />
      </Popover>
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

  const isFeesStructureAvailable = fees !== undefined;

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
                  css={css`
                    border: 0;
                    border-radius: 8px;

                    & .ant-input-number-handler-wrap {
                      display: none;
                    }

                    & .ant-input-number-input {
                      text-align: right;
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
                    <Ethereum
                      css={css`
                        font-size: 18px;
                        color: ${tokenCssVars.colorText};
                      `}
                    />
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
