import { readFileSync } from 'node:fs';
import pc from 'picocolors';

const packageJson: { dependencies: Record<string, string> } = JSON.parse(
  readFileSync('./package.json', 'utf8'),
);

const prodDependencies = Object.keys(packageJson.dependencies ?? {});

if (prodDependencies.length > 0) {
  console.error(
    pc.red('\n❌ It looks like you’ve installed the prod dependency in the root package.json.'),
  );
  console.error('👉 Please move it to the correct workspace where it’s used.');
  console.error('\nFirst, uninstall it from the root by running the following command:');
  console.error(pc.blue(`npm rm ${prodDependencies[0]}`));
  console.error('\nThen, install it in the correct workspace:');
  console.error(pc.blue(`npm i -w <workspace-name> ${prodDependencies[0]}`));

  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log('\n✅ Root package.json is valid.\n');
}
