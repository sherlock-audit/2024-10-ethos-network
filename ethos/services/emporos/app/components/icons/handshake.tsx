import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function HandshakeSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      viewBox="0 -960 960 960"
      width="1em"
      fill="currentColor"
    >
      <path d="M484-120q-17 0-28.5-11.5T444-160q0-7 3-14.5t9-13.5l185-185-29-29-184 185q-6 6-13 9t-15 3q-17 0-28.5-11.5T360-245q0-10 3-16.5t8-11.5l185-185-28-28-185 184q-6 6-13 9t-16 3q-16 0-28-12t-12-28q0-8 3-15t9-13l185-185-29-28-184 185q-5 5-12 8t-17 3q-17 0-28.5-11.5T189-415q0-8 3-15t9-13l223-223 150 151q11 11 26 17.5t30 6.5q32 0 56-22.5t24-57.5q0-14-5-29t-18-28L508-807q17-16 38-24.5t42-8.5q26 0 48 8.5t40 26.5l169 170q18 18 26.5 40t8.5 51q0 20-9 40.5T845-466L512-132q-8 8-14 10t-14 2ZM141-440l-26-26q-17-16-26-38t-9-46q0-26 10-48t25-37l169-170q16-16 38-25.5t43-9.5q27 0 48 7.5t41 27.5l205 205q6 6 9 13t3 15q0 16-12 28t-28 12q-9 0-15-2.5t-13-9.5L423-722 141-440Z" />
    </svg>
  );
}

export function HandshakeIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={HandshakeSvg} {...props} />;
}