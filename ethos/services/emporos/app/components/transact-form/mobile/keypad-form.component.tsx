import { Flex, Typography } from 'antd';
import { ConvenienceButtons } from '../components/convenience-buttons.component.tsx';
import { ErrorMessage } from '../components/error-message.component.tsx';
import { TransactionErrorNotifications } from '../components/error-notification.component.tsx';
import { TrustScore } from '../components/trust-score.component.tsx';
import { type InputKey, NumericKeypad } from './numeric-keypad.component.tsx';
import { SwipeToTransact } from './swipe-to-transact.tsx';

const { Title } = Typography;

export function KeypadForm({
  handleNumberInput,
  handlePercentage,
  onSubmit,
  validationError,
  value,
  impactTrend,
  formattedImpact,
  balanceInfo,
}: {
  handleNumberInput: (value: InputKey) => void;
  handlePercentage: (percentage: number) => void;
  onSubmit: () => Promise<void>;
  validationError: string | null;
  value: string;
  impactTrend: 'up' | 'down' | null;
  formattedImpact: string;
  balanceInfo: React.ReactNode;
}) {
  return (
    <Flex vertical className="h-full px-2 gap-4 [&_*]:font-plex items-center w-full max-w-xs">
      <TransactionErrorNotifications placement="bottom-right" />
      {balanceInfo}
      <Flex vertical align="center">
        <Title level={4} className="m-0 text-7xl/none max-w-xs" ellipsis={{ tooltip: value }}>
          {value}
        </Title>
        <TrustScore impactTrend={impactTrend} formattedImpact={formattedImpact} className="mb-2" />
        <ErrorMessage errorMessage={validationError} />
      </Flex>
      <ConvenienceButtons
        handlePercentage={handlePercentage}
        buttonClassName="hover:bg-antd-colorBgContainer"
      />
      <NumericKeypad onPress={handleNumberInput} />
      <SwipeToTransact onComplete={onSubmit} />
      <Typography.Text className="text-antd-colorText text-sm">1% fee</Typography.Text>
    </Flex>
  );
}
