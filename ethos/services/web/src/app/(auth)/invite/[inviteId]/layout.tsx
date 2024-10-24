import { type Metadata, type ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { generateInviteMetadata } from 'constant/metadata/metadata.generator';
import { parseProfileInviteId } from 'utils/routing';

type Props = {
  params: { inviteId: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { inviteeAddress, inviterProfileId } = parseProfileInviteId(params.inviteId);

  if (inviteeAddress === null || inviterProfileId === null) {
    return (await parent) as Metadata;
  } else {
    return await generateInviteMetadata(inviteeAddress, inviterProfileId);
  }
}

export default function Layout({
  children,
  params,
}: {
  children?: ReactNode;
  params: { inviteId: string };
}): ReactNode {
  const { inviteeAddress, inviterProfileId } = parseProfileInviteId(params.inviteId);

  if (inviteeAddress === null || inviterProfileId === null) {
    return notFound();
  }

  return children;
}
