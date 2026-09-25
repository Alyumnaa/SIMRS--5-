const corePasien = window.SIMRS_CORE;
window.SIMRS_MODULES.pasien = {
  data: { title: 'Manajemen pasien', desc: 'Kelola identitas, rekam medis, dan perjalanan layanan setiap pasien secara terpadu.', owner: 'Ns. Rina Kurnia, S.Kep', icon: '♙', eyebrow: 'DATA MASTER PASIEN', heading: 'Daftar pasien', subtitle: 'Temukan dan kelola informasi pasien Nusa Medika.' },
  render() { return `<div class="metrics-grid">${corePasien.metric('Total pasien terdaftar', '24.680', '+124 bulan ini', '♙', 'mint')}${corePasien.metric('Kunjungan hari ini', '1.284', '+12,8%', '＋', 'blue')}${corePasien.metric('Pasien baru', '86', '7% dari kunjungan', '✚', 'gold')}${corePasien.metric('Menunggu verifikasi', '18', 'Perlu ditinjau', '!', 'peach')}</div><section class="panel"><div class="panel-header"><div><h3>Direktori pasien</h3><p>Data pasien terbaru di seluruh unit layanan</p></div><button class="text-button" data-action="toast">Filter & sortir ≡</button></div>${corePasien.patientTable()}</section>`; }
};
