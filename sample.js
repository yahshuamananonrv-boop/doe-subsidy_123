/* Sample data generator — fictional DEMO STATION, two business days, every reconciliation scenario.
   Produces workbooks in the same layout as the real SH MOP Reference Report and LandBank export. */
(function (root) {
  "use strict";
  const PRICE = 86.1, RATE = 12, OFFSET_MIN = 10;
  const STATION = { code: "99SH999", siteNumber: "9999", name: "DEMO STATION (SAMPLE DATA)" };
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const plates = ["KVA101", "KVB202", "NHC303", "KBD404", "CU5055", "NKF606", "KVT707", "DB8088", "KVW909", "NHB110", "KVS212", "KBM313"];

  function dt(date, hh, mm, ss) { return { date, h: hh, m: mm, s: ss || 0 }; }
  function shift(t, min) {
    const d = new Date(Date.UTC(+t.date.slice(0, 4), +t.date.slice(5, 7) - 1, +t.date.slice(8, 10), t.h, t.m, t.s) + min * 60000);
    return { date: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() };
  }
  const tstr = (t) => pad(t.h) + ":" + pad(t.m) + ":" + pad(t.s);
  const trunc2 = (x) => Math.floor(x * 100 + 1e-6) / 100;
  const round2 = (x) => Math.round(x * 100 + 1e-9) / 100;
  const round3 = (x) => Math.round(x * 1000) / 1000;

  function build() {
    seed = 7;
    const txns = []; // {t, inv, pump, liters, siteSub, lbSub, flags...}
    let inv = 160100;
    const add = (t, pump, o) => {
      const liters = o && o.liters != null ? o.liters : round3(pump / PRICE);
      const x = Object.assign({ t, inv: inv++, pump, liters, siteSub: trunc2(liters * RATE), lbSub: round2(liters * RATE), plate: pick(plates), inSite: true, inLb: true, scenario: "Matched" }, o || {});
      if (o && o.liters != null && o.siteSub == null) x.siteSub = trunc2(liters * RATE);
      txns.push(x); return x;
    };
    const amounts = [300, 500, 600, 1000, 1200, 1291.5, 1500, 2000, 516.6, 861];
    for (const day of ["2026-10-01", "2026-10-02"]) {
      let h = 6, m = 5;
      for (let i = 0; i < 16; i++) {
        add(dt(day, h, m, Math.floor(rnd() * 59)), pick(amounts));
        m += 40 + Math.floor(rnd() * 25); while (m >= 60) { m -= 60; h++; }
        if (h > 22) break;
      }
    }
    // Scenarios
    add(dt("2026-10-01", 13, 5, 12), 1000, { inLb: false, scenario: "Missing in LandBank" });
    add(dt("2026-10-02", 20, 42, 7), 600, { inLb: false, scenario: "Missing in LandBank" });
    add(dt("2026-10-01", 15, 40, 33), 1200, { inSite: false, scenario: "Missing in Site Report" });
    add(dt("2026-10-02", 7, 18, 50), 500, { inSite: false, scenario: "Missing in Site Report" });
    add(dt("2026-10-01", 10, 15, 2), 1291.5, { liters: 15, siteSub: 180, lbSub: 168, lbLiters: 14, scenario: "Different subsidy amount" });
    add(dt("2026-10-02", 9, 20, 41), 1291.5, { liters: 15, siteSub: 180, lbSub: 180, lbLiters: 14.5, scenario: "Different liters" });
    add(dt("2026-10-02", 11, 0, 9), 1500, { dupSite: true, scenario: "Duplicate invoice in Site Report" });
    add(dt("2026-10-02", 12, 30, 55), 2000, { dupLb: true, scenario: "Duplicate LandBank reference" });
    add(dt("2026-10-01", 19, 0, 30), 1000, { lbDate: "2026-10-02", lbTime: "08:15:00", scenario: "Different transaction date (LandBank posted next day)" });
    add(dt("2026-10-02", 14, 10, 18), 1200, { lbInv: "160545", inv: 160455, scenario: "Invoice keyed differently (L2)" });
    add(dt("2026-10-01", 16, 0, 10), 1000, { lbInv: "", scenario: "Ambiguous – two same-amount sales minutes apart" });
    add(dt("2026-10-01", 16, 3, 40), 1000, { lbInv: "", scenario: "Ambiguous – two same-amount sales minutes apart" });
    add(dt("2026-10-02", 17, 45, 5), 2500, { lbInv: "", scenario: "No invoice in LandBank – suggested match (L3)" });
    add(dt("2026-10-01", 4, 30, 15), 1000, { inSite: false, scenario: "Cut-off: belongs to previous site business day" });
    add(dt("2026-10-01", 5, 20, 45), 800, { inSite: false, scenario: "Cut-off: belongs to previous site business day" });
    add(dt("2026-10-03", 2, 15, 0), 1500, { inLb: false, scenario: "Cut-off: LandBank report for Oct 3 not yet loaded" });
    add(dt("2026-10-03", 4, 40, 0), 1000, { inLb: false, scenario: "Cut-off: LandBank report for Oct 3 not yet loaded" });
    txns.sort((a, b) => (a.t.date + tstr(a.t)).localeCompare(b.t.date + tstr(b.t)));

    // ---- Site reports (business day 05:50 → 05:59 next day)
    const siteDays = [
      { day: "2026-10-01", start: "2026-10-01 05:50:12 AM", end: "2026-10-02 05:59:40 AM", lo: "2026-10-01 05:50:12", hi: "2026-10-02 05:59:40", per: "Day - 1151" },
      { day: "2026-10-02", start: "2026-10-02 05:59:41 AM", end: "2026-10-03 05:58:03 AM", lo: "2026-10-02 05:59:41", hi: "2026-10-03 05:58:03", per: "Day - 1152" }
    ];
    const siteHdr = ["Date", "Time", "POS", "Invoice Number", "MOP Name", "Reference Code", "MOP Amount", "Transaction Type", "Product Type", "Other MOP", "Loyalty Type", "Product 1 Code", "Product 1 Name", "Product 1 Value", "Product 1 Quantity"];
    const siteFiles = siteDays.map((sd) => {
      const aoa = [["MOP Reference Report"], ["Site Name:", STATION.name], ["Site Number:", STATION.siteNumber], ["Period:", sd.per], ["Start Date:", sd.start], ["End Date:", sd.end], [], siteHdr];
      const inDay = txns.filter((x) => x.inSite && (x.t.date + " " + tstr(x.t)) >= sd.lo && (x.t.date + " " + tstr(x.t)) <= sd.hi);
      let nfr = 30010;
      for (const x of inDay) {
        const row = [x.t.date, tstr(x.t), "1", "000-" + x.inv, "Other Vouchers", "DOE12", x.siteSub, "Sale", "Fuel", "Cash", "NOLOYALTY", "ADO", "FSDiesel", x.pump, x.liters];
        aoa.push(row);
        if (x.dupSite) aoa.push(row.slice());
        if (rnd() < 0.25) { const t2 = shift(x.t, 3); aoa.push([t2.date, tstr(t2), "6", "000-0" + (nfr++), pick(["GrabMart", "FoodPanda Shops"]), String(Math.floor(rnd() * 900 + 100)), 150, "Sale", "NFR", null, "NOLOYALTY", "4800000000001", "BOTTLED WATER 1L", 150, 1]); }
      }
      return { name: "SAMPLE_" + STATION.name.split(" ")[0] + "_Site_Report_" + sd.day + ".xlsx", aoa };
    });

    // ---- LandBank reports (calendar day, LandBank clock = POS + 10 min)
    const lbHdr = ["Station Code", "Province", "Region", "Segment", "Account Number", "Plate Number", "Pump Amount", "Liters Dispensed", "Computed Discount", "Amount Paid", "Remaining Subsidy", "LBP Reference No.", "POS Sales Invoice No.", "Transaction Date", "Transaction Time", "Settlement Date"];
    const lbRows = {};
    for (const x of txns) {
      if (!x.inLb) continue;
      const lt = shift(x.t, OFFSET_MIN + (Math.floor(rnd() * 40) / 60));
      const date = x.lbDate || lt.date, time = x.lbTime || tstr(lt);
      const liters = x.lbLiters != null ? x.lbLiters : x.liters;
      const sub = x.lbSub;
      const settle = x.lbDate ? "2026-10-05" : date === "2026-10-01" ? (lt.h >= 15 ? "2026-10-06" : "2026-10-03") : "2026-10-05";
      const ref = "REF-" + (12000 + Math.floor(rnd() * 3999)) + "-" + (1790000000000 + x.inv * 37);
      const row = [STATION.code, "DEMO PROVINCE", "X", "DEMO CITY", "", x.plate, String(x.pump), String(liters), sub.toFixed(2).replace(/\.?0+$/, ""), String(round2(x.pump - sub)), String(round2(1800 - sub)), ref, x.lbInv != null ? x.lbInv : String(x.inv), date, time, settle];
      (lbRows[date] = lbRows[date] || []).push(row);
      if (x.dupLb) lbRows[date].push(row.slice());
    }
    const lbFiles = Object.keys(lbRows).sort().map((d) => ({ name: STATION.code + "_" + d.replace(/-/g, "") + "_SAMPLE.xlsx", aoa: [lbHdr].concat(lbRows[d]) }));
    return { station: STATION, siteFiles, lbFiles, txns };
  }

  function toXlsx(XLSX, file) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(file.aoa);
    XLSX.utils.book_append_sheet(wb, ws, file.aoa[0][0] === "MOP Reference Report" ? "MOP Reference Report" : "LandBank");
    return XLSX.write(wb, { type: "array", bookType: "xlsx" });
  }

  root.SampleData = { build, toXlsx, STATION };
})(typeof window !== "undefined" ? window : globalThis);
