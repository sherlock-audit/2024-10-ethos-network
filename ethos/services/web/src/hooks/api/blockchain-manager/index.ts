import {
  type BlockchainManager,
  type AttestationService,
  type ReviewTarget,
  type ScoreType,
  type ProfileId,
  Score,
} from '@ethos/blockchain-manager';
import {
  discussionAbi,
  getContractsForEnvironment,
  isTargetContract,
  reviewAbi,
  voteAbi,
  type TargetContract,
} from '@ethos/contracts';
import { isValidAddress } from '@ethos/helpers';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useFeatureGate } from '@statsig/react-bindings';
import { useQueryClient } from '@tanstack/react-query';
import { getDefaultProvider } from 'ethers';
import { type Address, zeroAddress, getAddress, encodeFunctionData } from 'viem';
import { type VouchMetadata, type ReviewMetadata } from './metadata.utils';
import { useWithTxMutation, useWithViemTxMutation } from './useWithTxMutation';
import { getEnvironment } from 'config/environment';
import { featureGates } from 'constant/feature-flags';
import { invalidate, cacheKeysFor } from 'constant/queries/cache.invalidation';
import { INVALIDATE_ALL } from 'constant/queries/key.generator';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useBlockchainManager } from 'contexts/blockchain-manager.context';
import { useCurrentUser } from 'contexts/current-user.context';
import { explodeUserTargets, getAllUserTargets } from 'hooks/user/utils';
import { eventBus } from 'utils/event-bus';

const contracts = getContractsForEnvironment(getEnvironment());

export function useCreateProfile() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async (fromProfileId: number) =>
      await blockchainManager.ethosProfile.createProfile(fromProfileId),
    async onSuccess() {
      eventBus.emit('PROFILE_CREATED');

      if (connectedAddress) {
        invalidate(queryClient, cacheKeysFor.ProfileChange({ address: connectedAddress }));
      }
    },
  });
}

function useClassicWalletVoteFor(targetContract: TargetContract) {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async ({ id, isUpvote }: { id: number; isUpvote: boolean }) => {
      return await blockchainManager.ethosVote.voteFor(targetContract, id, isUpvote);
    },
    async onSuccess() {
      invalidate(queryClient, cacheKeysFor.VoteChange());
    },
  });
}

function useSmartWalletVoteFor(target: TargetContract) {
  const { blockchainManager } = useBlockchainManager();
  const { client } = useSmartWallets();
  const queryClient = useQueryClient();

  return useWithViemTxMutation({
    mutationFn: async ({ id, isUpvote }: { id: number; isUpvote: boolean }) => {
      // TODO: [CORE-1273] improve handling of the case when no client is available. But in
      // general, this should never happen.
      if (!client) throw new Error('No smart wallet client');
      if (!isTargetContract(target)) {
        throw new Error('Invalid target contract');
      }

      const hash = await client.sendTransaction({
        to: contracts.vote.address,
        data: encodeFunctionData({
          abi: voteAbi,
          functionName: 'voteFor',
          args: [blockchainManager.getContractAddress(target), BigInt(id), isUpvote],
        }),
      });

      return { hash };
    },
    async onSuccess() {
      invalidate(queryClient, cacheKeysFor.VoteChange());
    },
  });
}

export function useVoteFor(targetContract: TargetContract) {
  const { value: isPrivyEnabled } = useFeatureGate(featureGates.privyIntegration);
  const { isSmartWalletConnected } = useCurrentUser();
  const classicWalletVoteFor = useClassicWalletVoteFor(targetContract);
  const smartWalletVoteFor = useSmartWalletVoteFor(targetContract);

  return isSmartWalletConnected && isPrivyEnabled ? smartWalletVoteFor : classicWalletVoteFor;
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
      await blockchainManager.ethosAttestation.createAttestation(
        profileId,
        randValue,
        { account, service },
        evidence,
        signature,
      ),
    async onSuccess(tx, { profileId, service, account }) {
      // we need to update names, descriptions, scores for all views of this user - by profileId, addresses, etc.
      const allTargets = await explodeUserTargets([{ profileId }, { service, account }]);
      allTargets.forEach((target) => {
        invalidate(queryClient, cacheKeysFor.AttestationChange(target));
      });

      if (onSuccess) onSuccess(Boolean(tx), tx.hash);
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
    }) => await blockchainManager.ethosAttestation.archiveAttestation(service, account),
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

function useClassicWalletAddReview() {
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
      const result = await blockchainManager.ethosReview.addReview(
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

function useSmartWalletAddReview() {
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();
  const { client } = useSmartWallets();

  return useWithViemTxMutation({
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
      // TODO: [CORE-1273] improve handling of the case when no client is available. But in
      // general, this should never happen.
      if (!client) throw new Error('No smart wallet client');

      const address = 'address' in subject ? subject.address : zeroAddress;
      const attestation = 'service' in subject ? subject : { service: '', account: '' };
      const paymentToken = zeroAddress;

      const hash = await client.sendTransaction({
        to: contracts.review.address,
        data: encodeFunctionData({
          abi: reviewAbi,
          functionName: 'addReview',
          args: [
            Score[score],
            address,
            paymentToken,
            comment,
            JSON.stringify(metadata),
            attestation,
          ],
        }),
      });

      return { hash };
    },
    async onSuccess(_, { subject }) {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.ReviewChange(author, subject));
      }
    },
  });
}

export function useAddReview() {
  const { value: isPrivyEnabled } = useFeatureGate(featureGates.privyIntegration);
  const { value: isSmartWalletForReviewEnabled } = useFeatureGate(
    featureGates.useSmartWalletForReview,
  );
  const { isSmartWalletConnected } = useCurrentUser();

  const classicWalletAddReview = useClassicWalletAddReview();
  const smartWalletAddReview = useSmartWalletAddReview();

  return isSmartWalletConnected && isPrivyEnabled && isSmartWalletForReviewEnabled
    ? smartWalletAddReview
    : classicWalletAddReview;
}

export function useArchiveReview() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async (id: number) => {
      const [result, review] = await Promise.all([
        blockchainManager.ethosReview.archiveReview(id),
        blockchainManager.ethosReview.getReview(id),
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
      const result = await blockchainManager.ethosVouch.vouchByAddress(
        subjectAddress,
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
      const result = await blockchainManager.ethosVouch.vouchByProfileId(
        subjectProfileId,
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
        ? blockchainManager.ethosVouch.unvouch(vouchId)
        : blockchainManager.ethosVouch.unvouchUnhealthy(vouchId)),
    async onSuccess(_, vouchId) {
      if (connectedAddress) {
        const author = { address: connectedAddress };
        invalidate(queryClient, cacheKeysFor.VouchChange(author, INVALIDATE_ALL, vouchId));
      }
    },
  });
}

function useClassicWalletAddReply() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async (args: Parameters<BlockchainManager['ethosDiscussion']['addReply']>) =>
      await blockchainManager.ethosDiscussion.addReply(...args),
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

function useSmartWalletAddReply() {
  const { blockchainManager } = useBlockchainManager();
  const { client } = useSmartWallets();
  const queryClient = useQueryClient();

  return useWithViemTxMutation({
    mutationFn: async ([targetContract, targetId, content]: Parameters<
      BlockchainManager['ethosDiscussion']['addReply']
    >) => {
      // TODO: [CORE-1273] improve handling of the case when no client is available. But in
      // general, this should never happen.
      if (!client) throw new Error('No smart wallet client');

      const hash = await client.sendTransaction({
        to: contracts.discussion.address,
        data: encodeFunctionData({
          abi: discussionAbi,
          functionName: 'addReply',
          args: [
            blockchainManager.getContractAddress(targetContract),
            BigInt(targetId),
            content,
            '',
          ],
        }),
      });

      return { hash };
    },
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

export function useAddReply() {
  const { value: isPrivyEnabled } = useFeatureGate(featureGates.privyIntegration);
  const { isSmartWalletConnected } = useCurrentUser();
  const classicWalletAddReply = useClassicWalletAddReply();
  const smartWalletAddReply = useSmartWalletAddReply();

  return isSmartWalletConnected && isPrivyEnabled ? smartWalletAddReply : classicWalletAddReply;
}

export function useInviteAddress() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress, connectedProfile } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({ invitee }: { invitee: string }) => {
      if (isValidAddress(invitee)) {
        return await blockchainManager.ethosProfile.inviteAddress(getAddress(invitee));
      }

      const address = await getDefaultProvider().resolveName(invitee);

      if (!address) {
        throw new Error('Invalid Address or ENS Name');
      }

      return await blockchainManager.ethosProfile.inviteAddress(getAddress(address));
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
        return await blockchainManager.ethosProfile.uninviteUser(uninvitedUser);
      }

      const address = await getDefaultProvider().resolveName(uninvitedUser);

      if (!address) {
        throw new Error('Invalid Address or ENS Name');
      }

      return await blockchainManager.ethosProfile.uninviteUser(getAddress(address));
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

      const rewardsBalance = await blockchainManager.ethosVouch.getRewardsBalance(
        connectedProfile.id,
      );

      if (rewardsBalance.balance === '0') {
        throw new Error('No rewards to claim');
      }

      return await blockchainManager.ethosVouch.claimRewards();
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
      await blockchainManager.ethosProfile.addInvites(address, amount),
  });
}

export function useRegisterAddress() {
  const { connectedAddress } = useCurrentUser();
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();

  return useWithTxMutation({
    mutationFn: async ({
      address,
      profileId,
      randValue,
      signature,
    }: {
      address: Address;
      profileId: number;
      randValue: number;
      signature: string;
    }) =>
      await blockchainManager.ethosProfile.registerAddress(
        address,
        profileId,
        randValue,
        signature,
      ),
    async onSuccess() {
      if (connectedAddress) {
        invalidate(queryClient, cacheKeysFor.ProfileAddressesChange({ address: connectedAddress }));
      }
    },
  });
}
