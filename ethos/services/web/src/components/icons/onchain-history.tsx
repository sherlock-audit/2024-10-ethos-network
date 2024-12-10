import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { OnchainHistorySvg } from './onchain-history.svg';

export function OnchainHistoryIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={OnchainHistorySvg} {...props} />;
}
