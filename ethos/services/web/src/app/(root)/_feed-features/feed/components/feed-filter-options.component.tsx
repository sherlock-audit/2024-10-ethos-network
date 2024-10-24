import { scoreRanges } from '@ethos/score';
import { Tabs, type TabsProps } from 'antd';
import { Logo } from 'components/icons';

type FeedFilterOptionsProps = {
  onFilterChange: (minActorScore: number) => void;
};

export function FeedFilterOptions({ onFilterChange }: FeedFilterOptionsProps) {
  const items = [
    {
      key: 'reputable',
      label: (
        <>
          Above {scoreRanges.reputable.min} <Logo />
        </>
      ),
    },
    {
      key: 'all',
      label: 'All activity',
    },
  ] as const satisfies TabsProps['items'];

  function handleTabChange(activeKey: string) {
    if (activeKey === 'reputable') {
      onFilterChange(scoreRanges.reputable.min);
    } else if (activeKey === 'all') {
      onFilterChange(scoreRanges.untrusted.min);
    }
  }

  return <Tabs onChange={handleTabChange} items={items} />;
}
