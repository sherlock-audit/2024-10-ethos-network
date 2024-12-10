import { kebabCase, truncate } from 'lodash-es';

/**
 * Generate a slug from a title
 *
 * It will kebab-case the title and truncate it to the given maxLength.
 * If the title is truncated, it appends the "~" character at the end.
 *
 * @example generateSlug('Hello, World!') => 'hello-world'
 * @example generateSlug('Hello, World!', 10) => 'hello~'
 */
export function generateSlug(title: string, maxLength = 80): string {
  return truncate(kebabCase(title), {
    length: maxLength,
    separator: '-',
    omission: '~',
  });
}
