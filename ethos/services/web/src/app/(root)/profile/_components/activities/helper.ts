export function splitInTwo<T>(data: T[]) {
  const columnOne: T[] = [];
  const columnTwo: T[] = [];

  data.forEach((item: T, index: number) => {
    if (index % 2 === 0) {
      columnOne.push(item);
    } else {
      columnTwo.push(item);
    }
  });

  return { columnOne, columnTwo };
}

export function areUserKeysEqual(userKey1: string, userKey2: string) {
  return userKey1.toLowerCase() === userKey2.toLowerCase();
}

export function containsUserKey(userKeys: string[], userKey: string) {
  return userKeys.some((key) => areUserKeysEqual(key, userKey));
}
