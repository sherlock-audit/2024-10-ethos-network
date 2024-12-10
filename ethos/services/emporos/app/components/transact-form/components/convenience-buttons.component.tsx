import { Button, Flex } from 'antd';
import clsx from 'clsx';

const conveniencePercentages = ['10%', '25%', '50%', '100%'] as const;

export function ConvenienceButtons({
  handlePercentage,
  buttonClassName,
}: {
  handlePercentage: (value: number) => void;
  buttonClassName?: string;
}) {
  return (
    <Flex className="w-full justify-between">
      {conveniencePercentages.map((percent) => (
        <Button
          key={percent}
          onClick={() => {
            handlePercentage(parseInt(percent, 10));
          }}
          className={clsx(
            'text-base md:text-xs rounded-100 px-4 md:px-2 lg:px-3 xl:px-4',
            buttonClassName,
          )}
        >
          {percent === '100%' ? 'Max' : percent}
        </Button>
      ))}
    </Flex>
  );
}
