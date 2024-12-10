import { Tag } from 'antd';

export function StatTag({ icon, value }: { icon?: React.ReactNode; value: string }) {
  return (
    <Tag icon={icon} className="text-antd-colorPrimary bg-antd-colorPrimaryBgHover bg-opacity-[8%]">
      {value}
    </Tag>
  );
}
