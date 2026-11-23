/* Storage layer: shared artifact database when available (team-wide, durable),
   otherwise this browser's IndexedDB, or in-memory for demo mode. */
(function (root) {
  "use strict";
  const DB_NAME = "doe-subsidy-recon", STORE = "docs";

  function idbOpen() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }

  function makeIdb(db) {
    const tx = (mode) => db.transaction(STORE, mode).objectStore(STORE);
    const p = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    return {
      mode: "local",
      put: (col, id, obj) => p(tx("readwrite").put(Object.assign({ id }, obj), col + "/" + id)),
      del: (col, id) => p(tx("readwrite").delete(col + "/" + id)),
      all: async (col) => (await p(tx("readonly").getAll(IDBKeyRange.bound(col + "/", col + "/￿")))) || [],
      clearAll: () => p(tx("readwrite").clear())
    };
  }

  function makeMemory() {
    const m = new Map();
    return {
      mode: "demo",
      put: async (col, id, obj) => { m.set(col + "/" + id, JSON.parse(JSON.stringify(Object.assign({ id }, obj)))); },
      del: async (col, id) => { m.delete(col + "/" + id); },
      all: async (col) => Array.from(m.entries()).filter(([k]) => k.startsWith(col + "/")).map(([, v]) => v),
      clearAll: async () => m.clear()
    };
  }

  function makeShared(db) {
    const retry = async (fn) => {
      try { return await fn(); }
      catch (e) {
        if (e && e.code === "unavailable") { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); return fn(); }
        throw e;
      }
    };
    return {
      mode: "shared",
      put: (col, id, obj) => retry(() => db.collection(col).doc(id).set(Object.assign({ id, _k: id }, obj))),
      del: (col, id) => retry(() => db.collection(col).doc(id).delete()),
      all: async (col) => {
        const out = []; let last = null;
        for (let guard = 0; guard < 200; guard++) {
          let q = db.collection(col).orderBy("_k");
          if (last != null) q = q.where("_k", ">", last);
          const snap = await retry(() => q.limit(500).get());
          for (const d of snap.docs) out.push(d.data());
          if (snap.size < 500) break;
          last = snap.docs[snap.docs.length - 1].data()._k;
        }
        return out;
      },
      clearAll: null
    };
  }

  /** Resolve the best available store. Returns {store, user, canWrite, canAdmin, userId} */
  async function connect(onStatus) {
    let user = null, dbNs = null;
    if (root.claude && typeof root.claude.use === "function") {
      onStatus && onStatus("Connecting to shared storage…");
      const timeout = (ms) => new Promise((r) => setTimeout(() => r(null), ms));
      try { [dbNs, user] = await Promise.all([Promise.race([root.claude.use("db"), timeout(10000)]), Promise.race([root.claude.use("user"), timeout(10000)])]); }
      catch (e) { dbNs = null; }
    }
    if (dbNs) {
      let userId = null, canWrite = null, canAdmin = false;
      try { userId = user ? await user.id() : null; } catch (e) { /* ignore */ }
      try { canWrite = user ? await user.can("data.write") : null; } catch (e) { canWrite = null; }
      try { canAdmin = user ? !!(await user.canEdit()) : false; } catch (e) { canAdmin = false; }
      return { store: makeShared(dbNs), user, userId, canWrite: canWrite !== false, canAdmin };
    }
    try { const idb = await idbOpen(); return { store: makeIdb(idb), user: null, userId: null, canWrite: true, canAdmin: true }; }
    catch (e) { return { store: makeMemory(), user: null, userId: null, canWrite: true, canAdmin: true, memoryOnly: true }; }
  }

  root.ReconStore = { connect, makeMemory };
})(typeof window !== "undefined" ? window : globalThis);
