window.SIMRS_MODULES.hasil = {
  data: {
    title: 'Formulir hasil pemeriksaan',
    desc: 'Catat keluhan, diagnosa, tindakan, dan status pasien setelah registrasi.',
    owner: 'dr. Andika Rahman',
    icon: '✎',
    eyebrow: 'HASIL PEMERIKSAAN',
    heading: 'Hasil pemeriksaan',
    subtitle: 'Isi hasil pemeriksaan pasien yang baru saja terdaftar.'
  },
  render() {
    return `<div class="metrics-grid">
      <div class="metric-card"><div class="metric-top"><span>Pasien baru</span><i class="metric-icon mint">♙</i></div><h3 id="resultPatientBadge">BARU</h3><span class="trend">Registrasi berhasil</span></div>
      <div class="metric-card"><div class="metric-top"><span>Jenis pelayanan</span><i class="metric-icon blue">＋</i></div><h3>Poliklinik</h3><span class="trend">Konsultasi</span></div>
      <div class="metric-card"><div class="metric-top"><span>Status</span><i class="metric-icon gold">✓</i></div><h3>Menunggu</h3><span class="trend">Hasil pemeriksaan</span></div>
      <div class="metric-card"><div class="metric-top"><span>Dokter</span><i class="metric-icon peach">♛</i></div><h3>dr. Andika</h3><span class="trend">Poli Umum</span></div>
    </div>
    <section class="panel">
      <div class="panel-header">
        <div><h3>Formulir hasil pemeriksaan</h3><p>Catat hasil observasi pasien setelah registrasi</p></div>
        <button class="text-button" data-action="toast">Simpan draft</button>
      </div>
      <form class="result-form">
        <div class="form-grid">
          <label>Nama pasien<input id="resultPatientName" name="patientName" value="" required /></label>
          <label>NIK pasien<input id="resultPatientNik" name="nik" value="" required /></label>
          <label>Nomor RM<input name="recordNumber" value="RM-2408129" required /></label>
          <label>Poli tujuan<select name="clinic"><option>Poli Umum</option><option>Poli Penyakit Dalam</option><option>Poli Anak</option><option>Poli Jantung</option></select></label>
          <label>Dokter<select name="doctor"><option>dr. Andika Rahman</option><option>dr. Rina Kurnia</option><option>dr. Bambang Wijaya</option></select></label>
          <label>Keluhan utama<textarea name="complaint" rows="3" placeholder="Tuliskan keluhan utama"></textarea></label>
          <label>Diagnosa<textarea name="diagnosis" rows="3" placeholder="Tuliskan diagnosa"></textarea></label>
          <label>Tindakan<textarea name="treatment" rows="3" placeholder="Tuliskan tindakan / terapi"></textarea></label>
          <label>Status hasil<select name="resultStatus"><option>Menunggu</option><option>Rawat jalan</option><option>Rujuk</option><option>Rawat inap</option></select></label>
        </div>
        <div class="form-actions">
          <button type="button" class="outline-button" data-action="toast">Batal</button>
          <button type="button" class="primary-button" data-action="toast">Simpan hasil</button>
        </div>
      </form>
    </section>`;
  }
};
