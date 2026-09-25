window.SIMRS_MODULES = {};
window.SIMRS_CORE = {
  getDefaultPatients() {
    return [
      { name: 'Siti Aminah', record: 'RM-2408128', unit: 'Poli Penyakit Dalam', time: '08:10', initials: 'SA', color: 'orange', status: 'Menunggu' },
      { name: 'Bambang Wijaya', record: 'RM-2408127', unit: 'Poli Jantung', time: '08:05', initials: 'BW', color: 'blue', status: 'Selesai' },
      { name: 'Maya Lestari', record: 'RM-2408126', unit: 'Poli Anak', time: '07:52', initials: 'ML', color: 'purple', status: 'Dalam pemeriksaan' },
      { name: 'Rudi Hermawan', record: 'RM-2408125', unit: 'IGD', time: '07:41', initials: 'RH', color: 'green', status: 'Dirawat' }
    ];
  },
  getPatients() {
    try {
      const patients = JSON.parse(localStorage.getItem('simrsPatients') || '[]');
      if (!Array.isArray(patients) || patients.length === 0) {
        localStorage.setItem('simrsPatients', JSON.stringify(this.getDefaultPatients()));
        return this.getDefaultPatients();
      }
      return patients;
    } catch (error) {
      return this.getDefaultPatients();
    }
  },
  savePatients(patients) {
    localStorage.setItem('simrsPatients', JSON.stringify(patients));
  },
  addPatient(patient) {
    const list = this.getPatients();
    list.unshift(patient);
    this.savePatients(list);
    return list;
  },
  metric(label, value, trend, icon, color) {
    return `<div class="metric-card"><div class="metric-top"><span>${label}</span><i class="metric-icon ${color}">${icon}</i></div><h3>${value}</h3><span class="trend">${trend}</span></div>`;
  },
  patientTable(query = '') {
    const patients = this.getPatients();
    const normalized = String(query || '').trim().toLowerCase();
    const filtered = patients.filter(patient => {
      if (!normalized) return true;
      const detail = `${patient.name || ''} ${patient.record || ''} ${patient.unit || patient.clinic || ''} ${patient.phone || ''} ${patient.birth || ''} ${patient.gender || ''} ${patient.nik || ''}`.toLowerCase();
      return detail.includes(normalized);
    });

    if (!filtered.length) {
      return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pasien</th><th>Poli / unit</th><th>Jam</th><th>Status</th><th>Aksi</th></tr></thead><tbody><tr><td colspan="5"><span class='empty-search'>Pasien tidak ditemukan.</span></td></tr></tbody></table></div>`;
    }

    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pasien</th><th>Poli / unit</th><th>Jam</th><th>Status</th><th>SATUSEHAT</th><th>Aksi</th></tr></thead><tbody>${filtered.map(patient => `<tr><td><div class="patient-cell"><div class="avatar ${patient.color || 'blue'}">${patient.initials || patient.name.slice(0, 2).toUpperCase()}</div><div><strong>${patient.name}</strong><small>${patient.record || patient.rm || 'RM-000000'} · NIK ${patient.nik || '-'}</small></div></div></td><td>${patient.unit || patient.clinic || 'Poli Umum'}</td><td>${patient.time || '00:00'}</td><td><span class="status ${patient.status === 'Selesai' ? 'green' : patient.status === 'Dirawat' ? 'blue' : patient.status === 'Menunggu' ? 'orange' : patient.status === 'Dalam pemeriksaan' ? 'red' : 'orange'}">${patient.status || 'Menunggu'}</span></td><td><span class="status ${patient.satusehatStatus === 'success' ? 'green' : patient.satusehatStatus === 'pending' ? 'orange' : 'blue'}">${patient.satusehatStatus === 'success' ? `Tersimpan${patient.satusehatId ? ` (${patient.satusehatId})` : ''}` : patient.satusehatStatus === 'pending' ? 'Pending' : 'Belum dikirim'}</span></td><td><button class="edit-patient-button" data-action="edit-patient" data-record="${patient.record || patient.name}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
  },
  simpleModule(title, desc, metrics, rows) {
    return `<div class="metrics-grid">${[0, 2, 4].map(index => this.metric(metrics[index], metrics[index + 1], index === 0 ? 'Diperbarui beberapa saat lalu' : 'Data hari ini', index === 0 ? '◉' : index === 2 ? '◈' : '＋', index === 0 ? 'mint' : index === 2 ? 'gold' : 'blue')).join('')}</div><section class="panel"><div class="panel-header"><div><h3>${title}</h3><p>${desc}</p></div><button class="text-button" data-action="toast">Export CSV ⇩</button></div><div class="table-wrap"><table class="data-table module-table"><thead><tr><th>Unit / kategori</th><th>Volume</th><th>Keterangan</th><th>Status</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td><span class="status ${row[3].includes('Tersedia') || row[3].includes('Terverifikasi') || row[3].includes('Selesai') ? 'green' : 'orange'}">${row[3]}</span></td></tr>`).join('')}</tbody></table></div></section>`;
  }
};
