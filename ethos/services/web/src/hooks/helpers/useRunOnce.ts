import { useEffect, useRef } from 'react';

export function useRunOnce(cb: () => void) {
  const triggered = useRef(false);

  useEffect(() => {
    if (!triggered.current) {
      cb();
      triggered.current = true;
    }
  }, [cb]);

  return null;
}
