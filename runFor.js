/// <reference types="node" />

const {resolve} = require('path');
const {readdirSync} = require('fs');
const {execSync} = require('child_process');

function execute(targetDir, cmd) {
  console.log(`\nin ${targetDir}:\n\trunning: ${cmd}\n`);
  execSync(cmd, { cwd: targetDir, env: process.env, stdio: 'inherit' });
}

const packageFolder = resolve(__dirname, 'packages');

const packageNames = readdirSync(packageFolder);
const packagePaths = packageNames.map(path => resolve(packageFolder, path));

const targetPackages = process.argv[2] === '--all'
  ? packagePaths
  : process.argv[2].split(',').map(path => resolve(packageFolder, path));

const command = process.argv.slice(3).join(' ');

targetPackages.map(target => execute(target, command));
