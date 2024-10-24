/**
 * Delay for a given number of milliseconds.
 */
export async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
