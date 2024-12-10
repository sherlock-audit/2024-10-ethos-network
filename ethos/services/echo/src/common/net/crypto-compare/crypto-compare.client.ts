import { ethPriceCache } from '../../cache/exchange-rates/eth-price.js';

export class CryptoCompareClient {
  private readonly url = 'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD';

  public async getEthPriceInUSD(): Promise<number> {
    try {
      const cached = await ethPriceCache.get();

      if (cached) return cached;

      const response = await fetch(this.url);
      const data = await response.json();
      const price = data.USD as number;

      await ethPriceCache.set(price);

      return price;
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      throw new Error('Failed to fetch ETH price');
    }
  }
}
