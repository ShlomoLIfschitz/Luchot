#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): lint only the file that just changed.
// ESLint for JS/TS when the project has an ESLint config and a local eslint;
// Ruff for Python when ruff is on PATH. No linter configured -> silent pass.
// Exit 2 = lint errors (stderr goes back to Claude so it fixes them).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readStdin, projectDir, isInside, logEvent } = require('./lib');

const IS_WIN = process.platform === 'win32';
const ESLINT_CONFIGS = [
  'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts',
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
];

// On Windows .cmd shims need a shell; pass one quoted command line (no args
// array) so Node doesn't warn about unescaped shell arguments (DEP0190).
function run(cmd, args, cwd) {
  const opts = { cwd, encoding: 'utf8', timeout: 30000 };
  if (!IS_WIN) return spawnSync(cmd, args, opts);
  const line = [cmd, ...args].map(a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ');
  return spawnSync(line, { ...opts, shell: true });
}

function eslintFor(dir) {
  if (!ESLINT_CONFIGS.some(f => fs.existsSync(path.join(dir, f)))) return null;
  const bin = path.join(dir, 'node_modules', '.bin', IS_WIN ? 'eslint.cmd' : 'eslint');
  return fs.existsSync(bin) ? bin : null;
}

function ruffAvailable(dir) {
  const r = run('ruff', ['--version'], dir);
  return r.status === 0;
}

// The first line that names a problem, for the event log. Never the source
// snippet some linters print under it.
function firstError(out, file) {
  const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const hit = lines.find(l => /(^|:)\d+:\d+(:|\s)/.test(l) && !/^\d+\s*\|/.test(l)) || lines.find(l => /error/i.test(l)) || '';
  return hit.split(file).join('').replace(/^[^\s]*?:(?=\d+:\d+)/, '');
}

readStdin().then(input => {
  const file = input.tool_input && input.tool_input.file_path;
  const dir = projectDir(input);
  if (!file || !isInside(path.resolve(file), dir) || !fs.existsSync(file)) process.exit(0);

  const ext = path.extname(file).toLowerCase();
  let result = null;
  if (['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'].includes(ext)) {
    const eslint = eslintFor(dir);
    if (eslint) result = run(eslint, [file], dir);
  } else if (ext === '.py' && ruffAvailable(dir)) {
    result = run('ruff', ['check', file], dir);
  }

  if (!result || result.status === 0) process.exit(0);
  if (result.error || result.status === null) process.exit(0); // linter crashed or timed out: don't block on tooling
  const out = `${result.stdout || ''}${result.stderr || ''}`.trim().slice(0, 4000);
  logEvent(input, 'lint-changed', { file: path.relative(dir, file), linter: ext === '.py' ? 'ruff' : 'eslint', error: firstError(out, file) });
  process.stderr.write(`Lint errors in ${path.relative(dir, file)} — fix them before moving on:\n${out}\n`);
  process.exit(2);
});
