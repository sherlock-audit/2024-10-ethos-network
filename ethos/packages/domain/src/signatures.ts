import { getAddress, type Address, type ParseErc6492SignatureParameters } from 'viem';

const HEX_REGEX = /0x[a-fA-F0-9]+/gm;

/**
 * Utility functions for generating messages to sign and parsing them in the
 * register address flow.
 */
const registerAddress = {
  getNewWalletMessage(connectedAddress: Address) {
    return `I'm connecting my wallet to my Ethos profile with primary wallet ${connectedAddress}.`;
  },
  getConnectedWalletStatement(
    newWalletAddress: Address,
    newWalletSignature: ParseErc6492SignatureParameters,
  ) {
    return `I'm approving the connection of my wallet ${newWalletAddress} to my Ethos profile. Signature: ${newWalletSignature}`;
  },
  extractHexValues(str: string) {
    return [...str.matchAll(HEX_REGEX)].map(([match]) => match);
  },
  parseNewWalletMessage(message: string) {
    const [connectedAddress] = this.extractHexValues(message);

    return {
      connectedAddress: getAddress(connectedAddress),
    };
  },
  parseConnectedWalletStatement(statement: string) {
    const [newWalletAddress, newWalletSignature] = this.extractHexValues(statement);

    return {
      newWalletAddress: getAddress(newWalletAddress),
      newWalletSignature,
    };
  },
};

export const signatures = {
  registerAddress,
};
