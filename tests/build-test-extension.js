const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function copyFile(sourceRoot, targetRoot, relativePath) {
  const sourcePath = path.join(sourceRoot, relativePath);
  const targetPath = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function buildTestExtension() {
  const sourceRoot = path.resolve(__dirname, '..');
  const extensionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwu-ext-'));
  const filesToCopy = [
    'content_script.js',
    'manifest.json',
    'service_worker.js'
  ];

  filesToCopy.forEach((relativePath) => {
    copyFile(sourceRoot, extensionDir, relativePath);
  });

  fs.cpSync(path.join(sourceRoot, 'icons'), path.join(extensionDir, 'icons'), { recursive: true });

  const manifestPath = path.join(extensionDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const localhostPermissions = [
    'http://127.0.0.1/*',
    'http://localhost/*'
  ];

  manifest.host_permissions = Array.from(
    new Set([...(manifest.host_permissions || []), ...localhostPermissions])
  );

  manifest.content_scripts = (manifest.content_scripts || []).map((entry) => ({
    ...entry,
    matches: Array.from(new Set([...(entry.matches || []), ...localhostPermissions]))
  }));

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return extensionDir;
}

module.exports = {
  buildTestExtension
};
