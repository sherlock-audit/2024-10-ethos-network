import { App } from 'antd';
import { useRef } from 'react';
import { useScreenshot } from 'use-react-screenshot';

export function useCopyElementAsImage<T extends HTMLElement>(options?: {
  successMessage?: string;
  errorMessage?: string;
}) {
  const elementRef = useRef<T | null>(null);
  const [, takeScreenshot] = useScreenshot();
  const { notification } = App.useApp();

  async function copyToClipboard() {
    try {
      if (!elementRef.current) return;

      const image = await takeScreenshot(elementRef.current, { useCORS: true });
      const data = await fetch(image);
      const blob = await data.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      notification.success({
        message: 'Success',
        description: options?.successMessage ?? 'Image copied to clipboard!',
        duration: 5,
      });
    } catch (err) {
      console.error('Failed to copy image:', err);
      notification.error({
        message: 'Error',
        description: options?.errorMessage ?? 'Failed to copy image.',
        duration: 5,
      });
    }
  }

  return { elementRef, copyToClipboard };
}
