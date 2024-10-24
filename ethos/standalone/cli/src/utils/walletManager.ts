import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BlockchainManager } from '@ethos/blockchain-manager';
import { isValidAddress, isValidEnsName } from '@ethos/helpers';
import { ethers } from 'ethers';
import { type Address } from 'viem';
import { globals } from '../globals';
import { alchemyConnectionURL, ETHOS_ENV, mainnetProvider, provider } from './config';
import { error, out } from './output';

const WALLET_FILE = path.join(os.homedir(), '.ethos', '.wallets.json');
type WalletStorage = {
  address: string;
  privateKey: string;
  nickname: string;
  active: boolean;
};

/**
 * Manages Ethereum address wallet operations including creation, storage, and initiating transactions.
 * Includes a reference to the Ethos blockchain manager for triggering actions on behalf on this user.
 * Tracks a single active user by default.
 */
export class WalletManager {
  connect: BlockchainManager;
  wallets: WalletStorage[];

  constructor() {
    this.connect = new BlockchainManager(ETHOS_ENV, { alchemyConnectionURL });
    this.wallets = [];
  }

  /**
   * Loads wallets from storage and initializes the active wallet.
   */
  private async load(): Promise<void> {
    this.wallets = await this.loadWalletsFromFile();
    const activeWallet = this.wallets.find((wallet) => wallet.active);
    this.connect = new BlockchainManager(ETHOS_ENV, {
      alchemyConnectionURL,
      walletPrivateKey: activeWallet?.privateKey,
    });
    out(`🏷️  Active wallet: ${activeWallet?.nickname}`);
  }

  /**
   * Initializes a new WalletManager instance.
   * Does not require an active walletManager instance to exist first.
   * Call instead of "new WalletManager()" or constructor.
   */
  static async initialize(): Promise<WalletManager> {
    const walletManager = new WalletManager();
    await walletManager.load();

    return walletManager;
  }

  /**
   * Changes the currently active wallet to the specified nickname.
   * @param nickname - The nickname of the wallet to set as active
   */
  async setActive(nickname: string): Promise<void> {
    const wallet = await this.getWalletByNickname(nickname);
    this.connect = new BlockchainManager(ETHOS_ENV, {
      alchemyConnectionURL,
      walletPrivateKey: wallet.privateKey,
    });
    this.wallets.forEach((wallet) => {
      wallet.active = wallet.nickname === nickname;
    });
    await this.saveWalletsToFile();
  }

  /**
   * Generates a new address and private key and saves it to storage.
   * It does not set the new wallet as active.
   * @param nickname - The nickname of the wallet to create
   * @returns The new wallet instance
   */
  async create(nickname: string): Promise<ethers.HDNodeWallet> {
    if ((await this.getNicknames()).includes(nickname)) {
      error(`Nickname ${nickname} already exists.`);
    }
    const wallet = ethers.Wallet.createRandom();
    this.wallets.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
      nickname,
      active: false,
    });
    await this.saveWalletsToFile();

    return wallet;
  }

  /**
   * Sends ETH from the active wallet to a recipient.
   * @param {Address} recipient - The recipient's address
   * @param {number} amount - The amount of ETH to send
   * @returns {Promise<ethers.TransactionReceipt>} The transaction receipt
   */
  async sendEth(recipient: Address, amount: number): Promise<ethers.TransactionReceipt> {
    const wallet = await this.getActiveWallet();
    const tx = await wallet.sendTransaction({
      to: recipient,
      value: ethers.parseEther(String(amount)),
    });

    const receipt = await tx.wait();

    if (!receipt) {
      error('Transaction failed');
      process.exit(0);
    }

    return receipt;
  }

  /**
   * Gets all wallet nicknames.
   * @returns {Promise<string[]>} An array of wallet nicknames
   */
  async getNicknames(): Promise<string[]> {
    return this.wallets.map((wallet) => wallet.nickname);
  }

  /**
   * Gets information about the active wallet.
   * @returns {Promise<WalletStorage>} The active wallet's information
   */
  async info(): Promise<WalletStorage> {
    const wallet = this.wallets.find((wallet) => wallet.active);

    if (!wallet) {
      error('No active wallet found');
      process.exit(0);
    }

    return wallet;
  }

  /**
   * Gets the balance of the active wallet.
   * @returns {Promise<string>} The balance in ETH as a string
   */
  async balance(): Promise<string> {
    const wallet = await this.getActiveWallet();
    const balanceWei = await provider.getBalance(wallet.address);

    return ethers.formatEther(balanceWei);
  }

  /**
   * Looks up a wallet by its nickname.
   * @param {string} nickname - The nickname of the wallet to retrieve
   * @returns {Promise<ethers.Wallet>} The wallet instance
   */
  async getWalletByNickname(nickname: string): Promise<ethers.Wallet> {
    const wallet = this.wallets.find((wallet) => wallet.nickname === nickname);

    if (!wallet) {
      error(`Wallet with nickname ${nickname} not found`);
      process.exit(0);
    }

    return new ethers.Wallet(wallet.privateKey, provider);
  }

  /**
   * Gets the active wallet.
   * @returns {Promise<ethers.Wallet>} The active wallet instance
   */
  async getActiveWallet(): Promise<ethers.Wallet> {
    const wallet = this.wallets.find((wallet) => wallet.active);

    if (!wallet) {
      error('No active wallet found');
      process.exit(0);
    }

    return new ethers.Wallet(wallet.privateKey, provider);
  }

  /**
   * Saves the current wallet state to storage.
   */
  async saveWalletsToFile(): Promise<void> {
    if (globals.verbose) {
      out(`Saving wallets to file: ${WALLET_FILE}`);
    }
    await fs.mkdir(path.dirname(WALLET_FILE), { recursive: true });
    await fs.writeFile(WALLET_FILE, JSON.stringify(this.wallets, null, 2));
  }

  /**
   * Interprets a name as an address, nickname, or ENS name.
   * Convenience function that allows referencing users by nickname or ENS name.
   * @param {string} name - The name to interpret
   * @returns {Promise<Address>} The resolved address
   */
  async interpretName(name: string): Promise<Address> {
    const nicknames = await this.getNicknames();

    if (nicknames.includes(name)) {
      const { address } = await this.getWalletByNickname(name);

      if (isValidAddress(address)) {
        return address;
      }
    }
    if (isValidAddress(name)) {
      return name;
    }
    if (isValidEnsName(name)) {
      const ens = await resolveEns(name);

      if (ens) {
        return ens;
      }
    }

    error(`Could not find an address for ${name}`);
    process.exit(0);
  }

  /**
   * Loads wallets from storage.
   */
  async loadWalletsFromFile(): Promise<WalletStorage[]> {
    if (globals.verbose) {
      out(`Loading wallets from file: ${WALLET_FILE}`);
    }
    if (!existsSync(WALLET_FILE)) {
      await fs.mkdir(path.dirname(WALLET_FILE), { recursive: true });
      await fs.writeFile(WALLET_FILE, JSON.stringify([]));
    }
    const content = await fs.readFile(WALLET_FILE, 'utf-8');

    return JSON.parse(content);
  }

  /**
   * Gets the Ethos profile ID for the active wallet.
   * @returns {Promise<number | null>} The Ethos profile ID or null if not found
   */
  async getEthosProfileId(): Promise<number | null> {
    const wallet = await this.getActiveWallet();

    if (!isValidAddress(wallet.address)) {
      error('No active wallet found');
      process.exit(0);
    }
    const profile = await this.connect.ethosProfile.getProfileByAddress(wallet.address);

    return profile?.id ?? null;
  }
}

/**
 * Resolves an ENS name to an address.
 * Uses the mainnet provider as Base Sepolia doesn't have an ENS resolver.
 * @param {string} ensName - The ENS name to resolve
 * @returns {Promise<Address | null>} The resolved address or null if not found
 */
async function resolveEns(ensName: string): Promise<Address | null> {
  const address = await mainnetProvider
    .getResolver(ensName)
    .then(async (r) => await r?.getAddress());

  return isValidAddress(address) ? address : null;
}
