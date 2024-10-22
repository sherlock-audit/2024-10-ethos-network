import { readFileSync } from 'node:fs';
import concurrently from 'concurrently';
import { globSync } from 'glob';

const packagesToWatch = [];

const packagePaths = globSync('packages/*/package.json');

for (const path of packagePaths) {
  const pkg = JSON.parse(readFileSync(path, 'utf-8'));

  if (pkg.scripts?.watch) {
    packagesToWatch.push(pkg.name);
  }
}

concurrently([
  ...packagesToWatch.map((pkg) => ({
    name: pkg,
    command: `npm run watch -w ${pkg}`,
    prefixColor: 'cyan',
  })),
  { name: 'echo', command: 'npm run start:echo', prefixColor: 'yellow' },
  { name: 'web', command: 'npm run start:web', prefixColor: 'magenta' },
]);
