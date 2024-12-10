# Ethos CLI

Ethos CLI is a command-line interface tool designed to streamline and enhance the development process for Ethos-based projects.

## Installation

To install the Ethos CLI, run the following command:
`npm run build` or `npm install --global`

## Usage

After installation, you can use the `ethos` command in your terminal. At any time you can run the CLI without arguments to see a list of valid subcommands and arguments.

```bash
ethos <command> <subcommand> [options]
```

## Environment

To connect to an environment other than dev, set the environment variable `ETHOS_CLI_ENV` to `testnet` or `mainnet`

## Available Commands

- `wallet`: Manage wallets
- `invite`: Send and receive invitations
- `rewards`: Manage Ethos rewards
- `review`: Leave reviews
- `vouch`: Vouch for Ethos users
- `contracts`: Display smart contract addresses
- `bulk`: Initialize Ethos accounts in bulk

For a full list of commands and options, run:

```bash
ethos --help
```

## Example Usage

### First time use

1. Create a new wallet
Run the following command to create a new wallet:
```bash
ethos wallet create -n WALLET_NICKNAME
```
The wallet should be created in your root directory
> ~/.ethos/.wallets.json

2. You can then manually add another wallet by editing the .wallets.json file and appending a new entry:
```json
{
  "address": "WALLET_ADDRESS",
  "privateKey": "PRIVATE_KEY_OF_THAT_ADDRESS",
  "nickname": "WALLET_NICKNAME",
  "active": false
}
```

3. Load the wallet
```bash
ethos wallet load -n WALLET_NICKNAME
```

4. Check that it's marked as active by running
```bash
ethos wallet info
```

### Invitation, vouching and reviews
```bash
1. Identify which wallet you are using, and how much ETH it has

> ethos wallet info
🏷️  Active wallet: god
🔗 Address: 0x7568033fa1C69BB90bCD8e28432E243Ffb1C65b4
💰 Balance: 4.294776107535960846 ETH

2. Show which users currently exist in the CLI

> ethos wallet list
🏷️  Active wallet: god
🔗 Wallets: stuff, god, bot1, bot2, ethos0, ethos1, ethos2, ethos3

3. Create 10 new users and send an initial balance of 0.001 ETH to each

> ethos bulk create --count 10 --amount 0.001 --prefix ethos
🏷️  Active wallet: god
💸 Transferring 0.001 ETH to: 0xfA115DD23230430C7966FED0617D5572D1F9e9c2
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0xe716de4f73782b03b6d6b14fafcac166efc6dbff9e17e3c2b40484133539f024
💸 Transferring 0.001 ETH to: 0x1BcF50d7054cA81B94156590A3bb69F356144278
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0x633dbeea0bae475daa6a1e96e931373e9c26ac435631a3e22b2e872249a504b7
💸 Transferring 0.001 ETH to: 0xDB9f4d769e968253B81bB17B2D1078F7A66FC8A5
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0x35daa34992ed93c48b55415249c0c7f80a9d0ce2bf44e74583a47781743cc202
💸 Transferring 0.001 ETH to: 0xF40f5E2dc5F5aF81d5E0Bd840475f426f56c123F
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0x03111f77e4d05967d01a94254f76e1b10c3d078b943a3522978c33fc093a8cd8
💸 Transferring 0.001 ETH to: 0x7c2f83948fd367aaE2F43e93782CeBf11605dEE0
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0xc735a88ca66ff53044495fc34ea0f3fb14af3c085534ff7da01828a63cd463ae
💸 Transferring 0.001 ETH to: 0x9f194726B1f0a3EE83f329c5D28bD2a0cB5d6501
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0xf07523a7b5c08a515852255cdd22f493534f0f0b744b240c77517279a0b8d9ef
💸 Transferring 0.001 ETH to: 0x91B2309fa52CC4B988080E93d45a845e0Bb5EA39
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0x58e3f5dae1f457a4b3d655f963ebd59ba3f9b35efdf21026896886f9d70be89a
💸 Transferring 0.001 ETH to: 0xBA2275536E9032a6a13bC7F1e07EA25bf5db03eE
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0xb2058c56ea5ad3be26d277f42ef4a855201d58dfca085cc75e3289dc115092f6
💸 Transferring 0.001 ETH to: 0x3d74B287d66c3BC95f91C7d11A2cd230526A7ba4
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0xb336743d221296fb47797a86e36a2e84b960fbc6a70977917bcd9bc249c39872
💸 Transferring 0.001 ETH to: 0x88d2266B36640966f7D30940DF837e9989FeE1fb
🔍 View on Sepolia Basescan: https://sepolia.basescan.org/tx/0x328d814b676db8964cf11ee2f66082985676771f1c4475b9fd2ed05102aeb64d

4. Show the users again

> ethos wallet list
🏷️  Active wallet: god
🔗 Wallets: stuff, god, bot1, bot2, ethos0, ethos1, ethos2, ethos3, ethos4, ethos5, ethos6, ethos7, ethos8, ethos9, ethos10, ethos11, ethos12, ethos13

5. Invite 5 users to join Ethos

> for i in {4..9}; do ethos invite send -r ethos$i --wait; done

🏷️ Active wallet: god
📨 Sending invite to: ethos4
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x1e971be2d8c23806ecec6bb8b662f0e8c1ca733002c0348c83abb59f6f6c6ea6
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
🏷️ Active wallet: god
📨 Sending invite to: ethos5
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x44709f41521611105dc3d360e1cca19812756e738be92f99b22f06164594299a
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
📨 Sending invite to: ethos6
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x32ce7eaa33ca7a9597d777cf41b558fa2209c299e3863fc5bfc549a5dd65ca82
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
🏷️ Active wallet: god
📨 Sending invite to: ethos7
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x2a477da336cb9194b70cc92d2ecfde7ee813f4f9ea3b4e7d3aaeff310cd82d38
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
🏷️ Active wallet: god
📨 Sending invite to: ethos8
🎫 View on Basescan: https://sepolia.basescan.org/tx/0xabfdad3c8a97395a04f30c1ba7889b2bcd4342cb3e007aefed85cacd865097a1
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
🏷️ Active wallet: god
📨 Sending invite to: ethos9
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x54218b8adb5827291ec1f39afa98f89dd584f0771d65589a8f99042b9f650417
💤 Waiting for transaction confirmation...
✅ Transaction confirmed

6. Switch wallets

>  ethos wallet load -n ethos9
🏷️  Active wallet: god
🔓 Loaded wallet: ethos9

7. Accept an invite

> ethos invite accept -s god
🏷️  Active wallet: ethos9
👥 Accepting invite from: 0x7568033fa1C69BB90bCD8e28432E243Ffb1C65b4
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x3b965c3ac4d9ca247744f4881304bb0408854bb21f29f65093fe18e0f2fb07a7

8. Invite 3 more users to join Ethos from this wallet

> for i in {10..12}; do ethos invite send -r ethos$i --wait; done
🏷️  Active wallet: ethos9
📨 Sending invite to: ethos10
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x9f6d50931344c5ddcc548d1b9d76fa2d95f3bbd30a3c8db818e947027487a2d1
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
🏷️  Active wallet: ethos9
📨 Sending invite to: ethos11
🎫 View on Basescan: https://sepolia.basescan.org/tx/0xa6cd1608bab3cc85a773acdba1fe1ce176cb398a3edbc662f4f2618c103addac
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
🏷️  Active wallet: ethos9
📨 Sending invite to: ethos12
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x2bd27b3f3d713ad1e21309a6ee316ef5c6de24ea1ed61fc9326edb3fe2815232
💤 Waiting for transaction confirmation...
✅ Transaction confirmed

9. Write a review for a user

> ethos review add --subject ethos13 --rating positive --comment "welcome to ethos" --description "enjoy your stay" --wait

🏷️  Active wallet: ethos9
💬 Adding review for: ethos13
🎫 View on Basescan: https://sepolia.basescan.org/tx/0x925cfa344eb84aa3955453b60d58e47b9848f93123a8fb3d99921cfbb8484e83
💤 Waiting for transaction confirmation...
✅ Transaction confirmed
```
### Batch invite to address
This is helpful for testing the paginated invite list feature
1. Switch to a wallet that has available invites
```bash
ethos wallet load -n owner
````
2. Run the following command
```bash
ethos bulk create --count 10 --amount 0.001 --prefix adrian
````
3. Send invites to those users
```bash
for i in {2..9}; do ethos invite send -r adrian$i --wait; done
````
3. Switch to those wallets and accept the invitations
```bash
for i in {2..9}; do ethos wallet load -n adrian$i && ethos invite accept -s owner; done
````
4. Invite first address from each of them
```bash
for i in {4..9}; do ethos wallet load -n adrian$i && ethos invite send -r adrian1 --wait; done
````


## Configuration

Based on the walletManager.ts file, the Ethos CLI uses the .wallets.json file to store and manage wallet information.

### File Location

The .wallets.json file is stored in the user's home directory. The file is created when the Ethos CLI is first run and is used to store wallet information.
You can open the file by running the following command:

```bash
vim ~/.ethos/.wallets.json
```

### Loading wallets between Ethos CLI and Metamask
