const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const files = ['app.js', 'server.js', 'jest.config.cjs'];
for (const directory of ['middleware', 'models', 'routes', 'services', 'scripts', 'tests']) {
  for (const name of readdirSync(directory)) if (name.endsWith('.js')) files.push(join(directory, name));
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} backend files.`);
