# Ethos Contract

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```

## Smart Contracts deployment & setup flow

Refer to deployments in any unit test as an example (`deployFixture`)

- ContractAddressManager()
- SignatureVerifier()
- InteractionControl(OWNER, ContractAddressManager.address)
  - `OWNER` - owner address, that is able to send `onlyOwner` transactions (Note, the owner of this smart contract must be an admin in other contracts);
  - `ContractAddressManager.address` - address of ContractAddressManager Smart Contract.
- EthosAttestation(OWNER, ADMIN, EXPECTED_SIGNER, SignatureVerifier.address, ContractAddressManager.address)
  - `OWNER` - owner address that is able to send `onlyOwner` transactions;
  - `ADMIN` - admin address that is able to send `onlyAdmin` transactions;
  - `EXPECTED_SIGNER` - address that should be used for signature of messages for specific transactions (aka `createAttestation()`). What is _specific transactions_? These are transactions, that must be controlled / approved / signed by Ethos. This approach was used to allow users pay for transactions they want to perform.
  - `SignatureVerifier.address` - address of SignatureVerifier Smart Contract;
  - `ContractAddressManager.address` - address of ContractAddressManager Smart Contract.
- EthosProfile(OWNER, ADMIN, EXPECTED_SIGNER, SignatureVerifier.address, ContractAddressManager.address)
  - `OWNER` - described above;
  - `ADMIN` - described above;
  - `EXPECTED_SIGNER` - described above;
  - `SignatureVerifier.address` - described above;
  - `ContractAddressManager.address` - described above;
- EthosReview(OWNER, ADMIN, EXPECTED_SIGNER, SignatureVerifier.address, ContractAddressManager.address)
  - `OWNER` - described above;
  - `ADMIN` - described above;
  - `EXPECTED_SIGNER` - described above;
  - `SignatureVerifier.address` - described above;
  - `ContractAddressManager.address` - described above;
- EthosVote(OWNER, ADMIN, EXPECTED_SIGNER, SignatureVerifier.address, ContractAddressManager.address)
  - `OWNER` - described above;
  - `ADMIN` - described above;
  - `EXPECTED_SIGNER` - described above;
  - `SignatureVerifier.address` - described above;
  - `ContractAddressManager.address` - described above;
- EthosVouch(OWNER, ADMIN, EXPECTED_SIGNER, SignatureVerifier.address, ContractAddressManager.address)
  - `OWNER` - described above;
  - `ADMIN` - described above;
  - `EXPECTED_SIGNER` - described above;
  - `SignatureVerifier.address` - described above;
  - `ContractAddressManager.address` - described above;
  - `RECEIVER` - address that receives fees on unvouch;
- EthosDiscussion(ContractAddressManager.address)
  - `ContractAddressManager.address` - described above;
- contractAddressManager.updateContractAddressesForNames([
  - EthosAttestation.address,
  - EthosProfile.address,
  - EthosReview.address,
  - EthosVote.address,
  - EthosVouch.address,
  - InteractionControl.address],
  - [_names for these Smart Contracts_])
    - `EthosAttestation.address` - address for previously deployed Smart Contract;
    - `EthosProfile.address` - address for previously deployed Smart Contract;
    - `EthosReview.address` - address for previously deployed Smart Contract;
    - `EthosVote.address` - address for previously deployed Smart Contract;
    - `EthosVouch.address` - address for previously deployed Smart Contract;
    - `InteractionControl.address` - address for previously deployed Smart Contract;
    - `_names for these Smart Contracts_` - use names for Smart Contracts that will be used to get addresses.
- interactionControl.addControlledContractNames([_names used in updateContractAddressesForNames_]);
  - _names used in updateContractAddressesForNames_ - use **the names**, that were used in `interactionControl.addControlledContractNames`

Once deployed, make sure to add new address to `ContractAddressManager` contract and, if needed, to `InteractionControl`. To do this, you can run from `packages/contracts` directory:

```shell
cd packages/contracts

npm run deploy
```

## Smart Contract info

- **ContractAddressManager** is used to easily replace or add any other smart contract. It is implemented as a simple `mapping (contract name => address)`. The main reason for using a separate smart contract is that in case of replacing or adding another contract, each of Smart Contracts would need to be updated individually.
- **SignatureVerifier** is used to verify signatures. Simple implementation to do this only functionality.
- **InteractionControl** is used to control pause / pause. The main reason behind this contract is to be able to pause / unpause multiple contracts with single external transaction initiated by Ethos.
- **ethosAttestation** implements functionality related to attestation.
- **ethosProfile** implements functionality related to profile.
- **ethosReview** implements functionality related to review.
- **ethosVote** implements functionality related to vote.
- **ethosVouch** implements functionality related to vouch.
- **AccessControl** implements functionality to control external _managed_ requests, like
  - `onlyOwner`,
  - `onlyAdmin`,
  - `allowlistedOnly`,
  - `onlyInteractionControl`,
  - functionality for expectedSigner & SignatureVerifier, Pausable.
