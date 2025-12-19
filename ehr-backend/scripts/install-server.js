const { spawnSync } = require('child_process');
const path = require('path');

const serverDir = path.resolve(__dirname, '..', 'server');
const npmArgs = ['install'];
let command;
let commandArgs;

if (process.env.npm_execpath) {
  command = process.execPath;
  commandArgs = [process.env.npm_execpath, ...npmArgs];
} else {
  command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  commandArgs = npmArgs;
}

const result = spawnSync(command, commandArgs, {
  cwd: serverDir,
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed to run npm install in server directory:', result.error);
  process.exit(result.status ?? 1);
}

if (result.status !== 0) {
  process.exit(result.status);
}
