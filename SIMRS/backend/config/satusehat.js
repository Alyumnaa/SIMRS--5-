const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const configFilePath = path.join(dataDir, 'satusehat-config.json');
const tokenFilePath = path.join(dataDir, 'satusehat-token.json');

const defaultSatusehatConfig = {
  mode: 'demo',
  clientId: 'demo-local',
  clientSecret: 'demo-local',
  organizationId: 'demo-local-org',
  environment: 'sandbox',
  oauthUrl: 'https://api-satusehat.kemkes.go.id/oauth2/v1/accesstoken',
  fhirBaseUrl: 'https://api-satusehat.kemkes.go.id/fhir-r4',
  tokenUrl: 'https://api-satusehat.kemkes.go.id/oauth2/v1/accesstoken',
  scope: 'system/*.read system/*.write',
  redirectUri: 'http://localhost:4173/callback'
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(defaultSatusehatConfig, null, 2));
  }

  if (!fs.existsSync(tokenFilePath)) {
    fs.writeFileSync(tokenFilePath, JSON.stringify({ access_token: '', token_type: 'Bearer', expires_in: 0, expires_at: 0 }, null, 2));
  }
}

function readJsonFile(filePath, fallback = {}) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadSatusehatConfig() {
  ensureDataDir();
  return readJsonFile(configFilePath, defaultSatusehatConfig);
}

function saveSatusehatConfig(config) {
  ensureDataDir();
  writeJsonFile(configFilePath, config);
  return config;
}

module.exports = {
  dataDir,
  configFilePath,
  tokenFilePath,
  defaultSatusehatConfig,
  ensureDataDir,
  readJsonFile,
  writeJsonFile,
  loadSatusehatConfig,
  saveSatusehatConfig
};
