import { z } from 'zod';
import { privy } from '../../common/net/privy.client.js';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';

const schema = z.object({
  privyIdToken: z.string(),
});

type Input = z.infer<typeof schema>;

export class CreatePrivyLogin extends Service<typeof schema, undefined> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ privyIdToken }: Input): Promise<undefined> {
    const user = await privy.getUser({ idToken: privyIdToken });

    const wallets = user.linkedAccounts.filter((a) => a.type === 'wallet');
    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
    const smartWallet = user.linkedAccounts.find((a) => a.type === 'smart_wallet');
    const twitterUser = user.linkedAccounts.find((a) => a.type === 'twitter_oauth');

    if (!embeddedWallet || !smartWallet || !twitterUser) {
      this.logger.warn({ data: { user } }, 'missing_linked_accounts');

      throw ServiceError.Forbidden('Invalid linked accounts');
    }

    const data = {
      id: user.id,
      embeddedWallet: embeddedWallet.address,
      smartWallet: smartWallet.address,
      twitterUserId: twitterUser.subject,
    };

    await prisma.privyLogin.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
