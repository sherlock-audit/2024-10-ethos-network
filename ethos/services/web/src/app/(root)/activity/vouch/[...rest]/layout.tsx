import { type Metadata } from 'next';
import { type ReactNode } from 'react';
import { generateVouchMetadata } from 'constant/metadata/metadata.generator';

type Props = {
  params: { rest: string[] };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [id] = params.rest;

  return await generateVouchMetadata(Number(id));
}

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return children;
}
