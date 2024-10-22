import { CryptoCompareClient } from '../../common/net/crypto-compare/crypto-compare.client';
import { Service } from '../service.base';

type Output = {
  price: number;
};

export class EthPriceService extends Service<any, Output> {
  private readonly client = new CryptoCompareClient();
  validate(): boolean {
    return true;
  }

  async execute(): Promise<Output> {
    const price = await this.client.getEthPriceInUSD();

    return {
      price,
    };
  }
}
