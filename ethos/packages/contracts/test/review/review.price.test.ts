import '@nomicfoundation/hardhat-chai-matchers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { zeroAddress } from 'viem';
import { type EthosReview, type PaymentToken } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers } = hre;

describe('EthosReview Prices', () => {
  let deployer: EthosDeployer;
  let userB: EthosUser;
  let ethosReview: EthosReview;
  let paymentToken: PaymentToken;

  const Score = {
    Negative: 0,
    Neutral: 1,
    Positive: 2,
  };

  const defaultComment = 'default comment';
  const defaultMetadata = JSON.stringify({ itemKey: 'item value' });

  const SERVICE_X = 'x.com';

  const ACCOUNT_NAME_BEN = 'benwalther256';

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userB = await deployer.createUser();

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosReview = deployer.ethosReview.contract;

    paymentToken = deployer.paymentTokens[0].contract;
  });

  it('should accept ERC20 token payment without requiring ETH', async () => {
    const tokenPrice = ethers.parseEther('0.01');
    const tokenAddress = await paymentToken.getAddress();

    // Set review price for the payment token
    await ethosReview.connect(deployer.ADMIN).setReviewPrice(true, tokenAddress, tokenPrice);
    // disable ETH payment
    await ethosReview.connect(deployer.ADMIN).setReviewPrice(false, zeroAddress, 0n);

    // Mint tokens to userB and approve spending
    await paymentToken.mint(await userB.signer.getAddress(), tokenPrice);
    await paymentToken.connect(userB.signer).approve(await ethosReview.getAddress(), tokenPrice);

    // review with ETH should be rejected as wrong token
    await expect(
      userB.review({
        score: Score.Positive,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        },
      }),
    ).to.be.revertedWithCustomError(ethosReview, 'WrongPaymentToken');

    // sending both ETH and the ERC20 token should be rejected
    await expect(
      userB.review({
        score: Score.Positive,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        },
        paymentToken: tokenAddress,
        value: tokenPrice,
      }),
    )
      .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentAmount')
      .withArgs(ethers.ZeroAddress, tokenPrice);

    // review with correct token and no ETH should succeed
    await userB.review({
      score: Score.Positive,
      comment: defaultComment,
      metadata: defaultMetadata,
      attestationDetails: {
        account: ACCOUNT_NAME_BEN,
        service: SERVICE_X,
      },
      paymentToken: tokenAddress,
    });
  });
});
