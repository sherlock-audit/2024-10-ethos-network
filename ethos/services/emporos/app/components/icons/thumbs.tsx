import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function ThumbsUpFilledSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      viewBox="0 -960 960 960"
      width="1em"
      fill="currentColor"
    >
      <path d="M720-120H320v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h218q32 0 56 24t24 56v80q0 7-1.5 15t-4.5 15L794-168q-9 20-30 34t-44 14ZM240-640v520H80v-520h160Z" />
    </svg>
  );
}

export function ThumbsUpFilledIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ThumbsUpFilledSvg} {...props} />;
}

export function ThumbsDownFilledSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      viewBox="0 -960 960 960"
      width="1em"
      fill="currentColor"
    >
      <path d="M240-840h400v520L360-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 1.5-15t4.5-15l120-282q9-20 30-34t44-14Zm480 520v-520h160v520H720Z" />
    </svg>
  );
}
export function ThumbsDownFilledIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ThumbsDownFilledSvg} {...props} />;
}

export function ThumbsUpOutlinedSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M5 9v12H1V9zm4 12a2 2 0 0 1-2-2V9c0-.55.22-1.05.59-1.41L14.17 1l1.06 1.06c.27.27.44.64.44 1.05l-.03.32L14.69 8H21a2 2 0 0 1 2 2v2c0 .26-.05.5-.14.73l-3.02 7.05C19.54 20.5 18.83 21 18 21zm0-2h9.03L21 12v-2h-8.79l1.13-5.32L9 9.03z"
      />
    </svg>
  );
}

export function ThumbsUpOutlinedIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ThumbsUpOutlinedSvg} {...props} />;
}

export function ThumbsDownOutlinedSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M19 15V3h4v12zM15 3a2 2 0 0 1 2 2v10c0 .55-.22 1.05-.59 1.41L9.83 23l-1.06-1.06c-.27-.27-.44-.64-.44-1.06l.03-.31.95-4.57H3a2 2 0 0 1-2-2v-2c0-.26.05-.5.14-.73l3.02-7.05C4.46 3.5 5.17 3 6 3zm0 2H5.97L3 12v2h8.78l-1.13 5.32L15 14.97z"
      />
    </svg>
  );
}

export function ThumbsDownOutlinedIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ThumbsDownOutlinedSvg} {...props} />;
}
