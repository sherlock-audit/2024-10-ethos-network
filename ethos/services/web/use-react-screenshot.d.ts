declare module 'use-react-screenshot' {
  import { type Options } from 'html2canvas';

  function useScreenshot(): [
    string,
    (ref: HTMLElement, options?: Partial<Options>) => Promise<string>,
    { error: Error | null },
  ];
}
