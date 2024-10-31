import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { type ContractFactory, type BaseContract } from 'ethers';
import { ethers } from 'hardhat';
import {
  type EthosSlashPenalty,
  type EthosVaultManager,
  type WETH9,
  type ContractAddressManager,
  type ERC1967Proxy,
  type EthosAttestation,
  type EthosProfile,
  type EthosReview,
  type EthosVote,
  type EthosVouch,
  type InteractionControl,
  type PaymentToken,
  type RejectETHReceiver,
  type SignatureVerifier,
  type EthosEscrow,
  type EthosVaultFactory,
  type ReputationMarket,
} from '../../typechain-types';
import { EthosUser } from './ethosUser';
import { smartContractNames } from './mock.names';

type Deployable<T> = {
  contract: T;
  address: string;
};
type Factory<T> = {
  factory: ContractFactory;
} & Deployable<T>;
type Proxied<T> = {
  proxy: BaseContract;
} & Factory<T> &
  Deployable<T>;

export async function createDeployer(): Promise<EthosDeployer> {
  return await new EthosDeployer().initialize();
}

/**
 * This class is used to deploy and initialize the Ethos contracts.
 */
export class EthosDeployer {
  public OWNER!: HardhatEthersSigner;
  public ADMIN!: HardhatEthersSigner;
  public EXPECTED_SIGNER!: HardhatEthersSigner;
  public FEE_PROTOCOL_ACC!: HardhatEthersSigner;
  public RANDOM_ACC!: HardhatEthersSigner;

  public readonly ERC1967Proxy!: Factory<ERC1967Proxy>;
  public readonly weth9!: Deployable<WETH9>;
  public readonly contractAddressManager!: Deployable<ContractAddressManager>;
  public readonly signatureVerifier!: Deployable<SignatureVerifier>;
  public readonly interactionControl!: Deployable<InteractionControl>;
  public readonly ethosAttestation!: Proxied<EthosAttestation>;
  public readonly ethosProfile!: Proxied<EthosProfile>;
  public readonly ethosReview!: Proxied<EthosReview>;
  public readonly ethosVote!: Proxied<EthosVote>;
  public readonly ethosVouch!: Proxied<EthosVouch>;
  public readonly ethosEscrow!: Deployable<EthosEscrow>;
  public readonly ethosSlashPenalty!: Proxied<EthosSlashPenalty>;
  public readonly ethosVaultManager!: Proxied<EthosVaultManager>;
  public readonly ethosVaultFactory!: Deployable<EthosVaultFactory>;
  public readonly rejectETHReceiver!: Deployable<RejectETHReceiver>;
  public readonly paymentTokens: Array<Deployable<PaymentToken>> = [];
  public readonly reputationMarket!: Proxied<ReputationMarket>;

  constructor() {
    // this is stupid - just setting these to undefined
    // until we can populate them in initialize()
    // -- would never do this in non-test code
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ERC1967Proxy = {} as Factory<ERC1967Proxy>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.weth9 = {} as Deployable<WETH9>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.contractAddressManager = {} as Deployable<ContractAddressManager>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.signatureVerifier = {} as Deployable<SignatureVerifier>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.interactionControl = {} as Deployable<InteractionControl>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosAttestation = {} as Proxied<EthosAttestation>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosProfile = {} as Proxied<EthosProfile>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosReview = {} as Proxied<EthosReview>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosVote = {} as Proxied<EthosVote>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosVouch = {} as Proxied<EthosVouch>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosEscrow = {} as Deployable<EthosEscrow>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosSlashPenalty = {} as Proxied<EthosSlashPenalty>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosVaultManager = {} as Proxied<EthosVaultManager>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.ethosVaultFactory = {} as Deployable<EthosVaultFactory>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.rejectETHReceiver = {} as Deployable<RejectETHReceiver>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.reputationMarket = {} as Proxied<ReputationMarket>;
  }

  /**
   * Initializes the EthosDeployer in place, also returns the initialized EthosDeployer.
   * Use `createDeployer` for a static convenience method.
   * @returns {Promise<EthosDeployer>} The initialized EthosDeployer.
   */
  public async initialize(): Promise<EthosDeployer> {
    const signers = await ethers.getSigners();
    this.OWNER = signers[0];
    this.ADMIN = signers[1];
    this.EXPECTED_SIGNER = signers[2];
    this.FEE_PROTOCOL_ACC = signers[3];
    this.RANDOM_ACC = signers[4];
    // no dependencies
    await Promise.all([
      this.deployProxy(),
      this.deployContractAddressManager(),
      this.deploySignatureVerifier(),
      this.deployRejectETHReceiver(),
      this.deployPaymentToken(),
      this.deployWETH(),
    ]);
    // depends on contractAddressManager
    await Promise.all([
      this.deployInteractionControl(),
      this.deployEthosEscrow(),
      this.deployEthosVaultFactory(),
    ]);
    // depends on signatureVerifier, contractAddressManager
    await Promise.all([
      this.deployEthosAttestation(),
      this.deployEthosProfile(),
      this.deployEthosReview(),
      this.deployEthosVote(),
      this.deployEthosVouch(),
      this.deployEthosSlashPenalty(),
      this.deployEthosVaultManager(),
      this.deployReputationMarket(),
    ]);
    // requires all other contracts to be deployed
    await this.updateContractAddresses();

    return this;
  }

  /**
   * Deploys the ERC1967Proxy contract.
   * (no dependencies on other contracts)
   */
  async deployProxy(): Promise<void> {
    this.ERC1967Proxy.factory = await ethers.getContractFactory('ERC1967Proxy');
  }

  /**
   * Deploys the Wrapped ETH contract.
   * (no dependencies on other contracts)
   */
  async deployWETH(): Promise<void> {
    this.weth9.contract = await ethers.deployContract('WETH9', []);
    this.weth9.address = await this.weth9.contract.getAddress();
  }

  /**
   * Deploys the ContractAddressManager contract.
   * (no dependencies on other contracts)
   */
  async deployContractAddressManager(): Promise<void> {
    this.contractAddressManager.contract = await ethers.deployContract(
      'ContractAddressManager',
      [],
    );
    this.contractAddressManager.address = await this.contractAddressManager.contract.getAddress();
  }

  /**
   * Deploys the SignatureVerifier contract.
   * (no dependencies on other contracts)
   */
  async deploySignatureVerifier(): Promise<void> {
    this.signatureVerifier.contract = await ethers.deployContract('SignatureVerifier', []);
    this.signatureVerifier.address = await this.signatureVerifier.contract.getAddress();
  }

  /**
   * Deploys the InteractionControl contract.
   * (depends on contractAddressManager)
   */
  async deployInteractionControl(): Promise<void> {
    this.interactionControl.contract = await ethers.deployContract('InteractionControl', [
      this.OWNER.address,
      this.contractAddressManager.address,
    ]);
    this.interactionControl.address = await this.interactionControl.contract.getAddress();
  }

  /**
   * Deploys the EthosAttestation contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployEthosAttestation(): Promise<void> {
    this.ethosAttestation.factory = await ethers.getContractFactory('EthosAttestation');
    this.ethosAttestation.contract = await ethers.deployContract('EthosAttestation', []);
    this.ethosAttestation.address = await this.ethosAttestation.contract.getAddress();
    this.ethosAttestation.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosAttestation.address,
      this.ethosAttestation.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
      ]),
    );
    await this.ethosAttestation.proxy.waitForDeployment();
    this.ethosAttestation.address = await this.ethosAttestation.proxy.getAddress();

    if (this.ethosAttestation.address) {
      this.ethosAttestation.contract = await ethers.getContractAt(
        'EthosAttestation',
        this.ethosAttestation.address,
      );
    } else {
      throw new Error('EthosAttestation address is undefined');
    }
  }

  /**
   * Deploys the EthosProfile contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployEthosProfile(): Promise<void> {
    this.ethosProfile.factory = await ethers.getContractFactory('EthosProfile');
    this.ethosProfile.contract = await ethers.deployContract('EthosProfile', []);
    this.ethosProfile.address = await this.ethosProfile.contract.getAddress();
    this.ethosProfile.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosProfile.address,
      this.ethosProfile.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
      ]),
    );
    await this.ethosProfile.proxy.waitForDeployment();
    this.ethosProfile.address = await this.ethosProfile.proxy.getAddress();

    if (this.ethosProfile.address) {
      this.ethosProfile.contract = await ethers.getContractAt(
        'EthosProfile',
        this.ethosProfile.address,
      );
    } else {
      throw new Error('EthosProfile address is undefined');
    }
  }

  /**
   * Deploys the EthosReview contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployEthosReview(): Promise<void> {
    this.ethosReview.factory = await ethers.getContractFactory('EthosReview');
    this.ethosReview.contract = await ethers.deployContract('EthosReview', []);
    this.ethosReview.address = await this.ethosReview.contract.getAddress();
    this.ethosReview.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosReview.address,
      this.ethosReview.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
      ]),
    );
    await this.ethosReview.proxy.waitForDeployment();
    this.ethosReview.address = await this.ethosReview.proxy.getAddress();

    if (this.ethosReview.address) {
      this.ethosReview.contract = await ethers.getContractAt(
        'EthosReview',
        this.ethosReview.address,
      );
    } else {
      throw new Error('EthosReview address is undefined');
    }
  }

  /**
   * Deploys the EthosVote contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployEthosVote(): Promise<void> {
    this.ethosVote.factory = await ethers.getContractFactory('EthosVote');
    this.ethosVote.contract = await ethers.deployContract('EthosVote', []);
    this.ethosVote.address = await this.ethosVote.contract.getAddress();
    this.ethosVote.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosVote.address,
      this.ethosVote.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
      ]),
    );
    await this.ethosVote.proxy.waitForDeployment();
    this.ethosVote.address = await this.ethosVote.proxy.getAddress();

    if (this.ethosVote.address) {
      this.ethosVote.contract = await ethers.getContractAt('EthosVote', this.ethosVote.address);
    } else {
      throw new Error('EthosVote address is undefined');
    }
  }

  /**
   * Deploys the EthosVouch contract.
   * (depends on signatureVerifier, contractAddressManager, weth9)
   */
  async deployEthosVouch(): Promise<void> {
    this.ethosVouch.factory = await ethers.getContractFactory('EthosVouch');
    this.ethosVouch.contract = await ethers.deployContract('EthosVouch', []);
    this.ethosVouch.address = await this.ethosVouch.contract.getAddress();
    this.ethosVouch.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosVouch.address,
      this.ethosVouch.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
        this.weth9.address,
      ]),
    );
    await this.ethosVouch.proxy.waitForDeployment();
    this.ethosVouch.address = await this.ethosVouch.proxy.getAddress();

    if (this.ethosVouch.address) {
      this.ethosVouch.contract = await ethers.getContractAt('EthosVouch', this.ethosVouch.address);
    } else {
      throw new Error('EthosVouch address is undefined');
    }
  }

  /**
   * Deploys the EthosEscrow contract.
   * (depends on contractAddressManager)
   */
  async deployEthosEscrow(): Promise<void> {
    this.ethosEscrow.contract = await ethers.deployContract('EthosEscrow', [
      this.contractAddressManager.address,
    ]);
    this.ethosEscrow.address = await this.ethosEscrow.contract.getAddress();
  }

  /**
   * Deploys the EthosSlashPenalty contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployEthosSlashPenalty(): Promise<void> {
    this.ethosSlashPenalty.factory = await ethers.getContractFactory('EthosSlashPenalty');
    this.ethosSlashPenalty.contract = await ethers.deployContract('EthosSlashPenalty', []);
    this.ethosSlashPenalty.address = await this.ethosSlashPenalty.contract.getAddress();
    this.ethosSlashPenalty.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosSlashPenalty.address,
      this.ethosSlashPenalty.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
      ]),
    );
    await this.ethosSlashPenalty.proxy.waitForDeployment();
    this.ethosSlashPenalty.address = await this.ethosSlashPenalty.proxy.getAddress();

    if (this.ethosSlashPenalty.address) {
      this.ethosSlashPenalty.contract = await ethers.getContractAt(
        'EthosSlashPenalty',
        this.ethosSlashPenalty.address,
      );
    } else {
      throw new Error('EthosSlashPenalty address is undefined');
    }
  }

  /**
   * Deploys the EthosVaultManager contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployEthosVaultManager(): Promise<void> {
    this.ethosVaultManager.factory = await ethers.getContractFactory('EthosVaultManager');
    this.ethosVaultManager.contract = await ethers.deployContract('EthosVaultManager', []);
    this.ethosVaultManager.address = await this.ethosVaultManager.contract.getAddress();
    this.ethosVaultManager.proxy = await this.ERC1967Proxy.factory.deploy(
      this.ethosVaultManager.address,
      this.ethosVaultManager.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
        this.FEE_PROTOCOL_ACC.address,
        0n,
        0n,
        0n,
        0n,
      ]),
    );
    await this.ethosVaultManager.proxy.waitForDeployment();
    this.ethosVaultManager.address = await this.ethosVaultManager.proxy.getAddress();

    if (this.ethosVaultManager.address) {
      this.ethosVaultManager.contract = await ethers.getContractAt(
        'EthosVaultManager',
        this.ethosVaultManager.address,
      );
    } else {
      throw new Error('EthosVaultManager address is undefined');
    }
  }

  /**
   * Deploys the EthosVaultFactory contract.
   * (depends on contractAddressManager)
   */
  async deployEthosVaultFactory(): Promise<void> {
    this.ethosVaultFactory.contract = await ethers.deployContract('EthosVaultFactory', []);
    this.ethosVaultFactory.address = await this.ethosVaultFactory.contract.getAddress();
  }

  /**
   * Deploys the RejectETHReceiver contract.
   * (no dependencies on other contracts)
   */
  async deployRejectETHReceiver(): Promise<void> {
    this.rejectETHReceiver.contract = await ethers.deployContract('RejectETHReceiver', []);
    this.rejectETHReceiver.address = await this.rejectETHReceiver.contract.getAddress();
  }

  /**
   * Deploys the ReputationMarket contract.
   * (depends on signatureVerifier, contractAddressManager)
   */
  async deployReputationMarket(): Promise<void> {
    this.reputationMarket.factory = await ethers.getContractFactory('ReputationMarket');
    this.reputationMarket.contract = await ethers.deployContract('ReputationMarket', []);
    this.reputationMarket.address = await this.reputationMarket.contract.getAddress();
    this.reputationMarket.proxy = await this.ERC1967Proxy.factory.deploy(
      this.reputationMarket.address,
      this.reputationMarket.factory.interface.encodeFunctionData('initialize', [
        this.OWNER.address,
        this.ADMIN.address,
        this.EXPECTED_SIGNER.address,
        this.signatureVerifier.address,
        this.contractAddressManager.address,
      ]),
    );
    await this.reputationMarket.proxy.waitForDeployment();
    this.reputationMarket.address = await this.reputationMarket.proxy.getAddress();

    if (this.reputationMarket.address) {
      this.reputationMarket.contract = await ethers.getContractAt(
        'ReputationMarket',
        this.reputationMarket.address,
      );
    } else {
      throw new Error('ReputationMarket address is undefined');
    }
  }

  /**
   * Updates the contract addresses.
   * (depends on contractAddressManager, interactionControl)
   */
  async updateContractAddresses(): Promise<void> {
    if (!this.contractAddressManager.contract || !this.interactionControl.contract) {
      throw new Error('ContractAddressManager or InteractionControl not deployed');
    }

    const nameAndAddresses = [
      { name: smartContractNames.attestation, address: this.ethosAttestation.address },
      { name: smartContractNames.profile, address: this.ethosProfile.address },
      { name: smartContractNames.review, address: this.ethosReview.address },
      { name: smartContractNames.vote, address: this.ethosVote.address },
      { name: smartContractNames.vouch, address: this.ethosVouch.address },
      { name: smartContractNames.escrow, address: this.ethosEscrow.address },
      { name: smartContractNames.slashPenalty, address: this.ethosSlashPenalty.address },
      { name: smartContractNames.vaultManager, address: this.ethosVaultManager.address },
      { name: smartContractNames.vaultFactory, address: this.ethosVaultFactory.address },
      { name: smartContractNames.interactionControl, address: this.interactionControl.address },
      { name: smartContractNames.reputationMarket, address: this.reputationMarket.address },
    ];

    if (nameAndAddresses.some(({ address }) => address === undefined)) {
      throw new Error('One or more contract addresses are undefined');
    }

    const addresses = nameAndAddresses.map(({ address }) => address);
    const names = nameAndAddresses.map(({ name }) => name);

    await this.contractAddressManager.contract.updateContractAddressesForNames(addresses, names);

    await this.interactionControl.contract.addControlledContractNames(
      nameAndAddresses
        .filter(({ name }) => name !== smartContractNames.interactionControl)
        .map(({ name }) => name),
    );
  }

  /**
   * Deploys the PaymentToken contract.
   * (no dependencies on other contracts)
   */
  async deployPaymentToken(): Promise<void> {
    const index = this.paymentTokens.length;
    const paymentToken = await ethers.deployContract('PaymentToken', [
      `PAYMENT TOKEN NAME ${index}`,
      `PTN ${index}`,
    ]);
    await paymentToken.waitForDeployment();
    this.paymentTokens.push({ contract: paymentToken, address: await paymentToken.getAddress() });
  }

  /**
   * Mints and approves payment tokens for a user.
   * @param {HardhatEthersSigner} user - The user for whom the payment tokens are minted and approved.
   */
  async mintAndApprovePaymentTokensFor(user: HardhatEthersSigner): Promise<void> {
    if (!this.ethosVouch.address) {
      throw new Error('EthosVouch address is undefined');
    }

    for (const paymentToken of this.paymentTokens) {
      await paymentToken.contract.mint(user.address, ethers.parseEther('10'));
    }

    for (const paymentToken of this.paymentTokens) {
      await paymentToken.contract.connect(user).approve(this.ethosVouch.address, ethers.MaxUint256);
    }
  }

  /**
   * Creates a new wallet.
   * @returns {Promise<HardhatEthersSigner>} The new wallet.
   */
  async newWallet(): Promise<HardhatEthersSigner> {
    const wallet = ethers.Wallet.createRandom();
    const signer = await ethers.getImpersonatedSigner(wallet.address);
    await this.OWNER.sendTransaction({ to: wallet.address, value: ethers.parseEther('1') });

    return signer;
  }

  /**
   * Creates a new user.
   * @returns {Promise<EthosUser>} The new user.
   */
  async createUser(): Promise<EthosUser> {
    const recipient = await this.newWallet();

    if (!recipient) {
      throw new Error('No signer available for new users');
    }
    await this.ethosProfile.contract.connect(this.OWNER).inviteAddress(recipient.address);
    await this.ethosProfile.contract.connect(recipient).createProfile(1);
    const inviteeProfileId = await this.ethosProfile.contract.profileIdByAddress(recipient.address);

    return new EthosUser(recipient, inviteeProfileId, this);
  }

  /**
   * Returns a string representation of the EthosDeployer.
   * @returns {string} The string representation of the EthosDeployer.
   */
  public toString(): string {
    return `Ethos Deployer with owner: ${this.OWNER.address}`;
  }
}
