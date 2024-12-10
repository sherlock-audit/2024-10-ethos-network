'use client';
import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay: number, immediate = false) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstUpdate = useRef<boolean>(true); // To track the first call

  useEffect(() => {
    if (value === debouncedValue) return;

    if (immediate && firstUpdate.current) {
      // If it's the first call and immediate is true, set the value immediately
      setDebouncedValue(value);
      firstUpdate.current = false; // Mark the first update as completed
    } else {
      // Set up the debounce for subsequent updates
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, immediate]);

  return debouncedValue;
}
