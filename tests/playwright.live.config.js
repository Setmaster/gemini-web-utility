const path = require('node:path');

module.exports = {
  testDir: path.resolve(__dirname),
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'off'
  }
};
