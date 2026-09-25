window.SIMRS_MODULES.satusehat = {
  data: {
    title: 'Integrasi SatuSehat',
    desc: 'Kelola konfigurasi OAuth, endpoint, dan status interoperabilitas data ke platform SatuSehat.',
    owner: 'dr. Andika Rahman',
    icon: '◎',
    eyebrow: 'INTEGRASI SATUSEHAT',
    heading: 'SatuSehat',
    subtitle: 'Siapkan konfigurasi client ID, endpoint, dan token agar integrasi ke SatuSehat siap dipakai.'
  },
  render() {
    return `
      <div class="metrics-grid">
        <div class="metric-card"><div class="metric-top"><span>API status</span><i class="metric-icon mint">◎</i></div><h3>Online</h3><span class="trend">Sinyal aktif 99,92%</span></div>
        <div class="metric-card"><div class="metric-top"><span>Data terkirim</span><i class="metric-icon blue">⇄</i></div><h3>1.284</h3><span class="trend">+184 hari ini</span></div>
        <div class="metric-card"><div class="metric-top"><span>Dokumen pending</span><i class="metric-icon gold">◔</i></div><h3>12</h3><span class="trend">4 butuh validasi</span></div>
      </div>

      <div class="lower-grid">
        <section class="panel">
          <div class="panel-header">
            <div><h3>Status integrasi</h3><p>Ringkasan koneksi dan layanan SatuSehat</p></div>
            <button class="text-button" type="button" id="satusehatSyncNow">Sinkronisasi ↗</button>
          </div>
          <div class="panel-header" style="padding-top: 0; border-top: 0;">
            <small id="satusehatLastSyncText" style="color: #71818a; font-size: 12px;">Belum ada sinkronisasi terbaru.</small>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Layanan</th>
                  <th>Endpoint</th>
                  <th>Terakhir sync</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Pasien</strong></td><td>Patient API</td><td>08:42 WIB</td><td><span class="status green">Tersambung</span></td></tr>
                <tr><td><strong>Encounter</strong></td><td>Encounter API</td><td>08:41 WIB</td><td><span class="status green">Tersambung</span></td></tr>
                <tr><td><strong>Observation</strong></td><td>Observation API</td><td>08:38 WIB</td><td><span class="status orange">Warning</span></td></tr>
                <tr><td><strong>Medication</strong></td><td>Medication API</td><td>08:36 WIB</td><td><span class="status green">Tersambung</span></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div><h3>Log interoperabilitas</h3><p>Riwayat pengiriman data terbaru</p></div>
            <button class="text-button" data-action="toast" data-message="Log interoperabilitas siap diekspor.">Export CSV ⇩</button>
          </div>
          <div class="schedule-list">
            <div class="schedule-item"><span class="schedule-time">08:42</span><div><strong>Data pasien 1.284 berhasil dikirim</strong><small>Bundle FHIR: Patient / Encounter</small></div><i class="dot-line"></i></div>
            <div class="schedule-item"><span class="schedule-time">08:31</span><div><strong>Validasi kode ICD-10 selesai</strong><small>Checklist diagnosis otomatis</small></div><i class="dot-line yellow"></i></div>
            <div class="schedule-item"><span class="schedule-time">08:14</span><div><strong>3 rekam medik menunggu review</strong><small>Dokumen laboratorium &amp; radiologi</small></div><i class="dot-line red"></i></div>
            <div class="schedule-item"><span class="schedule-time">07:50</span><div><strong>Refresh token berstatus valid</strong><small>Credential SatuSehat aktif</small></div><i class="dot-line"></i></div>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div><h3>Status koneksi</h3><p>Credential dan endpoint dikelola aman oleh backend SIMRS.</p></div>
          <span class="status blue" id="satusehatConnectionStatus">Siap terhubung</span>
        </div>
        <div class="form-actions">
          <button type="button" class="outline-button" id="satusehatTestConnection">Uji koneksi</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div><h3>Manajemen data SatuSehat</h3><p>Monitoring penerimaan, validasi, dan kirim berkas ke platform nasional</p></div>
          <span class="status blue">3 item prioritas</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Jenis data</th>
                <th>Jumlah</th>
                <th>Periode</th>
                <th>Validasi</th>
                <th>Status kirim</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Rekam medis pasien</strong></td><td>842</td><td>Hari ini</td><td>98,4%</td><td><span class="status green">Berhasil</span></td></tr>
              <tr><td><strong>Hasil laboratorium</strong></td><td>216</td><td>Hari ini</td><td>96,1%</td><td><span class="status orange">Review</span></td></tr>
              <tr><td><strong>Resep obat</strong></td><td>174</td><td>Hari ini</td><td>99,2%</td><td><span class="status green">Berhasil</span></td></tr>
              <tr><td><strong>Referensi pasien</strong></td><td>52</td><td>Hari ini</td><td>94,6%</td><td><span class="status blue">Pending</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  }
};
