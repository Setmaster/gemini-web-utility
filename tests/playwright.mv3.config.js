const path = require('node:path');

module.exports = {
  testDir: path.resolve(__dirname),
  timeout: 30000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    cwd: path.resolve(__dirname, '..'),
    url: 'http://127.0.0.1:8765/tests/pages/settings-panel.html',
    reuseExistingServer: true,
    timeout: 10000
  }
};
