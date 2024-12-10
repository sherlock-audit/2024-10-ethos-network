import { ENS_NAME_REGEX, ETHEREUM_ADDRESS_REGEX, USER_AVATAR_CONTAINER_REGEX } from './regex';

describe('USER_AVATAR_CONTAINER_REGEX', () => {
  const SAMPLE_USER_AVATAR_CONTAINER = 'UserAvatar-Container-123';
  const SAMPLE_USER_AVATAR_CONTAINER_INVALID = 'UserAvatar-Container-';

  it(`should match ${SAMPLE_USER_AVATAR_CONTAINER} because it is valid`, () => {
    expect(SAMPLE_USER_AVATAR_CONTAINER.match(USER_AVATAR_CONTAINER_REGEX)?.[0]).toEqual(
      SAMPLE_USER_AVATAR_CONTAINER,
    );
  });

  it(`should not match ${SAMPLE_USER_AVATAR_CONTAINER_INVALID} because it is invalid`, () => {
    expect(SAMPLE_USER_AVATAR_CONTAINER_INVALID.match(USER_AVATAR_CONTAINER_REGEX)).toEqual(null);
  });
});

describe('ENS Name Regex', () => {
  const SAMPLE_ENS_NAME = 'vitalik.eth';
  const SAMPLE_ENS_NAME_INVALID = 'vitalik.ethos';

  describe('Simple ENS Name Tests', () => {
    it(`should match ${SAMPLE_ENS_NAME} when it is the only value in the string`, () => {
      const text = `${SAMPLE_ENS_NAME}`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME);
    });

    it(`should match ${SAMPLE_ENS_NAME} when it is at the beginning of a sentence`, () => {
      const text = `${SAMPLE_ENS_NAME} is a popular ENS name.`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME);
    });

    it(`should match ${SAMPLE_ENS_NAME} when it is in the middle of a sentence`, () => {
      const text = `The ENS name ${SAMPLE_ENS_NAME} is popular in the crypto world.`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME);
    });

    it(`should match ${SAMPLE_ENS_NAME} at the end of a sentence without punctuation`, () => {
      const text = `My ENS is ${SAMPLE_ENS_NAME}`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME);
    });

    it(`should match ${SAMPLE_ENS_NAME} followed by punctuation`, () => {
      const text = `The ENS name is ${SAMPLE_ENS_NAME}, and it's important.`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME);
    });

    it('should not match ENS name when part of a domain', () => {
      const text = `Check ${SAMPLE_ENS_NAME}.limo/general`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });

    it('should not match ENS name when part of a URL', () => {
      const text = `Visit https://${SAMPLE_ENS_NAME}.limo/general`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });

    it('should not match ENS name when at the end of a URL', () => {
      const text = `Check out https://limo.com/${SAMPLE_ENS_NAME}`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });

    it('should not match ENS name has following text', () => {
      const text = `Check out ${SAMPLE_ENS_NAME_INVALID} on the blockchain.`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });
  });

  describe('Multi-Level ENS Name Tests', () => {
    const SAMPLE_ENS_NAME_MULTI_LEVEL = 'official.vitalik.eth';
    const SAMPLE_ENS_NAME_MULTI_LEVEL_INVALID = 'official.vitalik.ethos';

    it(`should match ${SAMPLE_ENS_NAME_MULTI_LEVEL} when it is the only value in the string`, () => {
      const text = `${SAMPLE_ENS_NAME_MULTI_LEVEL}`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME_MULTI_LEVEL);
    });

    it(`should match ${SAMPLE_ENS_NAME_MULTI_LEVEL} when it is at the beginning of a sentence`, () => {
      const text = `${SAMPLE_ENS_NAME_MULTI_LEVEL} is a multi-level ENS name.`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME_MULTI_LEVEL);
    });

    it(`should match ${SAMPLE_ENS_NAME_MULTI_LEVEL} when it is in the middle of a sentence`, () => {
      const text = `The ENS name ${SAMPLE_ENS_NAME_MULTI_LEVEL} is used widely.`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME_MULTI_LEVEL);
    });

    it(`should match ${SAMPLE_ENS_NAME_MULTI_LEVEL} at the end of a sentence without punctuation`, () => {
      const text = `My ENS is ${SAMPLE_ENS_NAME_MULTI_LEVEL}`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME_MULTI_LEVEL);
    });

    it(`should match ${SAMPLE_ENS_NAME_MULTI_LEVEL} followed by punctuation`, () => {
      const text = `The ENS name is ${SAMPLE_ENS_NAME_MULTI_LEVEL}, and it's widely used.`;
      expect(text.match(ENS_NAME_REGEX)?.[0]).toEqual(SAMPLE_ENS_NAME_MULTI_LEVEL);
    });

    it('should not match multi-level ENS name when part of a domain', () => {
      const text = `Check ${SAMPLE_ENS_NAME_MULTI_LEVEL}.limo/general`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });

    it('should not match multi-level ENS name when part of a URL', () => {
      const text = `Visit https://${SAMPLE_ENS_NAME_MULTI_LEVEL}.limo/general`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });

    it('should not match multi-level ENS name when at the end of a URL', () => {
      const text = `Check out https://limo.com/${SAMPLE_ENS_NAME_MULTI_LEVEL}`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });

    it('should not match multi-level when ENS name has adjacent text', () => {
      const text = `Check out ${SAMPLE_ENS_NAME_MULTI_LEVEL_INVALID} on the blockchain.`;
      expect(text.match(ENS_NAME_REGEX)).toEqual(null);
    });
  });
});

describe('Ethereum Wallet Address Regex', () => {
  const SAMPLE_ETH_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';

  it(`should match Ethereum wallet ${SAMPLE_ETH_ADDRESS} when it is the only value in the string`, () => {
    const text = `${SAMPLE_ETH_ADDRESS}`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)?.[0]).toEqual(SAMPLE_ETH_ADDRESS);
  });

  it(`should match Ethereum wallet ${SAMPLE_ETH_ADDRESS} when it is at the beginning of a sentence`, () => {
    const text = `${SAMPLE_ETH_ADDRESS} is a well-known wallet.`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)?.[0]).toEqual(SAMPLE_ETH_ADDRESS);
  });

  it(`should match Ethereum wallet ${SAMPLE_ETH_ADDRESS} when it is in the middle of a sentence`, () => {
    const text = `This wallet ${SAMPLE_ETH_ADDRESS} is used by many.`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)?.[0]).toEqual(SAMPLE_ETH_ADDRESS);
  });

  it(`should match Ethereum wallet ${SAMPLE_ETH_ADDRESS} at the end of a sentence without punctuation`, () => {
    const text = `Use the address ${SAMPLE_ETH_ADDRESS}`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)?.[0]).toEqual(SAMPLE_ETH_ADDRESS);
  });

  it(`should match Ethereum wallet ${SAMPLE_ETH_ADDRESS} followed by punctuation`, () => {
    const text = `Visit this wallet: ${SAMPLE_ETH_ADDRESS}, please.`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)?.[0]).toEqual(SAMPLE_ETH_ADDRESS);
  });

  it(`should not match Ethereum wallet ${SAMPLE_ETH_ADDRESS} followed by more characters`, () => {
    const text = `Visit this wallet: ${SAMPLE_ETH_ADDRESS}1234567890`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)).toEqual(null);
  });

  it('should not match Ethereum wallet if part of a URL', () => {
    const text = `http://example.com/${SAMPLE_ETH_ADDRESS}`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)).toEqual(null);
  });

  it('should not match Ethereum wallet if part of a URL 2', () => {
    const text = `https://etherscan.io/token/0xee2a03aa6dacf51c18679c516ad5283d8e7c2637?a=0xb1b2d032AA2F52347fbcfd08E5C3Cc55216E8404`;
    expect(text.match(ETHEREUM_ADDRESS_REGEX)).toEqual(null);
  });
});
