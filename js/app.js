const STORAGE_KEY = 'pos_agen_trx_v1';
const CFG_KEY = 'pos_agen_cfg_v1';
const LIC_KEY = 'pos_agen_lic_v1';
const DEV_KEY = 'pos_agen_dev_v1';

const JENIS_KEY = "pos_agen_jenis_v1";
const DEFAULT_JENIS = ["Transfer","Tarik tunai","E Wallet","Token PLN","Pulsa","Paket Data","Aksesoris","Lainnya"];
const selectJenis = document.getElementById("jenis");
const btnAddJenis = document.getElementById("btn-add-jenis");
const getJenisList = () => {
  try {
    const raw = localStorage.getItem(JENIS_KEY);
    if (!raw) return [...DEFAULT_JENIS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return [...DEFAULT_JENIS];
    return [...new Set([...DEFAULT_JENIS, ...parsed.map((x) => String(x || "").trim()).filter(Boolean)])];
  } catch { return [...DEFAULT_JENIS]; }
};
const saveJenisList = (arr) => {
  const clean = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
  try { localStorage.setItem(JENIS_KEY, JSON.stringify(clean)); } catch {}
  return clean;
};
const renderJenisOptions = (selectedVal) => {
  if (!selectJenis) return;
  const list = getJenisList();
  selectJenis.innerHTML = list.map((j) => `<option value="${j.replace(/"/g, "&quot;")}">${j}</option>`).join("");
  if (selectedVal && list.includes(selectedVal)) selectJenis.value = selectedVal;
  else if (list.length) selectJenis.value = list[0];
};
renderJenisOptions();
if (btnAddJenis) {
  btnAddJenis.addEventListener("click", () => {
    const nama = prompt("Masukkan nama layanan baru:");
    if (!nama) return;
    const bersih = nama.trim().replace(/s+/g, " ");
    if (!bersih) return;
    const updated = saveJenisList([...getJenisList(), bersih]);
    renderJenisOptions(bersih);
    if (updated.includes(bersih) && selectJenis) selectJenis.value = bersih;
  });
}

const form = document.getElementById('trx-form');
const listEl = document.getElementById('trx-list');
const elMasuk = document.getElementById('total-masuk');
const elLaba = document.getElementById('total-laba');
const elBonAktif = document.getElementById('total-bon-aktif');
const bonWrap = document.getElementById('monitor-bon-wrap');
const bonRingkasan = document.getElementById('bon-ringkasan');
const bonListEl = document.getElementById('monitor-bon-list');
const selisihHariISO = (targetISO, baseISO) => {
  if (!targetISO) return 999;
  const a = new Date(targetISO + "T00:00:00").getTime();
  const b = new Date(baseISO + "T00:00:00").getTime();
  return Math.round((a - b) / 86400000);
};
window.lunasiBon = (id) => {
  const rows = getData();
  const idx = rows.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return;
  rows[idx].metode = "bon";
  rows[idx].statusBon = "lunas";
  rows[idx].tglLunas = (typeof getTodayISO === "function" ? getTodayISO() : toLocalISO(new Date()));
  saveData(rows);
  render();
};
window.tagihBonWA = (id) => {
  const item = getData().find((x) => String(x.id) === String(id));
  if (!item) return;
  const nama = item.tujuan || "Pelanggan";
  const msg = "Halo " + nama + ", pengingat tagihan " + (item.jenis || "transaksi") + " sebesar " + rupiah(item.jual || 0) + " jatuh tempo " + (item.jatuhTempo || "-") + ". Terima kasih.";
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).catch(() => {});
  const noMatch = String((item.tujuan || "") + " " + (item.ket || "")).match(/08\d{8,13}|628\d{8,13}/);
  if (noMatch) {
    const wa = noMatch[0].startsWith("0") ? "62" + noMatch[0].slice(1) : noMatch[0];
    window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), "_blank");
  } else {
    alert("Pesan tagihan disalin:\n" + msg);
  }
};
const renderMonitorBon = (allRows) => {
  if (!bonWrap || !bonListEl || !bonRingkasan) return;
  const todayStr = (typeof getTodayISO === "function" ? getTodayISO() : toLocalISO(new Date()));
  const aktif = (allRows || []).filter((r) => r.metode === "bon" && r.statusBon !== "lunas");
  if (!aktif.length) { bonWrap.style.display = "none"; bonListEl.innerHTML = ""; return; }
  bonWrap.style.display = "block";
  const totalPiutang = aktif.reduce((s, r) => s + Number(r.jual || 0), 0);
  bonRingkasan.textContent = aktif.length + " trx • " + rupiah(totalPiutang);
  bonListEl.innerHTML = aktif.map((r) => {
    const diff = selisihHariISO(r.jatuhTempo, todayStr);
    let badge = "<span class=\"bon-badge aman\">Sisa " + diff + " hr</span>";
    if (diff < 0) badge = "<span class=\"bon-badge lewat\">Lewat " + Math.abs(diff) + " hr</span>";
    else if (diff === 0) badge = "<span class=\"bon-badge hari-ini\">Hari Ini</span>";
    const labelPelanggan = [r.tujuan, r.jenis].filter(Boolean).join(" • ") || "Bon";
    return "<div class=\"bon-item\"><div><div><strong>" + labelPelanggan + "</strong>" + badge + "</div><small>" + rupiah(r.jual || 0) + " • Tempo: " + (r.jatuhTempo || "-") + "</small></div><div class=\"bon-aksi\"><button type=\"button\" class=\"bon-btn-lunas\" onclick=\"lunasiBon('" + r.id + "')\">Lunas</button><button type=\"button\" class=\"bon-btn-wa\" onclick=\"tagihBonWA('" + r.id + "')\">WA</button></div></div>";
  }).join("");
};
const elTrx = document.getElementById('total-trx');
const elTgl = document.getElementById('tanggal-hari');
const btnReset = document.getElementById('btn-reset');
const btnCsv = document.getElementById('btn-csv');
const btnLihatRiwayat = document.getElementById('btn-lihat-riwayat');
const riwayatTglWrap = document.getElementById('riwayat-tgl-wrap');
const tglStripBulan = document.getElementById('tgl-strip-bulan');
const tglStripList = document.getElementById('tgl-strip-list');
const btnTglHariIni = document.getElementById('btn-tgl-hari-ini');
let riwayatFilterAktif = false;
let tanggalDipilihISO = "";
const BULAN_PANJANG = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI_PENDEK = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + t;
};
const renderTglStrip = (rows) => {
  if (!riwayatTglWrap || !tglStripList || !tglStripBulan) return;
  const todayStr = (typeof getTodayISO === "function" ? getTodayISO() : toLocalISO(new Date()));
  if (!tanggalDipilihISO) tanggalDipilihISO = todayStr;
  const setTgl = new Set([todayStr, tanggalDipilihISO]);
  (rows || []).forEach((r) => { const d = normTrxDate(r); if (d) setTgl.add(d); });
  const base = new Date(tanggalDipilihISO + "T00:00:00");
  const start = new Date(base); start.setDate(base.getDate() - 10);
  const end = new Date(base); end.setDate(base.getDate() + 10);
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    setTgl.add(toLocalISO(cur));
  }
  const listSorted = Array.from(setTgl).sort();
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalDipilihISO) || [null, "2026", "11", "26"];
  tglStripBulan.textContent = (BULAN_PANJANG[Number(p[2]) - 1] || "") + " " + p[1];
  tglStripList.innerHTML = listSorted.map((iso) => {
    const dt = new Date(iso + "T00:00:00");
    const aktif = iso === tanggalDipilihISO ? " aktif" : "";
    return "<button type=\"button\" class=\"tgl-item" + aktif + "\" data-iso=\"" + iso + "\"><span class=\"tgl-bulat\">" + dt.getDate() + "</span><span class=\"tgl-hari\">" + HARI_PENDEK[dt.getDay()] + "</span></button>";
  }).join("");
  const aktifEl = tglStripList.querySelector(".tgl-item.aktif");
  if (aktifEl && typeof aktifEl.scrollIntoView === "function") {
    requestAnimationFrame(() => aktifEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
  }
  tglStripList.querySelectorAll(".tgl-item").forEach((el) => {
    el.addEventListener("click", () => {
      tanggalDipilihISO = el.dataset.iso;
      render();
    });
  });
};
const inputCari = document.getElementById('cari-trx');

const inputJual = document.getElementById('jual');
const inputModal = document.getElementById('modal');
const labaPreview = document.getElementById('laba-preview');
const inputMetode = document.getElementById('metode-bayar');
const wrapJatuhTempo = document.getElementById('wrap-jatuh-tempo');
const inputJatuhTempo = document.getElementById('jatuh-tempo');
const getPlusHariISO = (hari) => {
  const d = new Date();
  d.setDate(d.getDate() + (Number(hari) || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + t;
};
const syncMetodeUI = () => {
  const isBon = inputMetode && inputMetode.value === "bon";
  if (wrapJatuhTempo) wrapJatuhTempo.style.display = isBon ? "block" : "none";
  if (isBon && inputJatuhTempo && !inputJatuhTempo.value) {
    inputJatuhTempo.value = getPlusHariISO(3);
  }
};
if (inputMetode) {
  inputMetode.addEventListener("change", syncMetodeUI);
}

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

const normRowItem = (item, idx) => {
  const obj = (item && typeof item === "object") ? Object.assign({}, item) : {};
  if (!obj.id) obj.id = Date.now() + idx;
  const jual = Number(obj.jual ?? ((Number(obj.modal) || 0) + (Number(obj.laba) || 0))) || 0;
  const modal = Number(obj.modal) || 0;
  const laba = (obj.laba !== undefined && obj.laba !== null && obj.laba !== "") ? (Number(obj.laba) || 0) : (jual - modal);
  obj.jual = jual;
  obj.modal = modal;
  obj.laba = laba;
  obj.metode = obj.metode === "bon" ? "bon" : "tunai";
  obj.statusBon = obj.metode === "bon" ? (obj.statusBon === "lunas" ? "lunas" : "belum") : "lunas";
  if (!obj.jatuhTempo) obj.jatuhTempo = "";
  if (!obj.tglISO && typeof getTodayISO === "function") obj.tglISO = getTodayISO();
  return obj;
};

const getData = () => {
  let lsRows = null;
  let ckRows = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) lsRows = parsed;
    }
  } catch {}
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + STORAGE_KEY + "=([^;]*)"));
    if (m && m[1]) {
      const parsed = JSON.parse(decodeURIComponent(m[1]));
      if (Array.isArray(parsed)) ckRows = parsed;
    }
  } catch {}
  const chosen = (Array.isArray(lsRows) && lsRows.length) ? lsRows : ((Array.isArray(ckRows) && ckRows.length) ? ckRows : (lsRows || ckRows || []));
  const normalized = chosen.map(normRowItem);
  if ((!Array.isArray(lsRows) || !lsRows.length) && normalized.length) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  }
  return normalized;
};

const saveData = (rows) => {
  const json = JSON.stringify(rows || []);
  try { localStorage.setItem(STORAGE_KEY, json); } catch {}
  try {
    if (json.length < 3800) {
      document.cookie = STORAGE_KEY + "=" + encodeURIComponent(json) + "; max-age=315360000; path=/; SameSite=Lax";
    }
  } catch {}
};

const copyStruk = (item) => {
  const c = getCfg();
  const jual = Number(item.jual ?? ((Number(item.modal) || 0) + (Number(item.laba) || 0)));
  const lines = [
    `*${(c.nama || 'POS KONTER & AGEN').toUpperCase()}*`,
    ...(c.alamat ? [c.alamat] : []),
    '------------------------------',
    `Waktu  : ${item.jam}`,
    `Layanan: ${item.jenis}`,
    `Tujuan : ${item.tujuan || "-"}`,
    `Ket    : ${item.ket || "-"}`,
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
  renderMonitorBon(allRows);
  if (riwayatFilterAktif) renderTglStrip(allRows);
  const q = (inputCari ? inputCari.value : '').trim().toLowerCase();
  const rows = allRows.filter((item) => {
    const matchTgl = !riwayatFilterAktif || normTrxDate(item) === tanggalDipilihISO;
    if (!matchTgl) return false;
    if (!q) return true;
    return (
      String(item.jenis || '').toLowerCase().includes(q) ||
      String(item.tujuan || '').toLowerCase().includes(q) ||
      String(item.ket || '').toLowerCase().includes(q) ||
      String(item.jam || '').toLowerCase().includes(q)
    );
  });

  let totalMasuk = 0;
  let totalLabaTunai = 0;
  let totalBonAktif = 0;

  listEl.innerHTML = '';
  if (!rows.length) {
    listEl.innerHTML = `<li class="trx-item"><small>${q ? 'Transaksi tidak ditemukan.' : 'Belum ada transaksi hari ini.'}</small></li>`;
  }

  rows.forEach((item) => {
    const modal = Number(item.modal) || 0;
    const jual = Number(item.jual ?? (modal + (Number(item.laba) || 0)));
    const laba = Number(item.laba ?? (jual - modal));
    const isBonAktif = item.metode === "bon" && item.statusBon !== "lunas";
    totalMasuk += jual;
    if (isBonAktif) {
      totalBonAktif += jual;
    } else {
      totalLabaTunai += laba;
    }

    const li = document.createElement('li');
    li.className = 'trx-item';
    li.innerHTML = `
      <div class="trx-meta">
        <strong>${item.jenis}</strong>
        <small>${[item.tujuan, item.ket, item.metode === "bon" ? (item.statusBon === "lunas" ? "[BON LUNAS]" : "[BON • Tempo " + (item.jatuhTempo || "-") + "]") : ""].filter(Boolean).join(" • ")} • ${fmtJamTglPendek(item)}</small>
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
  elLaba.textContent = (totalLabaTunai < 0 ? '-' : '') + rp(Math.abs(totalLabaTunai));
  if (elBonAktif) elBonAktif.textContent = rp(totalBonAktif);
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

if (btnBackup) { btnBackup.addEventListener('click', () => {}); }

if (btnRestore) { btnRestore.addEventListener('click', () => {}); }

btnCsv.addEventListener('click', () => {
  const rows = getData();
  if (!rows.length) {
    alert('Belum ada transaksi untuk di-export.');
    return;
  }
  const header = ['Tanggal', 'Jam', 'Layanan', 'Keterangan', 'Harga Jual', 'Modal', 'Laba'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    'sep=;',
    header.map(esc).join(';'),
    ...rows.map((r) => {
      const modal = Number(r.modal) || 0;
      const jual = Number(r.jual ?? (modal + (Number(r.laba) || 0)));
      const laba = Number(r.laba ?? (jual - modal));
      const metode = r.metode === "bon" ? "bon" : "tunai";
      const statusBon = metode === "bon" ? (r.statusBon === "lunas" ? "lunas" : "belum") : "lunas";
      const jatuhTempo = metode === "bon" ? (r.jatuhTempo || "") : "";
      return [normTrxDate(r), r.jam || '', r.jenis || '', r.tujuan || '', r.ket || '', jual, modal, laba, metode, statusBon, jatuhTempo].map(esc).join(';');
    })
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-pos-agen-${getTodayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const jenis = document.getElementById('jenis').value;
  const tujuanEl = document.getElementById('tujuan');
  const tujuan = tujuanEl ? tujuanEl.value.trim() : '';
  const ket = document.getElementById('ket').value.trim();
  const jual = parseInt(inputJual.value, 10) || 0;
  const modal = parseInt(inputModal.value, 10) || 0;
  const laba = jual - modal;

  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const metode = (inputMetode && inputMetode.value === "bon") ? "bon" : "tunai";
  const statusBon = metode === "bon" ? "belum" : "lunas";
  const jatuhTempo = metode === "bon" ? ((inputJatuhTempo && inputJatuhTempo.value) || getPlusHariISO(3)) : "";
  const rows = getData();
  rows.unshift({ id: Date.now(), jenis, tujuan, ket, jual, modal, laba, jam, tglISO: getTodayISO(), metode, statusBon, jatuhTempo });
  saveData(rows);
  form.reset();
  if (inputJatuhTempo) inputJatuhTempo.value = "";
  syncMetodeUI();
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

const getTodayISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

const BULAN_PEND = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const fmtJamTglPendek = (item) => {
  const jamRaw = String((item && item.jam) || "").trim();
  const jamFmt = jamRaw ? jamRaw.replace(/:/g, ".") : "00.00";
  const iso = normTrxDate(item || {});
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return jamFmt;
  const thn2 = m[1].slice(-2);
  const bln = BULAN_PEND[Math.max(0, Math.min(11, Number(m[2]) - 1))];
  const tgl = String(Number(m[3]));
  return jamFmt + " | " + tgl + " " + bln + " " + thn2;
};
const normTrxDate = (t) => {
  if (t && /^\d{4}-\d{2}-\d{2}$/.test(t.tglISO || "")) return t.tglISO;
  return getTodayISO();
};

const filterAuditTrx = (dari, sampai) => {
  return getData().filter((t) => {
    const d = normTrxDate(t);
    if (dari && d < dari) return false;
    if (sampai && d > sampai) return false;
    return true;
  });
};

const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const initAuditUI = () => {
  const bulanEl = document.getElementById("audit-bulan");
  const dariEl = document.getElementById("audit-dari");
  const sampaiEl = document.getElementById("audit-sampai");
  const ringkasEl = document.getElementById("audit-ringkasan");
  const btnCsv = document.getElementById("btn-audit-csv");
  const btnJson = document.getElementById("btn-audit-json");
  if (!dariEl || !sampaiEl || !ringkasEl) return;

  const updateSummary = () => {
    const list = filterAuditTrx(dariEl.value, sampaiEl.value);
    const omzet = list.reduce((a, b) => a + Number(b.jual || 0), 0);
    const modal = list.reduce((a, b) => a + Number(b.modal || 0), 0);
    const laba = list.reduce((a, b) => a + Number(b.laba || 0), 0);
    ringkasEl.textContent = list.length + " trx | Modal Rp" + rp(modal) + " | Omzet Rp" + rp(omzet) + " | Laba Rp" + rp(laba);
  };

  if (bulanEl && !bulanEl.dataset.bound) {
    bulanEl.dataset.bound = "1";
    bulanEl.addEventListener("change", () => {
      if (!bulanEl.value) return;
      const [y, m] = bulanEl.value.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      dariEl.value = bulanEl.value + "-01";
      sampaiEl.value = bulanEl.value + "-" + String(lastDay).padStart(2, "0");
      updateSummary();
    });
  }

  [dariEl, sampaiEl].forEach((el) => {
    if (el && !el.dataset.bound) {
      el.dataset.bound = "1";
      el.addEventListener("change", updateSummary);
    }
  });

  if (btnCsv && !btnCsv.dataset.bound) {
    btnCsv.dataset.bound = "1";
    btnCsv.addEventListener("click", () => {
      const list = filterAuditTrx(dariEl.value, sampaiEl.value);
      const omzet = list.reduce((a, b) => a + Number(b.jual || 0), 0);
      const modal = list.reduce((a, b) => a + Number(b.modal || 0), 0);
      const laba = list.reduce((a, b) => a + Number(b.laba || 0), 0);
      const escCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const rows = [
        ["Tanggal", "Jam", "Layanan", "Keterangan", "Modal", "Harga Jual", "Laba"],
        ...list.map((t) => {
          const m = Number(t.modal) || 0;
          const j = Number(t.jual ?? (m + (Number(t.laba) || 0)));
          const l = Number(t.laba ?? (j - m));
          return [normTrxDate(t), t.jam || "", t.jenis || t.kat || "", t.tujuan || "", t.ket || "", m, j, l];
        }),
        [],
        ["REKAP AUDIT", dariEl.value || "AWAL", "s/d", sampaiEl.value || "AKHIR", modal, omzet, laba]
      ];
      const csvBody = ["sep=;", ...rows.map((r) => r.map(escCell).join(";"))].join("\r\n");
      downloadFile("\uFEFF" + csvBody, "audit-pos-" + (dariEl.value || "all") + "-to-" + (sampaiEl.value || "all") + ".csv", "text/csv;charset=utf-8;");
    });
  }

  updateSummary();
};

const syncDevIdUI = () => {
  const devId = getDevId();
  const el = document.getElementById("info-dev-id");
  if (el) el.textContent = devId;
  const btn = document.getElementById("btn-salin-id");
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(devId).then(() => alert("ID Perangkat disalin: " + devId)).catch(() => prompt("Salin ID Perangkat:", devId));
      } else {
        prompt("Salin ID Perangkat:", devId);
      }
    });
  }
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

syncDevIdUI();
initAuditUI();
applyCfg();
hitungLaba();
enforceLicense();
render();

if (btnLihatRiwayat) {
  btnLihatRiwayat.addEventListener("click", () => {
    riwayatFilterAktif = !riwayatFilterAktif;
    if (riwayatFilterAktif) tanggalDipilihISO = (typeof getTodayISO === "function" ? getTodayISO() : toLocalISO(new Date()));
    if (riwayatTglWrap) riwayatTglWrap.style.display = riwayatFilterAktif ? "block" : "none";
    btnLihatRiwayat.classList.toggle("aktif", riwayatFilterAktif);
    render();
  });
}
if (btnTglHariIni) {
  btnTglHariIni.addEventListener("click", () => {
    tanggalDipilihISO = (typeof getTodayISO === "function" ? getTodayISO() : toLocalISO(new Date()));
    render();
  });
}
