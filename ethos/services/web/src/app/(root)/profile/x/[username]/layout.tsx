import { X_SERVICE } from '@ethos/domain';
import { type Metadata } from 'next';
import { type ReactNode } from 'react';
import { generateProfileMetadata } from 'constant/metadata/metadata.generator';

type Props = {
  params: { username: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return await generateProfileMetadata({ service: X_SERVICE, username: params.username });
}

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return children;
}
