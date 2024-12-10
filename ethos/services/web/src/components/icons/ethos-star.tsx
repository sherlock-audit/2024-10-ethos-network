import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { EthosStarSvg } from './ethos-star.svg';

export function EthosStar(props: Partial<CustomIconComponentProps>) {
  return <Icon component={EthosStarSvg} {...props} />;
}
