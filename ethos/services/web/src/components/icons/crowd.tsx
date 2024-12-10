import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 17 16"
    >
      <g clipPath="url(#a)" fill="inherit" fillRule="evenodd">
        <path d="M4.9305 8.6727c.64.0133 1.2333.3333 1.6333.8933.4867.6867 1.2933 1.1 2.1533 1.1.86 0 1.6667-.4133 2.1534-1.1067.4-.56.9933-.88 1.6333-.8933-.48-.8133-2.4-1.3333-3.7867-1.3333-1.38 0-3.3066.52-3.7866 1.34ZM3.3838 8.666c1.1067 0 2-.8933 2-2s-.8933-2-2-2-2 .8933-2 2 .8933 2 2 2ZM14.0505 8.666c1.1066 0 2-.8933 2-2s-.8934-2-2-2c-1.1067 0-2 .8933-2 2s.8933 2 2 2ZM8.7171 6.666c1.1067 0 2-.8933 2-2s-.8933-2-2-2c-1.1066 0-2 .8933-2 2s.8934 2 2 2Z" />
        <path d="M14.7171 9.3327h-2.18c-.5133 0-.9.3-1.12.6133-.0266.04-.9066 1.3867-2.7 1.3867-.9533 0-2.02-.4267-2.7-1.3867-.26-.3666-.6666-.6133-1.12-.6133h-2.18c-.7333 0-1.3333.6-1.3333 1.3333v2c0 .3667.3.6667.6667.6667h3.3333c.3667 0 .6667-.3.6667-.6667v-.84c.7666.5333 1.6933.84 2.6666.84.9734 0 1.9-.3067 2.6667-.84v.84c0 .3667.3.6667.6667.6667h3.3333c.3667 0 .6667-.3.6667-.6667v-2c0-.7333-.6-1.3333-1.3334-1.3333Z" />
      </g>
      <defs>
        <clipPath>
          <path fill="#fff" transform="translate(.7168)" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function Crowd(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
