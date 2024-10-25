
# Ethos Network contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

# Q&A

### Q: On what chains are the smart contracts going to be deployed?
Base L2
___

### Q: If you are integrating tokens, are you allowing only whitelisted tokens to work with the codebase or any complying with the standard? Are they assumed to have certain properties, e.g. be non-reentrant? Are there any types of [weird tokens](https://github.com/d-xo/weird-erc20) you want to integrate?
We will interact with : 
- wETH https://basescan.org/token/0x4200000000000000000000000000000000000006
- any other ERC20 that follows exactly the standard (eg. 18 decimals)
___

### Q: Are there any limitations on values set by admins (or other roles) in the codebase, including restrictions on array lengths?
We have applied configurable minimum prices and maximum array lengths in the contracts where applicable. Admins should not be able to configure them to an amount high enough to cause gas issues or other issues. You can report failures of these limits as valid findings.
___

### Q: Are there any limitations on values set by admins (or other roles) in protocols you integrate with, including restrictions on array lengths?
No
___

### Q: For permissioned functions, please list all checks and requirements that will be made before calling the function.
EthosProfile
1. _authorizeUpgrade (onlyOwner)
2. setDefaultNumberOfInvites (onlyAdmin)
3. addInvites (onlyAdmin)
4. addInvitesBatch (onlyAdmin)
5. setMaxAddresses (onlyAdmin)
6. setMaxInvites (onlyAdmin)

EthosAttestation
1. _authorizeUpgrade (onlyOwner)

EthosDiscussion
1. _authorizeUpgrade (onlyOwner)

EthosReview
1. _authorizeUpgrade (onlyOwner)
2. setReviewPrice (onlyAdmin)
3. withdrawFunds (onlyOwner)

EthosVote
1. _authorizeUpgrade (onlyOwner)

InteractionControl
1. updateContractAddressManager
2. addControlledContractNames
3. removeControlledContractName
4. pauseAll
5. unpauseAll
6. pauseContract
7. unpauseContract

ContractAddressManager
1. updateContractAddressesForNames (onlyOwner)

___

### Q: Is the codebase expected to comply with any EIPs? Can there be/are there any deviations from the specification?
None of the current scope is expected to comply with EIPs.
___

### Q: Are there any off-chain mechanisms for the protocol (keeper bots, arbitrage bots, etc.)? We assume they won't misbehave, delay, or go offline unless specified otherwise.
Yes. For EthosAttestation and EthosProfile: the Ethos app will verify off-chain data as an oracle, including twitter and other social media data. It will use the `signatureVerifier` address to sign data that the smart contract should trust.

The smart contract should reject transactions where signatures are invalid, repeated, or missing. 
___

### Q: If the codebase is to be deployed on an L2, what should be the behavior of the protocol in case of sequencer issues (if applicable)? Should Sherlock assume that the Sequencer won't misbehave, including going offline?
L2 behavior and sequencing issues, including downtime, is out of scope. 
___

### Q: What properties/invariants do you want to hold even if breaking them has a low/unknown impact?
One address may be associated with maximum one profile.
Profile creation requires at least one active invitation.
One may not write to Ethos contracts until a (non-mock) profile is created.
___

### Q: Please discuss any design choices you made.
The consequences of these contracts being hacked should never result in users losing money. These contracts explicitly should not ever allow the user to maintain funds (escrow, tokens, or other balances). We consider these "non-financial" smart contracts; they are "social" only.

The Review contract does have the ability to set a price, but payments are only withdrawable by the contract owner, and thus doesn't represent a loss of user funds (they've already paid). 
___

### Q: Please list any known issues and explicitly state the acceptable risks for each known issue.
We use arrays for invitations as they are limited by admin action. That will increase gas cost or lead to inability to add/remove invites, should traversal reach gas limits. That is acceptable and requires admins to avoid making that mistake.
___

### Q: We will report issues where the core protocol functionality is inaccessible for at least 7 days. Would you like to override this value?
7 days is acceptable
___

### Q: Please provide links to previous audits (if any).
No previous audits
___

### Q: Please list any relevant protocol resources.
https://whitepaper.ethos.network/

(we will also have more documentation available as smart contract comments and README.md files)
___



# Audit scope


[ethos @ fa30788af7b492a534ac7ecf5c6b6969af5e9e81](https://github.com/trust-ethos/ethos/tree/fa30788af7b492a534ac7ecf5c6b6969af5e9e81)
- [ethos/packages/contracts/contracts/EthosAttestation.sol](ethos/packages/contracts/contracts/EthosAttestation.sol)
- [ethos/packages/contracts/contracts/EthosDiscussion.sol](ethos/packages/contracts/contracts/EthosDiscussion.sol)
- [ethos/packages/contracts/contracts/EthosProfile.sol](ethos/packages/contracts/contracts/EthosProfile.sol)
- [ethos/packages/contracts/contracts/EthosReview.sol](ethos/packages/contracts/contracts/EthosReview.sol)
- [ethos/packages/contracts/contracts/EthosVote.sol](ethos/packages/contracts/contracts/EthosVote.sol)
- [ethos/packages/contracts/contracts/errors/AttestationErrors.sol](ethos/packages/contracts/contracts/errors/AttestationErrors.sol)
- [ethos/packages/contracts/contracts/errors/DiscussionErrors.sol](ethos/packages/contracts/contracts/errors/DiscussionErrors.sol)
- [ethos/packages/contracts/contracts/errors/ProfileErrors.sol](ethos/packages/contracts/contracts/errors/ProfileErrors.sol)
- [ethos/packages/contracts/contracts/errors/ReviewErrors.sol](ethos/packages/contracts/contracts/errors/ReviewErrors.sol)
- [ethos/packages/contracts/contracts/errors/TargetStatusErrors.sol](ethos/packages/contracts/contracts/errors/TargetStatusErrors.sol)
- [ethos/packages/contracts/contracts/errors/VoteErrors.sol](ethos/packages/contracts/contracts/errors/VoteErrors.sol)
- [ethos/packages/contracts/contracts/interfaces/IEthosAttestation.sol](ethos/packages/contracts/contracts/interfaces/IEthosAttestation.sol)
- [ethos/packages/contracts/contracts/interfaces/IEthosProfile.sol](ethos/packages/contracts/contracts/interfaces/IEthosProfile.sol)
- [ethos/packages/contracts/contracts/interfaces/ISignatureVerifier.sol](ethos/packages/contracts/contracts/interfaces/ISignatureVerifier.sol)
- [ethos/packages/contracts/contracts/interfaces/ITargetStatus.sol](ethos/packages/contracts/contracts/interfaces/ITargetStatus.sol)
- [ethos/packages/contracts/contracts/utils/AccessControl.sol](ethos/packages/contracts/contracts/utils/AccessControl.sol)
- [ethos/packages/contracts/contracts/utils/Common.sol](ethos/packages/contracts/contracts/utils/Common.sol)
- [ethos/packages/contracts/contracts/utils/Constants.sol](ethos/packages/contracts/contracts/utils/Constants.sol)
- [ethos/packages/contracts/contracts/utils/ContractAddressManager.sol](ethos/packages/contracts/contracts/utils/ContractAddressManager.sol)
- [ethos/packages/contracts/contracts/utils/InteractionControl.sol](ethos/packages/contracts/contracts/utils/InteractionControl.sol)
- [ethos/packages/contracts/contracts/utils/SignatureControl.sol](ethos/packages/contracts/contracts/utils/SignatureControl.sol)
- [ethos/packages/contracts/contracts/utils/SignatureVerifier.sol](ethos/packages/contracts/contracts/utils/SignatureVerifier.sol)
- [ethos/packages/contracts/contracts/utils/Structs.sol](ethos/packages/contracts/contracts/utils/Structs.sol)

