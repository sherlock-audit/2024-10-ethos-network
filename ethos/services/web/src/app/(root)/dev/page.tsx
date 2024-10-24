'use client';
import { Tabs, type TabsProps } from 'antd';
import { notFound } from 'next/navigation';
import { ColorsList } from './_components/colors-list.component';
import { isDevPageEnabled } from './_components/dev-page.utils';
import { IconList } from './_components/icon-list.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';

const items: TabsProps['items'] = [
  {
    key: 'icons',
    label: 'Icons',
    children: <IconList />,
  },
  {
    key: 'colors',
    label: 'Colors',
    children: <ColorsList />,
  },
];

export default function DevPage() {
  if (!isDevPageEnabled()) {
    return notFound();
  }

  return (
    <BasicPageWrapper title="Dev">
      <Tabs items={items} />
    </BasicPageWrapper>
  );
}
