const test = require('node:test');
const assert = require('node:assert/strict');
const { isDummyMode } = require('../services/satusehat');

test('demo mode is treated as dummy for local testing', () => {
  assert.equal(isDummyMode({ mode: 'demo', clientId: 'random-client-id-123' }), true);
  assert.equal(isDummyMode({ clientId: 'demo' }), true);
});

test('real config remains active when credentials are provided', () => {
  assert.equal(isDummyMode({ mode: 'real', clientId: 'real-client', clientSecret: 'real-secret' }), false);
});
