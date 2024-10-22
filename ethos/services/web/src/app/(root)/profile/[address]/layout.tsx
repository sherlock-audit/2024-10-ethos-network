import { type Metadata } from 'next';
import { type ReactNode } from 'react';
import { type Address } from 'viem';
import { generateProfileMetadata } from 'constant/metadata/metadata.generator';

type Props = {
  params: { address: Address };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return await generateProfileMetadata({ address: params.address });
}

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return children;
}
