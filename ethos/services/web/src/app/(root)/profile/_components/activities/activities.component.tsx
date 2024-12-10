import { reviewActivity, vouchActivity, type EthosUserTarget } from '@ethos/domain';
import { Tabs, type TabsProps } from 'antd';
import { AllActivitiesTable } from './all-activities.table.component';
import { RenderActivities } from './render.component';

type Props = {
  target: EthosUserTarget;
};

export function Activities({ target }: Props) {
  const items: TabsProps['items'] = [
    {
      key: 'received',
      label: 'Received',
      children: (
        <RenderActivities
          target={target}
          direction="subject"
          filter={[reviewActivity, vouchActivity]}
        />
      ),
    },
    {
      key: 'given',
      label: 'Given',
      children: (
        <RenderActivities
          target={target}
          direction="author"
          filter={[reviewActivity, vouchActivity]}
        />
      ),
    },
    {
      key: 'all-activities',
      label: 'All activity',
      children: <AllActivitiesTable target={target} />,
    },
  ];

  return <Tabs defaultActiveKey={items[0].key} items={items} />;
}
