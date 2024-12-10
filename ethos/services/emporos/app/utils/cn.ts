import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes without style conflicts.
 * Combines clsx for conditional classes with tailwind-merge for handling class conflicts.
 *
 * @example
 * cn('p-2 bg-red', isError && 'bg-blue', className)
 * cn('p-2 hover:bg-red', 'p-3') // → 'p-3 hover:bg-red'
 */

// TODO: Update components that accept className to use cn instead of doing following:
// className={'some class here', className}
// className={clsx('some class here', className)}
// because they don't work as expected when there are conflicts

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
