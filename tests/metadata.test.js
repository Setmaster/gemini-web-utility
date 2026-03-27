const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readScriptVersion(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/);
  return match ? match[1] : '';
}

test('keeps package, manifest, and content script versions aligned', () => {
  const packageJson = readJson(path.join(repoRoot, 'package.json'));
  const manifestJson = readJson(path.join(repoRoot, 'manifest.json'));
  const scriptVersion = readScriptVersion(path.join(repoRoot, 'content_script.js'));

  assert.equal(packageJson.version, manifestJson.version);
  assert.equal(packageJson.version, scriptVersion);
});

test('includes packaged extension icons for release builds', () => {
  const manifestJson = readJson(path.join(repoRoot, 'manifest.json'));
  const iconEntries = Object.values(manifestJson.icons || {});

  assert.ok(iconEntries.length > 0);
  iconEntries.forEach((relativePath) => {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), true);
  });
});
