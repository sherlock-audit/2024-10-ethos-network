import { Button, Flex } from 'antd';
import { DeleteIcon } from '../../icons/delete.tsx';

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'delete'],
] as const;

export type InputKey = (typeof keys)[number][number];

type NumericKeypadProps = {
  onPress: (value: InputKey) => void;
};

export function NumericKeypad({ onPress }: NumericKeypadProps) {
  return (
    <Flex vertical gap={4} className="w-full">
      {keys.map((row, i) => (
        <Flex key={i} justify="space-between" className="w-full">
          {row.map((key) => (
            <Button
              type="link"
              key={key}
              className="h-16 w-16 text-3xl/none text-antd-colorText"
              onClick={() => {
                onPress(key);
              }}
            >
              {key === 'delete' ? (
                <>
                  <span className="sr-only">Delete</span>
                  <DeleteIcon />
                </>
              ) : (
                key
              )}
            </Button>
          ))}
        </Flex>
      ))}
    </Flex>
  );
}
