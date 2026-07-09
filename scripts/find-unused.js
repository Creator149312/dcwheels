const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist'];

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (IGNORE_DIRS.includes(file)) continue;
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function listFilesUnder(subdir) {
  const dir = path.join(ROOT, subdir);
  if (!fs.existsSync(dir)) return [];
  return walk(dir).filter(f => /\.(js|jsx|ts|tsx)$/.test(f));
}

function shortImportPaths(fullPath, baseDir) {
  const rel = path.relative(path.join(ROOT, baseDir), fullPath).replace(/\\\\/g, '/');
  const noExt = rel.replace(/\.(js|jsx|ts|tsx)$/, '');
  const parts = noExt.split('/');
  const candidates = [];
  // full relative path
  candidates.push(`${baseDir}/${noExt}`);
  // also allow plain path without @ prefix
  candidates.push(`${noExt}`);
  // allow `components/...` without baseDir prefix
  candidates.push(`${baseDir}/${noExt}`);
  candidates.push(`components/${noExt}`);
  // index shorthand (folder/index)
  if (parts[parts.length-1] === 'index') {
    const dirOnly = parts.slice(0, -1).join('/');
    candidates.push(`${baseDir}/${dirOnly}`);
    candidates.push(`components/${dirOnly}`);
  }
  return Array.from(new Set(candidates));
}

function repoFiles() {
  return walk(ROOT).filter(f => {
    if (f.includes(path.join(ROOT, 'node_modules'))) return false;
    if (f.includes(path.join(ROOT, '.next'))) return false;
    if (f.includes(path.join(ROOT, '.git'))) return false;
    if (f.includes(path.join(ROOT, 'scripts'))) return false; // ignore our script
    return /\.(js|jsx|ts|tsx|json|md)$/.test(f);
  });
}

function fileContains(filePath, needle) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    return txt.indexOf(needle) !== -1;
  } catch (e) { return false; }
}

function findUnused(baseDir) {
  const files = listFilesUnder(baseDir);
  const repo = repoFiles();
  const unused = [];
  for (const file of files) {
    const candidates = shortImportPaths(file, baseDir);
    // Build additional heuristic: component name usage in JSX or imports
    const baseName = path.basename(file).replace(/\.(js|jsx|ts|tsx)$/, '');
    const compTag = baseName
      .replace(/[-_]/g, ' ')
      .split(/\s+/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');

    let used = false;
    for (const r of repo) {
      const txt = fs.readFileSync(r, 'utf8');
      // check string path matches (with and without @)
      for (const cand of candidates) {
        if (txt.includes(`@${cand}`) || txt.includes(cand) || txt.includes(`/${cand}`)) {
          used = true; break;
        }
      }
      if (used) break;

      // check import/dynamic/import patterns for basename
      const importPattern = new RegExp(`from\\s+['\"]([^'\"]*${baseName})['\"]`);
      const dynamicPattern = new RegExp(`import\(.*['\"]([^'\"]*${baseName})['\"].*\)`);
      if (importPattern.test(txt) || dynamicPattern.test(txt)) { used = true; break; }

      // check JSX tag or import identifier usage for component name
      const jsxTag = `<${compTag}(\\s|>)`;
      const importIdentifier = new RegExp(`import\\s+.*\\b${compTag}\\b`);
      if (txt.includes(jsxTag) || importIdentifier.test(txt) || txt.includes(`const ${compTag}`) || txt.includes(`function ${compTag}`)) {
        used = true; break;
      }
    }
    if (!used) unused.push(path.relative(ROOT, file));
  }
  return unused;
}

function main() {
  const compUnused = findUnused('components');
  const modelUnused = findUnused('models');
  console.log('Unused components (candidates):');
  if (compUnused.length === 0) console.log('  (none)');
  else compUnused.forEach(f => console.log('  ' + f));
  console.log('\nUnused models (candidates):');
  if (modelUnused.length === 0) console.log('  (none)');
  else modelUnused.forEach(f => console.log('  ' + f));
}

main();
