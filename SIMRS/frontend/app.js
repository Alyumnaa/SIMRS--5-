const modules = window.SIMRS_MODULES;
const tabContent = document.getElementById('tabContent');

const moduleTemplateMap = {
  dashboard: 'modules/html/dashboard.html',
  pasien: 'modules/html/pasien.html',
  'rawat-jalan': 'modules/html/rawat-jalan.html',
  'rawat-inap': 'modules/html/rawat-inap.html',
  igd: 'modules/html/igd.html',
  farmasi: 'modules/html/farmasi.html',
  laboratorium: 'modules/html/laboratorium.html',
  keuangan: 'modules/html/keuangan.html',
  satusehat: 'modules/html/satusehat.html',
  laporan: 'modules/html/laporan.html',
  profil: 'modules/html/profil.html',
  hasil: 'modules/html/hasil.html'
};

function exportTableToCSV(tableElement, filename) {
  if (!tableElement) return;

  let csv = [];
  const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.textContent.trim());
  csv.push(headers.join(','));

  const rows = tableElement.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td')).map(td => {
      let text = td.textContent.trim();
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    });
    csv.push(cells.join(','));
  });

  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getOfflineDrafts() {
  try {
    return JSON.parse(localStorage.getItem('simrsOfflineVoiceDrafts') || '[]');
  } catch (error) {
    return [];
  }
}

function saveOfflineDraft(message) {
  const patient = sessionStorage.getItem('simrsLastPatient') || 'Pasien baru';
  const drafts = getOfflineDrafts();
  const draft = {
    patient,
    transcript: message,
    createdAt: new Date().toISOString(),
    synced: false,
    status: navigator.onLine ? 'pending-sync' : 'offline-draft'
  };

  drafts.push(draft);
  localStorage.setItem('simrsOfflineVoiceDrafts', JSON.stringify(drafts));
}

function bindTemplateEvents() {
  tabContent.querySelectorAll('[data-tab-link]').forEach(element => {
    element.addEventListener('click', () => setTab(element.dataset.tabLink));
  });

  tabContent.querySelectorAll('[data-action="export-csv"]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const panel = button.closest('.panel');
      const table = panel?.querySelector('table');
      if (table) {
        const now = new Date().toISOString().split('T')[0];
        const title = panel.querySelector('h3')?.textContent.trim() || 'export';
        const filename = `${title}-${now}.csv`;
        exportTableToCSV(table, filename);
        showToast('File CSV berhasil diunduh');
      }
      return false;
    });
  });

  tabContent.querySelectorAll('[data-action="toast"]').forEach(element => {
    element.addEventListener('click', () => {
      const message = element.getAttribute('data-message') || 'Filter dan export siap digunakan.';
      showToast(message);
    });
  });

  const testBtn = tabContent.querySelector('#satusehatTestConnection');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const status = tabContent.querySelector('#satusehatConnectionStatus');
      testBtn.disabled = true;
      if (status) status.textContent = 'Menguji koneksi...';
      try {
        const response = await fetch('/api/satusehat/test-connection', { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'Koneksi SatuSehat gagal.');
        }
        if (status) status.textContent = 'Koneksi SatuSehat aktif';
        showToast('Koneksi ke SatuSehat berhasil diuji.');
      } catch (error) {
        if (status) status.textContent = 'Koneksi gagal';
        showToast(error.message || 'Gagal menguji koneksi SatuSehat.');
      } finally {
        window.setTimeout(() => {
          testBtn.disabled = false;
        }, 60000);
      }
    });
  }

  const syncBtn = tabContent.querySelector('#satusehatSyncNow');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
        const patients = JSON.parse(localStorage.getItem('simrsPatients') || '[]');
        const latestPatient = Array.isArray(patients) && patients.length > 0 ? patients[0] : null;

        if (!latestPatient || !latestPatient.nik) {
          showToast('Belum ada data pasien yang bisa disinkronkan.');
          return;
        }

        const status = tabContent.querySelector('#satusehatConnectionStatus');
        const syncText = tabContent.querySelector('#satusehatLastSyncText');

        if (status) {
          status.textContent = 'Menyinkronkan...';
        }

        const payload = {
          resourceType: 'Patient',
          meta: { profile: ['https://fhir.kemkes.go.id/r4/StructureDefinition/Patient'] },
          identifier: [{ system: 'https://fhir.kemkes.go.id/id/nik', value: String(latestPatient.nik) }],
          name: [{ use: 'official', text: String(latestPatient.name || 'Pasien') }],
          gender: String(latestPatient.gender || 'unknown').toLowerCase() === 'perempuan' ? 'female' : String(latestPatient.gender || 'unknown').toLowerCase() === 'laki-laki' ? 'male' : 'unknown',
          birthDate: String(latestPatient.birth || '1990-01-01'),
          deceasedBoolean: false,
          multipleBirthInteger: 0,
          address: [{
            use: 'home',
            line: [String(latestPatient.address || 'Alamat belum diisi')],
            city: 'Jakarta',
            postalCode: '12950',
            country: 'ID',
            extension: [{
              url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode',
              extension: [
                { url: 'province', valueCode: '31' },
                { url: 'city', valueCode: '3174' },
                { url: 'district', valueCode: '317401' },
                { url: 'village', valueCode: '3174011001' },
                { url: 'rt', valueCode: '2' },
                { url: 'rw', valueCode: '2' }
              ]
            }]
          }],
          telecom: latestPatient.phone ? [{ system: 'phone', value: String(latestPatient.phone) }] : [],
          active: true
        };

        try {
          const response = await fetch('/api/satusehat/fhir/Patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const result = await response.json().catch(() => ({}));

          if (status) {
            status.textContent = response.ok ? 'Sinkronisasi berhasil' : 'Sinkronisasi gagal';
          }

          if (syncText) {
            const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
            syncText.textContent = response.ok ? `Terakhir disinkronkan: ${timestamp} (${latestPatient.nik})` : 'Sinkronisasi terakhir gagal.';
          }

          localStorage.setItem('simrsSatusehatLastSync', JSON.stringify({
            timestamp: new Date().toISOString(),
            patient: latestPatient.nik,
            status: response.ok ? 'success' : 'failed'
          }));

          if (!response.ok || result.success === false) {
            throw new Error(result.message || result.data?.issue?.[0]?.details?.text || 'Sinkronisasi data pasien gagal.');
          }

          showToast('Sinkronisasi pasien ke SatuSehat berhasil.');
        } catch (error) {
          if (status) {
            status.textContent = 'Sinkronisasi gagal';
          }
          if (syncText) {
            syncText.textContent = 'Sinkronisasi terakhir gagal.';
          }
          showToast(error.message || 'Sinkronisasi data pasien gagal.');
        }
    });
  }

  const dummyBtn = tabContent.querySelector('#satusehatSendDummyPatient');
  if (dummyBtn) {
    dummyBtn.addEventListener('click', async () => {
      const resultText = tabContent.querySelector('#satusehatDummyResult');
      const payload = {
        resourceType: 'Patient',
        meta: { profile: ['https://fhir.kemkes.go.id/r4/StructureDefinition/Patient'] },
        identifier: [{ system: 'https://fhir.kemkes.go.id/id/nik', value: '1000000000000001' }],
        name: [{ use: 'official', text: 'Dummy SatuSehat' }],
        gender: 'male',
        birthDate: '1990-01-01',
        deceasedBoolean: false,
        multipleBirthInteger: 0,
        address: [{
          use: 'home',
          line: ['Alamat dummy'],
          city: 'Jakarta',
          postalCode: '12950',
          country: 'ID',
          extension: [{
            url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode',
            extension: [
              { url: 'province', valueCode: '31' },
              { url: 'city', valueCode: '3174' },
              { url: 'district', valueCode: '317401' },
              { url: 'village', valueCode: '3174011001' },
              { url: 'rt', valueCode: '2' },
              { url: 'rw', valueCode: '2' }
            ]
          }]
        }],
        telecom: [{ system: 'phone', value: '081234567890' }],
        active: true
      };

      try {
        if (resultText) resultText.textContent = 'Mengirim data dummy ke endpoint...';
        const response = await fetch('/api/satusehat/fhir/Patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (resultText) {
          const summary = JSON.stringify({
            status: response.status,
            success: result.success,
            message: result.message || result.data?.message || 'Tidak ada pesan dari server',
            id: result.data?.id || null,
            dummy: Boolean(result.data?.dummy)
          }, null, 2);
          resultText.textContent = summary;
        }

        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'POST dummy gagal.');
        }

        showToast('Data dummy berhasil dikirim dan dijawab oleh backend SatuSehat.');
      } catch (error) {
        try {
          const lookup = await fetch(`/api/satusehat/fhir/Patient?identifier=${encodeURIComponent('https://fhir.kemkes.go.id/id/nik|1000000000000001')}`);
          const lookupResult = await lookup.json().catch(() => ({}));
          const existingPatient = lookupResult.data?.entry?.[0]?.resource;

          if (lookup.ok && lookupResult.success && existingPatient?.id) {
            if (resultText) {
              resultText.textContent = JSON.stringify({
                status: 200,
                success: true,
                message: 'Data dummy sudah terdaftar di SatuSehat.',
                id: existingPatient.id,
                existing: true
              }, null, 2);
            }
            showToast('Data dummy sudah terdaftar di SatuSehat.');
            return;
          }
        } catch {
        }

        if (resultText) resultText.textContent = `POST gagal: ${error.message}`;
        showToast(error.message || 'POST dummy gagal.');
      }
    });
  }

  const encounterBtn = tabContent.querySelector('#satusehatSendEncounter');
  if (encounterBtn) {
    encounterBtn.addEventListener('click', async () => {
      const patientId = tabContent.querySelector('#satusehatEncounterPatientId')?.value.trim();
      const encounterClass = tabContent.querySelector('#satusehatEncounterClass')?.value || 'AMB';
      const locationId = tabContent.querySelector('#satusehatEncounterLocationId')?.value.trim();
      const practitionerId = tabContent.querySelector('#satusehatEncounterPractitionerId')?.value.trim();
      const resultText = tabContent.querySelector('#satusehatEncounterResult');

      if (!patientId || !locationId || !practitionerId) {
        showToast('Patient ID, Location ID, dan Practitioner ID wajib diisi.');
        return;
      }

      const payload = {
        resourceType: 'Encounter',
        identifier: [{
          system: 'http://sys-ids.kemkes.go.id/encounter/6165cd56-2622-43b8-b518-0e52c6a7f073',
          value: `SIMRS-${Date.now()}`
        }],
        status: 'finished',
        statusHistory: [{
          status: 'finished',
          period: { start: new Date().toISOString(), end: new Date().toISOString() }
        }],
        participant: [{
          type: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'ATND',
              display: 'attender'
            }]
          }],
          individual: { reference: `Practitioner/${practitionerId}` }
        }],
        location: [{ location: { reference: `Location/${locationId}` } }],
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: encounterClass
        },
        subject: { reference: `Patient/${patientId}` },
        period: { start: new Date().toISOString(), end: new Date().toISOString() },
        serviceProvider: { reference: 'Organization/6165cd56-2622-43b8-b518-0e52c6a7f073' }
      };

      try {
        if (resultText) resultText.textContent = 'Mengirim Encounter ke SatuSehat...';
        const response = await fetch('/api/satusehat/fhir/Encounter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));

        if (resultText) {
          resultText.textContent = JSON.stringify({
            status: response.status,
            success: result.success,
            message: result.message || result.data?.issue?.[0]?.details?.text,
            id: result.data?.id || null
          }, null, 2);
        }

        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'Pengiriman Encounter gagal.');
        }

        showToast(`Encounter berhasil dikirim${result.data?.id ? ` (${result.data.id})` : ''}.`);
      } catch (error) {
        if (resultText) resultText.textContent = `Pengiriman gagal: ${error.message}`;
        showToast(error.message || 'Pengiriman Encounter gagal.');
      }
    });
  }

  tabContent.querySelectorAll('[data-action="show-history"]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const title = button.getAttribute('data-title') || 'History';
      const historyData = [
        ['08:15', 'Pemeriksaan Dokter', 'dr. Fajar Nugroho', 'Selesai'],
        ['08:30', 'Tes Laboratorium', 'Darah rutin + Urin', 'Terkirim'],
        ['08:45', 'Foto Thorax', 'Radiologi', 'On Progress'],
        ['09:00', 'Tindakan Luka', 'Jahit & Antiseptik', 'Berlangsung'],
        ['09:15', 'Pemberian Obat', 'Analgetik + Antibiotik', 'Selesai'],
        ['09:30', 'Monitoring Vital', 'TTV & Saturasi', 'Termonitoring']
      ];

      let historyHTML = `<div style="max-height: 400px; overflow-y: auto;"><table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;"><thead><tr style="background: #f5f8f8; border-bottom: 1px solid #e5eceb;"><th style="padding: 10px; text-align: left; font-weight: 600;">Waktu</th><th style="padding: 10px; text-align: left; font-weight: 600;">Tindakan</th><th style="padding: 10px; text-align: left; font-weight: 600;">Oleh</th><th style="padding: 10px; text-align: left; font-weight: 600;">Status</th></tr></thead><tbody>`;

      historyData.forEach(row => {
        const statusClass = row[3] === 'Selesai' ? 'green' : row[3] === 'Berlangsung' ? 'red' : row[3] === 'Termonitoring' ? 'blue' : 'orange';
        historyHTML += `<tr style="border-bottom: 1px solid #e5eceb;"><td style="padding: 10px;">${row[0]}</td><td style="padding: 10px;"><strong>${row[1]}</strong></td><td style="padding: 10px; font-size: 12px; color: #71818a;">${row[2]}</td><td style="padding: 10px;"><span class="status ${statusClass}">${row[3]}</span></td></tr>`;
      });

      historyHTML += `</tbody></table></div>`;

      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100;';
      modal.innerHTML = `<div style="background: white; border-radius: 12px; padding: 25px; max-width: 600px; width: 90%; box-shadow: 0 16px 45px rgba(26,57,60,.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px; color: #172b35;">${title}</h3>
          <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #71818a;">&times;</button>
        </div>
        ${historyHTML}
        <button class="primary-button" style="width: 100%; margin-top: 15px; padding: 12px; border-radius: 8px; border: none; background: #137f7b; color: white; cursor: pointer; font-weight: 600;">Tutup</button>
      </div>`;

      document.body.appendChild(modal);
      modal.querySelector('button:first-of-type').addEventListener('click', () => modal.remove());
      modal.querySelector('.primary-button').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
      });
    });
  });

  tabContent.querySelectorAll('[data-action="show-alerts"]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const title = button.getAttribute('data-title') || 'Alerts';
      const alertsData = [
        ['09:45', 'KRITIS', 'Rudi Hermawan', 'Saturasi O2 < 90%', 'Ruang IGD 1', 'Segera'],
        ['09:30', 'SERIUS', 'Sari Ningsih', 'Tekanan darah tinggi (180/110)', 'Ruang IGD 2', 'Urgent'],
        ['09:20', 'PERHATIAN', 'Wati Lestari', 'Denyut jantung irregularitas', 'Ruang IGD 3', 'Monitoring'],
        ['09:10', 'INFO', 'Aditya R', 'Suhu badan menurun', 'Ruang IGD 4', 'Konsultasi'],
        ['08:55', 'SERIUS', 'Pasien Baru', 'Pendarahan aktif tidak terkontrol', 'Ruang IGD 1', 'Urgent'],
        ['08:40', 'KRITIS', 'Pasien Emergency', 'Henti jantung potensial', 'Resus Room', 'Segera']
      ];

      let alertsHTML = `<div style="max-height: 450px; overflow-y: auto;"><table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 12px;"><thead><tr style="background: #f5f8f8; border-bottom: 2px solid #e5eceb;"><th style="padding: 10px; text-align: left; font-weight: 600;">Waktu</th><th style="padding: 10px; text-align: left; font-weight: 600;">Level</th><th style="padding: 10px; text-align: left; font-weight: 600;">Pasien</th><th style="padding: 10px; text-align: left; font-weight: 600;">Kondisi</th><th style="padding: 10px; text-align: left; font-weight: 600;">Lokasi</th><th style="padding: 10px; text-align: center; font-weight: 600;">Aksi</th></tr></thead><tbody>`;

      alertsData.forEach((row, idx) => {
        let levelClass = '';
        if (row[1] === 'KRITIS') levelClass = 'red';
        else if (row[1] === 'SERIUS' || row[1] === 'URGENT') levelClass = 'orange';
        else if (row[1] === 'PERHATIAN') levelClass = 'yellow';
        else levelClass = 'blue';

        alertsHTML += `<tr style="border-bottom: 1px solid #e5eceb; background: ${idx % 2 === 0 ? '#fff' : '#f9fbfb'};"><td style="padding: 10px; font-size: 11px; color: #71818a;">${row[0]}</td><td style="padding: 10px;"><span class="status ${levelClass}" style="font-weight: 700; font-size: 11px;">${row[1]}</span></td><td style="padding: 10px; font-weight: 500;">${row[2]}</td><td style="padding: 10px; font-size: 11px;">${row[3]}</td><td style="padding: 10px; font-size: 11px; color: #71818a;">${row[4]}</td><td style="padding: 10px; text-align: center;"><button class="alert-handle-btn" data-patient="${row[2]}" data-condition="${row[3]}" style="padding: 4px 8px; background: #137f7b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: 0.2s;">Handle</button></td></tr>`;
      });

      alertsHTML += `</tbody></table></div>`;

      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100;';
      modal.innerHTML = `<div style="background: white; border-radius: 12px; padding: 25px; max-width: 900px; width: 95%; box-shadow: 0 16px 45px rgba(26,57,60,.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div><h3 style="margin: 0; font-size: 18px; color: #172b35;">${title}</h3><p style="margin: 5px 0 0 0; font-size: 12px; color: #71818a;">Total Alert: <strong>${alertsData.length}</strong> | Status: <span style="color: #ef806f; font-weight: 700;">LIVE</span></p></div>
          <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #71818a;">&times;</button>
        </div>
        ${alertsHTML}
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button class="primary-button" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #137f7b; color: white; cursor: pointer; font-weight: 600;">Refresh Alert</button>
          <button class="view-history-btn" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #0099cc; color: white; cursor: pointer; font-weight: 600;">📋 Riwayat Tindakan</button>
          <button class="primary-button" style="flex: 1; padding: 12px; border-radius: 8px; border: #71818a solid 1px; background: white; color: #137f7b; cursor: pointer; font-weight: 600;">Tutup</button>
        </div>
      </div>`;

      document.body.appendChild(modal);
      modal.querySelector('button:first-of-type').addEventListener('click', () => modal.remove());
      modal.querySelector('.view-history-btn').addEventListener('click', () => {
        const actionsLog = JSON.parse(sessionStorage.getItem('alertActionsLog') || '[]');

        if (actionsLog.length === 0) {
          showToast('Belum ada riwayat tindakan alert. Lakukan tindakan terlebih dahulu.');
          return;
        }

        let historyHTML = `<div style="max-height: 400px; overflow-y: auto;"><table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 12px;"><thead><tr style="background: #f5f8f8; border-bottom: 2px solid #e5eceb;"><th style="padding: 10px; text-align: left; font-weight: 600;">Tanggal & Waktu</th><th style="padding: 10px; text-align: left; font-weight: 600;">Pasien</th><th style="padding: 10px; text-align: left; font-weight: 600;">Kondisi</th><th style="padding: 10px; text-align: left; font-weight: 600;">Tindakan</th><th style="padding: 10px; text-align: center; font-weight: 600;">Status</th></tr></thead><tbody>`;

        actionsLog.forEach((log, idx) => {
          historyHTML += `<tr style="border-bottom: 1px solid #e5eceb; background: ${idx % 2 === 0 ? '#fff' : '#f9fbfb'};"><td style="padding: 10px; font-size: 11px; color: #71818a;">${log.date} ${log.timestamp}</td><td style="padding: 10px; font-weight: 500;">${log.patient}</td><td style="padding: 10px; font-size: 11px;">${log.condition}</td><td style="padding: 10px; font-size: 11px;">${log.action}</td><td style="padding: 10px; text-align: center;"><span class="status green" style="font-size: 11px;">${log.status}</span></td></tr>`;
        });

        historyHTML += `</tbody></table></div>`;

        const historyModal = document.createElement('div');
        historyModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 102;';
        historyModal.innerHTML = `<div style="background: white; border-radius: 12px; padding: 25px; max-width: 900px; width: 95%; box-shadow: 0 16px 45px rgba(26,57,60,.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div><h3 style="margin: 0; font-size: 18px; color: #172b35;">📋 Riwayat Tindakan Alert</h3><p style="margin: 5px 0 0 0; font-size: 12px; color: #71818a;">Total Tindakan: <strong>${actionsLog.length}</strong></p></div>
            <button style="background: none; border: none; font-size: 24px; cursor: pointer; color: #71818a;">&times;</button>
          </div>
          ${historyHTML}
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="export-history-btn" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #137f7b; color: white; cursor: pointer; font-weight: 600;">⇩ Export CSV</button>
            <button class="close-history-btn" style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #e5eceb; background: white; color: #137f7b; cursor: pointer; font-weight: 600;">Tutup</button>
          </div>
        </div>`;

        document.body.appendChild(historyModal);
        historyModal.querySelector('button:first-of-type').addEventListener('click', () => historyModal.remove());
        historyModal.querySelector('.close-history-btn').addEventListener('click', () => historyModal.remove());
        historyModal.querySelector('.export-history-btn').addEventListener('click', () => {
          let csv = [];
          csv.push(['Tanggal & Waktu', 'Pasien', 'Kondisi', 'Tindakan', 'Status']);
          actionsLog.forEach(log => {
            csv.push([`${log.date} ${log.timestamp}`, log.patient, log.condition, log.action, log.status]);
          });

          const csvContent = csv.map(row => row.map(cell => {
            if (cell.includes(',') || cell.includes('"')) return '"' + cell.replace(/"/g, '""') + '"';
            return cell;
          }).join(',')).join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `riwayat-tindakan-alert-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          URL.revokeObjectURL(link.href);
          showToast('File CSV riwayat tindakan berhasil diunduh');
        });

        historyModal.addEventListener('click', e => {
          if (e.target === historyModal) historyModal.remove();
        });
      });

      modal.querySelector('.primary-button:last-of-type').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
      });

      modal.querySelectorAll('.alert-handle-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const patientName = btn.getAttribute('data-patient');
          const condition = btn.getAttribute('data-condition');

          const handleModal = document.createElement('div');
          handleModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 101;';
          handleModal.innerHTML = `<div style="background: white; border-radius: 12px; padding: 25px; max-width: 500px; width: 90%; box-shadow: 0 16px 45px rgba(26,57,60,.15);">
            <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #172b35;">Tindakan Alert</h3>
            <div style="background: #f5f8f8; border-left: 4px solid #ef806f; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <p style="margin: 0; font-weight: 600; color: #172b35;">Pasien: ${patientName}</p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #71818a;">${condition}</p>
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #172b35; font-size: 13px;">Aksi Penanganan:</label>
              <select style="width: 100%; padding: 10px; border: 1px solid #e5eceb; border-radius: 6px; font-size: 13px; color: #172b35; font-family: inherit;">
                <option>-- Pilih Tindakan --</option>
                <option>Notifikasi Dokter Spesialis</option>
                <option>Panggil Tim Resusitasi</option>
                <option>Isolasi Pasien</option>
                <option>Monitoring Ketat</option>
                <option>Transfer ke ICU</option>
                <option>Konsultasi Departemen</option>
                <option>Review Hasil Lab</option>
              </select>
            </div>
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #172b35; font-size: 13px;">Catatan:</label>
              <textarea style="width: 100%; padding: 10px; border: 1px solid #e5eceb; border-radius: 6px; font-size: 13px; color: #172b35; font-family: inherit; resize: vertical; min-height: 80px;" placeholder="Tuliskan catatan tindakan..."></textarea>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="save-handle" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #137f7b; color: white; cursor: pointer; font-weight: 600;">Simpan Tindakan</button>
              <button class="cancel-handle" style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #e5eceb; background: white; color: #137f7b; cursor: pointer; font-weight: 600;">Batalkan</button>
            </div>
          </div>`;

          document.body.appendChild(handleModal);

          handleModal.querySelector('.save-handle').addEventListener('click', () => {
            const select = handleModal.querySelector('select');
            const textarea = handleModal.querySelector('textarea');
            const action = select.value;
            const notes = textarea.value;

            if (action === '-- Pilih Tindakan --' || !notes.trim()) {
              alert('Silakan pilih tindakan dan tambahkan catatan');
              return;
            }

            const actionData = {
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              date: new Date().toLocaleDateString('id-ID'),
              patient: patientName,
              condition: condition,
              action: action,
              notes: notes,
              status: 'Tercatat'
            };

            let actionsLog = JSON.parse(sessionStorage.getItem('alertActionsLog') || '[]');
            actionsLog.unshift(actionData);
            sessionStorage.setItem('alertActionsLog', JSON.stringify(actionsLog));

            showToast(`✓ Tindakan "${action}" untuk ${patientName} berhasil dicatat.`);
            handleModal.remove();
          });

          handleModal.querySelector('.cancel-handle').addEventListener('click', () => {
            handleModal.remove();
          });

          handleModal.addEventListener('click', e => {
            if (e.target === handleModal) handleModal.remove();
          });
        });
      });
    });
  });

  const patientSearch = tabContent.querySelector('#patientSearch');
  if (patientSearch) {
    patientSearch.addEventListener('input', event => {
      const query = String(event.target.value || '').trim();
      const holder = tabContent.querySelector('#patientDirectoryTable');
      if (holder) {
        holder.innerHTML = window.SIMRS_CORE.patientTable(query);
        bindTemplateEvents();
      }
    });
  }

  const editButtons = tabContent.querySelectorAll('[data-action="edit-patient"]');
  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      openPatientEditor(button.dataset.record || '');
    });
  });

  if (tabContent.querySelector('#resultPatientNameInput')) {
    const patient = sessionStorage.getItem('simrsLastPatient') || 'Siti Aminah';
    const record = sessionStorage.getItem('simrsLastPatientRecord') || 'RM-2408128';
    const unit = sessionStorage.getItem('simrsLastPatientUnit') || 'Poli Penyakit Dalam';
    const nik = sessionStorage.getItem('simrsLastPatientNik') || '';

    tabContent.querySelector('#resultPatientNameInput').value = patient;
    const nameTarget = tabContent.querySelector('#resultPatientName');
    if (nameTarget) nameTarget.textContent = patient;

    const nikInput = tabContent.querySelector('#resultPatientNikInput');
    if (nikInput) nikInput.value = nik || '3578011402980001';

    const recordInput = tabContent.querySelector('[name="recordNumber"]');
    if (recordInput) recordInput.value = record;

    const unitSelect = tabContent.querySelector('[name="clinic"]');
    if (unitSelect) {
      const foundUnit = Array.from(unitSelect.options).some(option => option.value.trim() === unit.trim());
      if (foundUnit) unitSelect.value = unit;
    }
  }

  const saveResultButton = document.getElementById('saveResultButton');
  const saveStatus = document.getElementById('saveStatus');
  const backToPatientMenu = document.getElementById('backToPatientMenu');

  if (saveResultButton && saveStatus && backToPatientMenu) {
    saveResultButton.addEventListener('click', () => {
      saveStatus.hidden = false;
      backToPatientMenu.hidden = false;
      saveStatus.classList.add('show');
      saveStatus.querySelector('.save-status-text').textContent = 'Tersimpan';
      showToast('Hasil pemeriksaan berhasil disimpan.');

      const transcript = tabContent.querySelector('[name="anamnesis"]');
      if (transcript && transcript.value.trim()) {
        saveOfflineDraft(transcript.value.trim());
      }
    });
  }

  if (backToPatientMenu) {
    backToPatientMenu.addEventListener('click', () => {
      setTab('pasien');
      showToast('Kembali ke menu pasien.');
    });
  }

  const metricDetailPage = tabContent.querySelector('#metricDetailPage');
  const metricDetails = {
    'safe-stock': {
      title: 'Stok obat aman',
      description: 'Pantau obat yang tersedia, item kritis, dan kebutuhan pengadaan agar pelayanan tetap berjalan.',
      stats: [['76%', 'Stok dalam batas aman'], ['24', 'Item kritis'], ['128', 'Item dengan stok tertinggi']],
      listTitle: 'Daftar item kritis',
      listDescription: 'Prioritas pemeriksaan stok dan pengadaan hari ini.',
      rows: [['Insulin Glargine', 'Stok tersisa 5 unit', 'Restock'], ['Ceftriaxone 1 g', 'Stok tersisa 7 unit', 'Restock'], ['Furosemide 40 mg', 'Stok tersisa 18 unit', 'Pantau']]
    },
    prescriptions: {
      title: 'Resep obat hari ini',
      description: 'Ringkasan resep yang masuk dari rawat jalan, rawat inap, dan unit gawat darurat.',
      stats: [['428', 'Total resep hari ini'], ['+32', 'Dibanding kemarin'], ['18 menit', 'Waktu tunggu rata-rata']],
      listTitle: 'Distribusi resep',
      listDescription: 'Volume resep berdasarkan sumber layanan.',
      rows: [['Rawat jalan', '312 resep', 'Berjalan'], ['Rawat inap', '116 resep', 'Berjalan'], ['IGD', '24 resep', 'Prioritas']]
    },
    restock: {
      title: 'Obat perlu restock',
      description: 'Daftar kebutuhan pengadaan yang perlu ditinjau oleh petugas farmasi dan bagian logistik.',
      stats: [['18', 'Total item restock'], ['7', 'Item urgent'], ['3 hari', 'Estimasi pengadaan']],
      listTitle: 'Prioritas pengadaan',
      listDescription: 'Item dengan permintaan tinggi atau stok mendekati batas minimum.',
      rows: [['Insulin Glargine', 'Permintaan 15 | stok 5', 'Urgent'], ['Ceftriaxone 1 g', 'Permintaan 13 | stok 7', 'Urgent'], ['Furosemide 40 mg', 'Permintaan 10 | stok 18', 'Terjadwal']]
    },
    dispensing: {
      title: 'Penyerahan obat',
      description: 'Pantau resep yang telah disiapkan dan diserahkan kepada pasien atau unit perawatan.',
      stats: [['361', 'Resep telah diserahkan'], ['84%', 'Tingkat penyelesaian'], ['67', 'Resep masih diproses']],
      listTitle: 'Status penyerahan',
      listDescription: 'Ringkasan antrean penyerahan obat pada hari ini.',
      rows: [['Selesai diserahkan', '361 resep', 'Selesai'], ['Menunggu verifikasi', '42 resep', 'Diproses'], ['Menunggu pengambilan', '25 resep', 'Menunggu']]
    }
  };

  if (metricDetailPage) {
    const overviewSections = [...tabContent.querySelectorAll('.farmasi-overview')];
    const detailTitle = tabContent.querySelector('#metricDetailTitle');
    const detailDescription = tabContent.querySelector('#metricDetailDescription');
    const detailStats = tabContent.querySelector('#metricDetailStats');
    const detailListTitle = tabContent.querySelector('#metricDetailListTitle');
    const detailListDescription = tabContent.querySelector('#metricDetailListDescription');
    const detailRows = tabContent.querySelector('#metricDetailRows');
    const openMetricDetail = key => {
      const detail = metricDetails[key];
      if (!detail) return;
      detailTitle.textContent = detail.title;
      detailDescription.textContent = detail.description;
      detailStats.innerHTML = detail.stats.map(stat => `<div class="detail-stat"><strong>${stat[0]}</strong><span>${stat[1]}</span></div>`).join('');
      detailListTitle.textContent = detail.listTitle;
      detailListDescription.textContent = detail.listDescription;
      detailRows.innerHTML = detail.rows.map(row => `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td><span class="status ${row[2] === 'Selesai' ? 'green' : row[2] === 'Urgent' || row[2] === 'Restock' ? 'orange' : 'blue'}">${row[2]}</span></td></tr>`).join('');
      overviewSections.forEach(section => { section.hidden = true; });
      metricDetailPage.hidden = false;
      metricDetailPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tabContent.querySelectorAll('[data-metric-detail]').forEach(card => {
      card.addEventListener('click', () => openMetricDetail(card.dataset.metricDetail));
    });
    tabContent.querySelector('#closeMetricDetail').addEventListener('click', () => {
      metricDetailPage.hidden = true;
      overviewSections.forEach(section => { section.hidden = false; });
      tabContent.querySelector('.metrics-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const medicineSearch = tabContent.querySelector('#medicineSearch');
  const medicineRows = [...tabContent.querySelectorAll('#medicineTable tbody tr')];
  const medicineCount = tabContent.querySelector('#medicineCount');
  const medicineEmpty = tabContent.querySelector('#medicineEmpty');
  if (medicineSearch && medicineRows.length) {
    const filterMedicines = () => {
      const query = medicineSearch.value.trim().toLowerCase();
      let visibleCount = 0;
      medicineRows.forEach(row => {
        const visible = !query || row.dataset.medicine.includes(query);
        row.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      medicineCount.textContent = `${visibleCount} obat`;
      medicineEmpty.hidden = visibleCount !== 0;
    };
    medicineSearch.addEventListener('input', filterMedicines);
  }

  const chartMetric = tabContent.querySelector('#chartMetric');
  const chartSummary = tabContent.querySelector('#chartSummary');
  if (chartMetric && chartSummary) {
    chartMetric.addEventListener('change', () => {
      const waiting = chartMetric.value === 'waiting';
      tabContent.querySelector('.line-chart').classList.toggle('show-waiting', waiting);
      chartSummary.textContent = waiting ? 'Waktu tunggu turun 12%' : 'Penjualan meningkat 18%';
    });
  }

  const medicineDetail = tabContent.querySelector('#medicineDetail');
  const medicineDetailData = {
    amoxicillin: { title: 'Amoxicillin 500 mg', category: 'Antibiotik | Kapsul', use: 'Infeksi bakteri sesuai diagnosis klinis', form: 'Kapsul 500 mg', note: 'Perhatikan riwayat alergi penisilin dan gunakan sesuai resep.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80' },
    paracetamol: { title: 'Paracetamol 500 mg', category: 'Analgesik dan antipiretik | Tablet', use: 'Nyeri ringan sampai sedang dan demam', form: 'Tablet 500 mg', note: 'Perhatikan total dosis harian dan kondisi hati.', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80' },
    ibuprofen: { title: 'Ibuprofen 400 mg', category: 'Antiinflamasi nonsteroid | Tablet', use: 'Nyeri dan inflamasi tertentu', form: 'Tablet 400 mg', note: 'Waspadai riwayat tukak lambung, ginjal, dan kehamilan.', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8ca2?auto=format&fit=crop&w=900&q=80' },
    omeprazole: { title: 'Omeprazole 20 mg', category: 'Penghambat pompa proton | Kapsul', use: 'Keluhan terkait produksi asam lambung', form: 'Kapsul 20 mg', note: 'Tinjau indikasi dan durasi terapi secara berkala.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80' },
    metformin: { title: 'Metformin 500 mg', category: 'Antidiabetes | Tablet', use: 'Kontrol kadar glukosa pada diabetes tipe 2', form: 'Tablet 500 mg', note: 'Periksa fungsi ginjal dan toleransi saluran cerna.', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80' },
    amlodipine: { title: 'Amlodipine 5 mg', category: 'Antihipertensi | Tablet', use: 'Hipertensi dan angina sesuai evaluasi klinis', form: 'Tablet 5 mg', note: 'Pantau tekanan darah dan kemungkinan edema perifer.', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8ca2?auto=format&fit=crop&w=900&q=80' },
    cetirizine: { title: 'Cetirizine 10 mg', category: 'Antihistamin | Tablet', use: 'Gejala alergi dan rinitis alergi', form: 'Tablet 10 mg', note: 'Dapat menyebabkan kantuk pada sebagian pasien.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80' },
    salbutamol: { title: 'Salbutamol 2 mg', category: 'Bronkodilator | Tablet', use: 'Gejala bronkospasme sesuai diagnosis', form: 'Tablet 2 mg', note: 'Sesak berat atau memburuk memerlukan evaluasi segera.', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80' },
    furosemide: { title: 'Furosemide 40 mg', category: 'Diuretik | Tablet', use: 'Edema atau kondisi jantung tertentu', form: 'Tablet 40 mg', note: 'Pantau elektrolit, tekanan darah, dan status cairan.', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8ca2?auto=format&fit=crop&w=900&q=80' },
    insulin: { title: 'Insulin Glargine', category: 'Antidiabetes | Pena injeksi', use: 'Kontrol glukosa basal sesuai rencana terapi', form: 'Pena injeksi', note: 'Simpan sesuai ketentuan dan jangan mengganti dosis otomatis.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80' },
    ceftriaxone: { title: 'Ceftriaxone 1 g', category: 'Antibiotik | Injeksi', use: 'Infeksi bakteri tertentu dalam layanan kesehatan', form: 'Serbuk injeksi 1 g', note: 'Pemberian dan penggantian wajib mengikuti instruksi klinis.', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80' },
    loperamide: { title: 'Loperamide 2 mg', category: 'Antidiare | Kapsul', use: 'Diare akut tertentu setelah penyebab dinilai', form: 'Kapsul 2 mg', note: 'Hindari penggunaan pada tanda infeksi berat atau darah pada feses.', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8ca2?auto=format&fit=crop&w=900&q=80' }
  };

  if (medicineDetail) {
    const showMedicineDetail = key => {
      const detail = medicineDetailData[key];
      if (!detail) return;
      tabContent.querySelector('#medicineDetailTitle').textContent = detail.title;
      tabContent.querySelector('#medicineDetailCategory').textContent = detail.category;
      tabContent.querySelector('#medicineUse').textContent = detail.use;
      tabContent.querySelector('#medicineForm').textContent = detail.form;
      tabContent.querySelector('#medicineNote').textContent = detail.note;
      const image = tabContent.querySelector('#medicineImage');
      image.src = detail.image;
      image.alt = `Ilustrasi ${detail.title}`;
      medicineDetail.hidden = false;
      medicineDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tabContent.querySelectorAll('.medicine-link').forEach(button => {
      button.addEventListener('click', () => showMedicineDetail(button.closest('tr').dataset.detail));
    });
    tabContent.querySelector('#closeMedicineDetail').addEventListener('click', () => {
      medicineDetail.hidden = true;
    });
  }

  const nearbyPharmacyButton = tabContent.querySelector('#nearbyPharmacyButton');
  if (nearbyPharmacyButton) {
    nearbyPharmacyButton.addEventListener('click', () => {
      window.open('https://www.google.com/maps/search/apotek+terdekat', '_blank', 'noopener,noreferrer');
    });
  }

  const alternativeButton = tabContent.querySelector('#alternativeButton');
  const alternativeMedicine = tabContent.querySelector('#alternativeMedicine');
  const alternativeResult = tabContent.querySelector('#alternativeResult');
  const alternatives = {
    amoxicillin: ['Ampicillin atau cefalexin', 'Sama-sama antibiotik beta-laktam, tetapi pilihan bergantung pada lokasi infeksi, alergi, kultur, dan pedoman rumah sakit.'],
    paracetamol: ['Ibuprofen atau metamizole', 'Pertimbangkan indikasi, risiko perdarahan, fungsi ginjal, dan kontraindikasi sebelum memilih analgesik lain.'],
    ibuprofen: ['Paracetamol', 'Dapat dipertimbangkan untuk nyeri atau demam tertentu ketika NSAID perlu dihindari; cek penyebab dan kondisi hati.'],
    omeprazole: ['Pantoprazole atau lansoprazole', 'Keduanya termasuk penghambat pompa proton; kesesuaian bergantung pada indikasi dan interaksi obat.'],
    metformin: ['Glimepiride atau insulin', 'Bukan pengganti setara otomatis; perlu penilaian HbA1c, fungsi ginjal, risiko hipoglikemia, dan kondisi pasien.'],
    amlodipine: ['Nifedipine lepas lambat atau felodipine', 'Sama-sama calcium channel blocker, tetapi target tekanan darah, denyut, dan interaksi tetap perlu dinilai.'],
    cetirizine: ['Loratadine atau fexofenadine', 'Antihistamin non-sedatif yang dapat dipertimbangkan sesuai gejala, usia, fungsi ginjal, dan obat lain.'],
    salbutamol: ['Terbutaline atau ipratropium', 'Pilihan bergantung pada diagnosis dan bentuk sediaan; gejala sesak berat memerlukan evaluasi segera.']
  };
  if (alternativeButton && alternativeMedicine && alternativeResult) {
    alternativeButton.addEventListener('click', () => {
      const selected = alternatives[alternativeMedicine.value];
      if (!selected) {
        alternativeResult.hidden = false;
        alternativeResult.innerHTML = '<strong>Pilih obat terlebih dahulu.</strong><span>Asisten memerlukan obat acuan untuk membuat telaah alternatif.</span>';
        return;
      }
      alternativeResult.hidden = false;
      alternativeResult.innerHTML = `<strong>Opsi yang perlu ditelaah: ${selected[0]}</strong><span>${selected[1]}</span><small>Langkah berikutnya: validasi oleh dokter penanggung jawab dan apoteker klinis.</small>`;
    });
  }

  if (tabContent.querySelector('#resultPatientName')) {
    const patient = sessionStorage.getItem('simrsLastPatient');
    if (patient) {
      tabContent.querySelector('#resultPatientName').value = patient;
    }
  }

  bindProfileEvents();
  initVoiceRecorder();
}

function bindProfileEvents() {
  const profileEdit = tabContent.querySelector('#profileEditPanel');
  const passwordPanel = tabContent.querySelector('#passwordPanel');
  if (!profileEdit && !passwordPanel) return;

  const openPanel = panel => { if (panel) panel.hidden = false; };
  const closePanel = panel => { if (panel) panel.hidden = true; };

  tabContent.querySelectorAll('[data-profile-action="edit-profile"]').forEach(button => {
    button.addEventListener('click', () => openPanel(profileEdit));
  });

  tabContent.querySelectorAll('[data-profile-action="change-password"]').forEach(button => {
    button.addEventListener('click', () => openPanel(passwordPanel));
  });

  tabContent.querySelectorAll('[data-profile-action="close-panel"]').forEach(button => {
    button.addEventListener('click', () => closePanel(profileEdit));
  });

  tabContent.querySelectorAll('[data-profile-action="close-password"]').forEach(button => {
    button.addEventListener('click', () => closePanel(passwordPanel));
  });

  tabContent.querySelectorAll('[data-profile-action="session"]').forEach(button => {
    button.addEventListener('click', () => showToast('Saat ini terdapat 1 sesi aktif: Chrome di Windows.'));
  });

  tabContent.querySelectorAll('[data-profile-action="view-activity"]').forEach(button => {
    button.addEventListener('click', () => showToast('Riwayat aktivitas lengkap siap ditampilkan.'));
  });

  tabContent.querySelectorAll('[data-profile-action="view-doctor-activity"]').forEach(button => {
    button.addEventListener('click', () => showToast('Riwayat kegiatan dokter lengkap siap ditampilkan.'));
  });

  tabContent.querySelectorAll('.profile-drawer').forEach(drawer => {
    drawer.addEventListener('click', event => {
      if (event.target === drawer) drawer.hidden = true;
    });
  });

  const profileForm = tabContent.querySelector('#profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(profileForm);
      const name = String(data.get('name') || '').trim();
      if (!name) {
        showToast('Nama lengkap wajib diisi.');
        return;
      }

      const identity = tabContent.querySelector('.summary-identity .identity-name-row strong');
      if (identity) identity.textContent = name;

      if (profileEdit) profileEdit.hidden = true;
      showToast('Profil berhasil diperbarui.');
    });
  }

  const passwordForm = tabContent.querySelector('#passwordForm');
  if (passwordForm) {
    const passwordInput = passwordForm.querySelector('#newProfilePassword');
    const strengthBars = passwordForm.querySelectorAll('.password-strength span');
    const strengthLabel = passwordForm.querySelector('.password-strength strong');

    if (passwordInput && strengthBars.length && strengthLabel) {
      passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        const score = [value.length >= 8, /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
        const labels = ['Masukkan password baru', 'Password lemah', 'Password cukup kuat', 'Password kuat', 'Password sangat kuat'];
        strengthBars.forEach((bar, index) => {
          bar.style.background = index < score ? (score < 2 ? '#ef806f' : score < 4 ? '#f5bd5b' : '#3fc08c') : '';
        });
        strengthLabel.textContent = labels[score];
      });
    }

    passwordForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(passwordForm);
      const next = String(data.get('new') || '');
      const confirm = String(data.get('confirm') || '');
      if (next.length < 8) {
        showToast('Password baru minimal 8 karakter.');
        return;
      }
      if (next !== confirm) {
        showToast('Konfirmasi password belum sesuai.');
        return;
      }
      passwordForm.reset();
      if (passwordPanel) passwordPanel.hidden = true;
      showToast('Password berhasil diperbarui.');
    });
  }

  tabContent.querySelectorAll('[data-profile-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      const labels = {
        '2fa': 'Verifikasi 2 langkah',
        system: 'Notifikasi sistem',
        activity: 'Aktivitas akun',
        tasks: 'Pengingat tugas',
        summary: 'Ringkasan operasional'
      };
      showToast(`${labels[input.dataset.profileToggle] || 'Preferensi'} ${input.checked ? 'diaktifkan' : 'dinonaktifkan'}.`);
    });
  });
}

function openPatientEditor(recordId) {
  const list = JSON.parse(localStorage.getItem('simrsPatients') || '[]');
  const target = Array.isArray(list) ? list.find(patient => (patient.record || patient.rm || patient.name) === recordId) : null;

  if (!target) {
    showToast('Pasien tidak ditemukan.');
    return;
  }

  sessionStorage.setItem('simrsLastPatient', target.name || 'Pasien');
  sessionStorage.setItem('simrsLastPatientRecord', target.record || target.rm || recordId);
  sessionStorage.setItem('simrsLastPatientUnit', target.unit || target.clinic || 'Poli Umum');
  sessionStorage.setItem('simrsLastPatientNik', target.nik || target.NIK || '');
  sessionStorage.setItem('simrsEditingPatient', JSON.stringify(target));

  setTab('hasil');
  showToast('Membuka informasi lengkap pasien.');
}

function initVoiceRecorder() {
  const resultForm = tabContent.querySelector('.result-form-main');
  if (!resultForm) return;

  const patientName = tabContent.querySelector('#resultPatientNameInput') || tabContent.querySelector('#resultPatientName');
  const anamnesis = resultForm.querySelector('[name="anamnesis"]');
  const startBtn = tabContent.querySelector('.voice-record');
  const stopBtn = tabContent.querySelector('.voice-stop');
  const statusText = tabContent.querySelector('.voice-status');
  const speechConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!startBtn || !stopBtn || !anamnesis) return;

  let recognition = null;

  if (!speechConstructor) {
    statusText.textContent = 'Browser tidak mendukung';
    startBtn.disabled = true;
    return;
  }

  startBtn.addEventListener('click', () => {
    if (recognition) recognition.stop();

    recognition = new speechConstructor();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      startBtn.textContent = 'Merekam';
      statusText.textContent = 'Merekam...';
      showToast('Voice-to-text sedang merekam anamnesis.');
    };

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      const original = anamnesis.value.trim();
      anamnesis.value = original ? `${original}\n${transcript}` : transcript;
      startBtn.textContent = 'Mulai';
      statusText.textContent = 'Transkripsi siap disimpan';
    };

    recognition.onerror = () => {
      statusText.textContent = 'Kesalahan rekaman';
      showToast('Voice-to-text gagal diproses.');
    };

    recognition.onend = () => {
      startBtn.textContent = 'Mulai';
      statusText.textContent = 'Rekaman selesai';
    };

    recognition.start();
  });

  stopBtn.addEventListener('click', () => {
    if (recognition) {
      recognition.stop();
    }

    const transcript = anamnesis.value.trim();
    if (transcript) {
      saveOfflineDraft(transcript);
      statusText.textContent = 'Draft disimpan lokal';
      showToast('Transkrip voice-to-text disimpan sebagai draft lokal.');
    }
  });
}

function setTab(tab) {
  const module = modules[tab] || modules.dashboard;
  const data = module.data;
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  document.getElementById('breadcrumbTitle').textContent = data.heading;
  document.getElementById('eyebrow').textContent = data.eyebrow;
  document.getElementById('pageTitle').textContent = data.heading;
  document.getElementById('pageSubtitle').textContent = data.subtitle;
  document.getElementById('moduleIcon').textContent = data.icon;
  document.getElementById('moduleTitle').textContent = data.title;
  document.getElementById('moduleDescription').textContent = data.desc;
  document.getElementById('moduleOwner').textContent = data.owner;

  const templateUrl = moduleTemplateMap[tab] || moduleTemplateMap.dashboard;

  fetch(templateUrl)
    .then(response => {
      if (!response.ok) throw new Error(`Template ${templateUrl} gagal dimuat`);
      return response.text();
    })
    .then(html => {
      tabContent.innerHTML = html;
      if (tab === 'pasien') {
        const holder = tabContent.querySelector('#patientDirectoryTable');
        if (holder) holder.innerHTML = window.SIMRS_CORE.patientTable();
      }
      bindTemplateEvents();
    })
    .catch(() => {
      tabContent.innerHTML = module.render();
      bindTemplateEvents();
    });

  document.getElementById('sidebar').classList.remove('open');
}

function showToast(message) {
  document.getElementById('toastMessage').textContent = message;
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
document.getElementById('mobileMenu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('exportButton').addEventListener('click', () => showToast('Laporan berhasil disiapkan untuk diunduh.'));

const modal = document.getElementById('modalBackdrop');
document.getElementById('addPatientButton').addEventListener('click', () => modal.classList.add('open'));
document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', event => { if (event.target === modal) modal.classList.remove('open'); });
document.getElementById('patientForm').addEventListener('submit', event => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const patientName = String(formData.get('name') || '').trim();
  const nik = String(formData.get('nik') || '').replace(/\D/g, '');

  if (!patientName) {
    showToast('Nama pasien wajib diisi.');
    return;
  }

  if (!nik) {
    showToast('Nomor NIK pasien wajib diisi.');
    return;
  }

  if (!/^\d{16}$/.test(nik)) {
    showToast('NIK harus terdiri dari tepat 16 angka.');
    return;
  }

  const birth = String(formData.get('birth') || '1990-01-01');
  const gender = String(formData.get('gender') || 'unknown');
  const phone = String(formData.get('phone') || '');

  const patient = {
    name: patientName,
    nik,
    record: `RM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(Math.round(1000 + Math.random() * 9000))}`,
    unit: String(formData.get('clinic') || 'Poli Umum'),
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    initials: patientName.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase(),
    color: 'blue',
    status: 'Menunggu',
    birth,
    gender,
    phone
  };

  const currentPatients = JSON.parse(localStorage.getItem('simrsPatients') || '[]');
  const list = Array.isArray(currentPatients) ? currentPatients : [];
  list.unshift(patient);
  localStorage.setItem('simrsPatients', JSON.stringify(list));
  sessionStorage.setItem('simrsLastPatientNik', nik);

  const satusehatPayload = {
    resourceType: 'Patient',
    identifier: [{ system: 'https://fhir.kemkes.go.id/id/nik', value: nik }],
    name: [{ use: 'official', text: patientName }],
    gender: gender.toLowerCase() === 'perempuan' ? 'female' : gender.toLowerCase() === 'laki-laki' ? 'male' : 'unknown',
    birthDate: birth,
    telecom: phone ? [{ system: 'phone', value: phone }] : [],
    active: true
  };

  fetch('/api/satusehat/fhir/Patient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(satusehatPayload)
  }).then(async response => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.message || result.data?.issue?.[0]?.details?.text || 'Gagal mengirim data pasien ke SatuSehat.');
    }
    const satusehatId = result.data?.id || '';
    const savedPatients = JSON.parse(localStorage.getItem('simrsPatients') || '[]');
    const savedIndex = Array.isArray(savedPatients) ? savedPatients.findIndex(item => item.record === patient.record) : -1;
    if (savedIndex >= 0) {
      savedPatients[savedIndex].satusehatId = satusehatId;
      savedPatients[savedIndex].satusehatStatus = 'success';
      localStorage.setItem('simrsPatients', JSON.stringify(savedPatients));
    }
    showToast(`NIK ${nik} tersimpan di SATUSEHAT${satusehatId ? ` (Patient ID: ${satusehatId})` : ''}.`);
    return result;
  }).catch(error => {
    const savedPatients = JSON.parse(localStorage.getItem('simrsPatients') || '[]');
    const savedIndex = Array.isArray(savedPatients) ? savedPatients.findIndex(item => item.record === patient.record) : -1;
    if (savedIndex >= 0) {
      savedPatients[savedIndex].satusehatStatus = 'pending';
      localStorage.setItem('simrsPatients', JSON.stringify(savedPatients));
    }
    showToast(`${error.message} NIK ${nik} tetap tersimpan lokal.`);
  }).finally(() => {
    sessionStorage.setItem('simrsLastPatient', patientName);
    sessionStorage.setItem('simrsLastPatientRecord', patient.record);
    sessionStorage.setItem('simrsLastPatientUnit', patient.unit);
    modal.classList.remove('open');
    event.target.reset();

    setTimeout(() => {
      setTab('hasil');
      showToast('Silakan isi formulir hasil pemeriksaan.');
    }, 250);
  });
});

setInterval(() => {
  const now = new Date();
  document.getElementById('clock').textContent = `${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
}, 1000);

const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function openApplication() {
  loginScreen.style.display = 'none';
  loginScreen.classList.add('is-hidden');
  appShell.classList.add('is-authenticated');
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const identity = document.getElementById('loginIdentity').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (identity.toLowerCase() !== 'admin' || password !== 'simrs123') {
    loginError.textContent = 'ID pengguna atau password belum sesuai.';
    loginError.classList.add('show');
    return;
  }
  loginError.classList.remove('show');
  sessionStorage.setItem('simrsAuthenticated', 'true');
  openApplication();
});

document.getElementById('togglePassword').addEventListener('click', event => {
  const password = document.getElementById('loginPassword');
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  event.currentTarget.textContent = visible ? 'Lihat' : 'Sembunyikan';
});
document.getElementById('forgotPassword').addEventListener('click', () => showToast('Silakan hubungi IT Support untuk reset password.'));
document.getElementById('loginSupport').addEventListener('click', () => showToast('IT Support: ext. 110 atau support@nusamedika.id'));

if (sessionStorage.getItem('simrsAuthenticated') === 'true') openApplication();
setTab('dashboard');
