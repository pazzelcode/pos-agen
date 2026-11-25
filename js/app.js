const STORAGE_KEY = 'pos_agen_trx_v1';
const form = document.getElementById('trx-form');
const listEl = document.getElementById('trx-list');
const elMasuk = document.getElementById('total-masuk');
const elLaba = document.getElementById('total-laba');
const elTrx = document.getElementById('total-trx');
const elTgl = document.getElementById('tanggal-hari');
const btnReset = document.getElementById('btn-reset');

const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

elTgl.textContent = new Date().toLocaleDateString('id-ID', {
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
});

const getData = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};

const saveData = (rows) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));

const copyStruk = (item) => {
  const bayar = item.modal + item.laba;
  const teks = [
    '*STRUK TRANSAKSI*',
    `Waktu : ${item.jam}`,
    `Layanan: ${item.jenis}`,
    `Ket    : ${item.ket}`,
    `Total  : ${rp(bayar)}`,
    'Terima kasih!'
  ].join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(teks).then(() => alert('Struk berhasil disalin!')).catch(() => prompt('Salin struk:', teks));
  } else {
    prompt('Salin struk:', teks);
  }
};

const hapusItem = (id) => {
  if (!confirm('Hapus transaksi ini?')) return;
  saveData(getData().filter((x) => x.id !== id));
  render();
};

const render = () => {
  const rows = getData();
  let totalMasuk = 0;
  let totalLaba = 0;

  listEl.innerHTML = '';
  if (!rows.length) {
    listEl.innerHTML = '<li class="trx-item"><small>Belum ada transaksi hari ini.</small></li>';
  }

  rows.forEach((item) => {
    const bayar = item.modal + item.laba;
    totalMasuk += bayar;
    totalLaba += item.laba;

    const li = document.createElement('li');
    li.className = 'trx-item';
    li.innerHTML = `
      <div class="trx-meta">
        <strong>${item.jenis}</strong>
        <small>${item.ket} • ${item.jam}</small>
      </div>
      <div class="trx-amount">
        <span class="bayar">${rp(bayar)}</span>
        <span class="untung">+${rp(item.laba)}</span>
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">
          <button type="button" onclick="copyStruk(${item.id})" style="background:#3a86ff;color:#fff;border:none;padding:4px 8px;border-radius:5px;font-size:.7rem;cursor:pointer">Struk</button>
          <button type="button" onclick="hapusItem(${item.id})" style="background:#ef233c;color:#fff;border:none;padding:4px 8px;border-radius:5px;font-size:.7rem;cursor:pointer">Hapus</button>
        </div>
      </div>`;
    listEl.appendChild(li);
  });

  elMasuk.textContent = rp(totalMasuk);
  elLaba.textContent = rp(totalLaba);
  elTrx.textContent = rows.length;
};

window.copyStruk = (id) => {
  const found = getData().find((x) => x.id === id);
  if (found) copyStruk(found);
};
window.hapusItem = hapusItem;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const jenis = document.getElementById('jenis').value;
  const ket = document.getElementById('ket').value.trim();
  const modal = parseInt(document.getElementById('modal').value, 10) || 0;
  const laba = parseInt(document.getElementById('laba').value, 10) || 0;

  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const rows = getData();
  rows.unshift({ id: Date.now(), jenis, ket, modal, laba, jam });
  saveData(rows);
  form.reset();
  render();
});

btnReset.addEventListener('click', () => {
  if (!confirm('Hapus semua riwayat transaksi yang tampil?')) return;
  saveData([]);
  render();
});

render();
