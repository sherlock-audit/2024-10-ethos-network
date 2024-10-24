import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ArrowDownScoreSvg } from './arrow-down-score.svg';

export function ArrowDownScoreIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowDownScoreSvg} {...props} />;
}
