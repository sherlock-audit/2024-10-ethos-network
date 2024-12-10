import { X_SERVICE } from '@ethos/domain';
import { type Metadata } from 'next';
import { type ReactNode } from 'react';
import { generateProfileMetadata } from 'constant/metadata/metadata.generator';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;

  return await generateProfileMetadata({ service: X_SERVICE, username: params.username });
}

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return children;
}
