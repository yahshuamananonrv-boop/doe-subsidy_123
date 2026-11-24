/* DOE Subsidy reconciliation engine — pure functions, no DOM.
   Works in the browser (window.Recon) and in Node tests (globalThis.Recon). */
(function (root) {
  "use strict";

  /* ======================= Field definitions ======================= */
  const SITE_FIELDS = [
    { key: "date", label: "Transaction Date", req: true, syn: ["date", "transaction date", "trans date", "txn date", "business date"] },
    { key: "time", label: "Transaction Time", syn: ["time", "transaction time", "trans time", "txn time"] },
    { key: "invoice", label: "Invoice / Transaction Ref No.", req: true, syn: ["invoice number", "invoice no", "invoice", "sales invoice", "pos sales invoice no", "transaction reference number", "transaction ref", "or number", "receipt no"] },
    { key: "subsidy", label: "Subsidy Amount (₱)", req: true, syn: ["mop amount", "subsidy amount", "total subsidy amount", "subsidy", "discount amount", "voucher amount", "computed discount"] },
    { key: "sale", label: "Pump / Sale Amount (₱)", syn: ["product 1 value", "pump amount", "total transaction amount", "gross amount", "sale amount", "amount"] },
    { key: "liters", label: "Liters", syn: ["liters", "litres", "liters dispensed", "volume", "quantity", "qty", "product 1 quantity", "product 1 volume"] },
    { key: "product", label: "Fuel Product", syn: ["product 1 name", "fuel product", "product name", "product", "product 1 code"] },
    { key: "pos", label: "POS / Pump No.", syn: ["pos", "pos number", "pump", "pump number", "pump no"] },
    { key: "mop", label: "MOP Name (filter)", syn: ["mop name", "mode of payment", "payment type", "mop"] },
    { key: "refCode", label: "Reference / Voucher Code (filter)", syn: ["reference code", "voucher number", "voucher no", "voucher code", "reference"] },
    { key: "txnType", label: "Transaction Type", syn: ["transaction type", "trans type", "type"] },
    { key: "price", label: "Regular Price per Liter", syn: ["price", "unit price", "regular selling price per liter", "price per liter"] },
    { key: "beneficiary", label: "Customer / Beneficiary Ref", syn: ["customer", "beneficiary", "plate number", "plate no", "customer reference", "beneficiary reference"] },
    { key: "station", label: "Site / Station", syn: ["site number", "site no", "station", "station code", "site", "site name"], meta: ["site number", "site no", "station code", "site name"] }
  ];
  const LB_FIELDS = [
    { key: "date", label: "Transaction Date", req: true, syn: ["transaction date", "date", "trans date", "txn date"] },
    { key: "time", label: "Transaction Time", syn: ["transaction time", "time", "trans time"] },
    { key: "invoice", label: "POS Sales Invoice No.", req: true, syn: ["pos sales invoice no", "pos sales invoice", "sales invoice no", "invoice number", "invoice no", "invoice"] },
    { key: "lbRef", label: "LandBank Reference No.", syn: ["lbp reference no", "landbank reference number", "lbp reference", "reference no", "reference number", "lbp ref"] },
    { key: "subsidy", label: "Subsidy / Discount (₱)", req: true, syn: ["computed discount", "subsidy amount", "discount", "subsidy", "discount amount"] },
    { key: "liters", label: "Liters Dispensed", syn: ["liters dispensed", "liters", "litres", "volume", "quantity"] },
    { key: "sale", label: "Pump Amount (₱)", syn: ["pump amount", "gross amount", "sale amount", "transaction amount"] },
    { key: "amountPaid", label: "Amount Paid by Customer", syn: ["amount paid", "customer payment", "net amount"] },
    { key: "remaining", label: "Remaining Subsidy", syn: ["remaining subsidy", "remaining balance", "balance"] },
    { key: "plate", label: "Plate No. / Beneficiary", syn: ["plate number", "plate no", "plate", "beneficiary", "account number"] },
    { key: "station", label: "Station Code / Merchant ID", syn: ["station code", "merchant id", "site code", "station", "site id"] },
    { key: "product", label: "Fuel Product", syn: ["fuel product", "product", "fuel type"] },
    { key: "voucher", label: "Voucher Number", syn: ["voucher number", "voucher no", "voucher"] },
    { key: "settlementDate", label: "Settlement Date", syn: ["settlement date", "settled date", "credit date", "value date"] },
    { key: "reimbursement", label: "Reimbursement Amount", syn: ["reimbursement amount", "reimbursed amount", "amount reimbursed", "settlement amount"] },
    { key: "status", label: "Transaction Status", syn: ["transaction status", "status"] },
    { key: "lbRemarks", label: "Remarks", syn: ["remarks", "remark", "notes"] }
  ];
  const FIELDS = { site: SITE_FIELDS, lb: LB_FIELDS };

  const STATUS = {
    MATCHED: "MATCHED", SITE_ONLY: "SITE REPORT ONLY", LB_ONLY: "LANDBANK REPORT ONLY",
    AMOUNT: "AMOUNT VARIANCE", LITER: "LITER VARIANCE", DATE: "DATE MISMATCH",
    DUP: "DUPLICATE TRANSACTION", VERIFY: "FOR VERIFICATION"
  };
  const STATUS_ORDER = [STATUS.MATCHED, STATUS.SITE_ONLY, STATUS.LB_ONLY, STATUS.AMOUNT, STATUS.LITER, STATUS.DATE, STATUS.DUP, STATUS.VERIFY];

  const DEFAULT_SETTINGS = {
    rates: [{ rate: 12, effective: "2000-01-01", by: "System default", reason: "Standard DOE subsidy rate", ts: null }],
    amountTol: 0.01,          // ₱ per transaction
    literTol: 0.01,           // liters per transaction
    timeWindowMin: 10,        // ± minutes after clock-offset adjustment (Level 2/3)
    offsetMode: "auto",       // auto | manual
    offsetMin: 10,            // LandBank clock minus Site POS clock, minutes
    dateTolDays: 0,           // allowed calendar-day difference before DATE MISMATCH
    autoAcceptL3: false,      // Level 3 (amount+time only) unique matches: auto-accept or suggest
    dateOrder: "MDY",         // for ambiguous 01/02/2026 style dates
    siteFilters: { mop: ["Other Vouchers"], refCode: ["DOE12"] },
    stations: []              // [{code, siteNumber, name}]
  };

  /* ======================= Parsing helpers ======================= */
  const nh = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

  function isBlank(v) { return v == null || (typeof v === "string" && v.trim() === ""); }

  function parseNum(v) {
    if (isBlank(v)) return null;
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    let s = String(v).trim().replace(/[₱,\s]|PHP|Php/g, "");
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }
    if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return NaN;
    const n = parseFloat(s); return neg ? -n : n;
  }

  function serialToParts(n) {
    const ms = Math.round((n - 25569) * 86400000);
    const d = new Date(ms);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() };
  }

  function parseTimeStr(s) {
    const m = String(s).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp][Mm])?$/);
    if (!m) return null;
    let h = +m[1]; const mi = +m[2], se = +(m[3] || 0);
    if (m[4]) { const pm = /p/i.test(m[4]); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    if (h > 23 || mi > 59 || se > 59) return null;
    return pad(h) + ":" + pad(mi) + ":" + pad(se);
  }

  /** returns {date:'YYYY-MM-DD', time:'HH:MM:SS'|null} or null */
  function parseDateTime(v, order) {
    if (isBlank(v)) return null;
    if (v instanceof Date) return { date: v.getFullYear() + "-" + pad(v.getMonth() + 1) + "-" + pad(v.getDate()), time: pad(v.getHours()) + ":" + pad(v.getMinutes()) + ":" + pad(v.getSeconds()) };
    if (typeof v === "number") {
      if (v > 20000 && v < 80000) { const p = serialToParts(v); return { date: p.y + "-" + pad(p.m) + "-" + pad(p.d), time: (v % 1) ? pad(p.h) + ":" + pad(p.mi) + ":" + pad(p.s) : null }; }
      if (v >= 19000101 && v <= 21001231) { const s = String(v); return { date: s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8), time: null }; }
      return null;
    }
    let s = String(v).trim();
    let time = null;
    const tm = s.match(/[ T](\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:[AaPp][Mm])?)\s*$/);
    if (tm) { time = parseTimeStr(tm[1]); s = s.slice(0, tm.index).trim(); }
    let y, m, d, x;
    if ((x = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) { y = +x[1]; m = +x[2]; d = +x[3]; }
    else if ((x = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
      y = +x[3]; if (y < 100) y += 2000;
      let a = +x[1], b = +x[2];
      if (a > 12) { d = a; m = b; } else if (b > 12) { m = a; d = b; } else if (order === "DMY") { d = a; m = b; } else { m = a; d = b; }
    }
    else if ((x = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s,]*(\d{2,4})$/))) { d = +x[1]; m = MON[x[2].slice(0, 3).toLowerCase()]; y = +x[3]; if (y < 100) y += 2000; }
    else if ((x = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/))) { m = MON[x[1].slice(0, 3).toLowerCase()]; d = +x[2]; y = +x[3]; }
    else if ((x = s.match(/^(\d{4})(\d{2})(\d{2})$/))) { y = +x[1]; m = +x[2]; d = +x[3]; }
    else return null;
    if (!m || m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
    return { date: y + "-" + pad(m) + "-" + pad(d), time };
  }

  function parseTime(v) {
    if (isBlank(v)) return null;
    if (typeof v === "number") {
      const f = v % 1; const secs = Math.round(f * 86400);
      return pad(Math.floor(secs / 3600) % 24) + ":" + pad(Math.floor(secs / 60) % 60) + ":" + pad(secs % 60);
    }
    if (v instanceof Date) return pad(v.getHours()) + ":" + pad(v.getMinutes()) + ":" + pad(v.getSeconds());
    const s = String(v).trim();
    const t = parseTimeStr(s); if (t) return t;
    const dt = parseDateTime(s); return dt && dt.time ? dt.time : null;
  }

  function toMs(date, time) {
    const [y, m, d] = date.split("-").map(Number);
    const [h, mi, s] = (time || "00:00:00").split(":").map(Number);
    return Date.UTC(y, m - 1, d, h, mi, s);
  }
  function msToDate(ms) { const d = new Date(ms); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function msToDT(ms) { const d = new Date(ms); return msToDate(ms) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()); }
  function addDays(date, n) { return msToDate(toMs(date) + n * 86400000); }
  function dayDiff(a, b) { return Math.round((toMs(a) - toMs(b)) / 86400000); }

  function invKey(v) {
    if (isBlank(v)) return "";
    let s = typeof v === "number" ? String(Math.round(v)) : String(v).trim();
    const parts = s.split(/[-/]/).filter(Boolean);
    if (parts.length > 1 && /\d/.test(parts[parts.length - 1])) s = parts[parts.length - 1];
    const digits = s.replace(/\D/g, "");
    if (digits) return digits.replace(/^0+(?=\d)/, "");
    return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function invSimilar(a, b) { return !!a && !!b && a.length >= 4 && b.length >= 4 && lev(a, b) <= 2; }

  const cents = (x) => Math.round((x || 0) * 100);
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const r3 = (x) => Math.round((x + Number.EPSILON) * 1000) / 1000;

  function rateFor(settings, date) {
    const rs = (settings.rates || []).slice().sort((a, b) => a.effective < b.effective ? -1 : 1);
    let r = rs.length ? rs[0].rate : 12;
    for (const x of rs) if (!date || x.effective <= date) r = x.rate;
    return +r;
  }

  /* ======================= Sheet detection ======================= */
  function scoreRow(row, side) {
    const cells = row.map(nh).filter(Boolean);
    if (cells.length < 2) return 0;
    let score = 0;
    for (const f of FIELDS[side]) if (cells.some((c) => f.syn.includes(c))) score++;
    return score;
  }

  /** aoa: array of arrays. Returns {headerRow, headers, meta, side, scores} */
  function detectHeader(aoa) {
    let best = { idx: -1, score: 0, side: null };
    const lim = Math.min(aoa.length, 40);
    for (let i = 0; i < lim; i++) {
      const row = aoa[i] || [];
      for (const side of ["site", "lb"]) {
        const sc = scoreRow(row, side);
        if (sc > best.score) best = { idx: i, score: sc, side };
      }
    }
    if (best.idx < 0 || best.score < 2) return null;
    const hdr = aoa[best.idx].map((h, j) => isBlank(h) ? "Column " + (j + 1) : String(h).trim());
    const meta = {};
    for (let i = 0; i < best.idx; i++) {
      const r = aoa[i] || [];
      for (let j = 0; j < r.length - 1; j++) {
        if (typeof r[j] === "string" && /:\s*$/.test(r[j]) && !isBlank(r[j + 1])) meta[r[j].replace(/:\s*$/, "").trim()] = r[j + 1];
      }
      if (i === 0 && typeof r[0] === "string" && !/:\s*$/.test(r[0])) meta["Report Title"] = r[0];
    }
    const s1 = scoreRow(aoa[best.idx], "site"), s2 = scoreRow(aoa[best.idx], "lb");
    // LandBank exports have distinctive columns
    const hn = aoa[best.idx].map(nh);
    let side = s2 > s1 ? "lb" : "site";
    if (hn.some((h) => /lbp|landbank|liters dispensed|computed discount|remaining subsidy/.test(h))) side = "lb";
    else if (hn.some((h) => /^mop (name|amount)$|^product 1/.test(h))) side = "site";
    return { headerRow: best.idx, headers: hdr, meta, side, scores: { site: s1, lb: s2 } };
  }

  /** Parse a workbook (SheetJS object) into the best sheet's table. */
  function parseWorkbook(wb, XLSX) {
    let best = null;
    for (const name of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false });
      const det = detectHeader(aoa);
      if (det && (!best || det.scores[det.side] > best.det.scores[best.det.side])) best = { name, aoa, det };
    }
    if (!best) return null;
    const { aoa, det } = best;
    const width = det.headers.length;
    const rows = [];
    for (let i = det.headerRow + 1; i < aoa.length; i++) {
      const r = aoa[i] || [];
      if (r.every(isBlank)) continue;
      const cells = [];
      for (let j = 0; j < width; j++) { const v = r[j]; cells.push(v instanceof Date ? v.toISOString() : (v === undefined ? null : v)); }
      rows.push({ n: i + 1, c: cells });
    }
    return { sheet: best.name, headerRow: det.headerRow + 1, headers: det.headers, meta: det.meta, side: det.side, rows, sheetCount: wb.SheetNames.length };
  }

  /* ======================= Mapping ======================= */
  function autoMap(headers, meta, side) {
    const hn = headers.map(nh);
    const used = new Set();
    const map = {};
    for (const f of FIELDS[side]) {
      let idx = -1;
      for (const s of f.syn) { const j = hn.findIndex((h, k) => h === s && !used.has(k)); if (j >= 0) { idx = j; break; } }
      if (idx >= 0) { map[f.key] = { col: idx }; used.add(idx); continue; }
      if (f.meta && meta) {
        let mk = null;
        for (const want of f.meta) { mk = Object.keys(meta).find((k) => nh(k) === want); if (mk) break; }
        if (mk) { map[f.key] = { meta: mk }; continue; }
      }
      map[f.key] = null;
    }
    return map;
  }

  function missingRequired(map, side) {
    return FIELDS[side].filter((f) => f.req && !map[f.key]).map((f) => f.label);
  }

  function headerSignature(headers) { return headers.map(nh).join("|"); }

  /* ======================= Normalization ======================= */
  function stationFromFileName(name) { const m = String(name || "").match(/\b(\d{2}SH\d{3})\b/i); return m ? m[1].toUpperCase() : null; }

  function resolveStation(raw, side, settings) {
    if (isBlank(raw)) return null;
    const v = String(raw).trim();
    const st = settings.stations || [];
    const hit = st.find((s) => (s.code && s.code.toUpperCase() === v.toUpperCase()) || (s.siteNumber && String(s.siteNumber) === v) || (s.name && s.name.toUpperCase() === v.toUpperCase()));
    if (hit) return hit.code;
    return side === "lb" ? v.toUpperCase() : "SITE#" + v;
  }

  /** Normalize one parsed file into transaction records. */
  function normalizeFile(file, map, settings) {
    const side = file.side, issues = [], records = [], excluded = {};
    const get = (row, k) => { const m = map[k]; if (!m) return null; if (m.meta) return file.meta[m.meta]; return row.c[m.col]; };
    const filt = settings.siteFilters || {};
    const fk = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
    const mopF = (filt.mop || []).map(fk).filter(Boolean), refF = (filt.refCode || []).map(fk).filter(Boolean);
    const seen = { mop: {}, ref: {}, pairs: {} };
    const fileStation = side === "lb" ? stationFromFileName(file.name) : null;
    for (const row of file.rows) {
      if (side === "site") {
        const mop = get(row, "mop"), ref = get(row, "refCode");
        const mk = mop == null || mop === "" ? "(blank)" : String(mop), rk = ref == null || ref === "" ? "(blank)" : String(ref);
        if (map.mop) seen.mop[mk] = (seen.mop[mk] || 0) + 1;
        if (map.refCode) { seen.ref[rk] = (seen.ref[rk] || 0) + 1; const pk = mk + "\u0001" + rk; seen.pairs[pk] = (seen.pairs[pk] || 0) + 1; }
        const mopOk = !map.mop || !mopF.length || mopF.includes(fk(mop));
        const refOk = !map.refCode || !refF.length || refF.includes(fk(ref));
        if (!mopOk || !refOk) { const k = (mop || "(blank)") + (ref && !refOk ? " / " + ref : ""); excluded[k] = (excluded[k] || 0) + 1; continue; }
      }
      const rec = { key: file.id + "#" + row.n, side, fileId: file.id, fileName: file.name, rowNo: row.n };
      const dt = parseDateTime(get(row, "date"), settings.dateOrder);
      if (!dt) { issues.push({ row: row.n, msg: "Unreadable transaction date '" + (get(row, "date") ?? "") + "' — row excluded" }); continue; }
      rec.date = dt.date;
      rec.time = map.time ? parseTime(get(row, "time")) : dt.time;
      if (map.time && !rec.time && !isBlank(get(row, "time"))) issues.push({ row: row.n, msg: "Unreadable time '" + get(row, "time") + "'" });
      rec.hasTime = !!rec.time;
      rec.dt = toMs(rec.date, rec.time);
      const sub = parseNum(get(row, "subsidy"));
      if (sub == null || isNaN(sub)) { issues.push({ row: row.n, msg: "Missing/invalid subsidy amount '" + (get(row, "subsidy") ?? "") + "' — row excluded" }); continue; }
      rec.subsidy = sub;
      rec.invoice = isBlank(get(row, "invoice")) ? "" : String(get(row, "invoice")).trim();
      rec.inv = invKey(rec.invoice);
      const num = (k) => { const v = parseNum(get(row, k)); if (v != null && isNaN(v)) { issues.push({ row: row.n, msg: "Invalid number in " + k + ": '" + get(row, k) + "'" }); return null; } return v; };
      rec.sale = num("sale");
      rec.liters = num("liters");
      rec.product = isBlank(get(row, "product")) ? "" : String(get(row, "product")).trim();
      const stRaw = get(row, "station");
      rec.station = resolveStation(isBlank(stRaw) ? fileStation : stRaw, side, settings) || "UNASSIGNED";
      if (side === "site") {
        rec.pos = get(row, "pos"); rec.txnType = get(row, "txnType"); rec.mop = get(row, "mop"); rec.refCode = get(row, "refCode");
        rec.price = num("price"); rec.beneficiary = get(row, "beneficiary");
      } else {
        rec.lbRef = isBlank(get(row, "lbRef")) ? "" : String(get(row, "lbRef")).trim();
        rec.amountPaid = num("amountPaid"); rec.remaining = num("remaining"); rec.plate = get(row, "plate");
        rec.voucher = get(row, "voucher"); rec.status = get(row, "status"); rec.lbRemarks = get(row, "lbRemarks");
        rec.reimbursement = num("reimbursement");
        const sd = parseDateTime(get(row, "settlementDate"), settings.dateOrder); rec.settlementDate = sd ? sd.date : null;
      }
      records.push(rec);
    }
    return { records, issues, excluded, seen };
  }

  /** coverage interval of a file, in its own clock: [startMs, endMs] */
  function fileCoverage(file, records) {
    if (!records.length) return null;
    if (file.side === "site") {
      const ks = Object.keys(file.meta || {});
      const sk = ks.find((k) => /start\s*date/i.test(k)), ek = ks.find((k) => /end\s*date/i.test(k));
      const s = sk && parseDateTime(file.meta[sk]), e = ek && parseDateTime(file.meta[ek]);
      if (s && e && s.time && e.time) return { start: toMs(s.date, s.time), end: toMs(e.date, e.time), source: "report header" };
    }
    // Whole calendar days present in the file
    const ds = records.map((r) => r.date).sort();
    return { start: toMs(ds[0]), end: toMs(ds[ds.length - 1]) + 86399000, source: "transaction dates" };
  }
  function covered(intervals, ms) { return (intervals || []).some((c) => ms >= c.start && ms <= c.end); }

  /* ======================= Reconciliation ======================= */
  function median(a) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

  function estimateOffset(site, lb) {
    const byInv = new Map();
    for (const r of site) if (r.inv && r.hasTime) { if (byInv.has(r.inv)) byInv.set(r.inv, null); else byInv.set(r.inv, r); }
    const diffs = [];
    for (const l of lb) {
      const s = l.inv && byInv.get(l.inv);
      if (s && l.hasTime && cents(s.subsidy - l.subsidy) <= 2) { const d = (l.dt - s.dt) / 60000; if (Math.abs(d) < 180) diffs.push(d); }
    }
    return { offset: diffs.length >= 5 ? Math.round(median(diffs) * 10) / 10 : null, n: diffs.length };
  }

  function compareKey(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  /**
   * site, lb: normalized records. cov: {site:{station:[intervals]}, lb:{station:[intervals]}}.
   * ov: {matches:[{siteKey,lbKey,by,ts,remark}], unmatches:[{siteKey,lbKey}], notes:{key:[...]}, resolved:{key:{...}}}
   */
  function reconcile(siteAll, lbAll, settings, ov, cov) {
    settings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    ov = ov || {};
    cov = cov || { site: {}, lb: {} };
    const tolC = Math.round(settings.amountTol * 100 + 1e-9);
    const win = settings.timeWindowMin * 60000;
    const forbidden = new Set((ov.unmatches || []).map((u) => u.siteKey + "|" + u.lbKey));
    const items = [];
    const used = new Set();
    const offsets = {};

    const stations = Array.from(new Set(siteAll.map((r) => r.station).concat(lbAll.map((r) => r.station)))).sort();
    const offFor = (st) => (offsets[st] ? offsets[st].used : settings.offsetMin);

    for (const st of stations) {
      const est = estimateOffset(siteAll.filter((r) => r.station === st), lbAll.filter((r) => r.station === st));
      const usedOff = settings.offsetMode === "auto" && est.offset != null ? est.offset : +settings.offsetMin;
      offsets[st] = { detected: est.offset, n: est.n, used: usedOff, mode: settings.offsetMode === "auto" && est.offset != null ? "auto" : "manual" };
    }

    function mkPair(s, l, level, extra) {
      used.add(s.key); used.add(l.key);
      const it = { id: s.key + "|" + l.key, site: s, lb: l, level, station: s.station, remarks: [], flags: {} };
      Object.assign(it, extra || {});
      evaluatePair(it);
      items.push(it); return it;
    }

    function evaluatePair(it) {
      const s = it.site, l = it.lb, off = offFor(s.station) * 60000;
      const rate = rateFor(settings, s.date);
      const dC = cents(s.subsidy) - cents(l.subsidy);
      it.variance = dC / 100;
      const siteL = s.liters != null ? s.liters : s.subsidy / rate;
      it.siteLiters = s.liters != null ? s.liters : r3(siteL);
      it.siteLitersDerived = s.liters == null;
      it.literVar = l.liters != null ? r3(siteL - l.liters) : null;
      const lbAdj = l.dt - off;
      it.timeDiffMin = (s.hasTime && l.hasTime) ? Math.round((lbAdj - s.dt) / 600) / 100 : null;
      const dd = dayDiff(msToDate(lbAdj), s.date);
      const sts = [];
      if (Math.abs(dC) > tolC) { sts.push(STATUS.AMOUNT); it.remarks.push("Subsidy differs: Site ₱" + s.subsidy.toFixed(2) + " vs LandBank ₱" + l.subsidy.toFixed(2) + " (variance ₱" + it.variance.toFixed(2) + ")."); }
      else if (dC !== 0) { it.flags.rounding = true; it.remarks.push("₱" + Math.abs(it.variance).toFixed(2) + " rounding difference (within ₱" + settings.amountTol.toFixed(2) + " tolerance)."); }
      if (it.literVar != null && Math.abs(it.literVar) > settings.literTol) {
        if (it.siteLitersDerived && sts.includes(STATUS.AMOUNT)) it.remarks.push("Implied site liters (" + r3(siteL) + " L = subsidy ÷ ₱" + rate + ") differ from LandBank " + l.liters + " L.");
        else { sts.push(STATUS.LITER); it.remarks.push("Liters differ: Site " + r3(siteL) + " L" + (it.siteLitersDerived ? " (implied from subsidy ÷ ₱" + rate + ")" : "") + " vs LandBank " + l.liters + " L."); }
      }
      if (Math.abs(dd) > settings.dateTolDays) { sts.push(STATUS.DATE); it.remarks.push("Transaction dates differ: Site " + s.date + " vs LandBank " + l.date + (dd ? " (" + (dd > 0 ? "+" : "") + dd + " day/s)" : "") + "."); }
      else if (it.timeDiffMin != null && Math.abs(it.timeDiffMin) * 60000 > win) it.remarks.push("Time gap of " + Math.abs(it.timeDiffMin).toFixed(1) + " min after clock adjustment.");
      if (s.sale != null && l.sale != null && cents(s.sale) !== cents(l.sale)) { sts.push(STATUS.VERIFY); it.remarks.push("Pump amount differs: Site ₱" + s.sale.toFixed(2) + " vs LandBank ₱" + l.sale.toFixed(2) + "."); }
      if (s.txnType && !/^sale$/i.test(String(s.txnType).trim())) { sts.push(STATUS.VERIFY); it.remarks.push("Site transaction type is '" + s.txnType + "' (not Sale)."); }
      if (l.status && /(fail|revers|cancel|void|reject|declin)/i.test(String(l.status))) { sts.push(STATUS.VERIFY); it.remarks.push("LandBank status is '" + l.status + "'."); }
      if (l.liters != null) {
        const exp = r2(l.liters * rateFor(settings, l.date));
        if (Math.abs(cents(exp) - cents(l.subsidy)) > tolC) it.remarks.push("LandBank discount ₱" + l.subsidy.toFixed(2) + " ≠ " + l.liters + " L × ₱" + rateFor(settings, l.date) + " (₱" + exp.toFixed(2) + ").");
      }
      if (it.level === "L2") { it.flags.invoiceMismatch = true; it.remarks.unshift("Invoice no. differs — Site " + (s.invoice || "(blank)") + " vs LandBank " + (l.invoice || "(blank)") + "; matched on subsidy, pump amount and time (likely invoice keying error)."); }
      if (it.level === "L3") it.remarks.unshift("Matched on subsidy, pump amount and time only (Level 3).");
      if (it.level === "Manual") it.remarks.unshift("Manually matched by " + (it.manual.byName || it.manual.by || "user") + (it.manual.remark ? ": " + it.manual.remark : "") + ".");
      const order = [STATUS.AMOUNT, STATUS.LITER, STATUS.DATE, STATUS.VERIFY];
      it.status = order.find((x) => sts.includes(x)) || STATUS.MATCHED;
      if (!sts.length && !it.remarks.length) it.remarks.push("Invoice, subsidy" + (l.liters != null ? ", liters" : "") + " and date agree.");
      it.issues = sts;
      it.validated = Math.abs(dC) <= tolC ? l.subsidy : Math.min(s.subsidy, l.subsidy);
    }

    // ---- 0. Manual matches
    const sByKey = new Map(siteAll.map((r) => [r.key, r])), lByKey = new Map(lbAll.map((r) => [r.key, r]));
    for (const m of ov.matches || []) {
      const s = sByKey.get(m.siteKey), l = lByKey.get(m.lbKey);
      if (!s || !l || used.has(s.key) || used.has(l.key)) continue;
      mkPair(s, l, "Manual", { manual: m });
    }

    for (const st of stations) {
      const off = offFor(st) * 60000;
      const S = siteAll.filter((r) => r.station === st && !used.has(r.key));
      const L = lbAll.filter((r) => r.station === st && !used.has(r.key));

      // ---- duplicate LandBank reference numbers
      const refSeen = new Map();
      for (const l of L.slice().sort((a, b) => a.rowNo - b.rowNo)) {
        if (!l.lbRef) continue;
        if (refSeen.has(l.lbRef)) { const o = refSeen.get(l.lbRef); used.add(l.key); items.push({ id: l.key, site: null, lb: l, station: st, status: STATUS.DUP, dupOf: o.key, remarks: ["Same LandBank reference " + l.lbRef + " as row " + o.rowNo + " of " + o.fileName + " — excluded from receivable to prevent double recognition."], flags: {}, validated: 0 }); }
        else refSeen.set(l.lbRef, l);
      }

      // ---- 1. Level 1: invoice number
      const gS = new Map(), gL = new Map();
      for (const s of S) if (s.inv && !used.has(s.key)) { if (!gS.has(s.inv)) gS.set(s.inv, []); gS.get(s.inv).push(s); }
      for (const l of L) if (l.inv && !used.has(l.key)) { if (!gL.has(l.inv)) gL.set(l.inv, []); gL.get(l.inv).push(l); }
      const keys = Array.from(new Set([...gS.keys(), ...gL.keys()]));
      for (const k of keys) {
        const ss = gS.get(k) || [], ll = gL.get(k) || [];
        const cands = [];
        for (const s of ss) for (const l of ll) {
          if (forbidden.has(s.key + "|" + l.key)) continue;
          const dC = Math.abs(cents(s.subsidy) - cents(l.subsidy));
          const tD = Math.abs((l.dt - off) - s.dt) / 60000;
          if (tD > 31 * 1440 && dC > tolC) continue; // invoice series reuse far apart — not the same transaction
          cands.push({ s, l, score: dC * 100000 + tD });
        }
        cands.sort((a, b) => a.score - b.score);
        const paired = { s: [], l: [] };
        for (const c of cands) {
          if (used.has(c.s.key) || used.has(c.l.key)) continue;
          mkPair(c.s, c.l, "L1"); paired.s.push(c.s); paired.l.push(c.l);
        }
        const markDups = (list, pairedList, side) => {
          if (list.length < 2) return;
          const left = list.filter((r) => !used.has(r.key)).sort((a, b) => a.dt - b.dt || a.rowNo - b.rowNo);
          if (!left.length) return;
          const orig = pairedList[0] || left.shift();
          for (const r of left) {
            used.add(r.key);
            items.push({ id: r.key, site: side === "site" ? r : null, lb: side === "lb" ? r : null, station: st, status: STATUS.DUP, dupOf: orig.key,
              remarks: ["Invoice " + r.invoice + " appears more than once in the " + (side === "site" ? "Site Report" : "LandBank Report") + " (also row " + orig.rowNo + (orig.fileId !== r.fileId ? " of " + orig.fileName : "") + "). Excluded from receivable to prevent double recognition."], flags: {}, validated: 0 });
          }
        };
        markDups(ss, paired.s, "site"); markDups(ll, paired.l, "lb");
      }

      // ---- 2/3. Level 2 (similar invoice) and Level 3 (amount + time)
      const S2 = S.filter((r) => !used.has(r.key)), L2 = L.filter((r) => !used.has(r.key));
      const byC = new Map();
      for (const l of L2) { const c = cents(l.subsidy); if (!byC.has(c)) byC.set(c, []); byC.get(c).push(l); }
      const candOf = new Map(), revOf = new Map();
      for (const s of S2) {
        const out = [];
        const c0 = cents(s.subsidy);
        for (let c = c0 - tolC; c <= c0 + tolC; c++) for (const l of byC.get(c) || []) {
          if (forbidden.has(s.key + "|" + l.key)) continue;
          if (!(s.hasTime && l.hasTime)) { if (s.date !== l.date) continue; }
          else if (Math.abs((l.dt - off) - s.dt) > win) continue;
          if (s.sale != null && l.sale != null && Math.abs(cents(s.sale) - cents(l.sale)) > tolC) continue;
          if (s.liters != null && l.liters != null && Math.abs(s.liters - l.liters) > settings.literTol) continue;
          if (s.product && l.product && nh(s.product) !== nh(l.product)) continue;
          out.push({ l, sim: invSimilar(s.inv, l.inv) });
        }
        candOf.set(s.key, out);
        for (const o of out) { if (!revOf.has(o.l.key)) revOf.set(o.l.key, []); revOf.get(o.l.key).push({ s, sim: o.sim }); }
      }
      const suggestions = new Map();
      for (const level of ["L2", "L3"]) {
        for (const s of S2) {
          if (used.has(s.key)) continue;
          const cs = candOf.get(s.key).filter((o) => !used.has(o.l.key) && (level === "L3" || o.sim));
          if (cs.length !== 1) continue;
          const l = cs[0].l;
          const rs = (revOf.get(l.key) || []).filter((o) => !used.has(o.s.key) && (level === "L3" || o.sim));
          if (rs.length !== 1) continue;
          if (level === "L2" || settings.autoAcceptL3) mkPair(s, l, level);
          else if (!suggestions.has(s.key) && !Array.from(suggestions.values()).some((x) => x.key === l.key)) suggestions.set(s.key, l);
        }
      }

      // ---- 4. leftovers
      const lbCov = cov.lb[st] || [], siteCov = cov.site[st] || [];
      for (const s of S2) {
        if (used.has(s.key)) continue;
        const it = { id: s.key, site: s, lb: null, station: st, remarks: [], flags: {}, validated: 0, siteLiters: s.liters != null ? s.liters : r3(s.subsidy / rateFor(settings, s.date)), siteLitersDerived: s.liters == null };
        const cands = candOf.get(s.key).filter((o) => !used.has(o.l.key));
        const sug = suggestions.get(s.key);
        if (sug) {
          it.status = STATUS.VERIFY; it.suggest = sug.key; it.flags.suggestion = true;
          it.remarks.push("Probable match (Level 3): LandBank " + (sug.invoice ? "invoice " + sug.invoice : "row with no invoice") + (sug.lbRef ? " / " + sug.lbRef : "") + " at " + sug.date + " " + (sug.time || "") + ", same subsidy & pump amount. Confirm or reject.");
        } else if (cands.length > 1) {
          it.status = STATUS.VERIFY; it.flags.multi = true; it.candidates = cands.map((o) => o.l.key);
          it.remarks.push(cands.length + " possible LandBank matches with the same amount and time window (" + cands.map((o) => (o.l.invoice || "no invoice") + " @ " + (o.l.time || o.l.date)).join(", ") + ") — manual review required.");
        } else {
          it.status = STATUS.SITE_ONLY;
          const lbClock = s.dt + off;
          if (!covered(lbCov, lbClock)) {
            it.flags.timing = true;
            it.remarks.push("No LandBank report loaded for " + msToDate(lbClock) + " (LandBank clock). Expected in the LandBank report for " + msToDate(lbClock) + " — cut-off/timing item, not yet a discrepancy.");
          } else it.remarks.push("Not found in the LandBank report (no matching invoice, amount or time). Follow up with LandBank / verify voucher redemption.");
        }
        if (s.txnType && !/^sale$/i.test(String(s.txnType).trim())) it.remarks.push("Transaction type: " + s.txnType + ".");
        items.push(it);
      }
      for (const l of L2) {
        if (used.has(l.key)) continue;
        const it = { id: l.key, site: null, lb: l, station: st, remarks: [], flags: {}, validated: 0 };
        const rs = (revOf.get(l.key) || []).filter((o) => !used.has(o.s.key));
        const sugBy = Array.from(suggestions.entries()).find(([, v]) => v.key === l.key);
        if (sugBy) { it.status = STATUS.VERIFY; it.flags.suggestion = true; it.suggest = sugBy[0]; it.remarks.push("Probable match (Level 3) with Site invoice " + (sByKey.get(sugBy[0]).invoice || "?") + ". Confirm or reject."); }
        else if (rs.length > 1) { it.status = STATUS.VERIFY; it.flags.multi = true; it.candidates = rs.map((o) => o.s.key); it.remarks.push(rs.length + " possible Site Report matches (" + rs.map((o) => (o.s.invoice || "no invoice") + " @ " + (o.s.time || o.s.date)).join(", ") + ") — manual review required."); }
        else {
          it.status = STATUS.LB_ONLY;
          const siteClock = l.dt - off;
          if (!covered(siteCov, siteClock)) {
            it.flags.timing = true;
            const starts = siteCov.map((c) => c.start).sort((a, b) => a - b), ends = siteCov.map((c) => c.end).sort((a, b) => a - b);
            let where = "a Site Report period that is not loaded";
            if (starts.length && siteClock < starts[0]) where = "the site business day before " + msToDT(starts[0]) + " (previous day's Site Report)";
            else if (ends.length && siteClock > ends[ends.length - 1]) where = "the site business day after " + msToDT(ends[ends.length - 1]) + " (next day's Site Report)";
            it.remarks.push("Falls in " + where + ". Upload that Site Report to clear — cut-off/timing item.");
          } else it.remarks.push("Not found in the Site Report (no matching invoice, amount or time). Verify whether the sale was recorded under another MOP or invoice.");
        }
        if (l.status && /(fail|revers|cancel|void|reject|declin)/i.test(String(l.status))) it.remarks.push("LandBank status: " + l.status + ".");
        items.push(it);
      }
    }

    // annotate common fields
    for (const it of items) {
      const r = it.site || it.lb;
      it.date = it.site ? it.site.date : it.lb.date;
      it.time = it.site ? it.site.time : it.lb.time;
      it.period = it.date.slice(0, 7);
      it.invoice = it.site ? it.site.invoice : it.lb.invoice;
      it.siteSubsidy = it.site ? it.site.subsidy : null;
      it.lbSubsidy = it.lb ? it.lb.subsidy : null;
      it.lbLiters = it.lb ? it.lb.liters : null;
      if (it.variance == null) it.variance = r2((it.siteSubsidy || 0) - (it.lbSubsidy || 0));
      if (it.status === STATUS.DUP) it.variance = 0;
      it.notes = (ov.notes && (ov.notes[it.id] || [])) || [];
      if (ov.resolved && ov.resolved[it.id]) it.resolved = ov.resolved[it.id];
      it.station = it.station || r.station;
    }
    items.sort((a, b) => compareKey(a.date + (a.time || ""), b.date + (b.time || "")));
    return { items, offsets, settings };
  }

  /* ======================= Summaries ======================= */
  function sum(arr, f) { let t = 0; for (const x of arr) { const v = f(x); if (v != null && !isNaN(v)) t += v; } return r2(t); }

  function summarize(items, siteRecs, lbRecs, settings) {
    const rate = (d) => rateFor(settings, d);
    const nonDupSite = items.filter((i) => i.site && i.status !== STATUS.DUP).map((i) => i.site);
    const nonDupLb = items.filter((i) => i.lb && i.status !== STATUS.DUP).map((i) => i.lb);
    const byStatus = {}; for (const s of STATUS_ORDER) byStatus[s] = { count: 0, site: 0, lb: 0 };
    for (const i of items) { const b = byStatus[i.status]; b.count++; b.site += i.siteSubsidy || 0; b.lb += i.lbSubsidy || 0; }
    for (const s of STATUS_ORDER) { byStatus[s].site = r2(byStatus[s].site); byStatus[s].lb = r2(byStatus[s].lb); }
    const pairs = items.filter((i) => i.site && i.lb && !i.flags.suggestion);
    const siteLitersAll = siteRecs.map((r) => r.liters != null ? r.liters : r3(r.subsidy / rate(r.date)));
    const out = {
      siteCount: siteRecs.length, lbCount: lbRecs.length,
      siteLiters: r3(siteLitersAll.reduce((a, b) => a + b, 0)),
      siteLitersDerived: siteRecs.some((r) => r.liters == null),
      lbLiters: r3(sum(lbRecs, (r) => r.liters)),
      lbHasLiters: lbRecs.some((r) => r.liters != null),
      siteSubsidy: sum(siteRecs, (r) => r.subsidy),
      lbSubsidy: sum(lbRecs, (r) => r.subsidy),
      siteSale: sum(siteRecs, (r) => r.sale),
      lbSale: sum(lbRecs, (r) => r.sale),
      siteExpected: sum(siteRecs, (r) => r.liters != null ? r2(r.liters * rate(r.date)) : r.subsidy),
      lbExpected: sum(lbRecs, (r) => r.liters != null ? r2(r.liters * rate(r.date)) : null),
      lbReimbursed: sum(lbRecs, (r) => r.reimbursement),
      lbHasReimb: lbRecs.some((r) => r.reimbursement != null),
      matchedCount: pairs.length,
      cleanMatched: byStatus[STATUS.MATCHED].count,
      unmatchedCount: items.filter((i) => !(i.site && i.lb) || i.flags.suggestion).length,
      timingCount: items.filter((i) => i.flags.timing).length,
      timingSite: sum(items.filter((i) => i.flags.timing && i.site), (i) => i.siteSubsidy),
      timingLb: sum(items.filter((i) => i.flags.timing && i.lb), (i) => i.lbSubsidy),
      invoiceMismatch: items.filter((i) => i.flags.invoiceMismatch).length,
      roundingCount: items.filter((i) => i.flags.rounding).length,
      roundingTotal: sum(items.filter((i) => i.flags.rounding), (i) => i.variance),
      pairVariance: sum(pairs, (i) => i.variance),
      validated: sum(pairs, (i) => i.validated),
      dupCount: byStatus[STATUS.DUP].count,
      dupAmount: r2(byStatus[STATUS.DUP].site + byStatus[STATUS.DUP].lb),
      byStatus
    };
    out.nonDupSiteSubsidy = sum(nonDupSite, (r) => r.subsidy);
    out.nonDupLbSubsidy = sum(nonDupLb, (r) => r.subsidy);
    out.totalVariance = r2(out.siteSubsidy - out.lbSubsidy);
    out.pendingValidation = r2(out.nonDupSiteSubsidy - sum(pairs, (i) => Math.min(i.siteSubsidy, i.validated)));
    out.siteOnlyAmt = sum(items.filter((i) => i.site && !i.lb && i.status !== STATUS.DUP), (i) => i.siteSubsidy);
    out.lbOnlyAmt = sum(items.filter((i) => i.lb && !i.site && i.status !== STATUS.DUP), (i) => i.lbSubsidy);
    out.exceptionCount = items.filter((i) => i.status !== STATUS.MATCHED && !i.flags.timing && !i.resolved).length;
    return out;
  }

  /** Receivable rows per station × claim period (YYYY-MM). receipts/approvals: [{station, period, amount, ...}] */
  function receivables(items, receipts, approvals) {
    const rows = new Map();
    const row = (st, p) => {
      const k = st + "|" + p;
      if (!rows.has(k)) rows.set(k, { station: st, period: p, siteCount: 0, siteLiters: 0, siteSubsidy: 0, lbCount: 0, lbLiters: 0, lbReported: 0, validated: 0, pending: 0, approved: 0, reimbursed: 0, receipts: [], approvals: [], lastReceived: null });
      return rows.get(k);
    };
    for (const i of items) {
      if (i.status === STATUS.DUP) continue;
      const r = row(i.station, i.period);
      if (i.site) { r.siteCount++; r.siteLiters += i.siteLiters || 0; r.siteSubsidy += i.site.subsidy; }
      if (i.lb) { r.lbCount++; r.lbLiters += i.lb.liters || 0; r.lbReported += i.lb.subsidy; }
      if (i.site && i.lb && !i.flags.suggestion) { r.validated += i.validated; r.pending += i.site.subsidy - Math.min(i.site.subsidy, i.validated); }
      else if (i.site) r.pending += i.site.subsidy;
    }
    for (const a of approvals || []) { const r = row(a.station, a.period); r.approved += +a.amount || 0; r.approvals.push(a); }
    for (const x of receipts || []) { const r = row(x.station, x.period); r.reimbursed += +x.amount || 0; r.receipts.push(x); if (!r.lastReceived || x.dateReceived > r.lastReceived) r.lastReceived = x.dateReceived; }
    const out = [];
    for (const r of rows.values()) {
      for (const k of ["siteLiters", "lbLiters"]) r[k] = r3(r[k]);
      for (const k of ["siteSubsidy", "lbReported", "validated", "approved", "reimbursed", "pending"]) r[k] = r2(r[k]);
      r.outstanding = r2(r.validated - r.reimbursed);
      r.claimStatus = r.reimbursed <= 0 ? (r.approved > 0 ? "Approved – awaiting payment" : r.validated > 0 ? "Validated – awaiting approval" : "Reported – pending validation")
        : r.outstanding > 0.005 ? "Partially reimbursed" : r.outstanding < -0.005 ? "Over-reimbursed – investigate" : "Fully reimbursed";
      out.push(r);
    }
    out.sort((a, b) => compareKey(a.period + a.station, b.period + b.station));
    return out;
  }

  root.Recon = {
    SITE_FIELDS, LB_FIELDS, FIELDS, STATUS, STATUS_ORDER, DEFAULT_SETTINGS,
    parseNum, parseDateTime, parseTime, invKey, invSimilar, lev, rateFor, toMs, msToDate, msToDT, addDays,
    detectHeader, parseWorkbook, autoMap, missingRequired, headerSignature, stationFromFileName,
    normalizeFile, fileCoverage, covered, estimateOffset, reconcile, summarize, receivables, r2, r3, cents, nh
  };
})(typeof window !== "undefined" ? window : globalThis);

/* Station auto-link: one unmapped site number + one unmapped LandBank code → propose a link */
(function (root) {
  root.Recon.proposeStationLinks = function (siteIds, lbCodes, settings) {
    const st = settings.stations || [];
    const sU = Array.from(new Set(siteIds.filter((v) => v != null && v !== "").map(String))).filter((v) => !st.some((s) => String(s.siteNumber) === v || s.code === v));
    const lU = Array.from(new Set(lbCodes.filter(Boolean).map((v) => String(v).toUpperCase()))).filter((v) => !st.some((s) => s.code === v && s.siteNumber));
    if (sU.length === 1 && lU.length === 1) return [{ siteNumber: sU[0], code: lU[0] }];
    return [];
  };
})(typeof window !== "undefined" ? window : globalThis);
