import { getContractsForEnvironment } from '@ethos/contracts';
import { EthosAttestation } from './EthosAttestation';
import { getContractRunner } from './utils';

describe('hash', () => {
  it('should return the same hash as the blockchain manager getServiceAndAccountHash function', () => {
    const runner = getContractRunner();
    const contractLookup = getContractsForEnvironment('prod');
    const ethosAttestation = new EthosAttestation(runner, contractLookup);
    const combinations = [
      {
        service: 'service',
        account: 'account',
        hash: '0xc8f300cdd121db675d2c35da636dd69e12072fed0f5daabbe5ac66834259fc0c',
      },
      {
        service: 'x.com',
        account: 'benwalther256',
        hash: '0xd144e3dcb38b873fbcf648a8b4b7eda64cb5b4b92655b47a46459550927c1ad6',
      },
      {
        service: 'x.com',
        account: ' ',
        hash: '0xa4b65882aa82e4aad2a45c0971ae64a003b236f50a5d734b746e6a63d0ee1a1f',
      },
      {
        service: 'anything else',
        account: 'arbitrary string',
        hash: '0x442aefcb2e3264611614cafe1cc3b7e5ead53cf1e4e0e2c411eec1c9e1fd6293',
      },
    ];

    for (const { service, account, hash } of combinations) {
      expect(ethosAttestation.hash(service, account)).toBe(hash);
    }
  });
});
