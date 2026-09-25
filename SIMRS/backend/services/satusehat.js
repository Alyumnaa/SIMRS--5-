const { tokenFilePath, configFilePath, readJsonFile, writeJsonFile, loadSatusehatConfig } = require('../config/satusehat');

function markConfigAsDemo(config = {}) {
  const nextConfig = {
    ...config,
    mode: 'demo',
    clientId: 'demo-local',
    clientSecret: 'demo-local',
    organizationId: config.organizationId || 'demo-local-org'
  };

  writeJsonFile(configFilePath, nextConfig);
  return nextConfig;
}

function isDummyMode(config = {}) {
  if (!config || Object.keys(config).length === 0) return true;

  const mode = String(config.mode || '').trim().toLowerCase();
  if (mode === 'demo' || mode === 'dummy' || mode === 'local' || mode === 'simulation') {
    return true;
  }

  const clientId = String(config.clientId || '').trim().toLowerCase();
  return clientId === '' || clientId.includes('dummy') || clientId === 'demo' || clientId === 'test' || clientId.includes('tersimpan-di-backend') || clientId.includes('demo-local');
}

async function requestSatusehatToken(config = loadSatusehatConfig()) {
  if (isDummyMode(config)) {
    const dummyToken = {
      access_token: 'dummy-access-token-for-local-testing',
      token_type: 'Bearer',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      dummy: true,
      message: 'Mode demo aktif: token dari simulasi lokal'
    };
    writeJsonFile(tokenFilePath, dummyToken);
    return dummyToken;
  }

  const tokenUrl = config.tokenUrl || config.oauthUrl;
  if (!config.clientId || !config.clientSecret || !tokenUrl) {
    throw new Error('Client ID, Client Secret, dan Token URL harus diisi.');
  }

  const cachedToken = readJsonFile(tokenFilePath, {});
  const credentialChanged = String(config.clientId || '').trim() !== String(cachedToken.client_id || '').trim() || String(config.clientSecret || '').trim() !== String(cachedToken.client_secret || '').trim();

  if (cachedToken.retry_at && cachedToken.retry_at > Date.now()) {
    if (credentialChanged || String(config.mode || '').trim().toLowerCase() === 'real') {
      writeJsonFile(tokenFilePath, {
        access_token: '',
        token_type: 'Bearer',
        expires_in: 0,
        expires_at: 0,
        retry_at: 0,
        client_id: String(config.clientId || '').trim(),
        client_secret: String(config.clientSecret || '').trim()
      });
    } else {
      const waitSeconds = Math.ceil((cachedToken.retry_at - Date.now()) / 1000);
      throw new Error(`SATUSEHAT masih membatasi permintaan token (429). Tunggu ${waitSeconds} detik.`);
    }
  }

  const tokenEndpoint = new URL(tokenUrl);
  tokenEndpoint.searchParams.set('grant_type', 'client_credentials');
// Masukkan client_id dan client_secret ke dalam variabel form-urlencoded (Body)
  const params = new URLSearchParams();
  // Tidak perlu menambahkan grant_type ke body jika sudah di set di tokenEndpoint (URL), tapi menambahkannya di sini adalah praktik standar yang aman.
  params.append('client_id', String(config.clientId || '').trim());
  params.append('client_secret', String(config.clientSecret || '').trim());

  let response;
  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
        // HAPUS baris Authorization: Basic di sini
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('Timeout menghubungi endpoint token SatuSehat. Periksa koneksi internet atau firewall.');
    }
    throw new Error(`Endpoint token SatuSehat tidak dapat dihubungi: ${error.message}`);
  }

  const resultText = await response.text();
  let result;
  try {
    result = JSON.parse(resultText);
  } catch (error) {
    result = { raw: resultText };
  }

  if (!response.ok) {
    const detail = result.error_description || result.error || result.message || result.raw || '';
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const retrySeconds = Number.parseInt(retryAfter, 10) || 60;
      writeJsonFile(tokenFilePath, { retry_at: Date.now() + (retrySeconds * 1000) });
      const waitMessage = ` Tunggu ${retrySeconds} detik sebelum mencoba lagi.`;
      throw new Error(`SATUSEHAT membatasi permintaan token (429).${waitMessage}`);
    }
    throw new Error(`Token SatuSehat ditolak (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  if (!result.access_token) {
    throw new Error('Token SatuSehat tidak ditemukan pada response OAuth.');
  }

  const expiresAt = Date.now() + ((result.expires_in || 3600) * 1000) - 30000;
  const tokenData = {
    ...result,
    retry_at: 0,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
    client_id: String(config.clientId || '').trim(),
    client_secret: String(config.clientSecret || '').trim()
  };

  writeJsonFile(tokenFilePath, tokenData);
  return tokenData;
}

async function getValidToken(config = loadSatusehatConfig()) {
  const cachedToken = readJsonFile(tokenFilePath, {});
  const now = Date.now();

  const cachedTokenIsUsable = !cachedToken.dummy || isDummyMode(config);
  if (cachedTokenIsUsable && cachedToken.access_token && cachedToken.expires_at && cachedToken.expires_at > now) {
    return cachedToken;
  }

  return requsestSatusehatToken(config);
}

async function sendToSatusehat(config = loadSatusehatConfig(), resource, method, queryString, payload) {
  if (isDummyMode(config)) {
    const patientPayload = payload && payload.resourceType === 'Patient' ? payload : null;
    const patientId = patientPayload?.identifier?.[0]?.value || 'dummy-patient-001';
    const patientName = patientPayload?.name?.[0]?.text || 'Pasien Dummy';
    const responsePayload = {
      resourceType: 'Patient',
      id: `dummy-${Date.now()}`,
      identifier: patientPayload?.identifier || [{ system: 'https://fhir.kemkes.go.id/id/nik', value: patientId }],
      name: patientPayload?.name || [{ text: patientName }],
      gender: patientPayload?.gender || 'unknown',
      birthDate: patientPayload?.birthDate || '1990-01-01',
      telecom: patientPayload?.telecom || [],
      active: true,
      dummy: true,
      source: 'SIMRS demo sync',
      message: 'Mode demo aktif: data pasien berhasil masuk ke simulasi SatuSehat'
    };

    return {
      status: method === 'POST' ? 201 : 200,
      data: method === 'GET' ? {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 1,
        entry: [{ resource: responsePayload }],
        dummy: true,
        message: 'Mode demo aktif: data dibangkitkan dari simulasi lokal'
      } : responsePayload
    };
  }

  try {
    const token = await getValidToken(config);
    const baseUrl = (config.fhirBaseUrl || '').replace(/\/$/, '');
    const url = `${baseUrl}/${resource}${queryString || ''}`;

    const headers = {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/fhir+json',
      'Content-Type': 'application/fhir+json'
    };

    const options = { method, headers };

    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);
    const responseText = await response.text();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      parsedResponse = { raw: responseText };
    }

    if (!response.ok) {
      const detail = parsedResponse?.issue?.[0]?.details?.text
        || parsedResponse?.issue?.[0]?.diagnostics
        || parsedResponse?.error_description
        || parsedResponse?.error
        || parsedResponse?.message
        || parsedResponse?.raw
        || '';
      throw new Error(`SatuSehat menolak ${method} ${resource} (${response.status})${detail ? `: ${detail}` : ''}`);
    }

    return {
      status: response.status,
      data: parsedResponse
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  isDummyMode,
  requestSatusehatToken,
  getValidToken,
  sendToSatusehat
};
