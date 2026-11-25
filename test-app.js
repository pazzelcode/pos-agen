const fs = require("fs");
const vm = require("vm");

let errors = 0;
const ok = (msg) => console.log("[OK]  " + msg);
const fail = (msg) => { console.error("[ERR] " + msg); errors++; };

for (const file of ["sw.js", "keygen.js"]) {
  try {
    new vm.Script(fs.readFileSync(file, "utf8"), { filename: file });
    ok("Sintaks JS valid: " + file);
  } catch (e) {
    fail("Sintaks JS error di " + file + ": " + e.message);
  }
}

const html = fs.readFileSync("index.html", "utf8");
const requiredIds = [
  "trx-form", "jenis", "ket", "jual", "modal", "laba-preview",
  "cari-trx", "trx-list", "total-trx", "info-dev-id", "btn-salin-id",
  "audit-box", "audit-bulan", "audit-dari", "audit-sampai",
  "btn-audit-csv", "btn-csv"
];
for (const id of requiredIds) {
  if (html.includes(`id="${id}"`)) ok("ID HTML ditemukan: #" + id);
  else fail("ID HTML hilang: #" + id);
}

try {
  const appSrc = fs.readFileSync("js/app.js", "utf8");
  new vm.Script(appSrc, { filename: "js/app.js" });
  ok("Sintaks JS valid: js/app.js");

  const memStorage = {};
  const makeEl = (id) => ({
    id, value: "", textContent: "", innerHTML: "", dataset: {},
    style: {}, classList: { add(){}, remove(){}, toggle(){} },
    addEventListener(){}, querySelector(){ return makeEl(""); }
  });
  const elements = {};
  class MockFileReader {
    readAsText() { if (this.onload) this.onload(); }
  }

  const sandbox = {
    console, Math, Date, JSON, RegExp, Array, String, Number,
    encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout,
    URL, Blob, FileReader: MockFileReader,
    localStorage: {
      getItem: (k) => (k in memStorage ? memStorage[k] : null),
      setItem: (k, v) => { memStorage[k] = String(v); },
      removeItem: (k) => { delete memStorage[k]; }
    },
    document: {
      cookie: "",
      getElementById: (id) => {
        if (!elements[id]) elements[id] = makeEl(id);
        return elements[id];
      },
      createElement: () => makeEl("dynamic"),
      querySelector: () => makeEl("main")
    },
    window: { addEventListener(){}, navigator: { serviceWorker: { register: () => Promise.resolve() } } },
    navigator: { clipboard: null, serviceWorker: { register: () => Promise.resolve() } },
    alert: (m) => console.log("      [ALERT]: " + String(m).split("\n")[0]),
    confirm: () => true,
    prompt: () => "ACT-TEST01"
  };

  vm.createContext(sandbox);
  const exported = vm.runInContext(appSrc + "\n({ saveData, getData, filterAuditTrx, getDevId, makeKeyForDev });", sandbox, { filename: "js/app.js" });
  Object.assign(sandbox, exported);
  ok("Eksekusi awal js/app.js berjalan tanpa error");

  sandbox.saveData([
    { id: 1, jenis: "Pulsa & Data", ket: "081234567890", jual: 22000, modal: 20000, laba: 2000, jam: "10:00", tglISO: "2026-09-05" },
    { id: 2, jenis: "E-Wallet & Token", ket: "DANA 50rb", jual: 52000, modal: 50000, laba: 2000, jam: "11:15", tglISO: "2026-10-12" }
  ]);
  const loaded = sandbox.getData();
  if (loaded.length === 2 && loaded[0].tglISO === "2026-09-05") {
    ok("Simpan & baca ulang transaksi (getData/saveData) sukses");
  } else {
    fail("Simpan & baca ulang transaksi gagal");
  }

  const sept = sandbox.filterAuditTrx("2026-09-01", "2026-09-30");
  if (sept.length === 1 && sept[0].id === 1) {
    ok("Filter audit rentang tanggal bekerja akurat (" + sept.length + " trx)");
  } else {
    fail("Filter audit rentang tanggal tidak sesuai");
  }

  const dev1 = sandbox.getDevId();
  const dev2 = sandbox.getDevId();
  const key1 = sandbox.makeKeyForDev(dev1);
  const key2 = sandbox.makeKeyForDev(dev2);
  if (dev1 && dev1 === dev2 && key1 === key2 && key1.startsWith("ACT-")) {
    ok("Device ID (" + dev1 + ") & Kode Aktivasi (" + key1 + ") konsisten");
  } else {
    fail("Device ID atau Kode Aktivasi tidak konsisten");
  }
} catch (e) {
  fail("Runtime error saat simulasi js/app.js: " + e.message);
}

console.log("\n=== HASIL TEST: " + errors + " ERROR ===");
process.exit(errors ? 1 : 0);
