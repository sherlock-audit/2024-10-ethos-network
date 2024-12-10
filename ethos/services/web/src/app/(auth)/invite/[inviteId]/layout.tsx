import { type Metadata, type ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { type PropsWithChildren, type ReactNode } from 'react';
import { generateInviteMetadata } from 'constant/metadata/metadata.generator';
import { parseProfileInviteId } from 'utils/routing';

type Props = {
  params: Promise<{ inviteId: string }>;
};

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params;
  const { inviteeAddress, inviterProfileId } = parseProfileInviteId(params.inviteId);

  if (inviteeAddress === null || inviterProfileId === null) {
    return (await parent) as Metadata;
  } else {
    return await generateInviteMetadata(inviteeAddress, inviterProfileId);
  }
}

export default async function Layout(
  props: PropsWithChildren<{
    params: Promise<{ inviteId: string }>;
  }>,
): Promise<ReactNode> {
  const params = await props.params;

  const { children } = props;

  const { inviteeAddress, inviterProfileId } = parseProfileInviteId(params.inviteId);

  if (inviteeAddress === null || inviterProfileId === null) {
    return notFound();
  }

  return await children;
}
