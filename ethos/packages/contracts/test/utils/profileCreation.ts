import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { type EthosProfile } from '../../typechain-types/index.js';

// ONLY USED FOR EthosReview.test.ts; new tests use deployEthos.createUser
export async function inviteAndCreateProfile(
  ethosProfileContract: EthosProfile,
  inviter: HardhatEthersSigner,
  recipient: HardhatEthersSigner,
): Promise<string> {
  await ethosProfileContract.connect(inviter).inviteAddress(recipient.address);
  await ethosProfileContract.connect(recipient).createProfile(1);
  const inviteeProfileId = String(await ethosProfileContract.profileIdByAddress(recipient.address));

  return inviteeProfileId;
}
