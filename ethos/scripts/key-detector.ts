import { exec } from 'node:child_process';
import { exit } from 'node:process';
import { Wallet } from 'ethers';

const ignoreList = [
  'c8f300cdd121db675d2c35da636dd69e12072fed0f5daabbe5ac66834259fc0c', // used in EthosAttestation.test.ts - it's just a hash
  'd144e3dcb38b873fbcf648a8b4b7eda64cb5b4b92655b47a46459550927c1ad6', // used in EthosAttestation.test.ts - it's just a hash
  'a4b65882aa82e4aad2a45c0971ae64a003b236f50a5d734b746e6a63d0ee1a1f', // used in EthosAttestation.test.ts - it's just a hash
  '442aefcb2e3264611614cafe1cc3b7e5ead53cf1e4e0e2c411eec1c9e1fd6293', // used in EthosAttestation.test.ts - it's just a hash
  '360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', // used in upgradeable contract tests
];

function verifyPrivateKey(privateKey: string): boolean {
  if (ignoreList.includes(privateKey)) {
    return false;
  }
  try {
    // eslint-disable-next-line no-new
    new Wallet(privateKey);

    return true;
  } catch (e) {
    return false;
  }
}

async function getGitGrepResults(): Promise<string[]> {
  return await new Promise<string[]>((resolve, reject) => {
    exec('git grep -Ehow "[0-9a-f]{64}"', (error, stdout, stderr) => {
      if (error) {
        reject(error);

        return;
      }
      if (stderr) {
        reject(new Error(stderr));

        return;
      }
      const results = stdout.trim().split('\n');
      resolve(results);
    });
  });
}

async function main(): Promise<void> {
  // Get unique results
  const results = Array.from(new Set(await getGitGrepResults()));
  let found = 0;

  for (const result of results) {
    const isValid = verifyPrivateKey(result);

    if (!isValid) {
      continue;
    }
    console.warn(`⚠️  Found valid private key: ${result}`);
    found++;
  }

  if (found > 0) {
    console.warn(`☠️  Found ${found} valid private keys`);
    exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
