import { useState, useEffect, useCallback } from 'react';

function getNamespacedKey(key: string) {
  return `ethos.${key}`;
}

type ValueSetter<T> = (prevValue: T | undefined) => T;

function isValueSetter<T>(value: unknown): value is ValueSetter<T> {
  return typeof value === 'function';
}

function useStorage<ValueType>(
  storageType: 'localStorage' | 'sessionStorage',
  key: string,
  defaultValue?: ValueType,
): [ValueType | undefined, (newValue: ValueType) => void] {
  const namespacedKey = getNamespacedKey(key);
  const storage = typeof window !== 'undefined' ? window[storageType] : null;

  const [value, setValue] = useState(() => {
    if (!storage) return undefined; // We're on the server or storage is not available

    const storedValue = storage.getItem(namespacedKey);

    if (storedValue === null || storedValue === undefined) {
      return defaultValue;
    }

    return JSON.parse(storedValue);
  });

  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (typeof window !== 'undefined' && e.storageArea === storage && e.key === namespacedKey) {
        setValue(e.newValue ? JSON.parse(e.newValue) : e.newValue);
      }
    };

    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener('storage', listener);
    };
  }, [namespacedKey, storage]);

  const setValueInStorage = useCallback(
    (newValue: ValueType) => {
      setValue((currentValue: ValueType | undefined) => {
        const result = isValueSetter<ValueType>(newValue) ? newValue(currentValue) : newValue;

        storage?.setItem(namespacedKey, JSON.stringify(result));

        return result;
      });
    },
    [namespacedKey, storage],
  );

  return [value, setValueInStorage];
}

export function useLocalStorage<ValueType>(
  key: string,
  defaultValue?: ValueType,
): [ValueType | undefined, (newValue: ValueType) => void] {
  return useStorage('localStorage', key, defaultValue);
}

export function useSessionStorage<ValueType>(
  key: string,
  defaultValue?: ValueType,
): [ValueType | undefined, (newValue: ValueType) => void] {
  return useStorage('sessionStorage', key, defaultValue);
}
