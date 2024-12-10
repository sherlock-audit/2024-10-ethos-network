import { type Metadata } from 'next';
import { type ReactNode } from 'react';
import { generateVouchMetadata } from 'constant/metadata/metadata.generator';

type Props = {
  params: Promise<{ rest: string[] }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const [id] = params.rest;

  return await generateVouchMetadata(Number(id));
}

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return children;
}
