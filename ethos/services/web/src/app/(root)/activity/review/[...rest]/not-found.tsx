'use client';

import { useParams } from 'next/navigation';
import { NotFound } from 'components/error/not-found';

export default function NotFoundPage() {
  const { rest } = useParams<{ rest: string[] }>();

  return <NotFound description={`Review #${rest[0]} not found`} />;
}
