import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ArrowUpScoreSvg } from './arrow-up-score.svg';

export function ArrowUpScoreIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowUpScoreSvg} {...props} />;
}
