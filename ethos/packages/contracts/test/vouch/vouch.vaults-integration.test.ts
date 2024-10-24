import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  type EthosEscrow,
  type EthosSlashPenalty,
  type EthosVaultManager,
  type EthosVouch,
} from '../../typechain-types';
import { DEFAULT, VOUCH_PARAMS } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosVouch end-to-end', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;
  let userD: EthosUser;
  let ethosSlashPenalty: EthosSlashPenalty;
  let ethosVaultManager: EthosVaultManager;
  let ethosEscrow: EthosEscrow;
  let ethosVouch: EthosVouch;

  const entryfeeProtocolBasisPoint = 100n; // 1%
  const entryfeeDonationBasisPoint = 100n; // 1%
  const entryfeeVouchersPoolBasisPoint = 300n; // 3%
  const exitFeeBasisPoint = 100n; // 1%

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB, userC, userD] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
    ]);

    // set balances

    await userA.setBalance('2000');
    await userB.setBalance('2000');
    await userC.setBalance('2000');
    await userD.setBalance('2000');

    if (!deployer.ethosSlashPenalty.contract) {
      throw new Error('EthosSlashPenalty contract not found');
    }
    ethosSlashPenalty = deployer.ethosSlashPenalty.contract;

    if (!deployer.ethosVaultManager.contract) {
      throw new Error('EthosVaultManager contract not found');
    }
    ethosVaultManager = deployer.ethosVaultManager.contract;

    if (!deployer.ethosEscrow.contract) {
      throw new Error('EthosEscrow contract not found');
    }
    ethosEscrow = deployer.ethosEscrow.contract;

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosVouch = deployer.ethosVouch.contract;

    // Set entry and exit fees

    await ethosVaultManager
      .connect(deployer.ADMIN)
      .setEntryProtocolFeeBasisPoints(entryfeeProtocolBasisPoint);
    await ethosVaultManager
      .connect(deployer.ADMIN)
      .setEntryDonationFeeBasisPoints(entryfeeDonationBasisPoint);
    await ethosVaultManager
      .connect(deployer.ADMIN)
      .setEntryVouchersPoolFeeBasisPoints(entryfeeVouchersPoolBasisPoint);
    await ethosVaultManager.connect(deployer.ADMIN).setExitFeeBasisPoints(exitFeeBasisPoint);
  });

  // these tests call expect/assert inside the helper functions
  // eslint-disable-next-line jest/expect-expect
  it('should correctly calculate withdrawable assets and stakes after deposits and fee changes', async () => {
    await vouchAndCheckDepositsAndAssetCalculations(
      userB,
      userA,
      '1000',
      [
        { user: userB, expectedVouchedAmount: '980', expectedWithdrawableAssets: '970.2' }, // 980 * 0.99 (1% exit fee) = 970.2
        { user: userC, expectedVouchedAmount: '0', expectedWithdrawableAssets: '0' },
        { user: userD, expectedVouchedAmount: '0', expectedWithdrawableAssets: '0' },
      ],
      { protocolFee: '10', donationFee: '10' },
    );
    await vouchAndCheckDepositsAndAssetCalculations(
      userC,
      userA,
      '100',
      [
        {
          user: userB,
          expectedVouchedAmount: '982.73488372093',
          expectedWithdrawableAssets: '972.90753488372',
        }, // 982.73488372093 * 0.99 (1% exit fee) = 972.90753488372
        {
          user: userC,
          expectedVouchedAmount: '95.2651162790698',
          expectedWithdrawableAssets: '94.3124651162791',
        }, // 95.2651162790698 * 0.99 (1% exit fee) = 94.3124651162791
        { user: userD, expectedVouchedAmount: '0', expectedWithdrawableAssets: '0' },
      ],
      { protocolFee: '1', donationFee: '1' },
    );
    await vouchAndCheckDepositsAndAssetCalculations(
      userD,
      userA,
      '500',
      [
        {
          user: userB,
          expectedVouchedAmount: '992.226849758157',
          expectedWithdrawableAssets: '982.304581260575',
        }, // 992.226849758157 * 0.99 (1% exit fee) = 982.30458126057543
        {
          user: userC,
          expectedVouchedAmount: '96.1852558439',
          expectedWithdrawableAssets: '95.223403285461',
        }, // 96.1852558439 * 0.99 (1% exit fee) = 95.223403285461
        {
          user: userD,
          expectedVouchedAmount: '479.5878943979',
          expectedWithdrawableAssets: '474.792015454000',
        }, // 479.5878943979 * 0.99 (1% exit fee) = 474.792015453921 // TODO check this value ?????
      ],
      { protocolFee: '5', donationFee: '5' },
    );

    // all assets after deposit = (1000 + 100 + 500) * 0.98 = 1600 * 0.98 = 1568
    // 0.98 because 0.02 is the fee for the protocol, donation fee

    // all withdrawable assets = 1568 * 0.99 = 1552
    // 0.99 because 0.01 is exit fee

    await calculateAndCheckWithdrawable(userA, [userB, userC, userD], '1552.32');

    await unvouchAndCheckBalances(userA, [
      { user: userB, expectedWithdrawableAssets: '982.304581260575', exitFee: '9.922268497582' },
      { user: userC, expectedWithdrawableAssets: '95.223403285461', exitFee: '0.961852558439' },
      { user: userD, expectedWithdrawableAssets: '474.792015454000', exitFee: '4.795878943979' },
    ]);
  });

  // these tests call expect/assert inside the helper functions
  // eslint-disable-next-line jest/expect-expect
  it('should correctly handle slashes and calculate staked data', async () => {
    // withdrawable assets without exit fee => 19.6 eth
    // withdrawable assets with exit fee => 19.6 eth * 0.99 (1% exit fee) = 19.404 eth
    await vouchAndCheckDepositsAndAssetCalculations(
      userA,
      userB,
      '20',
      [{ user: userA, expectedVouchedAmount: '19.6', expectedWithdrawableAssets: '19.404' }], // withdrawable assets without exit fee = 19.6 eth
      { protocolFee: '0.2', donationFee: '0.2' },
    );
    // withdrawable assets without exit fee => 9.8 eth
    // withdrawable assets with exit fee => 9.8 eth * 0.99 (1% exit fee) = 9.702 eth
    await vouchAndCheckDepositsAndAssetCalculations(
      userA,
      userC,
      '10',
      [{ user: userA, expectedVouchedAmount: '9.8', expectedWithdrawableAssets: '9.702' }],
      { protocolFee: '0.1', donationFee: '0.1' },
    );

    // userB
    // withdrawable assets without exit fee => 18.62eth
    // withdrawable assets with exit fee => 18.62 eth * 0.99 (1% exit fee) = 18.4338 eth

    // userC
    // withdrawable assets without exit fee => 9.31 eth
    // withdrawable assets with exit fee => 9.31 eth * 0.99 (1% exit fee) = 9.2169 eth
    await slashAndCheck(userA, 500, [
      { user: userB, expectedWithdrawableAssets: '18.4338' },
      { user: userC, expectedWithdrawableAssets: '9.2169' },
      { user: userD, expectedWithdrawableAssets: '0' },
    ]);

    // withdrawable assets without exit fee => 98 eth
    // withdrawable assets with exit fee => 98 eth * 0.99 (1% exit fee) = 97.02 eth
    await vouchAndCheckDepositsAndAssetCalculations(
      userA,
      userD,
      '100',
      [{ user: userA, expectedVouchedAmount: '98', expectedWithdrawableAssets: '97.02' }],
      { protocolFee: '1', donationFee: '1' },
    );

    // userB
    // withdrawable assets without exit fee => 16.758 eth
    // withdrawable assets with exit fee => 16.758 eth * 0.99 (1% exit fee) = 16.59042 eth

    // userC
    // withdrawable assets without exit fee => 8.379 eth
    // withdrawable assets with exit fee => 8.379 eth * 0.99 (1% exit fee) = 8.29521 eth

    // userD
    // withdrawable assets without exit fee => 88.2 eth
    // withdrawable assets with exit fee => 88.2 eth * 0.99 (1% exit fee) = 87.318 eth
    await slashAndCheck(userA, 1000, [
      { user: userB, expectedWithdrawableAssets: '16.59042' },
      { user: userC, expectedWithdrawableAssets: '8.29521' },
      { user: userD, expectedWithdrawableAssets: '87.318' },
    ]);
  });

  async function vouchAndCheckDepositsAndAssetCalculations(
    voucher: EthosUser,
    vouchee: EthosUser,
    amount: string,
    usersWithAssets: Array<{
      user: EthosUser;
      expectedVouchedAmount: string;
      expectedWithdrawableAssets: string;
    }>,
    fees: { protocolFee: string; donationFee: string },
  ): Promise<void> {
    const paymentAmount = ethers.parseEther(amount);
    const vouchParams = {
      ...VOUCH_PARAMS,
      paymentAmount,
    };
    const ethBalanceForProtocolFeeAccBefore = await ethers.provider.getBalance(
      deployer.FEE_PROTOCOL_ACC.address,
    );

    const ethBalanceForEscrowBefore = await ethers.provider.getBalance(
      await ethosEscrow.getAddress(),
    );

    const ethBalanceInEscrowForVoucheeBefore = await ethosEscrow.balanceOf(
      vouchee.profileId,
      DEFAULT.ESCROW_TOKEN_ADDRESS,
    );

    await voucher.vouch(vouchee, vouchParams);

    // expected withdrawable asset
    const checkAssetPromises = usersWithAssets.map(
      async ({ user, expectedVouchedAmount, expectedWithdrawableAssets }) => {
        try {
          const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
            user.profileId,
            vouchee.profileId,
          );

          // expected vouched amount
          const expectedVouchedAmountRounded: bigint = excelRoundTo13Digits(
            BigInt(ethers.parseEther(expectedVouchedAmount)),
          );
          const vouchedAmountRounded: bigint = excelRoundTo13Digits(
            await user.getVouchBalance(vouch.vouchId),
          );
          expect(vouchedAmountRounded).to.be.at.most(expectedVouchedAmountRounded);
          expect(expectedVouchedAmountRounded - vouchedAmountRounded).to.be.at.most(BigInt(1));

          // expected withdrawable asset

          const maxWithdrawAssetsRounded: bigint = excelRoundTo13Digits(
            await user.getWithdrawableAssets(vouch.vouchId),
          );
          const expectedRoundedAssets: bigint = excelRoundTo13Digits(
            BigInt(ethers.parseEther(expectedWithdrawableAssets)),
          );
          expect(maxWithdrawAssetsRounded).to.be.at.most(expectedRoundedAssets);
          expect(expectedRoundedAssets - maxWithdrawAssetsRounded).to.be.at.most(BigInt(1));
        } catch (error) {
          // ignore if reverted with "VM Exception while processing transaction: reverted with custom error 'NotAuthorForVouch'"
          if (!(error as Error).message.includes('NotAuthorForVouch')) {
            throw error;
          }
        }
      },
    );

    await Promise.all(checkAssetPromises);

    // expected protocol fee
    // TODO make it work with excel rounding (in case we will need it)
    const expectedProtocolFeeDifference: bigint = ethers.parseEther(fees.protocolFee);
    const ethBalanceForProtocolFeeAccAfter = await ethers.provider.getBalance(
      deployer.FEE_PROTOCOL_ACC.address,
    );
    expect(ethBalanceForProtocolFeeAccAfter - ethBalanceForProtocolFeeAccBefore).to.be.equal(
      expectedProtocolFeeDifference,
    );

    // expected donation fee
    const ethBalanceForEscrowAfter = await ethers.provider.getBalance(
      await ethosEscrow.getAddress(),
    );
    const expectedVoucheeBalanceDifference: bigint = ethers.parseEther(fees.donationFee);
    expect(ethBalanceForEscrowAfter - ethBalanceForEscrowBefore).to.be.equal(
      expectedVoucheeBalanceDifference,
    );

    const ethBalanceInEscrowForVoucheeAfter = await ethosEscrow.balanceOf(
      vouchee.profileId,
      DEFAULT.ESCROW_TOKEN_ADDRESS,
    );
    expect(ethBalanceInEscrowForVoucheeAfter - ethBalanceInEscrowForVoucheeBefore).to.be.equal(
      expectedVoucheeBalanceDifference,
    );
  }

  async function calculateAndCheckWithdrawable(
    vouchee: EthosUser,
    users: EthosUser[],
    expectedValue: string,
  ): Promise<void> {
    let totalWithdrawable: bigint = 0n;

    for (const user of users) {
      try {
        const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
          user.profileId,
          vouchee.profileId,
        );
        // TODO check with vault data
        // const withdrawableAssets = await vault.previewRedeem(
        //   await vault.maxRedeem(user.signer.address),
        // );
        const maxWithdrawAssets: bigint = await user.getWithdrawableAssets(vouch.vouchId);
        totalWithdrawable += maxWithdrawAssets;
      } catch (error) {
        // ignore if reverted with "VM Exception while processing transaction: reverted with custom error 'NotAuthorForVouch'"
        if (!(error as Error).message.includes('NotAuthorForVouch')) {
          throw error;
        }
      }
    }

    const expectedTotal = BigInt(ethers.parseEther(expectedValue));

    expect(totalWithdrawable).to.closeTo(expectedTotal, users.length + 1);
  }

  async function unvouchAndCheckBalances(
    vouchee: EthosUser,
    usersWithAssets: Array<{
      user: EthosUser;
      expectedWithdrawableAssets: string;
      exitFee: string;
    }>,
  ): Promise<void> {
    for (const userWithexpectedWithdrawableAssets of usersWithAssets) {
      await unvouchAndCheckBalance(
        vouchee,
        userWithexpectedWithdrawableAssets.user,
        userWithexpectedWithdrawableAssets.expectedWithdrawableAssets,
        userWithexpectedWithdrawableAssets.exitFee,
      );
    }
  }

  async function unvouchAndCheckBalance(
    vouchee: EthosUser,
    user: EthosUser,
    expectedWithdrawableAssetss: string,
    exitFee: string,
  ): Promise<void> {
    const userAddress = user.signer.address;
    const feeProtocolBalanceBefore = await ethers.provider.getBalance(
      deployer.FEE_PROTOCOL_ACC.address,
    );
    const ethBalanceBefore = await ethers.provider.getBalance(userAddress);
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      user.profileId,
      vouchee.profileId,
    );
    const maxWithdrawAmount = await user.getWithdrawableAssets(vouch.vouchId);

    const voucheeVault = await vouchee.getVault();
    const withdrawableAssets = await voucheeVault.previewRedeem(user);

    const unvouchTx = await user.unvouch(vouch.vouchId);
    const receipt = await unvouchTx.wait();

    if (!receipt) {
      throw new Error('Transaction failed or receipt is null');
    }

    const ethBalanceCurrent = await ethers.provider.getBalance(userAddress);
    const transactionFee = receipt.gasUsed * receipt.gasPrice;

    expect(withdrawableAssets).to.equal(maxWithdrawAmount);

    expect(excelRoundTo13Digits(maxWithdrawAmount)).to.equal(
      excelRoundTo13Digits(BigInt(ethers.parseEther(expectedWithdrawableAssetss))),
    );

    // check user balance

    const expectedBalance =
      BigInt(ethBalanceBefore) + BigInt(maxWithdrawAmount.toString()) - transactionFee;
    expect(ethBalanceCurrent).to.equal(expectedBalance);

    // check fee protocol balance if exit fee is applied

    const feeProtocolBalanceCurrent = await ethers.provider.getBalance(
      deployer.FEE_PROTOCOL_ACC.address,
    );
    const feeProtocolBalanceDiff = feeProtocolBalanceCurrent - feeProtocolBalanceBefore;
    expect(excelRoundTo13Digits(feeProtocolBalanceDiff)).to.equal(
      BigInt(ethers.parseEther(exitFee)),
    );

    // check if unvouched vouches are now returning 0 as withdrawable assets and balance
    expect(await user.getVouchBalance(vouch.vouchId)).to.equal(0);
    expect(await user.getWithdrawableAssets(vouch.vouchId)).to.equal(0);
  }

  async function slashAndCheck(
    slashedUser: EthosUser,
    slashAmount: number,
    usersWithAssets: Array<{ user: EthosUser; expectedWithdrawableAssets: string }>,
  ): Promise<void> {
    // Perform the slashing
    await ethosSlashPenalty.slash(slashedUser.profileId, slashAmount);

    const checkAssetPromises = usersWithAssets.map(async ({ user, expectedWithdrawableAssets }) => {
      try {
        const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
          slashedUser.profileId,
          user.profileId,
        );
        const maxWithdrawAssets: bigint = excelRoundTo13Digits(
          await slashedUser.getWithdrawableAssets(vouch.vouchId),
        );
        const expectedRoundedAssets: bigint = excelRoundTo13Digits(
          BigInt(ethers.parseEther(expectedWithdrawableAssets)),
        );
        expect(maxWithdrawAssets).to.be.at.most(expectedRoundedAssets);

        expect(expectedRoundedAssets - maxWithdrawAssets).to.be.at.most(BigInt(1));
      } catch (error) {
        // ignore if reverted with "VM Exception while processing transaction: reverted with custom error 'WrongSubjectProfileIdForVouch'"
        if (!(error as Error).message.includes('WrongSubjectProfileIdForVouch')) {
          throw error;
        }
      }
    });

    await Promise.all(checkAssetPromises);
  }

  function excelRoundTo13Digits(value: bigint): bigint {
    const valueString = value.toString();
    const significantDigits = 13;

    if (valueString.length <= significantDigits) {
      return value;
    }

    const roundingDigit = parseInt(valueString.charAt(significantDigits), 10);
    const isNegative = value < BigInt(0);
    let truncatedValueString = valueString.substring(0, significantDigits);

    if (roundingDigit >= 5) {
      let truncatedValueNumber = BigInt(truncatedValueString);
      truncatedValueNumber += BigInt(1);
      truncatedValueString = truncatedValueNumber.toString();
    }

    if (truncatedValueString.length > significantDigits) {
      truncatedValueString = truncatedValueString.substring(0, significantDigits);
    }

    const zerosToAdd = valueString.length - significantDigits;
    const finalValueString = truncatedValueString + '0'.repeat(zerosToAdd);

    return isNegative ? BigInt('-' + finalValueString) : BigInt(finalValueString);
  }
});
