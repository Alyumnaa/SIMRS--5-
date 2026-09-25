const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const {
  ensureDataDir,
  loadSatusehatConfig
} = require('./config/satusehat');
const { requestSatusehatToken, sendToSatusehat } = require('./services/satusehat');

const preferredPort = Number(process.env.PORT || 4173);
const frontendRoot = path.join(__dirname, '..', 'frontend');

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return startPort;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  response.end(JSON.stringify(payload));
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        try {
          const params = new URLSearchParams(raw);
          resolve(Object.fromEntries(params.entries()));
        } catch (parseError) {
          reject(new Error('Request body is not valid JSON or form-encoded data'));
        }
      }
    });
    request.on('error', reject);
  });
}

ensureDataDir();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    response.end();
    return;
  }

  if (request.url === '/api/health') {
    sendJson(response, 200, { status: 'ok', service: 'SIMRS Nusa Medika' });
    return;
  }

  if (request.url === '/api/satusehat/config' && request.method === 'GET') {
    const config = loadSatusehatConfig();
    sendJson(response, 200, {
      configured: Boolean(config.clientId && config.clientSecret),
      environment: config.environment,
      organizationConfigured: Boolean(config.organizationId),
      fhirBaseUrl: config.fhirBaseUrl
    });
    return;
  }

  if (request.url === '/api/satusehat/config' && request.method === 'POST') {
    sendJson(response, 403, { success: false, message: 'Konfigurasi SatuSehat hanya dapat diubah di backend.' });
    return;
  }

  if (request.url === '/api/satusehat/token' && request.method === 'POST') {
    try {
      const config = loadSatusehatConfig();
      const token = await requestSatusehatToken(config);
      sendJson(response, 200, {
        success: true,
        tokenType: token.token_type,
        expiresIn: token.expires_in,
        dummy: Boolean(token.dummy)
      });
    } catch (error) {
      const statusCode = error.message.includes('(429)') ? 429 : 502;
      sendJson(response, statusCode, { success: false, message: error.message || 'Token SatuSehat gagal diambil.' });
    }
    return;
  }

  if (request.url === '/api/satusehat/test-connection' && request.method === 'POST') {
    try {
      const config = loadSatusehatConfig();
      const patientCheck = await sendToSatusehat(config, 'Patient', 'GET', '?_count=1', null);
      sendJson(response, 200, {
        success: true,
        message: 'Koneksi SatuSehat berhasil terhubung.',
        patientCheck
      });
    } catch (error) {
      const statusCode = error.message.includes('(429)') ? 429 : 502;
      sendJson(response, statusCode, {
        success: false,
        message: error.message || 'Koneksi SatuSehat gagal.',
        details: error.toString()
      });
    }
    return;
  }

  const pathMatch = url.pathname.match(/^\/api\/satusehat\/fhir\/([^?]+)/i);
  if (pathMatch && (request.method === 'GET' || request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
    try {
      const config = loadSatusehatConfig();
      const resource = pathMatch[1];
      const queryString = url.search || '';
      let payload = null;

      if (request.method !== 'GET') {
        payload = await getRequestBody(request);
      }

      if (request.method === 'POST' && resource.toLowerCase() === 'patient') {
        const nikIdentifier = Array.isArray(payload?.identifier)
          ? payload.identifier.find(identifier => identifier.system === 'https://fhir.kemkes.go.id/id/nik')
          : null;

        if (nikIdentifier?.value) {
          const lookupQuery = `?identifier=${encodeURIComponent(`${nikIdentifier.system}|${nikIdentifier.value}`)}`;
          const existingResult = await sendToSatusehat(config, 'Patient', 'GET', lookupQuery, null);
          const existingPatient = existingResult.data?.entry?.[0]?.resource;

          if (existingPatient?.id) {
            sendJson(response, 200, {
              success: true,
              status: 200,
              existing: true,
              message: 'Patient sudah terdaftar di SatuSehat.',
              data: existingPatient
            });
            return;
          }
        }
      }

      const result = await sendToSatusehat(config, resource, request.method, queryString, payload);
      sendJson(response, result.status >= 200 && result.status < 300 ? result.status : 502, {
        success: result.status >= 200 && result.status < 300,
        ...result
      });
    } catch (error) {
      sendJson(response, 502, { success: false, message: error.message || 'Permintaan FHIR ke SatuSehat gagal.' });
    }
    return;
  }

  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.resolve(frontendRoot, `.${requestedPath}`);
  if (!filePath.startsWith(frontendRoot)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(file);
  });
});

async function startServer() {
  const port = await findAvailablePort(preferredPort);
  server.listen(port, () => {
    console.log(`SIMRS frontend tersedia di http://localhost:${port}`);
    console.log(`SatuSehat API siap di http://localhost:${port}/api/satusehat/config`);
  });
  return port;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Gagal menyalakan server SIMRS:', error);
    process.exit(1);
  });
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  startServer
};
