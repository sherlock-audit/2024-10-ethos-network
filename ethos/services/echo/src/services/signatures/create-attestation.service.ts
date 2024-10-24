import { xComHelpers } from '@ethos/attestation';
import { X_SERVICE } from '@ethos/domain';
import { type EthosEnvironment } from '@ethos/env';
import { recoverMessageAddress, parseSignature, type Hex, type Address } from 'viem';
import { z } from 'zod';
import { config } from '../../common/config';
import { TwitterOfficial } from '../../common/net/twitter/twitter-official.client';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { findValidTweet } from './x-attestation.utils';

const twitterOfficial = new TwitterOfficial();
const ALLOWED_ENVS_FOR_SIMPLIFIED_ATTESTATION: EthosEnvironment[] = ['local', 'dev'];

const schema = z.object({
  service: z.enum([X_SERVICE]),
  account: z.string().min(1),
  signature: validators.ecdsaSignature,
  isSimplified: z
    .boolean()
    .refine(
      (isSimplified) =>
        ALLOWED_ENVS_FOR_SIMPLIFIED_ATTESTATION.includes(config.ETHOS_ENV) || !isSimplified,
      {
        message: `Not allowed in ${config.ETHOS_ENV} environment`,
      },
    )
    .optional()
    .default(false),
});

type Input = z.infer<typeof schema>;
type Output = {
  randValue: number;
  signature: string;
  account: string;
  evidence: string;
};

export class CreateAttestation extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({
    service,
    account: incomingAccount,
    signature,
    isSimplified,
  }: Input): Promise<Output> {
    if (!this.isSignature(signature)) {
      throw ServiceError.BadRequest('Invalid signature', {
        fields: ['signature'],
      });
    }

    const address = await recoverMessageAddress({
      message: xComHelpers.getVerifyMsg(incomingAccount),
      signature,
    }).catch((err) => {
      this.logger.warn({ err }, 'Failed to recover address from signature');

      return null;
    });

    if (!address) {
      throw ServiceError.BadRequest('Couldn’t recover address from signature', {
        fields: ['signature'],
      });
    }

    const attestationDetails = await this.getAccount({
      address,
      service,
      incomingAccount,
      isSimplified,
    });

    if (!attestationDetails) {
      throw ServiceError.BadRequest('Couldn’t extract account from evidence', {
        fields: ['service', 'incomingAccount'],
      });
    }

    const profile = await prisma.profileAddress.findFirst({
      where: {
        address: {
          equals: address,
          mode: 'insensitive',
        },
      },
    });

    if (!profile) {
      throw ServiceError.Forbidden('No profile associated with the address', {
        fields: ['signature'],
      });
    }

    const result = await this.blockchainManager.createSignatureForCreateAttestation(
      profile.profileId,
      attestationDetails.account,
      service,
      attestationDetails.evidence,
      config.SIGNER_ACCOUNT_PRIVATE_KEY,
    );

    return {
      ...result,
      account: attestationDetails.account,
      evidence: attestationDetails.evidence,
    };
  }

  private isSignature(signature: string): signature is Hex {
    try {
      parseSignature(signature as Hex);

      return true;
    } catch {
      return false;
    }
  }

  private async getAccount({
    address,
    service,
    incomingAccount,
    isSimplified,
  }: {
    address: Address;
    service: string;
    incomingAccount: string;
    isSimplified: boolean;
  }): Promise<{ account: string; evidence: string } | null> {
    switch (service) {
      case X_SERVICE:
        return await this.getXAccount({ address, incomingAccount, isSimplified });
      default:
        return null;
    }
  }

  private async getXAccount({
    address,
    incomingAccount,
    isSimplified,
  }: {
    address: Address;
    incomingAccount: string;
    isSimplified: boolean;
  }): Promise<{ account: string; evidence: string } | null> {
    const twitterProfile = await prisma.twitterProfileCache.findUnique({
      where: { id: incomingAccount },
    });

    if (!twitterProfile || twitterProfile.id !== incomingAccount) {
      this.logger.warn({ data: { incomingAccount } }, 'invalid_x_com_account');

      return null;
    }

    if (isSimplified) {
      return {
        account: twitterProfile.id,
        // Mimic tweet URL with a fake tweet ID
        evidence: `https://x.com/${twitterProfile.username}/status/${'0'.repeat(19)}`,
      };
    }

    const keywords = xComHelpers.getTweetKeywords();

    // TODO: This assumes that the latest tweet is the one we want to use. But
    // there's a risk of social engineering where the attacker convinces the
    // victim to post the tweet and then the attacker would attest the victim's
    // account.
    // Ideas:
    //   - Restrict the search, for example, for tweets posted in the last X
    //     minutes.
    //   - Include some random nonce in the tweet content so the attacker can't
    //     guess it in advance.
    const tweets = await twitterOfficial.searchTweets({
      query: {
        from: String(incomingAccount),
        keywords,
      },
    });

    const tweet = findValidTweet(tweets, twitterProfile.id, address);

    if (!tweet) {
      this.logger.warn(
        { data: { tweets, keywords, xAccountId: twitterProfile.id } },
        'invalid_x_com_tweet',
      );

      throw ServiceError.BadRequest('Couldn’t find tweet', {
        code: 'TWEET_NOT_FOUND',
        fields: ['account'],
      });
    }

    return {
      account: twitterProfile.id,
      evidence: `https://x.com/${twitterProfile.username}/status/${tweet.id}`,
    };
  }
}
