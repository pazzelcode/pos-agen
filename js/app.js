const STORAGE_KEY = 'pos_agen_trx_v1';
const CFG_KEY = 'pos_agen_cfg_v1';
const LIC_KEY = 'pos_agen_lic_v1';
const DEV_KEY = 'pos_agen_dev_v1';

const form = document.getElementById('trx-form');
const listEl = document.getElementById('trx-list');
const elMasuk = document.getElementById('total-masuk');
const elLaba = document.getElementById('total-laba');
const elTrx = document.getElementById('total-trx');
const elTgl = document.getElementById('tanggal-hari');
const btnReset = document.getElementById('btn-reset');
const btnCsv = document.getElementById('btn-csv');
const inputCari = document.getElementById('cari-trx');

const inputJual = document.getElementById('jual');
const inputModal = document.getElementById('modal');
const labaPreview = document.getElementById('laba-preview');

const btnToggleCfg = document.getElementById('btn-toggle-cfg');
const cfgBox = document.getElementById('cfg-box');
const cfgForm = document.getElementById('cfg-form');
const cfgNama = document.getElementById('cfg-nama');
const cfgAlamat = document.getElementById('cfg-alamat');
const judulToko = document.getElementById('nama-toko-judul');
const subToko = document.getElementById('sub-toko');
const btnBackup = document.getElementById('btn-backup');
const btnRestore = document.getElementById('btn-restore');
const fileRestore = document.getElementById('file-restore');

const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

elTgl.textContent = new Date().toLocaleDateString('id-ID', {
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
});

const hitungLaba = () => {
  const jual = parseInt(inputJual.value, 10) || 0;
  const modal = parseInt(inputModal.value, 10) || 0;
  const laba = jual - modal;
  labaPreview.value = (laba < 0 ? '-' : '') + rp(Math.abs(laba));
  labaPreview.style.color = laba < 0 ? '#f87171' : '#4ade80';
  return laba;
};

inputJual.addEventListener('input', hitungLaba);
inputModal.addEventListener('input', hitungLaba);

const getCfg = () => {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)) || { nama: 'POS KONTER & AGEN', alamat: '' }; }
  catch { return { nama: 'POS KONTER & AGEN', alamat: '' }; }
};

const applyCfg = () => {
  const c = getCfg();
  judulToko.textContent = c.nama || 'POS KONTER & AGEN';
  subToko.textContent = c.alamat || '';
  cfgNama.value = c.nama || '';
  cfgAlamat.value = c.alamat || '';
};

const getData = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};

const saveData = (rows) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));

const copyStruk = (item) => {
  const c = getCfg();
  const jual = Number(item.jual ?? ((Number(item.modal) || 0) + (Number(item.laba) || 0)));
  const lines = [
    `*${(c.nama || 'POS KONTER & AGEN').toUpperCase()}*`,
    ...(c.alamat ? [c.alamat] : []),
    '------------------------------',
    `Waktu  : ${item.jam}`,
    `Layanan: ${item.jenis}`,
    `Ket    : ${item.ket}`,
    `Total  : ${rp(jual)}`,
    '------------------------------',
    'Terima kasih!'
  ];
  const teks = lines.join('\n');

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
  const allRows = getData();
  const q = (inputCari ? inputCari.value : '').trim().toLowerCase();
  const rows = q
    ? allRows.filter((item) =>
        String(item.jenis || '').toLowerCase().includes(q) ||
        String(item.ket || '').toLowerCase().includes(q) ||
        String(item.jam || '').toLowerCase().includes(q)
      )
    : allRows;

  let totalMasuk = 0;
  let totalLaba = 0;

  listEl.innerHTML = '';
  if (!rows.length) {
    listEl.innerHTML = `<li class="trx-item"><small>${q ? 'Transaksi tidak ditemukan.' : 'Belum ada transaksi hari ini.'}</small></li>`;
  }

  rows.forEach((item) => {
    const modal = Number(item.modal) || 0;
    const jual = Number(item.jual ?? (modal + (Number(item.laba) || 0)));
    const laba = Number(item.laba ?? (jual - modal));
    totalMasuk += jual;
    totalLaba += laba;

    const li = document.createElement('li');
    li.className = 'trx-item';
    li.innerHTML = `
      <div class="trx-meta">
        <strong>${item.jenis}</strong>
        <small>${item.ket} • ${item.jam}</small>
      </div>
      <div class="trx-amount">
        <span class="bayar">${rp(jual)}</span>
        <span class="untung" style="color:${laba < 0 ? '#f87171' : '#4ade80'}">${laba < 0 ? '-' : '+'}${rp(Math.abs(laba))}</span>
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">
          <button type="button" onclick="copyStruk(${item.id})" style="background:#3a86ff;color:#fff;border:none;padding:4px 8px;border-radius:5px;font-size:.7rem;cursor:pointer">Struk</button>
          <button type="button" onclick="hapusItem(${item.id})" style="background:#ef233c;color:#fff;border:none;padding:4px 8px;border-radius:5px;font-size:.7rem;cursor:pointer">Hapus</button>
        </div>
      </div>`;
    listEl.appendChild(li);
  });

  elMasuk.textContent = rp(totalMasuk);
  elLaba.textContent = (totalLaba < 0 ? '-' : '') + rp(Math.abs(totalLaba));
  elTrx.textContent = rows.length;
};

if (inputCari) inputCari.addEventListener('input', render);

window.copyStruk = (id) => {
  const found = getData().find((x) => x.id === id);
  if (found) copyStruk(found);
};
window.hapusItem = hapusItem;

btnToggleCfg.addEventListener('click', () => {
  cfgBox.style.display = cfgBox.style.display === 'none' ? 'block' : 'none';
});

cfgForm.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem(CFG_KEY, JSON.stringify({
    nama: cfgNama.value.trim() || 'POS KONTER & AGEN',
    alamat: cfgAlamat.value.trim()
  }));
  applyCfg();
  cfgBox.style.display = 'none';
  alert('Profil toko tersimpan!');
});

btnBackup.addEventListener('click', () => {
  const payload = { profil: getCfg(), transaksi: getData(), diekspor: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-pos-agen-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

btnRestore.addEventListener('click', () => fileRestore.click());

fileRestore.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const rows = Array.isArray(parsed) ? parsed : parsed.transaksi;
      if (!Array.isArray(rows)) throw new Error('Format JSON tidak sesuai');
      if (!confirm(`Pulihkan ${rows.length} transaksi dari file backup? Data saat ini akan diganti.`)) return;
      saveData(rows);
      if (parsed && !Array.isArray(parsed) && parsed.profil) {
        localStorage.setItem(CFG_KEY, JSON.stringify({
          nama: parsed.profil.nama || 'POS KONTER & AGEN',
          alamat: parsed.profil.alamat || ''
        }));
        applyCfg();
      }
      render();
      alert('Data berhasil di-restore!');
    } catch {
      alert('File backup JSON tidak valid.');
    } finally {
      fileRestore.value = '';
    }
  };
  reader.readAsText(file);
});

btnCsv.addEventListener('click', () => {
  const rows = getData();
  if (!rows.length) {
    alert('Belum ada transaksi untuk di-export.');
    return;
  }
  const header = ['Jam', 'Layanan', 'Keterangan', 'Harga Jual', 'Modal', 'Laba'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(','),
    ...rows.map((r) => {
      const modal = Number(r.modal) || 0;
      const jual = Number(r.jual ?? (modal + (Number(r.laba) || 0)));
      const laba = Number(r.laba ?? (jual - modal));
      return [r.jam, r.jenis, r.ket, jual, modal, laba].map(esc).join(',');
    })
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-pos-agen-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const jenis = document.getElementById('jenis').value;
  const ket = document.getElementById('ket').value.trim();
  const jual = parseInt(inputJual.value, 10) || 0;
  const modal = parseInt(inputModal.value, 10) || 0;
  const laba = jual - modal;

  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const rows = getData();
  rows.unshift({ id: Date.now(), jenis, ket, jual, modal, laba, jam });
  saveData(rows);
  form.reset();
  hitungLaba();
  render();
});

btnReset.addEventListener('click', () => {
  if (!confirm('Hapus semua riwayat transaksi yang tampil?')) return;
  saveData([]);
  render();
});

const setStoreVal = (key, val) => {
  try { localStorage.setItem(key, val); } catch {}
  try { document.cookie = key + "=" + encodeURIComponent(val) + "; max-age=315360000; path=/; SameSite=Lax"; } catch {}
};

const getStoreVal = (key) => {
  try {
    const ls = localStorage.getItem(key);
    if (ls) return ls;
  } catch {}
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + key + "=([^;]*)"));
    if (m && m[1]) {
      const v = decodeURIComponent(m[1]);
      try { localStorage.setItem(key, v); } catch {}
      return v;
    }
  } catch {}
  return "";
};

const getDevId = () => {
  let id = getStoreVal(DEV_KEY);
  if (!id) {
    id = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  setStoreVal(DEV_KEY, id);
  return id;
};

const makeKeyForDev = (devId) => {
  let hash = 2166136261;
  const seed = String(devId || "").trim().toUpperCase() + "|POS-AGEN-PRO-2026";
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "ACT-" + (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
};

const enforceLicense = () => {
  const devId = getDevId();
  const expected = makeKeyForDev(devId);
  const saved = getStoreVal(LIC_KEY).trim().toUpperCase();
  if (saved === expected) {
    setStoreVal(LIC_KEY, expected);
    return;
  }

  const input = prompt(
    "Aplikasi POS Konter & Agen belum teraktivasi.\n\nID Perangkat Anda: " + devId + "\nKirim ID Perangkat ini ke penjual untuk mendapatkan Kode Aktivasi:\n(Masukkan Kode Aktivasi di bawah)"
  );

  if (input && input.trim().toUpperCase() === expected) {
    setStoreVal(LIC_KEY, expected);
    alert("Aktivasi berhasil! Selamat menggunakan POS Konter & Agen.");
  } else {
    alert("Kode aktivasi belum valid.\nID Perangkat Anda: " + devId);
    document.querySelector("main").style.opacity = "0.25";
    document.querySelector("main").style.pointerEvents = "none";
  }
};

applyCfg();
hitungLaba();
render();
enforceLicense();
