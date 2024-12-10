import * as AntIcon from '@ant-design/icons/lib/components/Icon';
import {
  type CustomIconComponentProps,
  type IconComponentProps,
} from '@ant-design/icons/lib/components/Icon';

const Icon = typeof AntIcon.default !== 'undefined' ? AntIcon.default : AntIcon;

export type { CustomIconComponentProps };
export default Icon as React.ComponentType<IconComponentProps>;
