/**
 * Node 18+ strict ESM (especially Node 22+) may require explicit .js in relative imports.
 * expo-sqlite@14 ships extensionless specifiers; Node loads this during expo start / plugins.
 * Rewrites expo-sqlite build output: all .js files under build/.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'build');
if (!fs.existsSync(root)) {
  console.log('patch-expo-sqlite-imports: expo-sqlite not installed, skip');
  process.exit(0);
}

function patchFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  const orig = s;

  // from './foo' or './foo/bar' -> append .js if no extension
  s = s.replace(/from\s+(['"])(\.\/[^'"]+)\1/g, (m, q, spec) => {
    if (spec.endsWith('.js')) return m;
    return `from ${q}${spec}.js${q}`;
  });

  // export * from './foo'
  s = s.replace(/export\s+\*\s+from\s+(['"])(\.\/[^'"]+)\1/g, (m, q, spec) => {
    if (spec.endsWith('.js')) return m;
    return `export * from ${q}${spec}.js${q}`;
  });

  // import './foo' (side effect)
  s = s.replace(/import\s+(['"])(\.\/[^'"]+)\1/g, (m, q, spec) => {
    if (spec.endsWith('.js')) return m;
    return `import ${q}${spec}.js${q}`;
  });

  if (s !== orig) {
    fs.writeFileSync(filePath, s, 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  let n = 0;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) n += walk(p);
    else if (name.name.endsWith('.js')) {
      if (patchFile(p)) n++;
    }
  }
  return n;
}

const changed = walk(root);
if (changed) console.log(`patch-expo-sqlite-imports: updated ${changed} file(s)`);
