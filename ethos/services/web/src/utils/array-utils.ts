export function splitArrayIntoChunks<T>(arr: T[], groupSize: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < arr.length; i += groupSize) {
    result.push(arr.slice(i, i + groupSize));
  }

  return result;
}
