import { spawn } from 'node:child_process';
import fs from 'node:fs';
import inquirer from 'inquirer';
import pc from 'picocolors';
import semver from 'semver';
import pkg from '../package.json' with { type: 'json' };

const DESTINATION_PATH = './release';

async function main() {
  console.log('📦 Packing Chrome extension...\n');

  const currentVersion = semver.parse(pkg.version);

  if (!currentVersion) {
    throw new Error('Invalid version in package.json');
  }

  console.log(
    `🏷️ Current version: ${pc.red(currentVersion.major)}.${pc.blueBright(currentVersion.minor)}.${pc.green(currentVersion.patch)}`,
  );

  const { bumpType } = await inquirer.prompt<{ bumpType: semver.ReleaseType }>({
    type: 'list',
    name: 'bumpType',
    message: 'Choose the version increment type:',
    choices: [
      { name: pc.green('patch'), value: 'patch' },
      { name: pc.blueBright('minor'), value: 'minor' },
      { name: pc.red('major'), value: 'major' },
    ],
  });

  const nextVersion = semver.parse(pkg.version);

  if (!nextVersion) {
    throw new Error('Invalid version in package.json');
  }

  nextVersion.inc(bumpType);

  console.log(
    `\n🔼 New version: ${pc.strikethrough(pc.yellow(currentVersion.format()))} → ${pc.cyan(nextVersion.format())}`,
  );

  fs.writeFileSync(
    './package.json',
    JSON.stringify({ ...pkg, version: nextVersion.format() }, null, 2),
  );

  console.log('\n👷‍♀️ Building the extension\n');

  await runCommand('npm run build');

  console.log('\n📚 Preparing package in .zip\n');

  if (!fs.existsSync(DESTINATION_PATH)) {
    fs.mkdirSync(DESTINATION_PATH);
  }

  const filePath = `${DESTINATION_PATH}/twitter-chrome-extension-${nextVersion.format()}.zip`;

  await runCommand(`zip -r ${filePath} ./dist`);

  console.log(`\n🎉 Done! Now you can upload ${pc.blue(filePath)} to Chrome Web Store\n`);
}

async function runCommand(str: string) {
  const [command, ...args] = str.split(' ');

  return await new Promise((resolve, reject) => {
    const cmd = spawn(command, args);

    cmd.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    cmd.stderr.on('error', (data) => {
      console.log(data);
    });
    cmd.on('close', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`Command existed with code ${code}}`));
      }
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
