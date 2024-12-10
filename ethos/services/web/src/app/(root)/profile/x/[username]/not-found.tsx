'use client';

import { useParams } from 'next/navigation';
import { NotFound } from 'components/error/not-found';

export default function NotFoundPage() {
  const { username } = useParams<{ username: string }>();

  return <NotFound description={`Twitter profile not found for: "@${username}"`} />;
}
