import { signatures } from '@ethos/domain';
import { webUrlMap } from '@ethos/env';
import { duration, isAddressEqualSafe } from '@ethos/helpers';
import { type Address, recoverMessageAddress } from 'viem';
import { parseSiweMessage } from 'viem/siwe';
import { z } from 'zod';
import { config } from '../../common/config.js';
import { publicViemClient } from '../../common/net/public-viem.client.js';
import { redis } from '../../data/redis.js';
import { user } from '../../data/user/lookup/index.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  connectedWalletSiweMessage: z.string(),
  connectedWalletSignature: validators.ecdsaSignature,
  newWalletMessage: z.string(),
  /**
   * Currently, only supports a smart wallet so the signature is ERC-6492. We
   * can extend this service to support any wallet.
   */
  newWalletSignature: validators.erc6492Signature,
});

type Input = z.infer<typeof schema>;
type Output = {
  randValue: number;
  signature: string;
};

export class RegisterAddress extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({
    connectedWalletSiweMessage,
    connectedWalletSignature,
    newWalletMessage,
    newWalletSignature,
  }: Input): Promise<Output> {
    // Both signatures reference each other's wallet, so we need to validate
    // whether the signatures are valid and match the expected wallet addresses.
    const { profileId, newWalletAddress, nonce } = await this.validateSignatures({
      connectedWalletSiweMessage,
      connectedWalletSignature,
      newWalletMessage,
      newWalletSignature,
    }).catch((err) => {
      if (err instanceof ServiceError) {
        throw err;
      }

      this.logger.error({ err }, 'signatures_verification_failed');

      throw ServiceError.BadRequest('Failed to verify signatures');
    });

    const profileAddress = await user.getAddresses({ profileId });

    // Ensure the wallet is not already connected to the profile.
    const isWalletAlreadyConnected = profileAddress.allAddresses.some((address) =>
      isAddressEqualSafe(address, newWalletAddress),
    );

    if (isWalletAlreadyConnected) {
      throw ServiceError.BadRequest('Wallet already connected to the profile');
    }

    const { randValue, signature } = await this.blockchainManager.createSignatureForRegisterAddress(
      profileId,
      newWalletAddress,
      config.SIGNER_ACCOUNT_PRIVATE_KEY,
    );

    // Mark nonce as used so the same signature can't be used again. The
    // signature is valid for 5 minutes, storing nonce for 10 minutes should be safe.
    await redis.setex(this.getUsedNonceCacheKey(nonce), duration(10, 'minutes').toSeconds(), nonce);

    return {
      randValue,
      signature,
    };
  }

  private async validateSignatures({
    connectedWalletSiweMessage,
    connectedWalletSignature,
    newWalletMessage,
    newWalletSignature,
  }: Input): Promise<{ profileId: number; newWalletAddress: Address; nonce: string }> {
    // Verify the connected wallet signature including the domain and whether
    // the signature is expired.
    const isConnectedWalletSignatureValid = await publicViemClient.verifySiweMessage({
      message: connectedWalletSiweMessage,
      signature: connectedWalletSignature,
      // We expect the signature to come from web service.
      domain: new URL(webUrlMap[config.ETHOS_ENV]).host,
    });

    if (!isConnectedWalletSignatureValid) {
      this.logger.info('invalid_connected_wallet_signature');

      throw ServiceError.Unauthorized('Invalid connected wallet signature', {
        fields: ['connectedWalletSignature'],
      });
    }

    const parsedConnectedWalletSiweMessage = parseSiweMessage(connectedWalletSiweMessage);

    if (!parsedConnectedWalletSiweMessage.statement) {
      this.logger.info('missing_connected_wallet_siwe_statement');

      throw ServiceError.Unauthorized('Invalid connected wallet message', {
        fields: ['connectedWalletSiweMessage'],
      });
    }

    if (!parsedConnectedWalletSiweMessage.nonce) {
      this.logger.info('missing_nonce');

      throw ServiceError.Unauthorized('Invalid connected wallet message', {
        fields: ['connectedWalletSiweMessage'],
      });
    }

    const isNonceUsed = Boolean(
      await redis.get(this.getUsedNonceCacheKey(parsedConnectedWalletSiweMessage.nonce)),
    );

    // This might be a replay attack where the same signature is used multiple
    // times by attacker. We should not allow the same signature to be used again.
    if (isNonceUsed) {
      this.logger.warn('connected_wallet_siwe_nonce_already_used');

      throw ServiceError.Unauthorized('Nonce already used', {
        fields: ['connectedWalletSiweMessage'],
      });
    }

    // Recover the connected wallet address from the signature.
    const connectedWallet = await recoverMessageAddress({
      message: connectedWalletSiweMessage,
      signature: connectedWalletSignature,
    });

    if (parsedConnectedWalletSiweMessage.address !== connectedWallet) {
      this.logger.info('connected_wallet_address_mismatch');

      throw ServiceError.Unauthorized('Invalid connected wallet signature', {
        fields: ['connectedWalletSignature'],
      });
    }

    const profileId = await user.getProfileIdByAddress(connectedWallet);

    // Ensure that the connected wallet is associated with a profile.
    if (!profileId) {
      this.logger.info('no_profile_associated_with_connected_wallet');

      throw ServiceError.NotFound('No profile associated with connected wallet', {
        fields: ['connectedWalletSignature'],
      });
    }

    const parsedConnectedWalletStatement = signatures.registerAddress.parseConnectedWalletStatement(
      parsedConnectedWalletSiweMessage.statement,
    );

    // Ensure that the connected wallet SIWE statement contains the correct new
    // wallet signature.
    if (parsedConnectedWalletStatement.newWalletSignature !== newWalletSignature) {
      this.logger.info('new_wallet_signature_mismatch');

      throw ServiceError.Unauthorized('Invalid new wallet signature', {
        fields: ['connectedWalletSignature', 'newWalletSignature'],
      });
    }

    // Verify the new wallet signature.
    // In this step we also verify if the new wallet address mentioned in the
    // connected wallet SIWE statement is the same as the address by which
    // this message was signed.
    const isNewWalletSignatureValid = await publicViemClient.verifyMessage({
      address: parsedConnectedWalletStatement.newWalletAddress,
      message: newWalletMessage,
      signature: newWalletSignature,
    });

    if (!isNewWalletSignatureValid) {
      this.logger.info('invalid_new_wallet_signature');

      throw ServiceError.Unauthorized('Invalid new wallet signature', {
        fields: ['newWalletSignature'],
      });
    }

    // Since the new wallet signature is valid, safely parse the message.
    const parsedNewWalletMessage =
      signatures.registerAddress.parseNewWalletMessage(newWalletMessage);

    // Ensure that the new wallet message contains the correct connected wallet address.
    if (parsedNewWalletMessage.connectedAddress !== connectedWallet) {
      this.logger.info('new_wallet_signature_connected_wallet_address_mismatch');

      throw ServiceError.Unauthorized('Invalid new wallet message', {
        fields: ['newWalletMessage'],
      });
    }

    return {
      profileId,
      newWalletAddress: parsedConnectedWalletStatement.newWalletAddress,
      nonce: parsedConnectedWalletSiweMessage.nonce,
    };
  }

  private getUsedNonceCacheKey(nonce: string): string {
    // Nonce is generated with
    // https://viem.sh/docs/siwe/utilities/generateSiweNonce. It's random enough
    // that we don't need to worry about adding the wallet address to the key to
    // avoid collisions.
    return `register_address:nonce:${nonce}`;
  }
}
