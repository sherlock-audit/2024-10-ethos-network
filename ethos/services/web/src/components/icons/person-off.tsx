import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
    >
      <path d="M12.4739 6.8198a5.3076 5.3076 0 0 1 4.4667-2.4266c2.9467 0 5.3333 2.3866 5.3333 5.3333 0 1.8667-.96 3.52-2.4266 4.4667l-7.3734-7.3733Zm15.1334 15.1334c-.0267-1.4667-.8401-2.8133-2.1467-3.4933a17.448 17.448 0 0 0-2.36-1.0134l4.5067 4.5067Zm.6533 4.4267-22.64-22.64c-.52-.52-1.36-.52-1.88 0-.52.52-.52 1.36 0 1.88l10.9067 10.9066c-2.4267.3067-4.5467 1.0667-6.2667 1.9467-1.3067.6933-2.1067 2.0667-2.1067 3.5467v3.7066h17.56l2.5333 2.5334c.52.52 1.36.52 1.88 0a1.316 1.316 0 0 0 .0134-1.88Z" />
    </svg>
  );
}

export function PersonOff(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
