const TRX_KEY = "pos_agen_trx_v1";
const rp = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const toISO = (d) => {
  const x = d instanceof Date ? d : new Date();
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
};
const plusHari = (hari) => {
  const d = new Date();
  d.setDate(d.getDate() + (Number(hari) || 0));
  return toISO(d);
};
const selisihHari = (tempoISO, todayISO) => {
  if (!tempoISO) return 999;
  const a = new Date(tempoISO + "T00:00:00").getTime();
  const b = new Date(todayISO + "T00:00:00").getTime();
  return Math.round((a - b) / 86400000);
};
const bacaTrx = () => {
  try {
    const raw = localStorage.getItem(TRX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
};
const simpanTrx = (rows) => {
  localStorage.setItem(TRX_KEY, JSON.stringify(rows));
};

let statusFilter = "belum";
const updBonLaba = () => {
  const j = Number((document.getElementById("bon-jual") || {}).value) || 0;
  const m = Number((document.getElementById("bon-modal") || {}).value) || 0;
  const el = document.getElementById("bon-laba-preview");
  if (el) {
    const lb = j - m;
    el.textContent = (lb < 0 ? "- " : "") + rp(Math.abs(lb));
    el.style.color = lb < 0 ? "#f87171" : "#34d399";
  }
};
["bon-jual", "bon-modal"].forEach((id) => {
  const inp = document.getElementById(id);
  if (inp) inp.addEventListener("input", updBonLaba);
});
window.aksiBatalLunas = (id) => {
  const rows = bacaTrx().map((r) => String(r.id) === String(id) ? Object.assign({}, r, { statusBon: "belum_lunas", tglLunas: "" }) : r);
  simpanTrx(rows);
  updBonLaba();
  renderHalamanBon();
};

const salinTeksAman = (teks) => {
  if (!teks) return;
  const fallbackCopy = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = teks;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, teks.length);
      const ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      alert(ok ? "Rekap bon disalin." : teks);
    } catch (e) {
      alert(teks);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(teks).then(() => alert("Rekap bon disalin.")).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
};

window.aksiSalinRekapBon = () => {
  salinTeksAman(window._rekapBonTeks || "");
};
window.aksiHapusBon = (id) => {
  if (!confirm("Hapus catatan bon ini?")) return;
  const rows = bacaTrx().filter((r) => String(r.id) !== String(id));
  simpanTrx(rows);
  renderHalamanBon();
};
const inputTempo = document.getElementById("bon-tempo");
if (inputTempo) inputTempo.value = plusHari(3);

if (typeof document.querySelectorAll === "function") {
  Array.from(document.querySelectorAll(".bon-tempo-cepat button")).forEach((b) => {
    b.addEventListener("click", () => {
      if (inputTempo) inputTempo.value = plusHari(Number(b.dataset.plus || 3));
    });
  });
  Array.from(document.querySelectorAll(".bon-chip-btn")).forEach((b) => {
    b.addEventListener("click", () => {
      statusFilter = b.dataset.st || "belum";
      Array.from(document.querySelectorAll(".bon-chip-btn")).forEach((x) => x.classList.toggle("aktif", x === b));
      renderHalamanBon();
    });
  });
}

window.aksiLunasiBon = (id) => {
  const rows = bacaTrx().map((r) => String(r.id) === String(id) ? Object.assign({}, r, { statusBon: "lunas", tglLunas: toISO(new Date()) }) : r);
  simpanTrx(rows);
  renderHalamanBon();
};
window.aksiTundaTempo = (id, hari) => {
  const rows = bacaTrx().map((r) => {
    if (String(r.id) !== String(id)) return r;
    const base = r.jatuhTempo ? new Date(r.jatuhTempo + "T00:00:00") : new Date();
    base.setDate(base.getDate() + (Number(hari) || 3));
    return Object.assign({}, r, { jatuhTempo: toISO(base) });
  });
  simpanTrx(rows);
  renderHalamanBon();
};
window.aksiTagihWA = (id) => {
  const item = bacaTrx().find((r) => String(r.id) === String(id));
  if (!item) return;
  const nama = item.tujuan || "Pelanggan";
  const pesan = "Halo " + nama + ", mengingatkan tagihan " + (item.jenis || "bon") + " (" + (item.ket || "-") + ") sebesar " + rp(item.jual || 0) + " jatuh tempo " + (item.jatuhTempo || "-") + ". Terima kasih.";
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pesan).catch(() => {});
  const gabung = String(item.waPelanggan || "") + " " + String(item.tujuan || "") + " " + String(item.ket || "");
  const match = gabung.match(/08d{8,13}|628d{8,13}/);
  if (match) {
    const wa = match[0].startsWith("0") ? "62" + match[0].slice(1) : match[0];
    window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(pesan), "_blank");
  } else {
    alert("Pesan tagihan disalin:\n" + pesan);
  }
};

const formBon = document.getElementById("form-bon-baru");
if (formBon) {
  formBon.addEventListener("submit", (e) => {
    e.preventDefault();
    const jual = Number(document.getElementById("bon-jual").value) || 0;
    const modal = Number(document.getElementById("bon-modal").value) || 0;
    const now = new Date();
    const item = {
      id: Date.now(),
      tanggal: toISO(now),
      jam: String(now.getHours()).padStart(2, "0") + "." + String(now.getMinutes()).padStart(2, "0"),
      jenis: (document.getElementById("bon-jenis").value || "Bon").trim(),
      tujuan: (document.getElementById("bon-nama").value || "").trim(),
      waPelanggan: (document.getElementById("bon-wa").value || "").trim(),
      ket: (document.getElementById("bon-ket").value || "").trim(),
      jual: jual,
      modal: modal,
      laba: jual - modal,
      metode: "bon",
      statusBon: "belum_lunas",
      jatuhTempo: (inputTempo && inputTempo.value) || plusHari(3)
    };
    const rows = bacaTrx();
    rows.unshift(item);
    simpanTrx(rows);
    formBon.reset();
    updBonLaba();
    if (inputTempo) inputTempo.value = plusHari(3);
    renderHalamanBon();
  });
}

const cariBon = document.getElementById("bon-cari");
if (cariBon) cariBon.addEventListener("input", renderHalamanBon);

function renderHalamanBon() {
  const listEl = document.getElementById("bon-halaman-list");
  if (!listEl) return;
  const todayStr = toISO(new Date());
  const semuaBon = bacaTrx().filter((r) => r.metode === "bon");

  let aktifNominal = 0;
  let lunasNominal = 0;
  let mendesakCount = 0;
  semuaBon.forEach((r) => {
    const nom = Number(r.jual) || 0;
    if (r.statusBon === "lunas") {
      lunasNominal += nom;
    } else {
      aktifNominal += nom;
      const d = selisihHari(r.jatuhTempo, todayStr);
      if (d <= 0) mendesakCount += 1;
    }
  });

    const rekapEl = document.getElementById("bon-rekap-pelanggan");
  if (rekapEl) {
    const mapPel = new Map();
    semuaBon.filter((r) => r.statusBon !== "lunas").forEach((r) => {
      const nama = (r.tujuan || "Pelanggan").trim() || "Pelanggan";
      const waRaw = String(r.waPelanggan || "").trim();
          const cur = mapPel.get(nama) || { nama, wa: waRaw, cnt: 0, total: 0, tempo: r.jatuhTempo || "" };
          if (!cur.wa && waRaw) cur.wa = waRaw;
          cur.cnt += 1;
          cur.total += Number(r.jual) || 0;
          if (r.jatuhTempo && (!cur.tempo || r.jatuhTempo < cur.tempo)) cur.tempo = r.jatuhTempo;
          mapPel.set(nama, cur);
    });
    const daftarPel = Array.from(mapPel.values()).sort((a, b) => b.total - a.total);
    window._rekapBonTeks = daftarPel.length
      ? "Rekap Bon Aktif per Pelanggan:" + "\n" + daftarPel.map((p) => "- " + p.nama + (p.wa ? " (WA: " + p.wa + ")" : "") + " [" + p.cnt + " nota]: " + rp(p.total) + (p.tempo ? " • Tempo: " + p.tempo : "")).join("\n")
      : "";
    rekapEl.innerHTML = daftarPel.length
      ? "<div style=\"padding:8px 10px;border-radius:8px;background:rgba(15,23,42,.7);border:1px solid rgba(148,163,184,.22);font-size:.75rem;line-height:1.5\"><div style=\"display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px\"><strong>Rekap Bon Aktif per Pelanggan:</strong><button type=\"button\" class=\"bon-btn-tunda\" onclick=\"aksiSalinRekapBon()\">Salin Rekap Bon</button></div>" + daftarPel.map((p) => p.nama + (p.wa ? " <span style=\"color:#38bdf8\">(WA: " + p.wa + ")</span>" : "") + " (" + p.cnt + " nota): <strong>" + rp(p.total) + "</strong>" + (p.tempo ? " • Tempo: " + p.tempo : "")).join("<br>") + "</div>"
      : "";
  }
const elAktif = document.getElementById("bon-stat-aktif");
  const elMendesak = document.getElementById("bon-stat-mendesak");
  const elLunas = document.getElementById("bon-stat-lunas");
  if (elAktif) elAktif.textContent = rp(aktifNominal);
  if (elMendesak) elMendesak.textContent = mendesakCount + " pelanggan";
  if (elLunas) elLunas.textContent = rp(lunasNominal);

  const q = (cariBon ? cariBon.value : "").trim().toLowerCase();
  const filtered = semuaBon.filter((r) => {
    const isLunas = r.statusBon === "lunas";
    const diff = selisihHari(r.jatuhTempo, todayStr);
    if (statusFilter === "belum" && isLunas) return false;
    if (statusFilter === "lunas" && !isLunas) return false;
    if (statusFilter === "lewat" && (isLunas || diff >= 0)) return false;
    if (statusFilter === "hari_ini" && (isLunas || diff !== 0)) return false;
    if (!q) return true;
    return [r.tujuan, r.jenis, r.ket, r.waPelanggan, r.jatuhTempo].some((v) => String(v || "").toLowerCase().includes(q));
  });

  filtered.sort((a, b) => {
    const aLunas = a.statusBon === "lunas" ? 1 : 0;
    const bLunas = b.statusBon === "lunas" ? 1 : 0;
    if (aLunas !== bLunas) return aLunas - bLunas;
    return selisihHari(a.jatuhTempo, todayStr) - selisihHari(b.jatuhTempo, todayStr);
  });
  if (!filtered.length) {
    listEl.innerHTML = "<small style=\"color:#94a3b8\">Tidak ada data bon pada filter ini.</small>";
    return;
  }

  listEl.innerHTML = filtered.map((r) => {
    const isLunas = r.statusBon === "lunas";
    const diff = selisihHari(r.jatuhTempo, todayStr);
    let badge = "<span class=\"bon-badge aman\">Sisa " + diff + " hr</span>";
    if (isLunas) badge = "<span class=\"bon-badge aman\">Lunas</span>";
    else if (diff < 0) badge = "<span class=\"bon-badge lewat\">Lewat " + Math.abs(diff) + " hr</span>";
    else if (diff === 0) badge = "<span class=\"bon-badge hari-ini\">Hari Ini</span>";

    const judul = [r.tujuan || "Pelanggan", r.jenis].filter(Boolean).join(" • ");
    const sub = [r.ket, "Tempo: " + (r.jatuhTempo || "-")].filter(Boolean).join(" • ");
    const aksi = isLunas
      ? "<button type=\"button\" class=\"bon-btn-tunda\" onclick=\"aksiBatalLunas('" + r.id + "')\">Batal Lunas</button><button type=\"button\" class=\"bon-btn-tunda\" onclick=\"aksiHapusBon('" + r.id + "')\">Hapus</button>"
      : "<button type=\"button\" class=\"bon-btn-tunda\" onclick=\"aksiTundaTempo('" + r.id + "', 3)\">+3 Hr</button><button type=\"button\" class=\"bon-btn-lunas\" onclick=\"aksiLunasiBon('" + r.id + "')\">Lunas</button><button type=\"button\" class=\"bon-btn-wa\" onclick=\"aksiTagihWA('" + r.id + "')\">WA</button><button type=\"button\" class=\"bon-btn-tunda\" onclick=\"aksiHapusBon('" + r.id + "')\">Hapus</button>";

    return "<div class=\"bon-item\"><div><div><strong>" + judul + "</strong>" + badge + "</div><small>" + rp(r.jual || 0) + " • " + sub + "</small></div><div class=\"bon-aksi\">" + aksi + "</div></div>";
  }).join("");
}

renderHalamanBon();
