import {
  type BlockchainManager,
  type AttestationService,
  type ReviewTarget,
  type ScoreType,
  ESCROW_TOKEN_ADDRESS,
  type ProfileId,
} from '@ethos/blockchain-manager';
import { type TargetContract } from '@ethos/contracts';
import { isValidAddress } from '@ethos/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { getDefaultProvider } from 'ethers';
import { type Address, zeroAddress, getAddress } from 'viem';
import { type VouchMetadata, type ReviewMetadata } from './metadata.utils';
import { useWithTxMutation } from './useWithTxMutation';
import { invalidate, cacheKeysFor } from 'constant/queries/cache.invalidation';
import { INVALIDATE_ALL } from 'constant/queries/key.generator';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useBlockchainManager } from 'contexts/blockchain-manager.context';
import { useCurrentUser } from 'contexts/current-user.context';
import { explodeUserTargets, getAllUserTargets } from 'hooks/user/utils';
import { eventBus } from 'utils/event-bus';

const NATIVE_TOKEN = zeroAddress;

export function useCreateProfile() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async (fromProfileId: number) =>
      await blockchainManager.createProfile(fromProfileId),
    async onSuccess() {
      eventBus.emit('PROFILE_CREATED');

      if (connectedAddress) {
        invalidate(queryClient, cacheKeysFor.ProfileChange({ address: connectedAddress }));
      }
    },
  });
}

export function useVoteFor(targetContract: TargetContract) {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async ({ id, isUpvote }: { id: number; isUpvote: boolean }) => {
      return await blockchainManager.voteFor(targetContract, id, isUpvote);
    },
    async onSuccess() {
      invalidate(queryClient, cacheKeysFor.VoteChange());
    },
  });
}

export function useCreateAttestation({
  onSuccess,
  onError,
}: {
  onSuccess?: (isTxConfirmed: boolean, txHash: string) => void;
  onError?: () => void;
} = {}) {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async ({
      profileId,
      randValue,
      account,
      service,
      evidence,
      signature,
    }: {
      profileId: number;
      randValue: number;
      account: string;
      service: AttestationService;
      evidence: string;
      signature: string;
    }) =>
      await blockchainManager.createAttestation(
        profileId,
        randValue,
        { account, service },
        evidence,
        signature,
      ),
    async onSuccess(tx, { profileId, service, account }) {
      if (onSuccess) onSuccess(Boolean(tx), tx.hash);
      // we need to update names, descriptions, scores for all views of this user - by profileId, addresses, etc.
      const allTargets = await explodeUserTargets([{ profileId }, { service, account }]);
      allTargets.forEach((target) => {
        invalidate(queryClient, cacheKeysFor.AttestationChange(target));
      });
    },
    onError,
  });
}

export function useArchiveAttestation({
  onSuccess,
  onError,
}: {
  onSuccess?: (isTxConfirmed: boolean) => void;
  onError?: () => void;
} = {}) {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async ({
      service,
      account,
    }: {
      service: AttestationService;
      account: string;
      profileId: number;
    }) => await blockchainManager.archiveAttestation(service, account),
    async onSuccess(tx, { profileId }) {
      if (onSuccess) onSuccess(Boolean(tx));

      // we need to update names, descriptions, scores for all views of this user - by profileId, addresses, etc.
      const allTargets = (await getAllUserTargets({ profileId })).targets;
      allTargets.forEach((target) => {
        invalidate(queryClient, cacheKeysFor.AttestationChange(target));
      });
    },
    onError,
  });
}

export function useAddReview() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({
      subject,
      score,
      comment,
      metadata,
    }: {
      subject: ReviewTarget;
      score: ScoreType;
      comment: string;
      metadata: ReviewMetadata;
    }) => {
      const result = await blockchainManager.addReview(
        score,
        subject,
        comment,
        JSON.stringify(metadata),
      );

      return result;
    },
    async onSuccess(_, { subject }) {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.ReviewChange(author, subject));
      }
    },
  });
}

export function useArchiveReview() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async (id: number) => {
      const [result, review] = await Promise.all([
        blockchainManager.archiveReview(id),
        blockchainManager.getReview(id),
      ]);

      if (!review) {
        throw new Error('Review not found');
      }

      return result;
    },
    async onSuccess() {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.ReviewChange(author, INVALIDATE_ALL));
      }
    },
  });
}

export function useVouchByAddress() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({
      paymentAmount,
      subjectAddress,
      comment,
      metadata,
    }: {
      paymentAmount: string;
      subjectAddress: Address;
      comment: string;
      metadata: VouchMetadata;
    }) => {
      const result = await blockchainManager.vouchByAddress(
        subjectAddress,
        NATIVE_TOKEN,
        paymentAmount,
        comment,
        JSON.stringify(metadata),
      );

      return result;
    },
    async onSuccess(_, { subjectAddress }) {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        const subject = { address: subjectAddress };
        invalidate(queryClient, cacheKeysFor.VouchChange(author, subject));
      }
    },
  });
}

export function useVouchByProfileId() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({
      paymentAmount,
      subjectProfileId,
      comment,
      metadata,
    }: {
      paymentAmount: string;
      subjectProfileId: ProfileId;
      comment: string;
      metadata: VouchMetadata;
    }) => {
      const result = await blockchainManager.vouchByProfileId(
        subjectProfileId,
        NATIVE_TOKEN,
        paymentAmount,
        comment,
        JSON.stringify(metadata),
      );

      return result;
    },
    async onSuccess(_, { subjectProfileId }) {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        const subject = { profileId: subjectProfileId };
        invalidate(queryClient, cacheKeysFor.VouchChange(author, subject));
      }
    },
  });
}

export function useUnvouch(healthy: boolean) {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async (vouchId: number) =>
      await (healthy
        ? blockchainManager.unvouch(vouchId)
        : blockchainManager.unvouchUnhealthy(vouchId)),
    async onSuccess(_, vouchId) {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.VouchChange(author, INVALIDATE_ALL, vouchId));
      }
    },
  });
}

export function useAddReply() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async (args: Parameters<BlockchainManager['addReply']>) =>
      await blockchainManager.addReply(...args),
    onSuccess: async (_data, [targetContract, targetId]) => {
      // omits Invalidate pattern as it's just a little bit more complex
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cacheKeys.reply.query({
            parentIds: [targetId],
            targetContract: blockchainManager.getContractAddress(targetContract),
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: cacheKeys.reply.summary({
            parentId: targetId,
            targetContract: blockchainManager.getContractAddress(targetContract),
          }),
        }),
      ]);
    },
  });
}

export function useInviteAddress() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress, connectedProfile } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({ invitee }: { invitee: string }) => {
      if (isValidAddress(invitee)) {
        return await blockchainManager.inviteAddress(getAddress(invitee));
      }

      const address = await getDefaultProvider().resolveName(invitee);

      if (!address) {
        throw new Error('Invalid Address or ENS Name');
      }

      return await blockchainManager.inviteAddress(getAddress(address));
    },
    async onSuccess() {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.ProfileChange(author));
      }

      if (connectedProfile) {
        queryClient.invalidateQueries({
          queryKey: cacheKeys.invitation.byAuthorInfinite({ invitedBy: connectedProfile.id }),
        });
      }
    },
  });
}

export function useUninviteUser() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress, connectedProfile } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({ uninvitedUser }: { uninvitedUser: string }) => {
      if (isValidAddress(uninvitedUser)) {
        return await blockchainManager.uninviteUser(uninvitedUser);
      }

      const address = await getDefaultProvider().resolveName(uninvitedUser);

      if (!address) {
        throw new Error('Invalid Address or ENS Name');
      }

      return await blockchainManager.uninviteUser(getAddress(address));
    },
    async onSuccess() {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.ProfileChange(author));
      }

      if (connectedProfile) {
        queryClient.invalidateQueries({
          queryKey: cacheKeys.invitation.byAuthorInfinite({ invitedBy: connectedProfile.id }),
        });
      }
    },
  });
}

export function useClaimVouchRewards() {
  const { blockchainManager } = useBlockchainManager();
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async () => {
      if (!connectedProfile) {
        throw new Error('Not an Ethos user');
      }

      if (!connectedAddress) {
        throw new Error('Not connected to wallet');
      }

      const escrowBalance = await blockchainManager.getEscrowBalance(
        connectedProfile.id,
        ESCROW_TOKEN_ADDRESS,
      );

      if (escrowBalance.balance === '0') {
        throw new Error('No rewards to claim');
      }

      return await blockchainManager.withdrawFromEscrow(
        escrowBalance.token,
        connectedAddress,
        escrowBalance.balance,
      );
    },
    onSuccess: () => {
      if (connectedAddress) {
        queryClient.invalidateQueries({
          queryKey: cacheKeys.vouch.rewards.byTarget({ address: connectedAddress }),
        });
      }
    },
  });
}

export function useAddInvites() {
  const { blockchainManager } = useBlockchainManager();

  return useWithTxMutation({
    mutationFn: async ({ address, amount }: { address: Address; amount: number }) =>
      await blockchainManager.addInvites(address, amount),
  });
}
