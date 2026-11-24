/* DOE Subsidy Site Report vs LandBank Reconciliation — application UI */
(function () {
  "use strict";
  const R = window.Recon, ST = R.STATUS;

  /* ======================= helpers ======================= */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const P = (n) => (n == null || isNaN(n)) ? "—" : (n < -0.0049 ? "-" : "") + "₱" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const N = (n, d = 0) => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const L = (n) => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
  const safeId = (s) => String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g, "_").slice(0, 150);
  const nowIso = () => new Date().toISOString();
  const fmtTs = (iso) => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString("en-CA") + " " + d.toLocaleTimeString("en-GB"); };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const monthName = (p) => { if (!p) return "All periods"; const [y, m] = p.split("-"); return new Date(+y, +m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }); };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  const ICON = {
    dashboard: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
    upload: '<path d="M5 20h14v-2H5v2zm7-18l-6 6h4v6h4V8h4l-6-6z"/>',
    mapping: '<path d="M4 6h7v2H4V6zm0 5h7v2H4v-2zm0 5h7v2H4v-2zm9-10l5 3-5 3V6zm0 8l5 3-5 3v-6z"/>',
    recon: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
    disc: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
    recv: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>',
    reports: '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>',
    settings: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>',
    cloud: '<path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>',
    dl: '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>',
    check: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    x: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    warn: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
    clock: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 11h-5v-2h3V6h2v7z"/>',
    copy: '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>',
    q: '<path d="M11 18h2v-2h-2v2zm1-16a10 10 0 100 20 10 10 0 000-20zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14a4 4 0 00-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 00-4-4z"/>',
    lock: '<path d="M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 6a3 3 0 016 0v2H9V6zm9 14H6V10h12v10z"/>'
  };
  const ic = (k) => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + (ICON[k] || "") + "</svg>";

  const STATUS_STYLE = {
    [ST.MATCHED]: ["good", "check"], [ST.SITE_ONLY]: ["critical", "x"], [ST.LB_ONLY]: ["critical", "x"],
    [ST.AMOUNT]: ["serious", "warn"], [ST.LITER]: ["serious", "warn"], [ST.DATE]: ["warn", "clock"],
    [ST.DUP]: ["critical", "copy"], [ST.VERIFY]: ["warn", "q"]
  };
  const chip = (status) => { const [c, i] = STATUS_STYLE[status] || ["neutral", "q"]; return '<span class="chip ' + c + '">' + ic(i) + esc(status) + "</span>"; };
  const itemTags = (it) => (it.flags.timing ? '<span class="tag timing">Cut-off / timing</span>' : "") + (it.flags.invoiceMismatch ? '<span class="tag">Invoice differs</span>' : "") + (it.flags.suggestion ? '<span class="tag">Suggested match</span>' : "") + (it.level ? '<span class="tag">' + esc(it.level) + "</span>" : "") + (it.resolved ? '<span class="tag" style="background:#e8f5e8;color:#0a6b0a">Resolved</span>' : "");

  /* ======================= state ======================= */
  const S = {
    conn: null, store: null, demo: false, ro: false, canAdmin: true, me: { id: null, name: "" }, names: {},
    files: [], staged: [], mappings: {}, stations: [], settings: JSON.parse(JSON.stringify(R.DEFAULT_SETTINGS)),
    ov: { matches: [], unmatches: [], notes: [], resolved: [] }, audit: [], receipts: [], approvals: [], finals: [],
    site: [], lb: [], cov: { site: {}, lb: {} }, result: null,
    view: "dashboard", filter: { station: "", period: "" },
    rc: { q: "", status: "", from: "", to: "", sort: "date", dir: 1, page: 0, sel: new Set() },
    disc: "action", setTab: "rate", busy: false
  };

  /* ======================= toasts & modals ======================= */
  function toast(msg, kind) {
    const t = document.createElement("div"); t.className = "toast " + (kind || ""); t.textContent = msg;
    $("#toasts").appendChild(t); setTimeout(() => t.remove(), kind === "err" ? 7000 : 4000);
  }
  function modal(html, opts) {
    opts = opts || {};
    const bg = document.createElement("div"); bg.className = "modal-bg";
    bg.innerHTML = '<div class="modal ' + (opts.wide ? "wide" : "") + '" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(bg);
    const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); opts.onClose && opts.onClose(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    bg.addEventListener("mousedown", (e) => { if (e.target === bg && !opts.sticky) close(); });
    $$("[data-close]", bg).forEach((b) => b.addEventListener("click", close));
    const first = $("input:not([type=checkbox]), textarea, select", bg); if (first) setTimeout(() => first.focus(), 30);
    return { el: bg, close };
  }
  function confirmBox(title, bodyHtml, okLabel, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      let done = false;
      const m = modal('<div class="mh"><h3>' + esc(title) + '</h3></div><div class="mb">' + bodyHtml +
        (opts.reason ? '<div style="margin-top:12px"><label class="small muted">' + esc(opts.reason) + '</label><textarea id="cf-reason"></textarea></div>' : "") +
        (opts.typed ? '<div style="margin-top:12px"><label class="small muted">Type <b>' + esc(opts.typed) + '</b> to confirm</label><input type="text" id="cf-typed" style="width:100%"></div>' : "") +
        '</div><div class="mf"><button class="btn" data-close>Cancel</button><button class="btn ' + (opts.danger ? "danger" : "primary") + '" id="cf-ok">' + esc(okLabel || "Confirm") + "</button></div>",
        { onClose: () => { if (!done) resolve(null); } });
      $("#cf-ok", m.el).addEventListener("click", () => {
        const reason = opts.reason ? $("#cf-reason", m.el).value.trim() : "";
        if (opts.reason && opts.reasonRequired !== false && !reason) { toast("Please enter a reason / remark.", "err"); return; }
        if (opts.typed && $("#cf-typed", m.el).value.trim() !== opts.typed) { toast("Confirmation text does not match.", "err"); return; }
        if (opts.requireCheck && !($("#" + opts.requireCheck, m.el) || {}).checked) { toast("Please tick the review confirmation.", "err"); return; }
        done = true; m.close(); resolve({ reason });
      });
    });
  }

  /* ======================= persistence ======================= */
  function storeErr(e) {
    const code = e && e.code;
    if (code === "invalid_argument" && S.store.mode === "shared") { S.ro = true; toast("Your access to this app is view-only — changes cannot be saved.", "err"); render(); }
    else if (code === "quota_exceeded") toast("Storage is full: " + (e.message || "") + " Export a backup and remove old periods.", "err");
    else if (code === "revoked") toast("Access to shared storage was withdrawn.", "err");
    else toast("Could not save: " + ((e && e.message) || e), "err");
  }
  async function put(col, id, obj) { try { await S.store.put(col, id, obj); return true; } catch (e) { storeErr(e); return false; } }
  async function del(col, id) { try { await S.store.del(col, id); return true; } catch (e) { storeErr(e); return false; } }
  function canChange() { if (S.ro) { toast("View-only access — changes are disabled.", "err"); return false; } return true; }
  function who(entry) { return (entry && (entry.userName || (entry.userId && S.names[entry.userId]))) || (entry && entry.userId ? "User " + entry.userId.slice(-4) : "Unknown user"); }
  function stamp() { return { userId: S.me.id || null, userName: S.store.mode === "shared" ? undefined : (S.me.name || "Local user"), ts: nowIso() }; }
  async function audit(action, details, ref) {
    const e = Object.assign({ action, details: details || "", ref: ref || "" }, stamp());
    const id = Date.now().toString(36).padStart(9, "0") + "-" + Math.random().toString(36).slice(2, 7);
    Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
    S.audit.push(Object.assign({ id }, e));
    await put("audit", id, e);
  }
  function clean(o) { const x = Object.assign({}, o); Object.keys(x).forEach((k) => x[k] === undefined && delete x[k]); return x; }

  async function loadAll() {
    const st = S.store;
    const cols = ["files", "chunks", "mappings", "stations", "settings", "matches", "unmatches", "notes", "resolved", "audit", "receipts", "approvals", "finals"];
    const res = await Promise.all(cols.map((c) => st.all(c).catch((e) => { console.warn(c, e); return []; })));
    const D = {}; cols.forEach((c, i) => (D[c] = res[i]));
    const chunksBy = {};
    for (const c of D.chunks) (chunksBy[c.fileId] = chunksBy[c.fileId] || []).push(c);
    S.files = D.files.map((f) => {
      const cs = (chunksBy[f.id] || []).sort((a, b) => a.idx - b.idx);
      const rows = [].concat(...cs.map((c) => c.rows || []));
      return Object.assign({}, f, { rows, incomplete: rows.length !== f.rowCount });
    }).sort((a, b) => (a.uploadedAt || "").localeCompare(b.uploadedAt || ""));
    S.mappings = {}; for (const m of D.mappings) S.mappings[m.id] = m.map;
    S.stations = D.stations.map((s) => ({ id: s.id, code: s.code, siteNumber: s.siteNumber, name: s.name || "" }));
    const sd = D.settings.find((s) => s.id === "main");
    S.settings = Object.assign(JSON.parse(JSON.stringify(R.DEFAULT_SETTINGS)), sd ? sd.data : {});
    S.ov = { matches: D.matches, unmatches: D.unmatches, notes: D.notes.sort((a, b) => (a.ts || "").localeCompare(b.ts || "")), resolved: D.resolved };
    S.audit = D.audit.sort((a, b) => (a.ts || "").localeCompare(b.ts || ""));
    S.receipts = D.receipts; S.approvals = D.approvals; S.finals = D.finals;
    await resolveNames();
  }
  async function resolveNames() {
    const u = S.conn && S.conn.user;
    if (!u || typeof u.profiles !== "function") return;
    const ids = new Set();
    for (const arr of [S.audit, S.files, S.ov.notes, S.ov.matches, S.receipts, S.approvals, S.finals, S.ov.resolved]) for (const x of arr) if (x.userId) ids.add(x.userId);
    if (S.me.id) ids.add(S.me.id);
    try { const ps = await u.profiles(Array.from(ids)); for (const id of Object.keys(ps || {})) if (ps[id] && ps[id].name) S.names[id] = ps[id].name; } catch (e) { /* names stay as ids */ }
  }

  /* ======================= computation ======================= */
  const mapKey = (f) => f.side + "_" + fnv(R.headerSignature(f.headers));
  function effSettings() { return Object.assign({}, S.settings, { stations: S.stations }); }
  function engineOverrides() {
    const notes = {}; for (const n of S.ov.notes) (notes[n.itemId] = notes[n.itemId] || []).push(n);
    const resolved = {}; for (const r of S.ov.resolved) if (r.resolved) resolved[r.itemId] = r;
    return { matches: S.ov.matches, unmatches: S.ov.unmatches, notes, resolved };
  }
  function rawStationValues() {
    const siteIds = [], lbCodes = [];
    for (const f of S.files) {
      const m = S.mappings[mapKey(f)]; if (!m) continue;
      const sm = m.station;
      if (f.side === "site") { if (sm && sm.meta) siteIds.push(f.meta[sm.meta]); else if (sm && sm.col != null) for (const r of f.rows) siteIds.push(r.c[sm.col]); }
      else { if (sm && sm.col != null) for (const r of f.rows) lbCodes.push(r.c[sm.col]); else lbCodes.push(R.stationFromFileName(f.name)); }
    }
    return { siteIds, lbCodes };
  }
  async function autoLinkStations() {
    const { siteIds, lbCodes } = rawStationValues();
    const links = R.proposeStationLinks(siteIds, lbCodes, { stations: S.stations });
    for (const l of links) {
      const existing = S.stations.find((s) => s.code === l.code);
      const rec = existing ? Object.assign({}, existing, { siteNumber: l.siteNumber }) : { id: safeId("st_" + l.code), code: l.code, siteNumber: l.siteNumber, name: "" };
      const siteFile = S.files.find((f) => f.side === "site" && Object.values(f.meta || {}).map(String).includes(String(l.siteNumber)));
      if (siteFile && !rec.name) { const nk = Object.keys(siteFile.meta).find((k) => /site name/i.test(k)); if (nk) rec.name = String(siteFile.meta[nk]); }
      if (existing) Object.assign(existing, rec); else S.stations.push(rec);
      if (!S.ro) { await put("stations", rec.id, clean({ code: rec.code, siteNumber: rec.siteNumber, name: rec.name })); await audit("STATION_LINK", "Auto-linked Site Report site number " + l.siteNumber + " to LandBank station " + l.code + (rec.name ? " (" + rec.name + ")" : "") + " — only one unlinked station on each side."); }
      toast("Linked site " + l.siteNumber + " ↔ LandBank station " + l.code + ". You can change this in Settings → Stations.");
    }
  }
  function recompute() {
    const settings = effSettings();
    const site = [], lb = [], cov = { site: {}, lb: {} };
    for (const f of S.files) {
      const map = S.mappings[mapKey(f)];
      f._missing = map ? R.missingRequired(map, f.side) : ["(no column mapping yet)"];
      if (f._missing.length || f.incomplete) { f._norm = null; continue; }
      const n = R.normalizeFile(f, map, settings);
      const c = R.fileCoverage(f, n.records);
      const sts = Array.from(new Set(n.records.map((r) => r.station)));
      f._norm = { seen: n.seen, count: n.records.length, issues: n.issues, excluded: n.excluded, stations: sts, cov: c, subsidy: R.r2(n.records.reduce((a, r) => a + r.subsidy, 0)) };
      (f.side === "site" ? site : lb).push(...n.records);
      if (c) for (const s of sts) (cov[f.side][s] = cov[f.side][s] || []).push(c);
    }
    S.site = site; S.lb = lb; S.cov = cov;
    S.result = R.reconcile(site, lb, settings, engineOverrides(), cov);
  }

  /* ======================= scope (station / period filters) ======================= */
  const inScope = (st, per) => (!S.filter.station || st === S.filter.station) && (!S.filter.period || per === S.filter.period);
  const scopedItems = () => (S.result ? S.result.items.filter((i) => inScope(i.station, i.period)) : []);
  const scopedRecs = (side) => S[side].filter((r) => inScope(r.station, r.date.slice(0, 7)));
  function stationLabel(code) { const s = S.stations.find((x) => x.code === code); return s && s.name ? code + " · " + s.name : code; }
  function finalOf(st, per) { const f = S.finals.find((x) => x.station === st && x.period === per); return f && f.status === "final" ? f : null; }
  const locked = (it) => !!finalOf(it.station, it.period);
  function recvRows() {
    const rc = S.receipts.filter((r) => !r.void), ap = S.approvals.filter((a) => !a.void);
    return R.receivables(S.result ? S.result.items : [], rc, ap).filter((r) => inScope(r.station, r.period));
  }

  /* ======================= charts ======================= */
  function tipLayer(container) {
    const tip = document.createElement("div"); tip.className = "tip"; container.appendChild(tip);
    container.addEventListener("mousemove", (e) => {
      const t = e.target.closest("[data-tip]");
      if (!t) { tip.style.display = "none"; return; }
      tip.innerHTML = t.getAttribute("data-tip"); tip.style.display = "block";
      const r = container.getBoundingClientRect();
      let x = e.clientX - r.left + 14, y = e.clientY - r.top + 12;
      if (x + tip.offsetWidth > r.width) x = e.clientX - r.left - tip.offsetWidth - 10;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
    container.addEventListener("mouseleave", () => (tip.style.display = "none"));
  }
  function roundTopBar(x, y, w, h, r) {
    if (h <= 0) return ""; r = Math.min(r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function roundRightBar(x, y, w, h, r) {
    if (w <= 0) return ""; r = Math.min(r, h / 2, w);
    return "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h - r) + "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
  }
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function shortP(v) { return Math.abs(v) >= 1e6 ? "₱" + (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1000 ? "₱" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : "₱" + v; }

  /** horizontal bars: rows [{label, value, sub, tip}] single hue */
  function hBars(rows, opts) {
    opts = opts || {};
    const W = 560, rowH = 30, lw = opts.labelW || 190, vw = 120, top = 4;
    const H = top + rows.length * rowH + 4;
    const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
    const bw = W - lw - vw;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.title || "") + '">';
    rows.forEach((r, i) => {
      const y = top + i * rowH, w = Math.max(r.value ? 2 : 0, (Math.abs(r.value) / max) * bw);
      s += '<g data-tip="' + esc(r.tip || (r.label + ": " + (opts.money ? P(r.value) : N(r.value)))) + '">';
      s += '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
      s += '<text class="lbl" x="' + (lw - 10) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end">' + esc(r.label) + "</text>";
      s += '<path d="' + roundRightBar(lw, y + 7, w, rowH - 14, 4) + '" fill="' + (r.color || "var(--accent)") + '"/>';
      s += '<text class="val" x="' + (lw + w + 8) + '" y="' + (y + rowH / 2 + 4) + '">' + esc(opts.money ? P(r.value) : N(r.value)) + (r.sub ? '<tspan fill="#7d7c76"> ' + esc(r.sub) + "</tspan>" : "") + "</text></g>";
    });
    return s + "</svg>";
  }
  /** grouped vertical bars: cats [label], series [{name,color,values}] */
  function groupBars(cats, series, opts) {
    opts = opts || {};
    const W = 620, H = 240, ml = 54, mr = 8, mt = 10, mb = 34;
    const pw = W - ml - mr, ph = H - mt - mb;
    const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
    const gw = pw / Math.max(1, cats.length), bw = Math.max(3, Math.min(34, (gw - 10) / series.length - 2));
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.title || "") + '"><g class="grid">';
    for (let k = 0; k <= 4; k++) { const y = mt + ph - (k / 4) * ph; s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '"/>'; }
    s += '</g><g class="axis">';
    for (let k = 0; k <= 4; k++) { const y = mt + ph - (k / 4) * ph; s += '<text x="' + (ml - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + shortP((max * k) / 4) + "</text>"; }
    const every = Math.ceil(cats.length / 12);
    cats.forEach((c, i) => { if (i % every === 0) s += '<text x="' + (ml + gw * i + gw / 2) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(opts.fmtCat ? opts.fmtCat(c) : c) + "</text>"; });
    s += "</g>";
    cats.forEach((c, i) => {
      const gx = ml + gw * i + (gw - (bw + 2) * series.length + 2) / 2;
      const tipRows = series.map((se) => '<span class="swatch" style="background:' + se.color + '"></span> ' + esc(se.name) + ": <b>" + P(se.values[i]) + "</b>").join("<br>");
      const diff = series.length === 2 ? "<br>Difference: <b>" + P(series[0].values[i] - series[1].values[i]) + "</b>" : "";
      s += '<g data-tip="' + esc("<b>" + esc(opts.fmtCat ? opts.fmtCat(c) : c) + "</b><br>" + tipRows + diff) + '"><rect x="' + (ml + gw * i) + '" y="' + mt + '" width="' + gw + '" height="' + ph + '" fill="transparent"/>';
      series.forEach((se, j) => { const h = (se.values[i] / max) * ph; s += '<path d="' + roundTopBar(gx + j * (bw + 2), mt + ph - h, bw, h, 4) + '" fill="' + se.color + '"/>'; });
      s += "</g>";
    });
    s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (mt + ph) + '" y2="' + (mt + ph) + '" stroke="#cfcfc8"/>';
    return s + "</svg>";
  }

  /* ======================= shell ======================= */
  const VIEWS = [
    ["dashboard", "Dashboard", "dashboard"], ["upload", "Upload Reports", "upload"], ["mapping", "Data Mapping", "mapping"],
    ["recon", "Reconciliation", "recon"], ["disc", "Discrepancy Monitoring", "disc"], ["recv", "Receivables Monitoring", "recv"],
    ["reports", "Reports", "reports"], ["settings", "Settings", "settings"]
  ];
  function shell() {
    const exc = S.result ? S.result.items.filter((i) => i.status !== ST.MATCHED && !i.flags.timing && !i.resolved).length : 0;
    const mode = S.demo ? '<span class="dot demo"></span>Demo mode (not saved)' : S.store.mode === "shared" ? '<span class="dot on"></span>Shared team storage' : S.store.mode === "local" ? '<span class="dot local"></span>Saved in this browser' : '<span class="dot"></span>Memory only';
    const periods = Array.from(new Set((S.result ? S.result.items : []).map((i) => i.period))).sort().reverse();
    const stations = Array.from(new Set((S.result ? S.result.items : []).map((i) => i.station).concat(S.stations.map((s) => s.code)))).sort();
    $("#app").innerHTML =
      '<div class="app"><aside class="sidebar"><div class="brandbox"><div class="t1">DOE Subsidy Recon</div><div class="t2">Site Report vs LandBank · ₱' + N(R.rateFor(S.settings, null), 2) + '/L</div></div><nav class="nav">' +
      VIEWS.map(([k, label, i]) => '<a href="#' + k + '" class="' + (S.view === k ? "active" : "") + '" data-nav="' + k + '">' + ic(i) + esc(label) + (k === "disc" && exc ? '<span class="badge">' + exc + "</span>" : "") + "</a>").join("") +
      '</nav><div class="sidefoot"><div class="mode">' + mode + "</div>" + (S.ro ? '<div style="margin-top:6px">View-only access</div>' : "") + '<div style="margin-top:6px">' + esc(S.store.mode === "shared" ? (S.names[S.me.id] || "Signed in") : (S.me.name || "Set your name in Settings")) + "</div></div></aside>" +
      '<div class="main"><div class="topbar"><h1 id="vt"></h1><div class="spacer"></div>' +
      '<label class="f">Station <select id="f-station"><option value="">All stations</option>' + stations.map((s) => '<option value="' + esc(s) + '"' + (S.filter.station === s ? " selected" : "") + ">" + esc(stationLabel(s)) + "</option>").join("") + "</select></label>" +
      '<label class="f">Period <select id="f-period"><option value="">All periods</option>' + periods.map((p) => '<option value="' + p + '"' + (S.filter.period === p ? " selected" : "") + ">" + monthName(p) + "</option>").join("") + "</select></label>" +
      (S.store.mode === "shared" && !S.demo ? '<button class="btn sm" id="refresh" title="Reload changes made by your team">Refresh</button>' : "") +
      '</div><div class="content" id="view"></div></div></div><div class="toasts" id="toasts"></div>';
    $$("[data-nav]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); go(a.dataset.nav); }));
    $("#f-station").addEventListener("change", (e) => { S.filter.station = e.target.value; S.rc.page = 0; render(); });
    $("#f-period").addEventListener("change", (e) => { S.filter.period = e.target.value; S.rc.page = 0; render(); });
    const rf = $("#refresh"); if (rf) rf.addEventListener("click", async () => { rf.disabled = true; await loadAll(); recompute(); render(); toast("Reloaded latest data."); });
  }
  function go(v) { S.view = v; try { history.replaceState(null, "", "#" + v); } catch (e) { location.hash = v; } render(); window.scrollTo(0, 0); }
  function render() {
    const keepToasts = $("#toasts") ? Array.from($("#toasts").children) : [];
    shell();
    keepToasts.forEach((t) => $("#toasts").appendChild(t));
    const V = { dashboard: vDashboard, upload: vUpload, mapping: vMapping, recon: vRecon, disc: vDisc, recv: vRecv, reports: vReports, settings: vSettings }[S.view] || vDashboard;
    const title = (VIEWS.find((x) => x[0] === S.view) || VIEWS[0])[1];
    $("#vt").textContent = title;
    const el = $("#view");
    let pre = "";
    if (S.demo) pre += '<div class="banner demo fx"><span><b>Demo mode.</b> Sample data for a fictional station — nothing is saved.</span><span class="spacer"></span><button class="btn sm" id="exit-demo">Exit demo</button></div>';
    if (S.ro && !S.demo) pre += '<div class="banner info">You have view-only access to this app. Ask the owner for Contributor access to upload or adjust records.</div>';
    el.innerHTML = pre + '<div id="vb"></div>';
    V($("#vb"));
    const ex = $("#exit-demo"); if (ex) ex.addEventListener("click", exitDemo);
  }

  /* ======================= DASHBOARD ======================= */
  function bridgeRows(items, sm) {
    const pairs = items.filter((i) => i.site && i.lb && !i.flags.suggestion);
    const singles = items.filter((i) => !(i.site && i.lb) || i.flags.suggestion);
    const sumF = (arr, f) => R.r2(arr.reduce((a, x) => a + (f(x) || 0), 0));
    const rows = [
      ["Site Report only — cut-off (LandBank report not yet loaded)", sumF(singles.filter((i) => i.site && i.flags.timing), (i) => i.siteSubsidy)],
      ["LandBank only — cut-off (belongs to another site business day)", -sumF(singles.filter((i) => i.lb && i.flags.timing), (i) => i.lbSubsidy)],
      ["Site Report only — not found in LandBank", sumF(singles.filter((i) => i.site && !i.flags.timing && i.status === ST.SITE_ONLY), (i) => i.siteSubsidy)],
      ["LandBank only — not found in Site Report", -sumF(singles.filter((i) => i.lb && !i.flags.timing && i.status === ST.LB_ONLY), (i) => i.lbSubsidy)],
      ["For verification (unconfirmed / ambiguous matches)", sumF(singles.filter((i) => i.status === ST.VERIFY), (i) => (i.siteSubsidy || 0) - (i.lbSubsidy || 0))],
      ["Subsidy differences on matched transactions", sumF(pairs.filter((i) => i.status === ST.AMOUNT), (i) => i.variance)],
      ["Rounding differences on matched transactions (within tolerance)", sumF(pairs.filter((i) => i.status !== ST.AMOUNT), (i) => i.variance)],
      ["Duplicate entries in Site Report (excluded)", sumF(items.filter((i) => i.status === ST.DUP && i.site), (i) => i.siteSubsidy)],
      ["Duplicate entries in LandBank Report (excluded)", -sumF(items.filter((i) => i.status === ST.DUP && i.lb), (i) => i.lbSubsidy)]
    ];
    const explained = R.r2(rows.reduce((a, r) => a + r[1], 0));
    return { rows, explained, unexplained: R.r2(sm.totalVariance - explained) };
  }
  function emptyState(el) {
    el.innerHTML = '<div class="card"><div class="empty">' + ic("upload").replace("<svg", '<svg style="width:40px;height:40px;color:#2a78d6"') +
      "<h3>No reports loaded yet</h3><p>Upload a DOE Subsidy Site Report and the matching LandBank report to start, or try the app with sample data first.</p>" +
      '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary" data-go="upload">Upload reports</button><button class="btn" id="demo-btn">Load sample data (demo)</button></div></div></div>';
    $$("[data-go]", el).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    $("#demo-btn", el).addEventListener("click", enterDemo);
  }
  function vDashboard(el) {
    if (!S.files.length) return emptyState(el);
    const items = scopedItems(), site = scopedRecs("site"), lb = scopedRecs("lb");
    const sm = R.summarize(items, site, lb, S.settings);
    const recv = recvRows();
    const outstanding = R.r2(recv.reduce((a, r) => a + r.outstanding, 0));
    const reimb = R.r2(recv.reduce((a, r) => a + r.reimbursed, 0));
    const br = bridgeRows(items, sm);
    const kpi = (lb, v, s, cls) => '<div class="card kpi ' + (cls || "") + '"><div class="lb">' + lb + '</div><div class="v">' + v + '</div><div class="s">' + (s || "&nbsp;") + "</div></div>";
    const rateTxt = "₱" + N(R.rateFor(S.settings, null), 2);
    const offs = S.result ? Object.entries(S.result.offsets).filter(([st]) => !S.filter.station || st === S.filter.station) : [];
    el.innerHTML =
      '<div class="grid g5 gap16">' +
      kpi('<span class="swatch" style="background:var(--series-site)"></span>Site Report transactions', N(sm.siteCount), "DOE voucher sales (" + P(sm.siteSubsidy) + ")", "hl") +
      kpi('<span class="swatch" style="background:var(--series-lb)"></span>LandBank transactions', N(sm.lbCount), "Reported by LandBank (" + P(sm.lbSubsidy) + ")", "hl") +
      kpi("Site Report liters", L(sm.siteLiters), sm.siteLitersDerived ? "Implied: subsidy ÷ voucher rate (DOE10 ₱10, DOE12 ₱12)" : "From Site Report") +
      kpi("LandBank liters", sm.lbHasLiters ? L(sm.lbLiters) : "—", sm.lbHasLiters ? "Liters dispensed" : "No liters column mapped") +
      kpi("Expected subsidy", sm.lbHasLiters ? P(sm.lbExpected) : P(sm.siteExpected), sm.lbHasLiters ? "LandBank liters × voucher rate" : "Site liters × voucher rate") +
      kpi("LandBank reported amount", P(sm.lbSubsidy), "Computed discount per LandBank") +
      kpi("Matched transactions", N(sm.matchedCount), N(sm.cleanMatched) + " fully agree · " + N(sm.invoiceMismatch) + " invoice keyed differently", "good") +
      kpi("Unmatched transactions", N(sm.unmatchedCount), N(sm.timingCount) + " are cut-off/timing items", sm.unmatchedCount - sm.timingCount > 0 ? "bad" : "") +
      kpi("Total amount variance", P(sm.totalVariance), "Site − LandBank · see breakdown below", Math.abs(sm.totalVariance) > 0.005 ? "" : "good") +
      kpi("Outstanding subsidy receivable", P(outstanding), "Validated " + P(R.r2(recv.reduce((a, r) => a + r.validated, 0))) + " − reimbursed " + P(reimb), "hl") +
      "</div>" +
      '<div class="grid g2 gap16"><div class="card"><div class="hd"><h3>Why the reports differ</h3><span class="sub">Site Report − LandBank, explained</span></div><div class="bd flush"><table class="t bridge"><tbody>' +
      '<tr><td>Site Report subsidy claimed</td><td class="n">' + P(sm.siteSubsidy) + "</td></tr>" +
      '<tr><td>Less: LandBank reported</td><td class="n">' + P(-sm.lbSubsidy) + "</td></tr>" +
      '<tr class="tot"><td>Difference</td><td class="n">' + P(sm.totalVariance) + "</td></tr>" +
      br.rows.filter((r) => Math.abs(r[1]) > 0.004).map((r) => '<tr><td style="padding-left:24px" class="muted">' + esc(r[0]) + '</td><td class="n">' + P(r[1]) + "</td></tr>").join("") +
      '<tr class="tot"><td>Unexplained difference</td><td class="n ' + (Math.abs(br.unexplained) > 0.004 ? "neg" : "") + '">' + P(br.unexplained) + (Math.abs(br.unexplained) < 0.005 ? ' <span class="chip good">' + ic("check") + "Fully explained</span>" : "") + "</td></tr>" +
      '</tbody></table></div></div><div class="card"><div class="hd"><h3>Transactions by reconciliation status</h3><span class="sub">count of records</span></div><div class="bd"><div class="chart" id="ch-status"></div></div></div></div>' +
      '<div class="grid g2 gap16"><div class="card"><div class="hd"><h3>Daily subsidy — Site Report vs LandBank</h3></div><div class="bd"><div class="legend"><span><i class="swatch" style="background:var(--series-site)"></i>Site Report</span><span><i class="swatch" style="background:var(--series-lb)"></i>LandBank</span></div><div class="chart" id="ch-daily"></div></div></div>' +
      '<div class="card"><div class="hd"><h3>Subsidy receivable stages</h3><span class="sub">reported ≠ reimbursed</span></div><div class="bd"><div class="chart" id="ch-recv"></div></div></div></div>' +
      '<div class="card"><div class="hd"><h3>Data coverage & matching basis</h3></div><div class="bd"><div class="grid g2"><div><div class="small muted" style="margin-bottom:6px">Loaded periods per station</div>' + coverageHtml() + '</div><div class="small">' +
      offs.map(([st, o]) => "<div><b>" + esc(stationLabel(st)) + "</b>: LandBank clock runs <b>" + N(o.used, 1) + " min</b> ahead of the POS clock (" + (o.mode === "auto" ? "detected from " + o.n + " invoice matches" : "manual setting") + ").</div>").join("") +
      '<div class="muted" style="margin-top:8px">Matching: Level 1 invoice number → Level 2 similar invoice + same subsidy, pump amount and time (±' + S.settings.timeWindowMin + " min) → Level 3 amount + time only (" + (S.settings.autoAcceptL3 ? "auto-accepted" : "suggested for review") + "). Amount tolerance ₱" + N(S.settings.amountTol, 2) + ".</div></div></div></div></div>";
    // charts
    const stRows = R.STATUS_ORDER.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: sm.byStatus[s].count, tip: "<b>" + esc(s) + "</b><br>" + sm.byStatus[s].count + " records<br>Site " + P(sm.byStatus[s].site) + " · LandBank " + P(sm.byStatus[s].lb) }));
    $("#ch-status").innerHTML = hBars(stRows, { title: "Records by status", labelW: 180 }); tipLayer($("#ch-status"));
    const days = Array.from(new Set(site.map((r) => r.date).concat(lb.map((r) => r.date)))).sort();
    const sumBy = (arr, d) => R.r2(arr.filter((r) => r.date === d).reduce((a, r) => a + r.subsidy, 0));
    $("#ch-daily").innerHTML = groupBars(days, [{ name: "Site Report", color: "var(--series-site)", values: days.map((d) => sumBy(site, d)) }, { name: "LandBank", color: "var(--series-lb)", values: days.map((d) => sumBy(lb, d)) }], { title: "Daily subsidy", fmtCat: (d) => d.slice(5) }); tipLayer($("#ch-daily"));
    const appr = R.r2(recv.reduce((a, r) => a + r.approved, 0)), val = R.r2(recv.reduce((a, r) => a + r.validated, 0));
    $("#ch-recv").innerHTML = hBars([
      { label: "Claimed (Site Report)", value: sm.nonDupSiteSubsidy }, { label: "Reported by LandBank", value: sm.nonDupLbSubsidy },
      { label: "Validated (matched)", value: val }, { label: "Approved", value: appr }, { label: "Actually reimbursed", value: reimb }, { label: "Outstanding", value: outstanding }
    ], { money: true, labelW: 170, title: "Receivable stages" }); tipLayer($("#ch-recv"));
  }
  function coverageHtml() {
    const byStation = {};
    for (const f of S.files) { if (!f._norm) continue; for (const st of f._norm.stations) { if (S.filter.station && st !== S.filter.station) continue; (byStation[st] = byStation[st] || { site: [], lb: [] })[f.side].push(f._norm.cov); } }
    const fmt = (c, side) => side === "site" ? R.msToDT(c.start).slice(0, 16) + " → " + R.msToDT(c.end).slice(0, 16) : R.msToDate(c.start) + (R.msToDate(c.end) !== R.msToDate(c.start) ? " → " + R.msToDate(c.end) : "");
    const keys = Object.keys(byStation);
    if (!keys.length) return '<div class="muted small">No processed files.</div>';
    return keys.map((st) => '<div class="small" style="margin-bottom:8px"><b>' + esc(stationLabel(st)) + '</b><div class="muted">Site Report: ' + (byStation[st].site.sort((a, b) => a.start - b.start).map((c) => fmt(c, "site")).join("; ") || "none") + "</div><div class=\"muted\">LandBank: " + (byStation[st].lb.sort((a, b) => a.start - b.start).map((c) => fmt(c, "lb")).join("; ") || "none") + "</div></div>").join("");
  }

  /* ======================= UPLOAD ======================= */
  function vUpload(el) {
    el.innerHTML =
      '<div class="grid g2 gap16">' +
      ["site", "lb"].map((side) => '<div class="drop" data-side="' + side + '" tabindex="0" role="button">' + ic("cloud").replace("<svg", '<svg class="ic"') + "<h3>" + (side === "site" ? "DOE Subsidy Site Report" : "LandBank Report") + "</h3><p>Drag & drop or click · Excel (.xlsx/.xls) or CSV · several days at once" + (side === "lb" ? "<br>Password-protected files are decrypted in your browser" : "") + '</p><input type="file" multiple accept=".xlsx,.xls,.csv,.xlsm" class="hidden"></div>').join("") +
      "</div>" +
      zeroBanner() +
      (S.staged.length ? stagedHtml() : "") +
      '<div class="card gap16"><div class="hd"><h3>Uploaded reports</h3><span class="sub">' + S.files.length + ' files · originals are kept unchanged</span><span class="grow"></span><button class="btn sm" id="run-btn"' + (S.files.length ? "" : " disabled") + ">Run reconciliation</button></div><div class=\"bd flush\" id=\"files-tbl\">" + filesTable() + '</div><div id="run-progress" class="bd hidden"></div></div>' +
      '<div class="card"><div class="hd"><h3>Sample data</h3><span class="sub">fictional DEMO STATION · 2 business days · every discrepancy type</span></div><div class="bd row"><button class="btn" id="demo-btn">Load sample data (demo mode)</button><button class="btn" id="sample-dl">' + ic("dl") + 'Download sample files (.zip)</button><span class="small muted">Demo mode runs in memory and does not touch your saved data.</span></div></div>';
    $$("[data-fixmap]", el).forEach((b) => b.addEventListener("click", () => { S.mapSel = b.dataset.fixmap; go("mapping"); }));
    $$(".drop", el).forEach((d) => {
      const inp = $("input", d);
      d.addEventListener("click", () => { if (canChange()) inp.click(); });
      d.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (canChange()) inp.click(); } });
      inp.addEventListener("change", () => { stageFiles(Array.from(inp.files), d.dataset.side); inp.value = ""; });
      d.addEventListener("dragover", (e) => { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", () => d.classList.remove("over"));
      d.addEventListener("drop", (e) => { e.preventDefault(); d.classList.remove("over"); if (canChange()) stageFiles(Array.from(e.dataTransfer.files), d.dataset.side); });
    });
    $("#demo-btn", el).addEventListener("click", enterDemo);
    $("#sample-dl", el).addEventListener("click", downloadSamples);
    $("#run-btn", el).addEventListener("click", () => runWithProgress());
    bindStaged(el); bindFilesTable(el);
  }
  const fkey = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
  function zeroBanner() {
    const zero = S.files.filter((f) => f.side === "site" && f._norm && f._norm.count === 0);
    if (!zero.length) return "";
    return '<div class="banner err fx"><span><b>' + zero.length + " Site Report file(s) have 0 DOE subsidy rows:</b> " + esc(zero.map((f) => f.name).join(", ")) + ". None of their rows match the DOE filter (MOP Name: " + esc((S.settings.siteFilters.mop || []).join(", ") || "any") + "; Reference Code: " + esc((S.settings.siteFilters.refCode || []).join(", ") || "any") + "). No need to re-upload — fix the filter and the files update automatically.</span><span class=\"spacer\"></span><button class=\"btn sm\" data-fixmap=\"" + esc(mapKey(zero[0])) + "\">Fix filter</button></div>";
  }
  function filesTable() {
    if (!S.files.length) return '<div class="empty small">No reports uploaded yet.</div>';
    return '<div class="tbl-wrap"><table class="t"><thead><tr><th>Report</th><th>File</th><th>Station</th><th>Coverage</th><th class="n">Rows</th><th class="n">DOE rows used</th><th class="n">Subsidy</th><th>Status</th><th>Uploaded</th><th></th></tr></thead><tbody>' +
      S.files.map((f) => {
        const n = f._norm;
        const status = f.incomplete ? '<span class="chip critical">Incomplete in storage</span>' : f._missing && f._missing.length ? '<span class="chip critical">' + ic("x") + "Missing: " + esc(f._missing.join(", ")) + "</span>" : n && n.count === 0 ? '<span class="chip critical" title="No rows were counted. Open Data Mapping to check the DOE filter.">' + ic("x") + (f.side === "site" ? "0 DOE rows – check filter" : "No usable rows") + "</span>" : n && n.issues.length ? '<span class="chip warn">' + ic("warn") + n.issues.length + " row issue(s)</span>" : '<span class="chip good">' + ic("check") + "Ready</span>";
        const cov = n && n.cov ? (f.side === "site" ? R.msToDT(n.cov.start).slice(0, 16) + " → " + R.msToDT(n.cov.end).slice(0, 16) : R.msToDate(n.cov.start) + (R.msToDate(n.cov.end) !== R.msToDate(n.cov.start) ? " → " + R.msToDate(n.cov.end) : "")) : "—";
        return '<tr><td><span class="chip ' + (f.side === "site" ? "info" : "serious") + '" style="' + (f.side === "lb" ? "background:#fdeee7" : "") + '">' + (f.side === "site" ? "Site Report" : "LandBank") + "</span>" + (f.encrypted ? ' <span class="tag" title="Password-protected original">' + ic("lock").replace("<svg", '<svg style="width:10px;height:10px;vertical-align:-1px"') + " encrypted</span>" : "") +
          '</td><td><div style="font-weight:500">' + esc(f.name) + '</div><div class="xs muted">' + esc(f.sheet) + " · header row " + f.headerRow + '</div></td><td class="small">' + esc(n ? n.stations.map(stationLabel).join(", ") : "—") + '</td><td class="small">' + cov + '</td><td class="n">' + N(f.rowCount) + '</td><td class="n">' + (n ? N(n.count) : "—") + '</td><td class="n">' + (n ? P(n.subsidy) : "—") + "</td><td>" + status + '</td><td class="small">' + fmtTs(f.uploadedAt) + '<div class="xs muted">' + esc(who(f)) + '</div></td><td class="row" style="flex-wrap:nowrap"><button class="btn sm" data-prev="' + f.id + '">Preview</button><button class="btn sm danger" data-rm="' + f.id + '">Remove</button></td></tr>';
      }).join("") + "</tbody></table></div>";
  }
  function bindFilesTable(el) {
    $$("[data-prev]", el).forEach((b) => b.addEventListener("click", () => previewFile(S.files.find((f) => f.id === b.dataset.prev))));
    $$("[data-rm]", el).forEach((b) => b.addEventListener("click", () => removeFile(b.dataset.rm)));
  }
  function previewFile(f, staged) {
    const map = S.mappings[mapKey(f)] || R.autoMap(f.headers, f.meta, f.side);
    const miss = R.missingRequired(map, f.side);
    const n = f._norm;
    const rows = f.rows.slice(0, 15);
    const mappedCols = new Set(Object.values(map).filter((m) => m && m.col != null).map((m) => m.col));
    modal('<div class="mh"><h3>' + esc(f.name) + '</h3><span class="chip ' + (f.side === "site" ? "info" : "serious") + '">' + (f.side === "site" ? "Site Report" : "LandBank Report") + '</span><span class="grow"></span><button class="btn sm ghost" data-close>' + ic("x") + '</button></div><div class="mb">' +
      (miss.length ? '<div class="banner err">Required field(s) not found: <b>' + esc(miss.join(", ")) + "</b>. Assign them in Data Mapping — the app will not guess or invent these values.</div>" : "") +
      (Object.keys(f.meta || {}).length ? '<dl class="kv" style="margin-bottom:12px">' + Object.entries(f.meta).map(([k, v]) => "<dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd>").join("") + "</dl>" : "") +
      '<div class="small muted" style="margin-bottom:6px">Sheet "' + esc(f.sheet) + '", header detected on row ' + f.headerRow + ", " + N(f.rowCount) + " data rows. Highlighted columns are mapped." + (n ? " " + N(n.count) + " rows qualify as DOE subsidy transactions." : "") + '</div>' +
      '<div class="tbl-wrap" style="max-height:52vh"><table class="t"><thead><tr><th>Row</th>' + f.headers.map((h, j) => '<th style="' + (mappedCols.has(j) ? "background:#e9f1fb;color:#1c5cab" : "") + '">' + esc(h) + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr><td class=\"muted\">" + r.n + "</td>" + r.c.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>" +
      (n && n.issues.length ? '<div style="margin-top:12px"><b class="small">Row issues</b><ul class="small">' + n.issues.slice(0, 30).map((i) => "<li>Row " + i.row + ": " + esc(i.msg) + "</li>").join("") + "</ul></div>" : "") +
      (n && Object.keys(n.excluded).length ? '<div class="small muted" style="margin-top:8px">Excluded by Site Report filter (not DOE subsidy): ' + Object.entries(groupExcluded(n.excluded)).map(([k, v]) => esc(k) + " (" + v + ")").join(", ") + "</div>" : "") +
      '</div><div class="mf"><button class="btn" data-close>Close</button></div>', { wide: true });
  }
  function groupExcluded(ex) { const g = {}; for (const [k, v] of Object.entries(ex)) { const name = k.split(" / ")[0]; g[name] = (g[name] || 0) + v; } return g; }

  async function removeFile(id) {
    if (!canChange()) return;
    const f = S.files.find((x) => x.id === id); if (!f) return;
    const touches = S.result ? S.result.items.filter((i) => (i.site && i.site.fileId === id) || (i.lb && i.lb.fileId === id)) : [];
    const lockedP = Array.from(new Set(touches.filter(locked).map((i) => i.station + " " + i.period)));
    if (lockedP.length) { toast("This file is part of a finalized reconciliation (" + lockedP.join(", ") + "). Reopen the period first.", "err"); return; }
    const ok = await confirmBox("Remove " + f.name + "?", "<p>The file and its " + N(f.rowCount) + " rows will be removed from the reconciliation. Manual matches and notes stay on record. This is logged in the audit trail.</p>", "Remove file", { danger: true, reason: "Reason for removal" });
    if (!ok) return;
    const chunkIds = Array.from({ length: f.chunkCount || 0 }, (_, i) => f.id + "_" + i);
    for (const c of chunkIds) await del("chunks", c);
    await del("files", f.id);
    await audit("FILE_REMOVE", "Removed " + (f.side === "site" ? "Site Report" : "LandBank Report") + " file " + f.name + " (" + f.rowCount + " rows). Reason: " + ok.reason, f.id);
    S.files = S.files.filter((x) => x.id !== id);
    recompute(); render(); toast("File removed.");
  }

  /* ---------- staging (preview before processing) ---------- */
  async function hashHex(bytes) {
    try { const d = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
    catch (e) { return window.sha1(bytes); }
  }
  function passwordPrompt(fileName, code, failed) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal('<div class="mh"><h3>' + ic("lock").replace("<svg", '<svg style="width:18px;height:18px"') + " Password required</h3></div><div class=\"mb\"><p class=\"small\"><b>" + esc(fileName) + "</b> is password-protected" + (code ? " (station " + esc(code) + ")" : "") + ". The password is used only in this browser to open the file.</p>" +
        (failed ? '<div class="banner err">' + esc(failed) + "</div>" : "") +
        '<input type="password" id="pw" style="width:100%" autocomplete="off" placeholder="Password"><label class="row small" style="margin-top:10px"><input type="checkbox" id="pw-rem"> Remember for station ' + esc(code || "(from file name)") + ' on this device only</label></div><div class="mf"><button class="btn" data-close>Skip file</button><button class="btn primary" id="pw-ok">Open</button></div>',
        { onClose: () => { if (!done) resolve(null); }, sticky: true });
      const ok = () => { done = true; const v = $("#pw", m.el).value; const rem = $("#pw-rem", m.el).checked; m.close(); resolve({ pw: v, remember: rem }); };
      $("#pw-ok", m.el).addEventListener("click", ok);
      $("#pw", m.el).addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); });
    });
  }
  async function decryptFile(bytes, fileName) {
    const code = R.stationFromFileName(fileName);
    const saved = lsGet("doeRecon.passwords", {});
    const tpl = lsGet("doeRecon.pwTemplate", "");
    const tries = [];
    if (code && saved[code]) tries.push(saved[code]);
    if (tpl && code) tries.push(tpl.replace(/\{station\}/gi, code));
    for (const pw of tries) { try { return window.OfficeDecrypt.decrypt(bytes, pw); } catch (e) { if (e.code !== "BAD_PASSWORD") throw e; } }
    let failed = tries.length ? "The saved password did not open this file." : "";
    for (;;) {
      const ans = await passwordPrompt(fileName, code, failed);
      if (!ans) return null;
      try {
        const out = window.OfficeDecrypt.decrypt(bytes, ans.pw);
        if (ans.remember && code) { saved[code] = ans.pw; lsSet("doeRecon.passwords", saved); }
        return out;
      } catch (e) { if (e.code !== "BAD_PASSWORD") throw e; failed = "Incorrect password — please try again."; }
    }
  }
  async function readUpload(file, sideHint, bytesIn) {
    const bytes = bytesIn || new Uint8Array(await file.arrayBuffer());
    const hash = await hashHex(bytes);
    const dupe = S.files.find((f) => f.hash === hash) || S.staged.find((f) => f.hash === hash);
    if (dupe) throw new Error("Identical file already " + (dupe.uploadedAt ? "uploaded on " + fmtTs(dupe.uploadedAt) + " (" + dupe.name + ")" : "staged") + ". Duplicate upload blocked to prevent double counting. Mapping and filter changes apply to uploaded files automatically, so there is no need to re-upload; to replace the file, remove it first.");
    let wb, encrypted = false;
    const isCsv = /\.csv$/i.test(file.name) || (bytes[0] !== 0x50 && bytes[0] !== 0xd0 && bytes[0] !== 0x09);
    if (window.OfficeDecrypt.isEncrypted(bytes)) {
      encrypted = true;
      const plain = await decryptFile(bytes, file.name);
      if (!plain) return null;
      wb = XLSX.read(plain, { type: "array" });
    } else if (isCsv) {
      wb = XLSX.read(new TextDecoder("utf-8").decode(bytes), { type: "string", raw: true });
    } else wb = XLSX.read(bytes, { type: "array" });
    const p = R.parseWorkbook(wb, XLSX);
    if (!p) throw new Error("Could not find a header row with recognizable columns (e.g. Date, Invoice, Amount). Check that this is a Site Report or LandBank report.");
    let side = sideHint, note = "";
    if (p.side !== sideHint) { side = p.side; note = "Looks like a " + (p.side === "site" ? "Site Report" : "LandBank report") + " — filed under that report type."; }
    return { id: uid(), name: file.name, side, hash, size: bytes.length, encrypted, sheet: p.sheet, headerRow: p.headerRow, headers: p.headers, meta: p.meta, rows: p.rows, rowCount: p.rows.length, note };
  }
  async function stageFiles(list, sideHint) {
    if (!list.length) return;
    for (const file of list) {
      try {
        toast("Reading " + file.name + "…");
        await tick();
        const f = await readUpload(file, sideHint);
        if (!f) { toast("Skipped " + file.name + " (no password).", "err"); continue; }
        S.staged.push(f);
        if (f.note) toast(file.name + ": " + f.note);
      } catch (e) { toast(file.name + ": " + (e.message || e), "err"); }
    }
    if (S.view === "upload") render();
  }
  function stagedHtml() {
    return '<div class="card gap16" style="border-color:#c3d8f3"><div class="hd"><h3>Ready to process — review before saving</h3><span class="sub">' + S.staged.length + ' file(s)</span><span class="grow"></span><button class="btn" id="stg-clear">Discard</button><button class="btn primary" id="stg-go">Save & reconcile</button></div><div class="bd flush"><table class="t"><thead><tr><th>Report</th><th>File</th><th>Detected header</th><th class="n">Rows</th><th>Required fields</th><th>Report info</th><th></th></tr></thead><tbody>' +
      S.staged.map((f) => {
        const map = S.mappings[mapKey(f)] || R.autoMap(f.headers, f.meta, f.side);
        const miss = R.missingRequired(map, f.side);
        return '<tr><td><select data-side="' + f.id + '"><option value="site"' + (f.side === "site" ? " selected" : "") + '>Site Report</option><option value="lb"' + (f.side === "lb" ? " selected" : "") + ">LandBank</option></select></td><td>" + esc(f.name) + (f.encrypted ? ' <span class="tag">decrypted</span>' : "") + '</td><td class="small">Sheet "' + esc(f.sheet) + '", row ' + f.headerRow + ' · ' + f.headers.length + ' columns</td><td class="n">' + N(f.rowCount) + "</td><td>" + (miss.length ? '<span class="chip critical">Missing: ' + esc(miss.join(", ")) + "</span>" : '<span class="chip good">' + ic("check") + "All found</span>") + '</td><td class="small muted">' + esc(Object.entries(f.meta || {}).filter(([k]) => /site|period|start|end/i.test(k)).map(([k, v]) => k + ": " + v).join(" · ")) + '</td><td class="row" style="flex-wrap:nowrap"><button class="btn sm" data-sprev="' + f.id + '">Preview</button><button class="btn sm ghost" data-sdel="' + f.id + '">' + ic("x") + "</button></td></tr>";
      }).join("") + "</tbody></table></div></div>";
  }
  function bindStaged(el) {
    if (!S.staged.length) return;
    $("#stg-clear", el).addEventListener("click", () => { S.staged = []; render(); });
    $("#stg-go", el).addEventListener("click", () => commitStaged());
    $$("[data-sprev]", el).forEach((b) => b.addEventListener("click", () => previewFile(S.staged.find((f) => f.id === b.dataset.sprev), true)));
    $$("[data-sdel]", el).forEach((b) => b.addEventListener("click", () => { S.staged = S.staged.filter((f) => f.id !== b.dataset.sdel); render(); }));
    $$("select[data-side]", el).forEach((s) => s.addEventListener("change", () => { const f = S.staged.find((x) => x.id === s.dataset.side); f.side = s.value; render(); }));
  }
  function chunkRows(rows) {
    const out = []; let cur = [], size = 0;
    for (const r of rows) { const s = JSON.stringify(r).length; if (cur.length && size + s > 150000) { out.push(cur); cur = []; size = 0; } cur.push(r); size += s; }
    if (cur.length) out.push(cur);
    return out;
  }
  async function commitStaged(silent) {
    if (!canChange()) return;
    const list = S.staged.slice();
    const prog = $("#run-progress");
    const steps = list.map((f) => "Saving " + f.name).concat(["Linking stations", "Normalizing transactions", "Matching & classifying", "Updating receivables"]);
    let k = 0;
    const show = () => { if (!prog) return; prog.classList.remove("hidden"); prog.innerHTML = '<div class="progress" style="margin-bottom:10px"><div style="width:' + Math.round((k / steps.length) * 100) + '%"></div></div><div class="steps">' + steps.map((s, i) => '<div class="step ' + (i < k ? "done" : i === k ? "run" : "") + '"><span class="b">' + (i < k ? "✓" : i + 1) + "</span>" + esc(s) + "</div>").join("") + "</div>"; };
    show();
    for (const f of list) {
      const key = mapKey(f);
      if (!S.mappings[key]) { const m = R.autoMap(f.headers, f.meta, f.side); S.mappings[key] = m; await put("mappings", key, { side: f.side, headers: f.headers, map: m }); await audit("MAPPING_AUTO", "Auto-detected column mapping for " + (f.side === "site" ? "Site Report" : "LandBank") + " layout (" + f.headers.length + " columns) from " + f.name, key); }
      const chunks = chunkRows(f.rows);
      const meta = clean(Object.assign({ name: f.name, side: f.side, hash: f.hash, size: f.size, encrypted: f.encrypted, sheet: f.sheet, headerRow: f.headerRow, headers: f.headers, meta: f.meta, rowCount: f.rowCount, chunkCount: chunks.length, uploadedAt: nowIso() }, stamp()));
      delete meta.ts;
      let ok = true;
      for (let i = 0; i < chunks.length && ok; i++) ok = await put("chunks", f.id + "_" + i, { fileId: f.id, idx: i, rows: chunks[i] });
      if (ok) ok = await put("files", f.id, meta);
      if (!ok) { toast("Upload of " + f.name + " was not saved.", "err"); break; }
      S.files.push(Object.assign({ id: f.id, rows: f.rows }, meta));
      S.staged = S.staged.filter((x) => x.id !== f.id);
      await audit("FILE_UPLOAD", "Uploaded " + (f.side === "site" ? "Site Report" : "LandBank Report") + " " + f.name + " — " + f.rowCount + " rows, sheet \"" + f.sheet + "\"" + (f.encrypted ? ", password-protected original" : "") + ". SHA-256 " + f.hash.slice(0, 16) + "…", f.id);
      k++; show(); await tick();
    }
    await autoLinkStations(); k++; show(); await tick();
    await runWithProgress(true, () => { k = steps.length - 3; show(); }, (n) => { k = steps.length - 3 + n; show(); });
    if (!silent) toast("Reconciliation updated.", "ok");
  }
  async function runWithProgress(fromCommit, onStart, onStep) {
    if (!fromCommit) {
      const prog = $("#run-progress"); const steps = ["Normalizing " + S.files.length + " files", "Matching (Level 1 → 3) & classifying", "Updating receivables & dashboard"];
      let k = 0;
      const show = () => { if (!prog) return; prog.classList.remove("hidden"); prog.innerHTML = '<div class="progress" style="margin-bottom:10px"><div style="width:' + Math.round((k / steps.length) * 100) + '%"></div></div><div class="steps">' + steps.map((s, i) => '<div class="step ' + (i < k ? "done" : i === k ? "run" : "") + '"><span class="b">' + (i < k ? "✓" : i + 1) + "</span>" + esc(s) + "</div>").join("") + "</div>"; };
      onStart = () => { k = 0; show(); }; onStep = (n) => { k = n; show(); };
    }
    onStart && onStart(); await tick(); await new Promise((r) => setTimeout(r, 120));
    recompute(); onStep && onStep(1); await new Promise((r) => setTimeout(r, 120));
    const sm = R.summarize(S.result.items, S.site, S.lb, S.settings); onStep && onStep(2); await new Promise((r) => setTimeout(r, 120));
    onStep && onStep(3);
    if (!fromCommit) { await audit("RECON_RUN", "Reconciliation run: " + sm.siteCount + " site / " + sm.lbCount + " LandBank transactions, " + sm.matchedCount + " matched, " + sm.unmatchedCount + " unmatched, variance " + P(sm.totalVariance) + "."); toast("Reconciliation complete: " + sm.matchedCount + " matched, " + sm.unmatchedCount + " unmatched.", "ok"); }
    setTimeout(() => render(), 300);
  }

  /* ======================= DATA MAPPING ======================= */
  function vMapping(el) {
    const groups = {};
    for (const f of S.files.concat(S.staged)) { const k = mapKey(f); (groups[k] = groups[k] || { key: k, side: f.side, headers: f.headers, files: [], sample: f }).files.push(f); }
    const keys = Object.keys(groups);
    if (!keys.length) { el.innerHTML = '<div class="card"><div class="empty"><h3>No files to map</h3><p>Upload a report first; columns are detected automatically and you can adjust them here.</p></div></div>'; return; }
    S.mapSel = S.mapSel && groups[S.mapSel] ? S.mapSel : keys[0];
    const g = groups[S.mapSel];
    const map = Object.assign({}, S.mappings[g.key] || R.autoMap(g.headers, g.sample.meta, g.side));
    const fields = R.FIELDS[g.side];
    const miss = R.missingRequired(map, g.side);
    const metaKeys = Object.keys(g.sample.meta || {});
    const opt = (fk) => {
      const m = map[fk]; const sel = m ? (m.col != null ? "c" + m.col : "m" + m.meta) : "";
      return '<select data-f="' + fk + '" style="width:100%"><option value="">— not available —</option>' + g.headers.map((h, j) => '<option value="c' + j + '"' + (sel === "c" + j ? " selected" : "") + ">" + esc(h) + "</option>").join("") +
        (metaKeys.length ? '<optgroup label="From report header">' + metaKeys.map((k) => '<option value="m' + esc(k) + '"' + (sel === "m" + k ? " selected" : "") + ">" + esc(k) + ": " + esc(g.sample.meta[k]) + "</option>").join("") + "</optgroup>" : "") + "</select>";
    };
    const sample = (fk) => { const m = map[fk]; if (!m) return ""; const vals = m.meta ? [g.sample.meta[m.meta]] : g.sample.rows.slice(0, 3).map((r) => r.c[m.col]); return vals.map((v) => esc(v)).join(" · "); };
    const mopVals = {}, refVals = {};
    const mopSel = (S.settings.siteFilters.mop || []).map(R.nh);
    if (g.side === "site") for (const f of g.files) for (const r of f.rows) {
      if (map.mop) { const v = r.c[map.mop.col]; mopVals[v] = (mopVals[v] || 0) + 1; }
      if (map.refCode && (!map.mop || !mopSel.length || mopSel.includes(R.nh(r.c[map.mop.col])))) { const v = r.c[map.refCode.col]; refVals[v] = (refVals[v] || 0) + 1; }
    }
    if (g.side === "site" && map.refCode && !Object.keys(refVals).length) for (const f of g.files) for (const r of f.rows) { const v = r.c[map.refCode.col]; refVals[v] = (refVals[v] || 0) + 1; }
    const doeLike = (v) => /doe|subsid|fuel ?sub/i.test(String(v == null ? "" : v));
    const zeroFiles = g.side === "site" ? g.files.filter((f) => f._norm && f._norm.count === 0) : [];
    const candMop = [], candRef = [];
    if (zeroFiles.length) {
      const fm = (S.settings.siteFilters.mop || []).map(fkey), fr = (S.settings.siteFilters.refCode || []).map(fkey);
      for (const f of zeroFiles) for (const r of f.rows) {
        const mv = map.mop ? r.c[map.mop.col] : null, rv = map.refCode ? r.c[map.refCode.col] : null;
        if (!(doeLike(mv) || doeLike(rv))) continue;
        if (map.mop && mv != null && mv !== "" && !fm.includes(fkey(mv)) && !candMop.includes(String(mv))) candMop.push(String(mv));
        if (map.refCode && rv != null && rv !== "" && !fr.includes(fkey(rv)) && !candRef.includes(String(rv))) candRef.push(String(rv));
      }
    }
    const zeroHtml = zeroFiles.length ? '<div class="banner err"><b>' + zeroFiles.length + " file(s) with this layout have 0 DOE subsidy rows</b> (" + esc(zeroFiles.map((f) => f.name).join(", ")) + "). The current filter is MOP Name: <b>" + esc((S.settings.siteFilters.mop || []).join(", ") || "any") + "</b>, Reference Code: <b>" + esc((S.settings.siteFilters.refCode || []).join(", ") || "any") + "</b>." +
      ((candMop.length || candRef.length) ? "<div style=\"margin-top:6px\">These values in those files look like DOE subsidy: " + (candMop.length ? "MOP Name <b>" + esc(candMop.join(", ")) + "</b> " : "") + (candRef.length ? "Reference Code <b>" + esc(candRef.join(", ")) + "</b>" : "") + '. <button class="btn sm" id="filt-auto" style="margin-left:6px">Include these values</button></div>' : "<div style=\"margin-top:6px\">No values containing \"DOE\" were found. Tick the correct MOP Name and Reference Code values on the right, then Save filter.</div>") + "</div>" : "";
    el.innerHTML =
      '<div class="row gap16"><label class="small muted">Report layout</label><select id="map-sel">' + keys.map((k) => '<option value="' + k + '"' + (k === S.mapSel ? " selected" : "") + ">" + (groups[k].side === "site" ? "Site Report" : "LandBank") + " · " + groups[k].headers.length + " columns · " + groups[k].files.length + " file(s): " + esc(groups[k].files.map((f) => f.name).join(", ").slice(0, 90)) + "</option>").join("") + "</select></div>" +
      zeroHtml + (miss.length ? '<div class="banner err">Required field(s) not mapped: <b>' + esc(miss.join(", ")) + "</b>. Files with this layout are excluded from reconciliation until you assign them. If the report truly does not contain this field, ask for a report that does — the app will not assume values.</div>" : '<div class="banner info">All required fields are mapped. The same mapping is reused for every file with this column layout.</div>') +
      '<div class="grid g2"><div class="card"><div class="hd"><h3>Column mapping</h3><span class="sub">' + (g.side === "site" ? "DOE Subsidy Site Report" : "LandBank Report") + '</span></div><div class="bd flush"><table class="t"><thead><tr><th>Field</th><th style="width:44%">Source column</th><th>Sample values</th></tr></thead><tbody>' +
      fields.map((f) => "<tr><td>" + esc(f.label) + (f.req ? ' <span class="chip critical" style="padding:0 6px">required</span>' : "") + "</td><td>" + opt(f.key) + '</td><td class="small muted">' + sample(f.key) + "</td></tr>").join("") +
      '</tbody></table></div><div class="bd row end"><button class="btn" id="map-reset">Re-detect automatically</button><button class="btn primary" id="map-save">Save mapping</button></div></div>' +
      '<div>' + (g.side === "site" ? '<div class="card gap16"><div class="hd"><h3>Which Site Report rows are DOE subsidy?</h3></div><div class="bd"><p class="small muted" style="margin-top:0">Only rows matching these values are reconciled. Others (e.g. GrabMart, FoodPanda) are excluded and listed in the file preview. Reference codes written as DOE + a number (DOE10, DOE12) are always recognized.</p>' +
        '<div class="small" style="margin-bottom:4px"><b>MOP Name</b> values found:</div>' + (Object.keys(mopVals).length ? Object.entries(mopVals).sort((a, b) => b[1] - a[1]).map(([v, c]) => '<label class="row small"><input type="checkbox" data-mop="' + esc(v) + '"' + ((S.settings.siteFilters.mop || []).map(fkey).includes(fkey(v)) ? " checked" : "") + "> " + esc(v) + ' <span class="muted">(' + c + " rows)</span></label>").join("") : '<div class="small muted">MOP column not mapped — all rows included.</div>') +
        '<div class="small" style="margin:10px 0 4px"><b>Reference Code</b> values (DOE-like first):</div>' + (Object.keys(refVals).length ? Object.entries(refVals).sort((a, b) => (doeLike(b[0]) - doeLike(a[0])) || (b[1] - a[1])).slice(0, 15).map(([v, c]) => '<label class="row small"><input type="checkbox" data-ref="' + esc(v) + '"' + ((S.settings.siteFilters.refCode || []).map(fkey).includes(fkey(v)) || /^doe\d{1,3}$/.test(fkey(v)) ? " checked" : "") + "> " + esc(v) + ' <span class="muted">(' + c + " rows)</span></label>").join("") : '<div class="small muted">Reference column not mapped.</div>') +
        '<div class="row end" style="margin-top:10px"><button class="btn" id="filt-save"' + (S.canAdmin ? "" : " disabled title=\"Editors only\"") + ">Save filter</button></div></div></div>" : "") +
      '<div class="card"><div class="hd"><h3>How these columns are used</h3></div><div class="bd small">' + mappingNotes(g.side) + "</div></div></div></div>";
    $("#map-sel", el).addEventListener("change", (e) => { S.mapSel = e.target.value; render(); });
    $$("select[data-f]", el).forEach((s) => s.addEventListener("change", () => { const v = s.value; map[s.dataset.f] = !v ? null : v[0] === "c" ? { col: +v.slice(1) } : { meta: v.slice(1) }; S._draftMap = { key: g.key, map }; }));
    $("#map-reset", el).addEventListener("click", () => { S._draftMap = { key: g.key, map: R.autoMap(g.headers, g.sample.meta, g.side) }; saveMapping(g, S._draftMap.map, "re-detected"); });
    $("#map-save", el).addEventListener("click", () => saveMapping(g, (S._draftMap && S._draftMap.key === g.key) ? S._draftMap.map : map, "saved"));
    const fa = $("#filt-auto", el);
    if (fa) fa.addEventListener("click", async () => {
      if (!canChange()) return;
      const before = JSON.stringify(S.settings.siteFilters);
      S.settings.siteFilters = { mop: (S.settings.siteFilters.mop || []).concat(candMop), refCode: (S.settings.siteFilters.refCode || []).concat(candRef) };
      if (await put("settings", "main", { data: S.settings })) await audit("FILTER_CHANGE", "Site Report DOE filter extended from " + before + " to " + JSON.stringify(S.settings.siteFilters) + " (values found in " + zeroFiles.map((f) => f.name).join(", ") + ")");
      recompute(); render(); toast("Filter updated — " + zeroFiles.map((f) => f.name + ": " + ((f._norm && f._norm.count) || 0) + " DOE rows").join("; "), "ok");
    });
    const fs = $("#filt-save", el);
    if (fs) fs.addEventListener("click", async () => {
      if (!canChange()) return;
      const mop = $$("[data-mop]", el).filter((c) => c.checked).map((c) => c.dataset.mop), ref = $$("[data-ref]", el).filter((c) => c.checked).map((c) => c.dataset.ref);
      const before = JSON.stringify(S.settings.siteFilters);
      S.settings.siteFilters = { mop, refCode: ref };
      if (await put("settings", "main", { data: S.settings })) await audit("FILTER_CHANGE", "Site Report DOE filter changed from " + before + " to " + JSON.stringify(S.settings.siteFilters));
      recompute(); render(); toast("Filter saved and reconciliation updated.", "ok");
    });
  }
  function mappingNotes(side) {
    if (side === "site") return "<ul style=\"margin:0;padding-left:18px\"><li><b>Invoice Number</b> is the Level 1 match key — the <code>000-</code> prefix and leading zeros are ignored, so <code>000-150066</code> matches LandBank <code>150066</code>.</li><li><b>MOP Amount</b> is the subsidy claimed (liters × the voucher rate). The rate comes from the <b>Reference Code</b>: DOE10 = ₱10/L, DOE12 = ₱12/L.</li><li><b>Product 1 Value</b> (pump amount) confirms Level 2/3 matches.</li><li>If no liters column exists, liters are shown as <i>implied</i> = subsidy ÷ rate, and labeled as such.</li><li><b>Site Number</b> from the report header links the site to its LandBank station code.</li><li>The report's Start/End Date defines the business day, used to explain cut-off items.</li></ul>";
    return "<ul style=\"margin:0;padding-left:18px\"><li><b>POS Sales Invoice No.</b> is the Level 1 match key.</li><li><b>Computed Discount</b> is the subsidy LandBank recognizes.</li><li><b>Liters Dispensed</b> × rate is checked against Computed Discount.</li><li><b>LBP Reference No.</b> must be unique — repeats are flagged as duplicates.</li><li>Transaction time is compared after removing LandBank's clock offset (auto-detected).</li><li>This report shows what LandBank <i>reported</i>; it is not proof of payment. Record actual bank credits under Receivables.</li></ul>";
  }
  async function saveMapping(g, map, how) {
    if (!canChange()) return;
    const before = S.mappings[g.key];
    S.mappings[g.key] = map;
    const desc = Object.entries(map).filter(([, v]) => v).map(([k, v]) => k + "=" + (v.col != null ? g.headers[v.col] : "header:" + v.meta)).join(", ");
    if (await put("mappings", g.key, { side: g.side, headers: g.headers, map })) await audit("MAPPING_CHANGE", "Column mapping " + how + " for " + (g.side === "site" ? "Site Report" : "LandBank") + " layout: " + desc + (before ? "" : " (new)"), g.key);
    S._draftMap = null;
    await autoLinkStations();
    recompute(); render(); toast("Mapping saved — reconciliation updated.", "ok");
  }

  /* ======================= RECONCILIATION ======================= */
  const FILTERS = [["", "All statuses"]].concat(R.STATUS_ORDER.map((s) => [s, s.charAt(0) + s.slice(1).toLowerCase()])).concat([["_exc", "Exceptions needing action"], ["_timing", "Cut-off / timing items"], ["_l2", "Invoice keyed differently (L2)"], ["_sug", "Suggested matches"], ["_res", "Resolved"], ["_manual", "Manually matched"]]);
  function filterItems(items, rc) {
    const q = rc.q.trim().toLowerCase();
    return items.filter((it) => {
      if (rc.status) {
        if (rc.status === "_exc") { if (it.status === ST.MATCHED || it.flags.timing || it.resolved) return false; }
        else if (rc.status === "_timing") { if (!it.flags.timing) return false; }
        else if (rc.status === "_l2") { if (!it.flags.invoiceMismatch) return false; }
        else if (rc.status === "_sug") { if (!it.flags.suggestion) return false; }
        else if (rc.status === "_res") { if (!it.resolved) return false; }
        else if (rc.status === "_manual") { if (it.level !== "Manual") return false; }
        else if (it.status !== rc.status) return false;
      }
      if (rc.from && it.date < rc.from) return false;
      if (rc.to && it.date > rc.to) return false;
      if (q) {
        const hay = [it.site && it.site.invoice, it.lb && it.lb.invoice, it.lb && it.lb.lbRef, it.lb && it.lb.plate, it.status, it.remarks.join(" "), it.notes.map((n) => n.text).join(" "), it.siteSubsidy, it.lbSubsidy, it.date].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  function sortItems(items, rc) {
    const f = { date: (i) => i.date + (i.time || ""), site: (i) => i.siteSubsidy ?? -1e9, lb: (i) => i.lbSubsidy ?? -1e9, var: (i) => i.variance, status: (i) => i.status, inv: (i) => i.invoice || "" }[rc.sort] || ((i) => i.date);
    return items.slice().sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * rc.dir; });
  }
  function vRecon(el) {
    if (!S.result || !S.files.length) return emptyState(el);
    const rc = S.rc;
    const all = scopedItems();
    const items = sortItems(filterItems(all, rc), rc);
    const PAGE = 100, pages = Math.max(1, Math.ceil(items.length / PAGE)); if (rc.page >= pages) rc.page = pages - 1;
    const view = items.slice(rc.page * PAGE, rc.page * PAGE + PAGE);
    const tot = { site: R.r2(items.reduce((a, i) => a + (i.siteSubsidy || 0), 0)), lb: R.r2(items.reduce((a, i) => a + (i.lbSubsidy || 0), 0)), sl: R.r3(items.reduce((a, i) => a + (i.site ? i.siteLiters || 0 : 0), 0)), ll: R.r3(items.reduce((a, i) => a + (i.lbLiters || 0), 0)) };
    const selItems = Array.from(rc.sel).map((id) => all.find((i) => i.id === id)).filter(Boolean);
    const canMatch = selItems.length === 2 && selItems.filter((i) => i.site && !i.lb).length === 1 && selItems.filter((i) => i.lb && !i.site).length === 1;
    const fin = S.filter.station && S.filter.period ? S.finals.find((x) => x.station === S.filter.station && x.period === S.filter.period) : null;
    const sortTh = (k, label, cls) => '<th class="sort ' + (cls || "") + '" data-sort="' + k + '">' + label + (rc.sort === k ? (rc.dir > 0 ? " ▲" : " ▼") : "") + "</th>";
    el.innerHTML =
      (fin && fin.status === "final" ? '<div class="banner lock fx"><span>' + ic("lock").replace("<svg", '<svg style="width:16px;height:16px"') + " <b>" + esc(stationLabel(fin.station)) + " · " + monthName(fin.period) + "</b> was finalized by " + esc(who(fin)) + " on " + fmtTs(fin.ts) + ". Manual changes are locked.</span>" + '<span class="spacer"></span>' + (S.canAdmin ? '<button class="btn sm" id="reopen">Reopen</button>' : "") + "</div>" : "") +
      '<div class="card"><div class="hd" style="flex-wrap:wrap;gap:8px"><input type="search" id="rc-q" placeholder="Search invoice, LBP ref, plate, remark…" value="' + esc(rc.q) + '" style="width:260px">' +
      '<select id="rc-st">' + FILTERS.map(([v, l]) => '<option value="' + v + '"' + (rc.status === v ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>" +
      '<label class="small muted">From <input type="date" id="rc-from" value="' + rc.from + '"></label><label class="small muted">To <input type="date" id="rc-to" value="' + rc.to + '"></label>' +
      '<span class="grow"></span><button class="btn" id="rc-match"' + (canMatch ? "" : " disabled") + ' title="Select one Site-only and one LandBank-only row">Match selected</button><button class="btn" id="rc-xl">' + ic("dl") + 'Export to Excel</button><button class="btn primary" id="rc-final">' + ic("lock") + "Finalize…</button></div>" +
      '<div class="tbl-wrap" style="max-height:68vh"><table class="t"><thead><tr><th></th>' + sortTh("date", "Transaction Date") + sortTh("inv", "Invoice / Voucher No.") + '<th class="n">Site Liters</th><th class="n">LandBank Liters</th>' + sortTh("site", "Site Subsidy", "n") + sortTh("lb", "LandBank Amount", "n") + sortTh("var", "Variance", "n") + sortTh("status", "Status") + "<th>Remarks</th></tr></thead><tbody>" +
      (view.length ? view.map((it) => {
        const single = !(it.site && it.lb);
        const inv2 = it.site && it.lb && it.site.inv !== it.lb.inv ? '<div class="xs muted">LB: ' + esc(it.lb.invoice || "(blank)") + "</div>" : !it.site && it.lb ? '<div class="xs muted">LandBank only</div>' : "";
        return '<tr class="click ' + (rc.sel.has(it.id) ? "sel" : "") + '" data-id="' + esc(it.id) + '"><td>' + (single && !locked(it) && it.status !== ST.DUP ? '<input type="checkbox" data-sel="' + esc(it.id) + '"' + (rc.sel.has(it.id) ? " checked" : "") + ">" : (locked(it) ? ic("lock").replace("<svg", '<svg style="width:12px;height:12px;color:#7d7c76"') : "")) + "</td><td>" + it.date + ' <span class="xs muted">' + esc(it.time || "") + "</span></td><td>" + esc(it.invoice || "(blank)") + inv2 +
          '</td><td class="n">' + (it.site ? L(it.siteLiters) + (it.siteLitersDerived ? '<span class="muted" title="Implied from subsidy ÷ rate">*</span>' : "") : "—") + '</td><td class="n">' + (it.lbLiters != null ? L(it.lbLiters) : "—") + '</td><td class="n">' + P(it.siteSubsidy) + '</td><td class="n">' + P(it.lbSubsidy) + '</td><td class="n ' + (Math.abs(it.variance) > 0.004 ? "neg" : "") + '">' + (Math.abs(it.variance) > 0.004 ? P(it.variance) : "—") + "</td><td>" + chip(it.status) + "<div>" + itemTags(it) + '</div></td><td class="rem">' + esc(it.remarks[0] || "") + (it.notes.length ? '<div class="xs" style="color:#1c5cab">📝 ' + it.notes.length + " note(s)</div>" : "") + "</td></tr>";
      }).join("") : '<tr><td colspan="10"><div class="empty small">No transactions match these filters.</div></td></tr>') +
      '</tbody><tfoot><tr><td></td><td colspan="2">' + N(items.length) + ' transactions (filtered)</td><td class="n">' + L(tot.sl) + '</td><td class="n">' + L(tot.ll) + '</td><td class="n">' + P(tot.site) + '</td><td class="n">' + P(tot.lb) + '</td><td class="n">' + P(R.r2(tot.site - tot.lb)) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
      '<div class="pager"><span>Page ' + (rc.page + 1) + " of " + pages + '</span><button class="btn sm" id="pg-prev"' + (rc.page ? "" : " disabled") + '>Previous</button><button class="btn sm" id="pg-next"' + (rc.page < pages - 1 ? "" : " disabled") + '>Next</button><span class="grow"></span><span>* Site liters implied from subsidy ÷ rate when the Site Report has no liters column. Click a row for details, original data and actions.</span></div></div>';
    const rerender = () => { const pos = $("#rc-q") === document.activeElement; render(); if (pos) { const q = $("#rc-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); } };
    let tmr; $("#rc-q", el).addEventListener("input", (e) => { clearTimeout(tmr); tmr = setTimeout(() => { rc.q = e.target.value; rc.page = 0; rerender(); }, 250); });
    $("#rc-st", el).addEventListener("change", (e) => { rc.status = e.target.value; rc.page = 0; render(); });
    $("#rc-from", el).addEventListener("change", (e) => { rc.from = e.target.value; rc.page = 0; render(); });
    $("#rc-to", el).addEventListener("change", (e) => { rc.to = e.target.value; rc.page = 0; render(); });
    $$("[data-sort]", el).forEach((th) => th.addEventListener("click", () => { if (rc.sort === th.dataset.sort) rc.dir *= -1; else { rc.sort = th.dataset.sort; rc.dir = th.dataset.sort === "date" ? 1 : -1; } render(); }));
    $("#pg-prev", el).addEventListener("click", () => { rc.page--; render(); });
    $("#pg-next", el).addEventListener("click", () => { rc.page++; render(); });
    $$("tr[data-id]", el).forEach((tr) => tr.addEventListener("click", (e) => { if (e.target.matches("input[type=checkbox]")) return; openItem(tr.dataset.id); }));
    $$("[data-sel]", el).forEach((cb) => cb.addEventListener("change", () => { if (cb.checked) rc.sel.add(cb.dataset.sel); else rc.sel.delete(cb.dataset.sel); render(); }));
    $("#rc-match", el).addEventListener("click", () => { const s = selItems.find((i) => i.site), l = selItems.find((i) => i.lb); manualMatch(s.site, l.lb); });
    $("#rc-xl", el).addEventListener("click", () => exportReport("summary", items));
    $("#rc-final", el).addEventListener("click", finalizeFlow);
    const ro = $("#reopen", el); if (ro) ro.addEventListener("click", () => reopenFlow(fin));
  }

  /* ---------- item details ---------- */
  function findItem(id) { return S.result && S.result.items.find((i) => i.id === id); }
  function srcRowHtml(rec) {
    const f = S.files.find((x) => x.id === rec.fileId); if (!f) return "";
    const row = f.rows.find((r) => r.n === rec.rowNo); if (!row) return "";
    return '<details class="raw"><summary>Original ' + (rec.side === "site" ? "Site Report" : "LandBank") + " row (unchanged) — " + esc(f.name) + ", row " + rec.rowNo + '</summary><div class="tbl-wrap"><table class="t"><tbody>' + f.headers.map((h, j) => '<tr><td class="muted" style="width:40%">' + esc(h) + "</td><td>" + esc(row.c[j]) + "</td></tr>").join("") + '</tbody></table></div><div class="xs muted">Uploaded ' + fmtTs(f.uploadedAt) + " by " + esc(who(f)) + "</div></details>";
  }
  function openItem(id) {
    const it = findItem(id); if (!it) return;
    const s = it.site, l = it.lb, off = S.result.offsets[it.station] ? S.result.offsets[it.station].used : 0;
    const lk = locked(it);
    const row = (label, a, b, diff) => "<tr><th>" + label + "</th><td" + (diff ? ' class="diff"' : "") + ">" + (a == null || a === "" ? '<span class="muted">—</span>' : a) + "</td><td" + (diff ? ' class="diff"' : "") + ">" + (b == null || b === "" ? '<span class="muted">—</span>' : b) + "</td></tr>";
    const lbAdj = l && l.hasTime ? R.msToDT(l.dt - off * 60000).slice(11) : null;
    const amtDiff = s && l && Math.abs(R.cents(s.subsidy) - R.cents(l.subsidy)) > Math.round(S.settings.amountTol * 100);
    const litDiff = it.literVar != null && Math.abs(it.literVar) > S.settings.literTol;
    const cmp = '<table class="cmp"><thead><tr><th>Field</th><th>Site Report</th><th>LandBank</th></tr></thead><tbody>' +
      row("Station", s && esc(stationLabel(s.station)), l && esc(stationLabel(l.station))) +
      row("Transaction date", s && s.date, l && l.date, s && l && it.status === ST.DATE) +
      row("Transaction time", s && esc(s.time || ""), l && esc((l.time || "") + (lbAdj ? " (≈ " + lbAdj + " POS clock)" : ""))) +
      row("Invoice no.", s && esc(s.invoice), l && esc(l.invoice), s && l && s.inv !== l.inv) +
      row("LBP reference", null, l && esc(l.lbRef)) +
      row("Subsidy amount", s && P(s.subsidy), l && P(l.subsidy), amtDiff) +
      row("Liters", s && (L(it.siteLiters) + (it.siteLitersDerived ? ' <span class="xs muted">(implied)</span>' : "")), l && (l.liters != null ? L(l.liters) : null), litDiff) +
      row("Pump / sale amount", s && s.sale != null ? P(s.sale) : null, l && l.sale != null ? P(l.sale) : null, s && l && s.sale != null && l.sale != null && R.cents(s.sale) !== R.cents(l.sale)) +
      row("Subsidy rate per liter", s && ("₱" + N(s.rate || R.rateFor(S.settings, s.date), 2) + (s.rate ? " (from " + esc(s.rateSource) + ")" : " (setting)")), l && ("₱" + N(l.rate || R.rateFor(S.settings, l.date), 2) + (l.rate ? " (from site voucher code)" : " (setting)"))) +
      row("Expected subsidy (liters × rate)", s && s.liters != null ? P(R.r2(s.liters * (s.rate || R.rateFor(S.settings, s.date)))) : null, l && l.liters != null ? P(R.r2(l.liters * (s && s.rate || l.rate || R.rateFor(S.settings, l.date)))) : null) +
      row("Customer paid", null, l && l.amountPaid != null ? P(l.amountPaid) : null) +
      row("Plate no. / beneficiary", s && esc(s.beneficiary || ""), l && esc(l.plate || "")) +
      row("Product", s && esc(s.product), l && esc(l.product)) +
      row("MOP / reference code", s && esc([s.mop, s.refCode].filter(Boolean).join(" / ")), null) +
      row("Remaining subsidy balance", null, l && l.remaining != null ? P(l.remaining) : null) +
      row("Settlement date", null, l && l.settlementDate) +
      row("LandBank status / remarks", null, l && esc([l.status, l.lbRemarks].filter(Boolean).join(" · "))) +
      "</tbody></table>";
    const notes = it.notes.map((n) => '<div class="note">' + esc(n.text) + '<div class="meta">' + esc(n.kind ? n.kind + " · " : "") + esc(who(n)) + " · " + fmtTs(n.ts) + "</div></div>").join("") || '<div class="small muted">No investigation notes yet.</div>';
    const acts = [];
    if (!lk && !S.ro) {
      if (s && l && it.level === "Manual") acts.push('<button class="btn danger" data-a="undo">Undo manual match</button>');
      else if (s && l) acts.push('<button class="btn danger" data-a="unmatch">Unmatch</button>');
      if (it.flags.suggestion) acts.push('<button class="btn primary" data-a="accept">Accept suggested match</button><button class="btn" data-a="reject">Reject suggestion</button>');
      if (!(s && l) && it.status !== ST.DUP) acts.push('<button class="btn" data-a="pick">Match manually…</button>');
      if (it.status !== ST.MATCHED) acts.push(it.resolved ? '<button class="btn" data-a="unresolve">Reopen issue</button>' : '<button class="btn" data-a="resolve">' + ic("check") + "Mark resolved</button>");
    }
    const m = modal('<div class="mh"><h3>Transaction detail</h3>' + chip(it.status) + itemTags(it) + '<span class="grow"></span><button class="btn sm ghost" data-close>' + ic("x") + '</button></div><div class="mb">' +
      (lk ? '<div class="banner lock">' + ic("lock").replace("<svg", '<svg style="width:15px;height:15px"') + " This period is finalized — actions are locked.</div>" : "") +
      (it.resolved ? '<div class="banner lock">Resolved by ' + esc(who(it.resolved)) + " on " + fmtTs(it.resolved.ts) + (it.resolved.remark ? ": " + esc(it.resolved.remark) : "") + "</div>" : "") +
      cmp + '<div style="margin-top:14px"><b class="small">Why this status</b><ul class="small" style="margin:6px 0">' + it.remarks.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul></div>" +
      (it.dupOf ? '<div class="small muted">Duplicate of record ' + esc(it.dupOf) + ".</div>" : "") +
      (s ? srcRowHtml(s) : "") + (l ? srcRowHtml(l) : "") +
      '<div style="margin-top:14px"><b class="small">Investigation notes</b>' + notes + (S.ro ? "" : '<textarea id="note-txt" placeholder="Add an investigation remark…"></textarea><div class="row end" style="margin-top:6px"><button class="btn sm" id="note-add">Add note</button></div>') + "</div>" +
      '<div id="picker"></div></div><div class="mf">' + acts.join("") + '<span class="grow"></span><button class="btn" data-close>Close</button></div>', { wide: true });
    const na = $("#note-add", m.el);
    if (na) na.addEventListener("click", async () => { const t = $("#note-txt", m.el).value.trim(); if (!t) return; await addNote(it, t); m.close(); recompute(); render(); openItem(it.id); });
    $$("[data-a]", m.el).forEach((b) => b.addEventListener("click", async () => {
      const a = b.dataset.a;
      if (a === "pick") { showPicker(it, m); return; }
      m.close();
      if (a === "unmatch") await unmatch(it);
      if (a === "undo") await undoManual(it);
      if (a === "accept") { const other = S.site.concat(S.lb).find((r) => r.key === it.suggest); if (it.site) await manualMatch(it.site, other, "Accepted Level 3 suggestion"); else await manualMatch(other, it.lb, "Accepted Level 3 suggestion"); }
      if (a === "reject") { const sk = it.site ? it.site.key : it.suggest, lk2 = it.lb ? it.lb.key : it.suggest; await rejectPair(sk, lk2, it); }
      if (a === "resolve") await resolveItem(it, true);
      if (a === "unresolve") await resolveItem(it, false);
    }));
  }
  function showPicker(it, m) {
    const mine = it.site || it.lb, other = it.site ? "lb" : "site";
    const pool = S.result.items.filter((x) => !(x.site && x.lb) && x.status !== ST.DUP && (other === "lb" ? x.lb : x.site) && x.station === it.station && !locked(x))
      .map((x) => other === "lb" ? x.lb : x.site)
      .filter((r) => Math.abs(R.toMs(r.date) - R.toMs(mine.date)) <= 3 * 86400000)
      .sort((a, b) => Math.abs(a.subsidy - mine.subsidy) - Math.abs(b.subsidy - mine.subsidy) || Math.abs(a.dt - mine.dt) - Math.abs(b.dt - mine.dt)).slice(0, 25);
    $("#picker", m.el).innerHTML = '<div class="card" style="margin-top:14px"><div class="hd"><h3>Choose the ' + (other === "lb" ? "LandBank" : "Site Report") + ' record to match</h3><span class="sub">unmatched, same station, ±3 days, closest amount first</span></div><div class="bd flush">' +
      (pool.length ? '<table class="t"><thead><tr><th></th><th>Date / time</th><th>Invoice</th><th class="n">Subsidy</th><th class="n">Pump amount</th><th>Ref / plate</th></tr></thead><tbody>' + pool.map((r) => '<tr><td><input type="radio" name="pk" value="' + esc(r.key) + '"></td><td>' + r.date + " " + esc(r.time || "") + "</td><td>" + esc(r.invoice || "(blank)") + '</td><td class="n">' + P(r.subsidy) + '</td><td class="n">' + P(r.sale) + '</td><td class="small">' + esc([r.lbRef, r.plate].filter(Boolean).join(" · ")) + "</td></tr>").join("") + "</tbody></table>" : '<div class="empty small">No unmatched candidates within ±3 days.</div>') +
      '</div><div class="bd"><textarea id="pk-rem" placeholder="Reason for manual match (required)"></textarea><div class="row end" style="margin-top:8px"><button class="btn primary" id="pk-ok"' + (pool.length ? "" : " disabled") + ">Match</button></div></div></div>";
    $("#pk-ok", m.el).addEventListener("click", async () => {
      const k = ($("input[name=pk]:checked", m.el) || {}).value, rem = $("#pk-rem", m.el).value.trim();
      if (!k) { toast("Select a record.", "err"); return; } if (!rem) { toast("Enter a reason for the manual match.", "err"); return; }
      const r = S.site.concat(S.lb).find((x) => x.key === k);
      m.close();
      if (it.site) await manualMatch(it.site, r, rem, true); else await manualMatch(r, it.lb, rem, true);
    });
  }
  async function addNote(it, text, kind) {
    if (!canChange()) return;
    const n = clean(Object.assign({ itemId: it.id, text, kind: kind || "" }, stamp()));
    const id = uid(); S.ov.notes.push(Object.assign({ id }, n));
    await put("notes", id, n);
    await audit("NOTE", "Note on " + describe(it) + ": " + text, it.id);
  }
  function describe(it) { return (it.site ? "Site " + (it.site.invoice || "(no inv)") : "") + (it.site && it.lb ? " / " : "") + (it.lb ? "LandBank " + (it.lb.invoice || it.lb.lbRef || "(no inv)") : "") + " (" + it.date + ", " + it.status + ")"; }
  async function manualMatch(s, l, remark, reasonGiven) {
    if (!canChange()) return;
    if (!remark) { const ok = await confirmBox("Match these records?", '<table class="cmp"><thead><tr><th></th><th>Site Report</th><th>LandBank</th></tr></thead><tbody><tr><th>Date/time</th><td>' + s.date + " " + esc(s.time || "") + "</td><td>" + l.date + " " + esc(l.time || "") + "</td></tr><tr><th>Invoice</th><td>" + esc(s.invoice) + "</td><td>" + esc(l.invoice) + "</td></tr><tr><th>Subsidy</th><td>" + P(s.subsidy) + "</td><td>" + P(l.subsidy) + "</td></tr></tbody></table>", "Match", { reason: "Reason for manual match" }); if (!ok) return; remark = ok.reason; }
    const id = "m_" + fnv(s.key + "|" + l.key);
    const doc = clean(Object.assign({ siteKey: s.key, lbKey: l.key, remark }, stamp()));
    S.ov.matches.push(Object.assign({ id }, doc));
    await put("matches", id, doc);
    const un = S.ov.unmatches.find((u) => u.siteKey === s.key && u.lbKey === l.key);
    if (un) { S.ov.unmatches = S.ov.unmatches.filter((u) => u !== un); await del("unmatches", un.id); }
    await audit("MANUAL_MATCH", "Matched Site " + (s.invoice || "(blank)") + " " + P(s.subsidy) + " (" + s.date + ") with LandBank " + (l.invoice || l.lbRef || "(blank)") + " " + P(l.subsidy) + " (" + l.date + "). Reason: " + remark, s.key + "|" + l.key);
    S.rc.sel.clear(); recompute(); render(); toast("Records matched — logged in audit trail.", "ok");
    openItem(s.key + "|" + l.key);
  }
  async function unmatch(it) {
    const ok = await confirmBox("Unmatch these records?", "<p>The Site and LandBank records will be separated and will not be auto-matched to each other again. Each will show as unmatched until resolved.</p>", "Unmatch", { danger: true, reason: "Reason" });
    if (!ok) return;
    const id = "u_" + fnv(it.site.key + "|" + it.lb.key);
    const doc = clean(Object.assign({ siteKey: it.site.key, lbKey: it.lb.key, remark: ok.reason }, stamp()));
    S.ov.unmatches.push(Object.assign({ id }, doc)); await put("unmatches", id, doc);
    await audit("UNMATCH", "Unmatched " + describe(it) + ". Reason: " + ok.reason, it.id);
    recompute(); render(); toast("Records unmatched.", "ok");
  }
  async function rejectPair(sk, lk, it) {
    const ok = await confirmBox("Reject suggested match?", "<p>These two records will not be suggested or matched together again.</p>", "Reject", { reason: "Reason" });
    if (!ok) return;
    const id = "u_" + fnv(sk + "|" + lk);
    const doc = clean(Object.assign({ siteKey: sk, lbKey: lk, remark: ok.reason }, stamp()));
    S.ov.unmatches.push(Object.assign({ id }, doc)); await put("unmatches", id, doc);
    await audit("REJECT_SUGGESTION", "Rejected Level 3 suggestion for " + describe(it) + ". Reason: " + ok.reason, it.id);
    recompute(); render();
  }
  async function undoManual(it) {
    const ok = await confirmBox("Undo manual match?", "<p>The automatic matching rules will apply to both records again.</p>", "Undo match", { danger: true, reason: "Reason" });
    if (!ok) return;
    const m = S.ov.matches.find((x) => x.siteKey === it.site.key && x.lbKey === it.lb.key);
    if (m) { S.ov.matches = S.ov.matches.filter((x) => x !== m); await del("matches", m.id); }
    await audit("UNDO_MATCH", "Undid manual match " + describe(it) + ". Reason: " + ok.reason, it.id);
    recompute(); render();
  }
  async function resolveItem(it, on) {
    const ok = await confirmBox(on ? "Mark as resolved?" : "Reopen this issue?", on ? "<p>The status stays <b>" + esc(it.status) + "</b> for the record, but the item leaves the exceptions queue. Explain the resolution (e.g. LandBank confirmed adjustment, POS correction).</p>" : "<p>The item returns to the exceptions queue.</p>", on ? "Mark resolved" : "Reopen", { reason: on ? "Resolution remark" : "Reason" });
    if (!ok) return;
    const id = "r_" + fnv(it.id);
    const doc = clean(Object.assign({ itemId: it.id, resolved: on, remark: ok.reason }, stamp()));
    S.ov.resolved = S.ov.resolved.filter((r) => r.itemId !== it.id).concat([Object.assign({ id }, doc)]);
    await put("resolved", id, doc);
    await addNote(it, (on ? "Resolved: " : "Reopened: ") + ok.reason, on ? "Resolution" : "Reopened");
    recompute(); render();
  }

  /* ---------- finalize ---------- */
  async function finalizeFlow() {
    if (!canChange()) return;
    if (!S.filter.station || !S.filter.period) { toast("Choose one station and one period in the top bar, then finalize.", "err"); return; }
    const items = scopedItems();
    const sm = R.summarize(items, scopedRecs("site"), scopedRecs("lb"), S.settings);
    const open = items.filter((i) => i.status !== ST.MATCHED && !i.flags.timing && !i.resolved);
    const timing = items.filter((i) => i.flags.timing);
    const ok = await confirmBox("Finalize " + stationLabel(S.filter.station) + " — " + monthName(S.filter.period),
      '<dl class="kv"><dt>Site Report subsidy</dt><dd>' + P(sm.siteSubsidy) + "</dd><dt>LandBank reported</dt><dd>" + P(sm.lbSubsidy) + "</dd><dt>Variance</dt><dd>" + P(sm.totalVariance) + "</dd><dt>Matched</dt><dd>" + sm.matchedCount + "</dd><dt>Open exceptions</dt><dd><b>" + open.length + "</b></dd><dt>Cut-off items</dt><dd>" + timing.length + "</dd></dl>" +
      (open.length ? '<div class="banner err" style="margin-top:12px">' + open.length + " exception(s) are not resolved. They will be carried in the finalized snapshot as open items.</div>" : "") +
      '<label class="row small" style="margin-top:12px"><input type="checkbox" id="fz-rev"> I have reviewed all unmatched transactions for this period.</label><p class="small muted">After finalizing, manual matching, unmatching and resolutions for this station and period are locked. Reimbursements can still be recorded.</p>',
"Finalize period", { requireCheck: "fz-rev", typed: "FINALIZE", reason: open.length ? "Why finalize with open exceptions?" : "Remarks (optional)", reasonRequired: !!open.length });
    if (!ok) return;
    const id = safeId("f_" + S.filter.station + "_" + S.filter.period);
    const doc = clean(Object.assign({ station: S.filter.station, period: S.filter.period, status: "final", reason: ok.reason, totals: { siteSubsidy: sm.siteSubsidy, lbSubsidy: sm.lbSubsidy, variance: sm.totalVariance, matched: sm.matchedCount, unmatched: sm.unmatchedCount, openExceptions: open.length, timing: timing.length, validated: sm.validated } }, stamp()));
    S.finals = S.finals.filter((f) => f.id !== id).concat([Object.assign({ id }, doc)]);
    await put("finals", id, doc);
    await audit("FINALIZE", "Finalized " + S.filter.station + " " + S.filter.period + ": site " + P(sm.siteSubsidy) + ", LandBank " + P(sm.lbSubsidy) + ", variance " + P(sm.totalVariance) + ", " + open.length + " open exception(s)." + (ok.reason ? " Remarks: " + ok.reason : ""), id);
    render(); toast("Period finalized.", "ok");
  }
  async function reopenFlow(fin) {
    const ok = await confirmBox("Reopen finalized period?", "<p>Manual adjustments will be allowed again. The original finalization stays in the audit trail.</p>", "Reopen", { reason: "Reason for reopening", danger: true });
    if (!ok) return;
    const doc = Object.assign({}, fin, { status: "reopened", reopenReason: ok.reason, reopenedAt: nowIso(), reopenedBy: S.me.id || S.me.name || "" });
    S.finals = S.finals.map((f) => f.id === fin.id ? doc : f);
    const save = Object.assign({}, doc); delete save.id; delete save._k;
    await put("finals", fin.id, clean(save));
    await audit("REOPEN", "Reopened " + fin.station + " " + fin.period + ". Reason: " + ok.reason, fin.id);
    render();
  }

  /* ======================= DISCREPANCY MONITORING ======================= */
  function vDisc(el) {
    if (!S.result || !S.files.length) return emptyState(el);
    const items = scopedItems();
    const cats = R.STATUS_ORDER.filter((s) => s !== ST.MATCHED).map((s) => { const xs = items.filter((i) => i.status === s); return { s, n: xs.length, open: xs.filter((i) => !i.flags.timing && !i.resolved).length, amt: R.r2(xs.reduce((a, i) => a + Math.abs(i.siteSubsidy || 0) + Math.abs(i.lbSubsidy || 0) - (i.site && i.lb ? Math.abs(i.lbSubsidy) : 0), 0)) }; });
    const groups = {
      action: { t: "Requires action", d: "Discrepancies that are not cut-off items and not yet resolved.", f: (i) => i.status !== ST.MATCHED && !i.flags.timing && !i.resolved },
      timing: { t: "Cut-off / timing", d: "Expected to clear when the adjacent day's report is uploaded.", f: (i) => i.flags.timing },
      l2: { t: "Invoice keying differences", d: "Matched at Level 2 — the invoice number differs between POS and LandBank. Correct at source.", f: (i) => i.flags.invoiceMismatch },
      rounding: { t: "Rounding (within tolerance)", d: "₱0.01-type differences: LandBank rounds liters × ₱12, the POS truncates.", f: (i) => i.flags.rounding },
      resolved: { t: "Resolved", d: "Items closed with a resolution remark.", f: (i) => !!i.resolved }
    };
    const g = groups[S.disc] || groups.action;
    const list = items.filter(g.f);
    const today = R.toMs(new Date().toISOString().slice(0, 10));
    el.innerHTML = '<div class="grid g4 gap16">' + cats.map((c) => '<div class="card kpi" style="cursor:pointer" data-cat="' + esc(c.s) + '"><div class="lb">' + chip(c.s) + '</div><div class="v">' + N(c.n) + '</div><div class="s">' + (c.n ? N(c.open) + " open · " + P(c.amt) : "none") + "</div></div>").join("") + "</div>" +
      '<div class="tabs">' + Object.entries(groups).map(([k, x]) => '<button data-g="' + k + '" class="' + (S.disc === k ? "on" : "") + '">' + esc(x.t) + " (" + items.filter(x.f).length + ")</button>").join("") + "</div>" +
      '<div class="card"><div class="hd"><h3>' + esc(g.t) + '</h3><span class="sub">' + esc(g.d) + '</span><span class="grow"></span><button class="btn sm" id="d-xl">' + ic("dl") + 'Export</button></div><div class="bd flush"><div class="tbl-wrap" style="max-height:62vh"><table class="t"><thead><tr><th>Date</th><th>Station</th><th>Invoice</th><th class="n">Site</th><th class="n">LandBank</th><th class="n">Variance</th><th>Status</th><th class="n">Age (days)</th><th>Remarks</th></tr></thead><tbody>' +
      (list.length ? list.map((it) => '<tr class="click" data-id="' + esc(it.id) + '"><td>' + it.date + '</td><td class="small">' + esc(it.station) + "</td><td>" + esc(it.invoice || "(blank)") + (it.site && it.lb && it.site.inv !== it.lb.inv ? '<div class="xs muted">LB: ' + esc(it.lb.invoice || "(blank)") + "</div>" : "") + '</td><td class="n">' + P(it.siteSubsidy) + '</td><td class="n">' + P(it.lbSubsidy) + '</td><td class="n">' + (Math.abs(it.variance) > 0.004 ? P(it.variance) : "—") + "</td><td>" + chip(it.status) + "<div>" + itemTags(it) + '</div></td><td class="n">' + N(Math.max(0, Math.round((today - R.toMs(it.date)) / 86400000))) + '</td><td class="rem">' + esc(it.remarks.join(" ")) + (it.notes.length ? '<div class="xs" style="color:#1c5cab">Latest note: ' + esc(it.notes[it.notes.length - 1].text) + "</div>" : "") + "</td></tr>").join("") : '<tr><td colspan="9"><div class="empty small">' + ic("check").replace("<svg", '<svg style="width:22px;height:22px;color:#0ca30c"') + "<div>Nothing here.</div></div></td></tr>") +
      "</tbody></table></div></div></div>";
    $$("[data-g]", el).forEach((b) => b.addEventListener("click", () => { S.disc = b.dataset.g; render(); }));
    $$("[data-cat]", el).forEach((c) => c.addEventListener("click", () => { S.rc.status = c.dataset.cat; S.rc.page = 0; go("recon"); }));
    $$("tr[data-id]", el).forEach((tr) => tr.addEventListener("click", () => openItem(tr.dataset.id)));
    $("#d-xl", el).addEventListener("click", () => exportReport("custom", list, "Discrepancies – " + g.t));
  }

  /* ======================= RECEIVABLES ======================= */
  function vRecv(el) {
    if (!S.result || !S.files.length) return emptyState(el);
    const rows = recvRows();
    const T = (k) => R.r2(rows.reduce((a, r) => a + r[k], 0));
    const kpi = (lb, v, s, cls) => '<div class="card kpi ' + (cls || "") + '"><div class="lb">' + lb + '</div><div class="v">' + v + '</div><div class="s">' + s + "</div></div>";
    const recs = S.receipts.filter((r) => inScope(r.station, r.period)).sort((a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || ""));
    const apps = S.approvals.filter((r) => inScope(r.station, r.period)).sort((a, b) => (b.dateApproved || "").localeCompare(a.dateApproved || ""));
    el.innerHTML = '<div class="banner info">A transaction appearing in the LandBank report is <b>reported</b>, not paid. Only amounts you record here from bank credits count as <b>reimbursed</b>. Outstanding = Validated − Confirmed reimbursements.</div>' +
      '<div class="grid g5 gap16">' +
      kpi("Reported by LandBank", P(T("lbReported")), N(rows.reduce((a, r) => a + r.lbCount, 0)) + " transactions") +
      kpi("Approved / validated", P(T("validated")), "Matched to Site Report · approved " + P(T("approved"))) +
      kpi("Actually reimbursed", P(T("reimbursed")), recs.filter((r) => !r.void).length + " bank credit(s) recorded", "good") +
      kpi("Outstanding / unpaid", P(T("outstanding")), "Validated not yet received", T("outstanding") > 0.005 ? "bad" : "") +
      kpi("Pending validation", P(T("pending")), "Site claims not yet matched to LandBank") + "</div>" +
      '<div class="card gap16"><div class="hd"><h3>DOE subsidy receivable by claim period</h3><span class="grow"></span>' + (S.ro ? "" : '<button class="btn" id="add-app">Record approval</button><button class="btn primary" id="add-rec">Record reimbursement</button>') + '<button class="btn" id="rv-xl">' + ic("dl") + 'Export</button></div><div class="bd flush"><div class="tbl-wrap"><table class="t"><thead><tr><th>Claim Period</th><th>Site / Station</th><th class="n">Total Liters</th><th class="n">Total Subsidy</th><th class="n">LandBank Reported</th><th class="n">Validated</th><th class="n">Approved</th><th class="n">Confirmed Reimbursement</th><th class="n">Outstanding Receivable</th><th>Claim Status</th><th>Date Received</th><th>Remarks</th></tr></thead><tbody>' +
      (rows.length ? rows.map((r) => { const fin = finalOf(r.station, r.period); const lastRec = r.receipts.slice().sort((a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || ""))[0]; return "<tr><td>" + monthName(r.period) + (fin ? ' <span class="tag">' + ic("lock").replace("<svg", '<svg style="width:9px;height:9px"') + " final</span>" : "") + '</td><td style="min-width:170px"><b>' + esc(r.station) + '</b><div class="xs muted">' + esc((S.stations.find((x) => x.code === r.station) || {}).name || "") + '</div></td><td class="n">' + L(r.siteLiters) + '</td><td class="n">' + P(r.siteSubsidy) + '</td><td class="n">' + P(r.lbReported) + '</td><td class="n">' + P(r.validated) + '</td><td class="n">' + P(r.approved) + '</td><td class="n">' + P(r.reimbursed) + '</td><td class="n ' + (r.outstanding > 0.005 ? "neg" : "") + '"><b>' + P(r.outstanding) + "</b></td><td>" + recvChip(r.claimStatus) + '</td><td class="small">' + esc(r.lastReceived || "—") + '</td><td class="small muted">' + esc(lastRec ? lastRec.remarks || "" : r.pending > 0.005 ? P(r.pending) + " pending validation" : "") + "</td></tr>"; }).join("") : '<tr><td colspan="12"><div class="empty small">No claims in scope.</div></td></tr>') +
      (rows.length > 1 ? '</tbody><tfoot><tr><td colspan="2">Total</td><td class="n">' + L(R.r3(rows.reduce((a, r) => a + r.siteLiters, 0))) + '</td><td class="n">' + P(T("siteSubsidy")) + '</td><td class="n">' + P(T("lbReported")) + '</td><td class="n">' + P(T("validated")) + '</td><td class="n">' + P(T("approved")) + '</td><td class="n">' + P(T("reimbursed")) + '</td><td class="n">' + P(T("outstanding")) + '</td><td colspan="3"></td></tr></tfoot>' : "</tbody>") + "</table></div></div></div>" +
      '<div class="grid g2"><div class="card"><div class="hd"><h3>Reimbursements received (bank credits)</h3></div><div class="bd flush">' + entryTable(recs, "receipt") + '</div></div><div class="card"><div class="hd"><h3>Approvals / validations from agency</h3></div><div class="bd flush">' + entryTable(apps, "approval") + "</div></div></div>";
    const a = $("#add-rec", el); if (a) a.addEventListener("click", () => entryForm("receipt"));
    const b = $("#add-app", el); if (b) b.addEventListener("click", () => entryForm("approval"));
    $("#rv-xl", el).addEventListener("click", () => exportReport("receivables"));
    $$("[data-void]", el).forEach((x) => x.addEventListener("click", () => voidEntry(x.dataset.kind, x.dataset.void)));
  }
  function recvChip(s) { const c = /Fully/.test(s) ? "good" : /Over/.test(s) ? "critical" : /Partially|Approved/.test(s) ? "warn" : "neutral"; return '<span class="chip ' + c + '">' + esc(s) + "</span>"; }
  function entryTable(list, kind) {
    if (!list.length) return '<div class="empty small">None recorded.</div>';
    return '<table class="t"><thead><tr><th>Date</th><th>Station / period</th><th class="n">Amount</th><th>Reference</th><th>Recorded by</th><th></th></tr></thead><tbody>' + list.map((r) => '<tr style="' + (r.void ? "opacity:.5;text-decoration:line-through" : "") + '"><td>' + esc(kind === "receipt" ? r.dateReceived : r.dateApproved) + '</td><td class="small">' + esc(r.station) + " · " + esc(r.period) + '</td><td class="n">' + P(+r.amount) + '</td><td class="small">' + esc(r.ref) + (r.remarks ? '<div class="xs muted">' + esc(r.remarks) + "</div>" : "") + (r.void ? '<div class="xs neg">Voided: ' + esc(r.voidReason || "") + "</div>" : "") + '</td><td class="small">' + esc(who(r)) + '<div class="xs muted">' + fmtTs(r.ts) + "</div></td><td>" + (!r.void && !S.ro ? '<button class="btn sm danger" data-kind="' + kind + '" data-void="' + esc(r.id) + '">Void</button>' : "") + "</td></tr>").join("") + "</tbody></table>";
  }
  function entryForm(kind) {
    if (!canChange()) return;
    const all = R.receivables(S.result.items, S.receipts.filter((r) => !r.void), S.approvals.filter((a) => !a.void));
    const opts = all.map((r) => '<option value="' + esc(r.station + "|" + r.period) + '"' + (inScope(r.station, r.period) && S.filter.station && S.filter.period ? " selected" : "") + ">" + esc(stationLabel(r.station)) + " · " + monthName(r.period) + " — outstanding " + P(r.outstanding) + "</option>").join("");
    const isR = kind === "receipt";
    const m = modal('<div class="mh"><h3>' + (isR ? "Record reimbursement received" : "Record agency approval") + '</h3></div><div class="mb"><div class="form">' +
      "<label>Claim (station · period)</label><select id=\"e-claim\">" + opts + "</select>" +
      "<label>Amount (₱)</label><input type=\"number\" step=\"0.01\" min=\"0\" id=\"e-amt\">" +
      "<label>" + (isR ? "Date received in bank" : "Date approved") + '</label><input type="date" id="e-date" value="' + new Date().toISOString().slice(0, 10) + '">' +
      "<label>" + (isR ? "Bank / LandBank credit reference" : "Approval reference") + '</label><input type="text" id="e-ref">' +
      '<label>Remarks</label><input type="text" id="e-rem"></div>' + '<p class="small muted">' + (isR ? "Each bank reference can be recorded only once, to prevent recognizing the same reimbursement twice." : "Approval is tracked separately from validation and payment.") + '</p><div id="e-warn"></div></div><div class="mf"><button class="btn" data-close>Cancel</button><button class="btn primary" id="e-ok">Save</button></div>');
    $("#e-ok", m.el).addEventListener("click", async () => {
      const [station, period] = ($("#e-claim", m.el).value || "|").split("|");
      const amount = R.r2(+$("#e-amt", m.el).value), date = $("#e-date", m.el).value, ref = $("#e-ref", m.el).value.trim(), remarks = $("#e-rem", m.el).value.trim();
      if (!station || !period) return toast("Choose a claim.", "err");
      if (!(amount > 0)) return toast("Enter an amount greater than zero.", "err");
      if (!date) return toast("Enter the date.", "err");
      if (!ref) return toast("Enter a reference number.", "err");
      const list = isR ? S.receipts : S.approvals;
      const dup = list.find((r) => !r.void && R.nh(r.ref) === R.nh(ref));
      if (dup) return toast("Reference " + ref + " was already recorded on " + (dup.dateReceived || dup.dateApproved) + " for " + dup.station + " " + dup.period + ". Duplicate recognition blocked.", "err");
      const row = all.find((r) => r.station === station && r.period === period);
      const cap = isR ? row.validated - row.reimbursed : row.validated - row.approved;
      let override = "";
      if (amount > cap + 0.005) {
        const w = $("#e-warn", m.el);
        if (!w.dataset.shown) { w.dataset.shown = "1"; w.innerHTML = '<div class="banner err">This exceeds the ' + (isR ? "validated amount still outstanding" : "validated amount not yet approved") + " (" + P(cap) + ") by " + P(amount - cap) + '. To record anyway, give a reason and click Save again.</div><textarea id="e-ovr" placeholder="Reason (e.g. LandBank also paid items still under validation)"></textarea>'; return; }
        override = ($("#e-ovr", m.el).value || "").trim();
        if (!override) return toast("Enter a reason for recording more than the validated amount.", "err");
      }
      const id = uid();
      const doc = clean(Object.assign({ station, period, amount, ref, remarks, override }, isR ? { dateReceived: date } : { dateApproved: date }, stamp()));
      list.push(Object.assign({ id }, doc));
      await put(isR ? "receipts" : "approvals", id, doc);
      await audit(isR ? "REIMBURSEMENT" : "APPROVAL", (isR ? "Recorded reimbursement " : "Recorded approval ") + P(amount) + " for " + station + " " + period + ", ref " + ref + ", dated " + date + (override ? ". Over validated amount — reason: " + override : "") + (remarks ? ". " + remarks : ""), id);
      m.close(); render(); toast("Saved.", "ok");
    });
  }
  async function voidEntry(kind, id) {
    const list = kind === "receipt" ? S.receipts : S.approvals;
    const r = list.find((x) => x.id === id); if (!r) return;
    const ok = await confirmBox("Void this " + kind + "?", "<p>" + P(+r.amount) + " · ref " + esc(r.ref) + ". The entry stays on record, struck through, and stops counting.</p>", "Void", { danger: true, reason: "Reason" });
    if (!ok) return;
    Object.assign(r, { void: true, voidReason: ok.reason, voidTs: nowIso(), voidBy: S.me.id || S.me.name || "" });
    const save = Object.assign({}, r); delete save.id; delete save._k;
    await put(kind === "receipt" ? "receipts" : "approvals", id, clean(save));
    await audit("VOID_" + kind.toUpperCase(), "Voided " + kind + " " + P(+r.amount) + " ref " + r.ref + " (" + r.station + " " + r.period + "). Reason: " + ok.reason, id);
    render();
  }

  /* ======================= REPORTS & EXPORT ======================= */
  let dlNs;
  async function downloadsNs() { if (dlNs !== undefined) return dlNs; dlNs = null; if (window.claude && window.claude.use) { try { dlNs = await window.claude.use("downloads"); } catch (e) { dlNs = null; } } return dlNs; }
  async function saveFile(filename, data, mime) {
    const ns = await downloadsNs();
    if (ns) {
      try { await ns.save({ filename, data: data instanceof Blob ? data : new Blob([data], { type: mime || "application/octet-stream" }) }); toast("Saved " + filename, "ok"); }
      catch (e) { if (e && e.code === "declined") return; toast("Download not available: " + ((e && e.message) || e.code || e), "err"); }
      return;
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "application/octet-stream" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function scopeText() { return (S.filter.station ? stationLabel(S.filter.station) : "All stations") + " · " + monthName(S.filter.period); }
  function genBy() { return (S.store.mode === "shared" ? (S.names[S.me.id] || "Signed-in user") : (S.me.name || "Local user")) + " · " + fmtTs(nowIso()); }
  const ITEM_COLS = [
    { h: "Transaction Date", f: (i) => i.date, w: 12 }, { h: "Time", f: (i) => i.time || "", w: 9 }, { h: "Station", f: (i) => i.station, w: 10 },
    { h: "Site Invoice No.", f: (i) => i.site ? i.site.invoice : "", w: 14 }, { h: "LandBank Invoice No.", f: (i) => i.lb ? i.lb.invoice : "", w: 14 }, { h: "LBP Reference", f: (i) => i.lb ? i.lb.lbRef : "", w: 24 },
    { h: "Site Liters", f: (i) => i.site ? i.siteLiters : null, t: "l", w: 10 }, { h: "LandBank Liters", f: (i) => i.lbLiters, t: "l", w: 10 },
    { h: "Site Subsidy", f: (i) => i.siteSubsidy, t: "p", w: 12 }, { h: "LandBank Amount", f: (i) => i.lbSubsidy, t: "p", w: 12 }, { h: "Variance", f: (i) => i.status === ST.DUP ? 0 : i.variance, t: "p", w: 10 },
    { h: "Status", f: (i) => i.status, w: 20 }, { h: "Match Level", f: (i) => i.level || "", w: 8 }, { h: "Cut-off", f: (i) => i.flags.timing ? "Yes" : "", w: 7 },
    { h: "Remarks", f: (i) => i.remarks.join(" "), w: 60 }, { h: "Investigation Notes", f: (i) => i.notes.map((n) => n.text + " (" + who(n) + ", " + fmtTs(n.ts) + ")").join(" | "), w: 40 }, { h: "Resolved", f: (i) => i.resolved ? "Yes — " + (i.resolved.remark || "") : "", w: 16 }
  ];
  const PDF_ITEM_COLS = [0, 3, 4, 6, 7, 8, 9, 10, 11, 14];
  function reportDefs() {
    const items = scopedItems();
    const sm = R.summarize(items, scopedRecs("site"), scopedRecs("lb"), S.settings);
    const br = bridgeRows(items, sm);
    const pairs = items.filter((i) => i.site && i.lb && !i.flags.suggestion);
    const summaryBlock = [["Scope", scopeText(), "s"], ["Subsidy rate", "From voucher code (DOE10 = ₱10, DOE12 = ₱12 per liter); otherwise ₱" + N(R.rateFor(S.settings, null), 2) + " per liter", "s"], ["Site Report transactions", sm.siteCount, "n"], ["LandBank transactions", sm.lbCount, "n"], ["Site Report liters" + (sm.siteLitersDerived ? " (implied)" : ""), sm.siteLiters, "l"], ["LandBank liters", sm.lbLiters, "l"], ["Site Report subsidy", sm.siteSubsidy, "p"], ["LandBank reported amount", sm.lbSubsidy, "p"], ["Expected subsidy (LandBank liters × rate)", sm.lbExpected, "p"], ["Matched transactions", sm.matchedCount, "n"], ["Unmatched transactions", sm.unmatchedCount, "n"], ["  of which cut-off/timing", sm.timingCount, "n"], ["Total variance (Site − LandBank)", sm.totalVariance, "p"]]
      .concat(br.rows.map((r) => ["  " + r[0], r[1], "p"])).concat([["Unexplained difference", br.unexplained, "p"]]);
    const recv = recvRows();
    const RECV_COLS = [{ h: "Claim Period", f: (r) => r.period, w: 10 }, { h: "Site / Station", f: (r) => stationLabel(r.station), w: 30 }, { h: "Total Liters", f: (r) => r.siteLiters, t: "l", w: 12 }, { h: "Total Subsidy", f: (r) => r.siteSubsidy, t: "p", w: 14 }, { h: "LandBank Reported Amount", f: (r) => r.lbReported, t: "p", w: 14 }, { h: "Validated", f: (r) => r.validated, t: "p", w: 14 }, { h: "Approved", f: (r) => r.approved, t: "p", w: 14 }, { h: "Confirmed Reimbursement", f: (r) => r.reimbursed, t: "p", w: 14 }, { h: "Outstanding Receivable", f: (r) => r.outstanding, t: "p", w: 14 }, { h: "Pending Validation", f: (r) => r.pending, t: "p", w: 14 }, { h: "Claim Status", f: (r) => r.claimStatus, w: 26 }, { h: "Date Received", f: (r) => r.lastReceived || "", w: 12 }, { h: "Remarks", f: (r) => r.receipts.map((x) => x.ref + (x.remarks ? ": " + x.remarks : "")).join("; "), w: 30 }];
    const monthly = {};
    for (const i of items) { const k = i.station + "|" + i.period; const m = monthly[k] = monthly[k] || { station: i.station, period: i.period, sc: 0, sl: 0, ss: 0, lc: 0, ll: 0, ls: 0, matched: 0, unmatched: 0, timing: 0, dups: 0, variance: 0 };
      if (i.status === ST.DUP) { m.dups++; continue; }
      if (i.site) { m.sc++; m.sl += i.siteLiters || 0; m.ss += i.siteSubsidy; } if (i.lb) { m.lc++; m.ll += i.lbLiters || 0; m.ls += i.lbSubsidy; }
      if (i.site && i.lb && !i.flags.suggestion) m.matched++; else m.unmatched++; if (i.flags.timing) m.timing++; }
    const monthlyRows = Object.values(monthly).map((m) => { const r = recv.find((x) => x.station === m.station && x.period === m.period) || {}; return Object.assign(m, { sl: R.r3(m.sl), ll: R.r3(m.ll), ss: R.r2(m.ss), ls: R.r2(m.ls), variance: R.r2(m.ss - m.ls), validated: r.validated || 0, reimbursed: r.reimbursed || 0, outstanding: r.outstanding || 0 }); }).sort((a, b) => (a.period + a.station).localeCompare(b.period + b.station));
    const MCOLS = [{ h: "Period", f: (r) => r.period, w: 10 }, { h: "Station", f: (r) => stationLabel(r.station), w: 30 }, { h: "Site Txns", f: (r) => r.sc, t: "n", w: 9 }, { h: "Site Liters", f: (r) => r.sl, t: "l", w: 12 }, { h: "Site Subsidy", f: (r) => r.ss, t: "p", w: 14 }, { h: "LandBank Txns", f: (r) => r.lc, t: "n", w: 9 }, { h: "LandBank Liters", f: (r) => r.ll, t: "l", w: 12 }, { h: "LandBank Amount", f: (r) => r.ls, t: "p", w: 14 }, { h: "Variance", f: (r) => r.variance, t: "p", w: 12 }, { h: "Matched", f: (r) => r.matched, t: "n", w: 9 }, { h: "Unmatched", f: (r) => r.unmatched, t: "n", w: 9 }, { h: "Cut-off", f: (r) => r.timing, t: "n", w: 8 }, { h: "Duplicates", f: (r) => r.dups, t: "n", w: 9 }, { h: "Validated", f: (r) => r.validated, t: "p", w: 14 }, { h: "Reimbursed", f: (r) => r.reimbursed, t: "p", w: 14 }, { h: "Outstanding", f: (r) => r.outstanding, t: "p", w: 14 }];
    const itemsSheet = (name, rows) => ({ name, cols: ITEM_COLS, rows, pdfCols: PDF_ITEM_COLS });
    return [
      { id: "summary", title: "DOE Site Report vs. LandBank Reconciliation Summary", desc: "Key totals, variance explanation, status counts and every transaction.", sheets: [{ name: "Summary", kv: summaryBlock }, { name: "Status breakdown", cols: [{ h: "Status", f: (r) => r[0], w: 26 }, { h: "Count", f: (r) => r[1].count, t: "n", w: 8 }, { h: "Site Subsidy", f: (r) => r[1].site, t: "p", w: 14 }, { h: "LandBank Amount", f: (r) => r[1].lb, t: "p", w: 14 }], rows: Object.entries(sm.byStatus) }, itemsSheet("All transactions", items)] },
      { id: "matched", title: "Matched Transactions Report", desc: "Transactions found in both reports (Level 1, 2, 3 and manual).", sheets: [itemsSheet("Matched", pairs)] },
      { id: "unsite", title: "Unmatched Site Transactions", desc: "In the Site Report but not matched to LandBank, incl. cut-off items.", sheets: [itemsSheet("Unmatched Site", items.filter((i) => i.site && (!i.lb || i.flags.suggestion) && i.status !== ST.DUP))] },
      { id: "unlb", title: "Unmatched LandBank Transactions", desc: "In the LandBank report but not matched to the Site Report.", sheets: [itemsSheet("Unmatched LandBank", items.filter((i) => i.lb && (!i.site || i.flags.suggestion) && i.status !== ST.DUP))] },
      { id: "variance", title: "Amount and Liter Variance Report", desc: "Matched transactions whose subsidy, liters or date differ, plus rounding.", sheets: [itemsSheet("Variances", pairs.filter((i) => [ST.AMOUNT, ST.LITER, ST.DATE, ST.VERIFY].includes(i.status) || i.flags.rounding))] },
      { id: "dups", title: "Duplicate Transactions Report", desc: "Repeated invoices or LandBank references, excluded from receivable.", sheets: [itemsSheet("Duplicates", items.filter((i) => i.status === ST.DUP))] },
      { id: "receivables", title: "Outstanding DOE Subsidy Receivables", desc: "Reported vs validated vs approved vs reimbursed, per claim period.", sheets: [{ name: "Receivables", cols: RECV_COLS, rows: recv }, { name: "Reimbursements", cols: [{ h: "Date Received", f: (r) => r.dateReceived, w: 12 }, { h: "Station", f: (r) => r.station, w: 10 }, { h: "Period", f: (r) => r.period, w: 9 }, { h: "Amount", f: (r) => +r.amount, t: "p", w: 14 }, { h: "Reference", f: (r) => r.ref, w: 20 }, { h: "Remarks", f: (r) => r.remarks || "", w: 30 }, { h: "Voided", f: (r) => r.void ? "VOID – " + (r.voidReason || "") : "", w: 20 }, { h: "Recorded by", f: (r) => who(r) + " " + fmtTs(r.ts), w: 28 }], rows: S.receipts.filter((r) => inScope(r.station, r.period)) }] },
      { id: "monthly", title: "Monthly Subsidy Reconciliation Report", desc: "Per station and month: volumes, amounts, matching and receivable status.", sheets: [{ name: "Monthly", cols: MCOLS, rows: monthlyRows }] }
    ];
  }
  function cellVal(c, r) { const v = c.f(r); return v == null ? "" : v; }
  function buildXlsx(def, overrideRows, overrideTitle) {
    const wb = XLSX.utils.book_new();
    for (const sh of def.sheets) {
      const head = [[overrideTitle || def.title], ["Scope: " + scopeText()], ["Generated: " + genBy()], []];
      let ws;
      if (sh.kv) {
        ws = XLSX.utils.aoa_to_sheet(head.concat([["Item", "Value"]]).concat(sh.kv.map((k) => [k[0], k[1]])));
        const zf = { p: "#,##0.00", l: "#,##0.000", n: "#,##0" };
        for (let i = 0; i < sh.kv.length; i++) { const cell = ws[XLSX.utils.encode_cell({ r: head.length + 1 + i, c: 1 })]; if (cell && typeof cell.v === "number" && zf[sh.kv[i][2]]) cell.z = zf[sh.kv[i][2]]; }
        ws["!cols"] = [{ wch: 62 }, { wch: 20 }];
      } else {
        const rows = overrideRows && sh.name !== "Summary" && sh.name !== "Status breakdown" ? overrideRows : sh.rows;
        const aoa = head.concat([sh.cols.map((c) => c.h)]).concat(rows.map((r) => sh.cols.map((c) => cellVal(c, r))));
        if (sh.cols.some((c) => c.t === "p")) aoa.push(sh.cols.map((c, j) => j === 0 ? "TOTAL" : c.t === "p" ? R.r2(rows.reduce((a, r) => a + (+c.f(r) || 0), 0)) : c.t === "l" ? R.r3(rows.reduce((a, r) => a + (+c.f(r) || 0), 0)) : ""));
        ws = XLSX.utils.aoa_to_sheet(aoa);
        const fmt = { p: "#,##0.00", l: "#,##0.000", n: "#,##0" };
        for (let ri = head.length + 1; ri < aoa.length; ri++) sh.cols.forEach((c, j) => { if (!fmt[c.t]) return; const cell = ws[XLSX.utils.encode_cell({ r: ri, c: j })]; if (cell && typeof cell.v === "number") cell.z = fmt[c.t]; });
        ws["!cols"] = sh.cols.map((c) => ({ wch: c.w || 12 }));
        ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: head.length, c: 0 }, e: { r: Math.max(head.length, aoa.length - 1), c: sh.cols.length - 1 } }) };
      }
      XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
    }
    return wb;
  }
  function fileStem(title) { return title.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) + "_" + (S.filter.station || "All") + "_" + (S.filter.period || "AllPeriods"); }
  async function exportReport(id, rows, title) {
    const defs = reportDefs();
    let def = defs.find((d) => d.id === id);
    if (id === "custom") def = { title: title || "Transactions", sheets: [{ name: "Transactions", cols: ITEM_COLS, rows }] };
    const wb = buildXlsx(def, id === "summary" ? rows : null, title);
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    await saveFile(fileStem(def.title) + ".xlsx", new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    await audit("EXPORT", "Exported \"" + def.title + "\" to Excel (" + scopeText() + ")");
  }
  async function exportPdf(id) {
    const def = reportDefs().find((d) => d.id === id);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const pdfTxt = (x) => String(x == null ? "" : x).replace(/₱/g, "PHP ").replace(/[−–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/↔/g, "<->").replace(/→/g, "->").replace(/≈/g, "~").replace(/≠/g, "!=");
    const pdfNum = (v, t) => { if (v === "" || v == null) return ""; const n = Number(v); const z = Math.abs(n) < 0.0005 ? 0 : n; return t === "p" ? (z < 0 ? "-" : "") + "PHP " + Math.abs(z).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : t === "l" ? z.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : t === "n" ? z.toLocaleString("en-US") : pdfTxt(v); };
    const header = () => { doc.setFontSize(14); doc.setTextColor(18, 53, 91); doc.text(pdfTxt(def.title), 36, 36); doc.setFontSize(9); doc.setTextColor(90); doc.text(pdfTxt("Scope: " + scopeText() + "    Generated: " + genBy()), 36, 52); };
    header(); let y = 66;
    for (const sh of def.sheets) {
      if (y > 480) { doc.addPage(); header(); y = 66; }
      doc.setFontSize(11); doc.setTextColor(20); doc.text(sh.name, 36, y + 12); y += 18;
      if (sh.kv) {
        doc.autoTable({ startY: y, head: [["Item", "Value"]], body: sh.kv.map(([k, v, t]) => [pdfTxt(k), t === "s" ? pdfTxt(v) : pdfNum(v, t)]), styles: { fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [31, 79, 134] }, columnStyles: { 1: { halign: "right" } }, margin: { left: 36, right: 36 }, tableWidth: 460 });
      } else {
        const cols = sh.pdfCols ? sh.pdfCols.map((k) => sh.cols[k]) : sh.cols;
        const body = sh.rows.map((r) => cols.map((c) => pdfNum(cellVal(c, r), c.t)));
        if (cols.some((c) => c.t === "p")) body.push(cols.map((c, j) => j === 0 ? "TOTAL" : c.t === "p" ? pdfNum(R.r2(sh.rows.reduce((a, r) => a + (+c.f(r) || 0), 0)), "p") : ""));
        const cs = {}; cols.forEach((c, j) => { if (c.t) cs[j] = { halign: "right" }; if (c.h === "Remarks") cs[j] = { cellWidth: 230 }; });
        doc.autoTable({ startY: y, head: [cols.map((c) => pdfTxt(c.h))], body: body.length ? body : [[{ content: "No records", colSpan: cols.length }]], styles: { fontSize: 7, cellPadding: 2.5, overflow: "linebreak" }, headStyles: { fillColor: [31, 79, 134], fontSize: 7 }, columnStyles: cs, margin: { left: 24, right: 24 }, didDrawPage: () => { doc.setFontSize(8); doc.setTextColor(140); doc.text("Page " + doc.internal.getNumberOfPages(), W - 70, doc.internal.pageSize.getHeight() - 16); } });
      }
      y = doc.lastAutoTable.finalY + 22;
    }
    await saveFile(fileStem(def.title) + ".pdf", doc.output("blob"));
    await audit("EXPORT", "Exported \"" + def.title + "\" to PDF (" + scopeText() + ")");
  }
  function vReports(el) {
    if (!S.result || !S.files.length) return emptyState(el);
    const defs = reportDefs();
    el.innerHTML = '<div class="banner info">Reports use the current scope: <b>' + esc(scopeText()) + "</b>. Change station or period in the top bar.</div>" +
      '<div class="grid g2 gap16">' + defs.map((d, i) => '<div class="card"><div class="hd">' + ic("reports").replace("<svg", '<svg style="width:18px;height:18px;color:#1f4f86"') + "<h3>" + (i + 1) + ". " + esc(d.title) + '</h3></div><div class="bd"><p class="small muted" style="margin-top:0">' + esc(d.desc) + " " + d.sheets.filter((s) => s.rows).map((s) => s.rows.length + " row(s)").join(", ") + '</p><div class="row"><button class="btn" data-xl="' + d.id + '">' + ic("dl") + 'Excel</button><button class="btn" data-pdf="' + d.id + '">' + ic("dl") + "PDF</button></div></div></div>").join("") + "</div>" +
      '<div class="card"><div class="bd row"><button class="btn primary" id="all-xl">' + ic("dl") + 'All reports in one Excel workbook</button><span class="small muted">One sheet per report, same scope.</span></div></div>';
    $$("[data-xl]", el).forEach((b) => b.addEventListener("click", () => exportReport(b.dataset.xl)));
    $$("[data-pdf]", el).forEach((b) => b.addEventListener("click", () => exportPdf(b.dataset.pdf)));
    $("#all-xl", el).addEventListener("click", async () => {
      const wb = XLSX.utils.book_new(); const used = new Set();
      for (const d of defs) { const one = buildXlsx(d); for (const n of one.SheetNames) { let nm = n; let k = 2; while (used.has(nm)) nm = n.slice(0, 28) + " " + k++; used.add(nm); XLSX.utils.book_append_sheet(wb, one.Sheets[n], nm); } }
      await saveFile(fileStem("DOE_Subsidy_Reconciliation_All_Reports") + ".xlsx", new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })]));
      await audit("EXPORT", "Exported all reports workbook (" + scopeText() + ")");
    });
  }

  /* ======================= SETTINGS ======================= */
  function vSettings(el) {
    const tabs = [["rate", "Subsidy rate"], ["match", "Matching rules"], ["stations", "Stations & passwords"], ["user", "User"], ["audit", "Audit trail"], ["data", "Data & backup"]];
    el.innerHTML = '<div class="tabs">' + tabs.map(([k, l]) => '<button data-t="' + k + '" class="' + (S.setTab === k ? "on" : "") + '">' + l + "</button>").join("") + '</div><div id="st-body"></div>';
    $$("[data-t]", el).forEach((b) => b.addEventListener("click", () => { S.setTab = b.dataset.t; render(); }));
    const body = $("#st-body", el);
    ({ rate: sRate, match: sMatch, stations: sStations, user: sUser, audit: sAudit, data: sData })[S.setTab](body);
  }
  const adminNote = () => S.canAdmin ? "" : '<div class="banner info">Only editors of this app can change these settings.</div>';
  function sRate(el) {
    const rates = S.settings.rates.slice().sort((a, b) => b.effective.localeCompare(a.effective));
    el.innerHTML = adminNote() + '<div class="grid g2"><div class="card"><div class="hd"><h3>Rate history</h3><span class="sub">the rate in effect on each transaction date is used</span></div><div class="bd flush"><table class="t"><thead><tr><th>Effective from</th><th class="n">Rate / liter</th><th>Authorized by</th><th>Reason</th><th>Recorded</th></tr></thead><tbody>' +
      rates.map((r) => "<tr><td>" + esc(r.effective) + '</td><td class="n">₱' + N(r.rate, 2) + "</td><td>" + esc(r.by) + '</td><td class="small">' + esc(r.reason) + '</td><td class="small">' + (r.ts ? fmtTs(r.ts) : "default") + "</td></tr>").join("") + "</tbody></table></div></div>" +
      '<div class="card"><div class="hd"><h3>Add a new subsidy rate</h3></div><div class="bd"><div class="form"><label>New rate (₱ per liter)</label><input type="number" step="0.01" min="0" id="r-rate"><label>Effective from</label><input type="date" id="r-eff"><label>Authorized by</label><input type="text" id="r-by" placeholder="Name and position of approver"><label>Reason / reference</label><input type="text" id="r-why" placeholder="e.g. DOE memo no."></div><div class="row end" style="margin-top:12px"><button class="btn primary" id="r-save"' + (S.canAdmin ? "" : " disabled") + ">Add rate</button></div><p class=\"small muted\">Source amounts are never overwritten — the rate is used only for expected-subsidy checks and implied liters. Site rows whose Reference Code is DOE + a number (e.g. DOE10, DOE12) use that number as the rate; this setting applies to all other rows.</p></div></div></div>";
    $("#r-save", el).addEventListener("click", async () => {
      if (!canChange()) return;
      const rate = +$("#r-rate", el).value, eff = $("#r-eff", el).value, by = $("#r-by", el).value.trim(), why = $("#r-why", el).value.trim();
      if (!(rate > 0) || !eff || !by || !why) return toast("Fill in rate, effective date, authorizer and reason.", "err");
      const ok = await confirmBox("Change subsidy rate?", "<p>New rate <b>₱" + N(rate, 2) + "</b> per liter effective <b>" + esc(eff) + "</b>, authorized by " + esc(by) + ". Expected-subsidy checks for transactions on or after this date will use the new rate.</p>", "Confirm rate change");
      if (!ok) return;
      S.settings.rates.push(clean(Object.assign({ rate, effective: eff, by, reason: why }, { ts: nowIso(), userId: S.me.id || undefined })));
      if (await put("settings", "main", { data: S.settings })) await audit("RATE_CHANGE", "Subsidy rate ₱" + N(rate, 2) + "/L effective " + eff + " authorized by " + by + " — " + why);
      recompute(); render(); toast("Rate added.", "ok");
    });
  }
  function sMatch(el) {
    const s = S.settings;
    const offs = S.result ? Object.entries(S.result.offsets) : [];
    el.innerHTML = adminNote() + '<div class="card" style="max-width:820px"><div class="hd"><h3>Matching tolerances</h3></div><div class="bd"><div class="form">' +
      '<label>Amount tolerance (₱)</label><div class="row"><input type="number" step="0.01" min="0" id="m-amt" value="' + s.amountTol + '" style="width:110px"><span class="small muted">Differences up to this are treated as rounding (default ₱0.01).</span></div>' +
      '<label>Liter tolerance (L)</label><div class="row"><input type="number" step="0.001" min="0" id="m-lit" value="' + s.literTol + '" style="width:110px"><span class="small muted">Per transaction.</span></div>' +
      '<label>Time window (± minutes)</label><div class="row"><input type="number" step="1" min="0" id="m-win" value="' + s.timeWindowMin + '" style="width:110px"><span class="small muted">For Level 2/3 matching, after clock adjustment.</span></div>' +
      '<label>LandBank clock offset</label><div class="row"><select id="m-om"><option value="auto"' + (s.offsetMode === "auto" ? " selected" : "") + '>Auto-detect from invoice matches</option><option value="manual"' + (s.offsetMode === "manual" ? " selected" : "") + '>Manual</option></select><input type="number" step="0.1" id="m-off" value="' + s.offsetMin + '" style="width:90px"><span class="small muted">minutes (manual / fallback)</span></div>' +
      '<label>Date tolerance (days)</label><div class="row"><input type="number" step="1" min="0" id="m-dd" value="' + s.dateTolDays + '" style="width:110px"><span class="small muted">Larger differences on matched records → DATE MISMATCH.</span></div>' +
      '<label>Level 3 matches</label><label class="row small"><input type="checkbox" id="m-l3"' + (s.autoAcceptL3 ? " checked" : "") + "> Auto-accept unique amount + time matches (otherwise suggested for review)</label>" +
      '<label>Ambiguous dates</label><select id="m-do"><option value="MDY"' + (s.dateOrder === "MDY" ? " selected" : "") + '>MM/DD/YYYY</option><option value="DMY"' + (s.dateOrder === "DMY" ? " selected" : "") + ">DD/MM/YYYY</option></select>" +
      '</div><div class="small muted" style="margin-top:12px">' + offs.map(([st, o]) => esc(st) + ": detected " + (o.detected != null ? N(o.detected, 1) + " min from " + o.n + " matches" : "n/a") + ", using " + N(o.used, 1) + " min").join("<br>") + '</div><div class="row end" style="margin-top:12px"><button class="btn primary" id="m-save"' + (S.canAdmin ? "" : " disabled") + ">Save & re-run</button></div></div></div>";
    $("#m-save", el).addEventListener("click", async () => {
      if (!canChange()) return;
      const before = JSON.stringify({ a: s.amountTol, l: s.literTol, w: s.timeWindowMin, om: s.offsetMode, o: s.offsetMin, d: s.dateTolDays, l3: s.autoAcceptL3, do: s.dateOrder });
      Object.assign(s, { amountTol: Math.max(0, +$("#m-amt", el).value || 0), literTol: Math.max(0, +$("#m-lit", el).value || 0), timeWindowMin: Math.max(0, +$("#m-win", el).value || 0), offsetMode: $("#m-om", el).value, offsetMin: +$("#m-off", el).value || 0, dateTolDays: Math.max(0, Math.round(+$("#m-dd", el).value || 0)), autoAcceptL3: $("#m-l3", el).checked, dateOrder: $("#m-do", el).value });
      const after = JSON.stringify({ a: s.amountTol, l: s.literTol, w: s.timeWindowMin, om: s.offsetMode, o: s.offsetMin, d: s.dateTolDays, l3: s.autoAcceptL3, do: s.dateOrder });
      if (await put("settings", "main", { data: s })) await audit("SETTINGS_CHANGE", "Matching rules changed from " + before + " to " + after);
      recompute(); render(); toast("Saved — reconciliation re-run.", "ok");
    });
  }
  function sStations(el) {
    const saved = lsGet("doeRecon.passwords", {});
    el.innerHTML = '<div class="card gap16"><div class="hd"><h3>Stations</h3><span class="sub">links the Site Report site number to the LandBank station code</span><span class="grow"></span>' + (S.ro ? "" : '<button class="btn sm" id="st-add">Add station</button>') + '</div><div class="bd flush"><table class="t"><thead><tr><th>LandBank station code</th><th>Site Report site number</th><th>Name</th><th>File password (this device)</th><th></th></tr></thead><tbody>' +
      (S.stations.length ? S.stations.map((s) => "<tr><td><b>" + esc(s.code) + "</b></td><td>" + esc(s.siteNumber || "—") + "</td><td>" + esc(s.name) + "</td><td>" + (saved[s.code] ? '<span class="chip good">' + ic("check") + 'Saved</span> <button class="btn sm ghost" data-pwdel="' + esc(s.code) + '">Forget</button>' : '<span class="small muted">Not saved</span>') + ' <button class="btn sm" data-pwset="' + esc(s.code) + '">Set</button></td><td>' + (S.ro ? "" : '<button class="btn sm" data-sted="' + esc(s.id) + '">Edit</button> <button class="btn sm danger" data-stdel="' + esc(s.id) + '">Delete</button>') + "</td></tr>").join("") : '<tr><td colspan="5"><div class="empty small">Stations are linked automatically when one Site Report and one LandBank station are uploaded, or add them here.</div></td></tr>') +
      '</tbody></table></div></div><div class="card" style="max-width:820px"><div class="hd"><h3>LandBank file passwords</h3></div><div class="bd small"><p style="margin-top:0">Passwords are stored <b>only in this browser on this device</b>, never in shared storage. The station code is read from the file name (e.g. <code>43SH002_20260907.xlsx</code>).</p><div class="form"><label>Password pattern (optional)</label><input type="text" id="pw-tpl" value="' + esc(lsGet("doeRecon.pwTemplate", "")) + '" placeholder="e.g. PREFIX@{station}"></div><p class="muted">If your passwords follow a pattern, use <code>{station}</code> where the station code goes. Leave blank to be asked for each new station.</p><div class="row end"><button class="btn" id="pw-tpl-save">Save pattern on this device</button></div></div></div>';
    const add = $("#st-add", el); if (add) add.addEventListener("click", () => stationForm());
    $$("[data-sted]", el).forEach((b) => b.addEventListener("click", () => stationForm(S.stations.find((s) => s.id === b.dataset.sted))));
    $$("[data-stdel]", el).forEach((b) => b.addEventListener("click", async () => { const s = S.stations.find((x) => x.id === b.dataset.stdel); const ok = await confirmBox("Delete station " + s.code + "?", "<p>Records will no longer be linked to this station.</p>", "Delete", { danger: true, reason: "Reason" }); if (!ok) return; S.stations = S.stations.filter((x) => x !== s); await del("stations", s.id); await audit("STATION_DELETE", "Deleted station " + s.code + " (site " + s.siteNumber + "). Reason: " + ok.reason); recompute(); render(); }));
    $$("[data-pwset]", el).forEach((b) => b.addEventListener("click", async () => { const ans = await passwordPrompt("files of station " + b.dataset.pwset, b.dataset.pwset, ""); if (!ans || !ans.pw) return; saved[b.dataset.pwset] = ans.pw; lsSet("doeRecon.passwords", saved); render(); toast("Password saved on this device."); }));
    $$("[data-pwdel]", el).forEach((b) => b.addEventListener("click", () => { delete saved[b.dataset.pwdel]; lsSet("doeRecon.passwords", saved); render(); }));
    $("#pw-tpl-save", el).addEventListener("click", () => { lsSet("doeRecon.pwTemplate", $("#pw-tpl", el).value.trim()); toast("Pattern saved on this device."); });
  }
  function stationForm(s) {
    if (!canChange()) return;
    const m = modal('<div class="mh"><h3>' + (s ? "Edit" : "Add") + ' station</h3></div><div class="mb"><div class="form"><label>LandBank station code</label><input type="text" id="sf-code" value="' + esc(s ? s.code : "") + '" placeholder="e.g. 43SH002"><label>Site Report site number</label><input type="text" id="sf-num" value="' + esc(s ? s.siteNumber : "") + '" placeholder="e.g. 2012"><label>Name</label><input type="text" id="sf-name" value="' + esc(s ? s.name : "") + '" placeholder="e.g. LAPASAN"></div></div><div class="mf"><button class="btn" data-close>Cancel</button><button class="btn primary" id="sf-ok">Save</button></div>');
    $("#sf-ok", m.el).addEventListener("click", async () => {
      const code = $("#sf-code", m.el).value.trim().toUpperCase(), num = $("#sf-num", m.el).value.trim(), name = $("#sf-name", m.el).value.trim();
      if (!code) return toast("Enter the station code.", "err");
      if (S.stations.some((x) => x !== s && (x.code === code || (num && String(x.siteNumber) === num)))) return toast("That code or site number is already linked to another station.", "err");
      const rec = s || { id: safeId("st_" + code) };
      const before = s ? JSON.stringify({ code: s.code, siteNumber: s.siteNumber, name: s.name }) : "(new)";
      Object.assign(rec, { code, siteNumber: num, name });
      if (!s) S.stations.push(rec);
      await put("stations", rec.id, { code, siteNumber: num, name });
      await audit("STATION_SAVE", "Station " + before + " → " + JSON.stringify({ code, siteNumber: num, name }));
      m.close(); recompute(); render();
    });
  }
  function sUser(el) {
    if (S.store.mode === "shared" && !S.demo) { el.innerHTML = '<div class="card" style="max-width:640px"><div class="bd small">You are signed in as <b>' + esc(S.names[S.me.id] || "your claude.ai account") + "</b>. Every change is recorded in the audit trail under your account with a timestamp.</div></div>"; return; }
    el.innerHTML = '<div class="card" style="max-width:640px"><div class="hd"><h3>Your name for the audit trail</h3></div><div class="bd"><div class="form"><label>Name</label><input type="text" id="u-name" value="' + esc(S.me.name) + '" placeholder="e.g. J. Dela Cruz – Accounting"></div><p class="small muted">Stored in this browser and written on every change you make.</p><div class="row end"><button class="btn primary" id="u-save">Save</button></div></div></div>';
    $("#u-save", el).addEventListener("click", () => { S.me.name = $("#u-name", el).value.trim(); lsSet("doeRecon.userName", S.me.name); render(); toast("Saved."); });
  }
  function sAudit(el) {
    const q = (S.auditQ || "").toLowerCase();
    const list = S.audit.slice().reverse().filter((a) => !q || (a.action + " " + a.details + " " + who(a)).toLowerCase().includes(q));
    el.innerHTML = '<div class="card"><div class="hd"><input type="search" id="au-q" placeholder="Search audit trail…" value="' + esc(S.auditQ || "") + '" style="width:280px"><span class="sub">' + N(S.audit.length) + ' entries · append-only</span><span class="grow"></span><button class="btn sm" id="au-xl">' + ic("dl") + 'Export</button></div><div class="bd flush"><div class="tbl-wrap" style="max-height:70vh"><table class="t"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>' +
      (list.length ? list.slice(0, 500).map((a) => '<tr><td class="small" style="white-space:nowrap">' + fmtTs(a.ts) + '</td><td class="small">' + esc(who(a)) + '</td><td><span class="chip neutral">' + esc(a.action) + '</span></td><td class="small">' + esc(a.details) + "</td></tr>").join("") : '<tr><td colspan="4"><div class="empty small">No entries.</div></td></tr>') + "</tbody></table></div></div></div>";
    let t; $("#au-q", el).addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { S.auditQ = e.target.value; render(); const i = $("#au-q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); });
    $("#au-xl", el).addEventListener("click", async () => {
      const ws = XLSX.utils.aoa_to_sheet([["Audit trail — DOE Subsidy Reconciliation"], ["Generated: " + genBy()], [], ["Timestamp", "User", "Action", "Details", "Reference"]].concat(S.audit.map((a) => [fmtTs(a.ts), who(a), a.action, a.details, a.ref || ""])));
      ws["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 100 }, { wch: 30 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Audit trail");
      await saveFile("Audit_Trail_" + new Date().toISOString().slice(0, 10) + ".xlsx", new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })]));
    });
  }
  function sData(el) {
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="hd"><h3>Storage</h3></div><div class="bd small">' +
      (S.demo ? "Demo mode — data lives in memory only." : S.store.mode === "shared" ? "Data is kept in this app's shared database: everyone you share the app with sees the same uploads, matches, notes and receivables. Original files' rows are stored exactly as uploaded." : "Data is kept in this browser's local storage (IndexedDB). Open the app from claude.ai to share it with your team.") +
      '<dl class="kv" style="margin-top:10px"><dt>Files</dt><dd>' + S.files.length + "</dd><dt>Transactions</dt><dd>" + N(S.site.length) + " site · " + N(S.lb.length) + " LandBank</dd><dt>Manual matches</dt><dd>" + S.ov.matches.length + "</dd><dt>Notes</dt><dd>" + S.ov.notes.length + "</dd><dt>Audit entries</dt><dd>" + S.audit.length + "</dd></dl></div></div>" +
      '<div class="card"><div class="hd"><h3>Backup</h3></div><div class="bd"><p class="small muted" style="margin-top:0">A JSON backup holds every uploaded row, mapping, setting, manual action, receivable entry and the audit trail.</p><div class="row"><button class="btn" id="bk-x">' + ic("dl") + "Download backup (.json)</button>" + (S.store.mode !== "shared" && !S.demo ? '<label class="btn">Restore from backup<input type="file" id="bk-i" accept=".json" class="hidden"></label>' : "") + "</div>" +
      (S.store.mode === "local" && !S.demo ? '<hr style="border:none;border-top:1px solid #e3e3de;margin:16px 0"><button class="btn danger" id="bk-clear">Delete all data in this browser…</button>' : "") + "</div></div></div>";
    $("#bk-x", el).addEventListener("click", async () => {
      const cols = ["files", "chunks", "mappings", "stations", "settings", "matches", "unmatches", "notes", "resolved", "audit", "receipts", "approvals", "finals"];
      const data = {}; for (const c of cols) data[c] = await S.store.all(c);
      await saveFile("DOE_Recon_Backup_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ app: "doe-subsidy-recon", version: 1, exportedAt: nowIso(), data }), "application/json");
      await audit("BACKUP", "Downloaded full backup.");
    });
    const bi = $("#bk-i", el);
    if (bi) bi.addEventListener("change", async () => {
      const f = bi.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text()); if (j.app !== "doe-subsidy-recon") throw new Error("Not a backup from this app.");
        const ok = await confirmBox("Restore backup?", "<p>Data from " + esc(j.exportedAt) + " will be merged into this browser's storage (records with the same ID are replaced).</p>", "Restore");
        if (!ok) return;
        for (const [c, arr] of Object.entries(j.data)) for (const d of arr) { const x = Object.assign({}, d); const id = x.id; delete x.id; delete x._k; await S.store.put(c, id, x); }
        await audit("RESTORE", "Restored backup exported " + j.exportedAt);
        await loadAll(); recompute(); render(); toast("Backup restored.", "ok");
      } catch (e) { toast("Restore failed: " + e.message, "err"); }
    });
    const bc = $("#bk-clear", el);
    if (bc) bc.addEventListener("click", async () => { const ok = await confirmBox("Delete all data?", "<p>All uploads, matches, notes, receivables and the audit trail in this browser will be erased. Download a backup first.</p>", "Delete everything", { danger: true, typed: "DELETE" }); if (!ok) return; await S.store.clearAll(); await loadAll(); recompute(); render(); toast("All local data deleted."); });
  }

  /* ======================= demo & samples ======================= */
  async function enterDemo() {
    if (S.demo) return;
    S.saved = { store: S.store, ro: S.ro, filter: Object.assign({}, S.filter) };
    S.demo = true; S.ro = false; S.store = window.ReconStore.makeMemory();
    S.staged = []; S.filter = { station: "", period: "" }; S.rc.sel.clear();
    await loadAll();
    S.settings.stations = [];
    const D = window.SampleData.build();
    for (const f of D.siteFiles.concat(D.lbFiles)) {
      const bytes = new Uint8Array(window.SampleData.toXlsx(XLSX, f));
      const st = await readUpload({ name: f.name }, f.aoa[0][0] === "MOP Reference Report" ? "site" : "lb", bytes);
      S.staged.push(st);
    }
    S.view = "upload"; render();
    await commitStaged(true);
    await audit("DEMO", "Loaded sample data for the fictional DEMO STATION (demo mode, not saved).");
    toast("Sample data loaded — explore the dashboard, reconciliation and discrepancy views.", "ok");
    go("dashboard");
  }
  async function exitDemo() {
    S.demo = false; S.store = S.saved.store; S.ro = S.saved.ro; S.filter = S.saved.filter; S.staged = []; S.rc = { q: "", status: "", from: "", to: "", sort: "date", dir: 1, page: 0, sel: new Set() };
    await loadAll(); recompute(); go("dashboard");
  }
  async function downloadSamples() {
    const D = window.SampleData.build();
    const cfb = XLSX.CFB.utils.cfb_new();
    for (const f of D.siteFiles.concat(D.lbFiles)) XLSX.CFB.utils.cfb_add(cfb, "/" + f.name, new Uint8Array(window.SampleData.toXlsx(XLSX, f)));
    const zip = XLSX.CFB.write(cfb, { type: "array", fileType: "zip" });
    await saveFile("DOE_Recon_Sample_Files.zip", new Blob([zip], { type: "application/zip" }));
  }

  /* ======================= boot ======================= */
  async function boot() {
    $("#app").innerHTML = '<div class="loading"><div class="spin"></div><div id="ld">Loading…</div></div>';
    S.conn = await window.ReconStore.connect((m) => { const l = $("#ld"); if (l) l.textContent = m; });
    S.store = S.conn.store; S.ro = !S.conn.canWrite; S.canAdmin = S.conn.canAdmin; S.me = { id: S.conn.userId, name: lsGet("doeRecon.userName", "") };
    try { await loadAll(); } catch (e) { console.error(e); toast("Could not load saved data: " + e.message, "err"); }
    recompute();
    const h = (location.hash || "").slice(1);
    if (VIEWS.some((v) => v[0] === h)) S.view = h;
    render();
    if (S.conn.memoryOnly) toast("Browser storage is unavailable — data will be lost when you close this page.", "err");
    window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (VIEWS.some((x) => x[0] === v) && v !== S.view) { S.view = v; render(); } });
  }
  window.__recon = S; // for diagnostics
  boot();
})();
