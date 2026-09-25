const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { findAvailablePort } = require('../server');

test('findAvailablePort skips a busy port and returns the next one', async () => {
  const busyPort = 43123;
  const server = net.createServer();
  await new Promise((resolve) => server.listen(busyPort, '127.0.0.1', resolve));

  const nextPort = await findAvailablePort(busyPort, 3);
  assert.equal(nextPort, busyPort + 1);

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});
