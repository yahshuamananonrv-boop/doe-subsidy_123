/* Office (OOXML) password decryption — ECMA-376 Standard and Agile encryption.
   Runs entirely in the browser; the password and file never leave the page.
   Depends on: XLSX (SheetJS, for CFB), aesjs, sha1, sha512 (globals). */
(function (root) {
  "use strict";

  function u8(x) { return x instanceof Uint8Array ? x : new Uint8Array(x); }
  function concat() {
    let n = 0; for (const a of arguments) n += a.length;
    const out = new Uint8Array(n); let o = 0;
    for (const a of arguments) { out.set(a, o); o += a.length; }
    return out;
  }
  function le32(i) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, i >>> 0, true); return b; }
  function utf16le(s) {
    const b = new Uint8Array(s.length * 2);
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[2 * i] = c & 255; b[2 * i + 1] = c >> 8; }
    return b;
  }
  function b64(s) { const bin = atob(s); const o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
  function eq(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  function hashFn(name) {
    const n = String(name || "SHA1").toUpperCase().replace("-", "");
    if (n === "SHA1") return (d) => new Uint8Array(root.sha1.arrayBuffer(d));
    if (n === "SHA512") return (d) => new Uint8Array(root.sha512.arrayBuffer(d));
    if (n === "SHA384") return (d) => new Uint8Array(root.sha384.arrayBuffer(d));
    throw new Error("Unsupported hash algorithm in encrypted file: " + name);
  }

  function isCFB(bytes) {
    const b = u8(bytes);
    return b.length > 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
  }

  function readStreams(bytes) {
    const cfb = root.XLSX.CFB.read(u8(bytes), { type: "buffer" });
    const info = root.XLSX.CFB.find(cfb, "EncryptionInfo");
    const pkg = root.XLSX.CFB.find(cfb, "EncryptedPackage");
    if (!info || !pkg) return null;
    return { info: u8(info.content), pkg: u8(pkg.content) };
  }

  /** true when the bytes are a password-protected OOXML workbook */
  function isEncrypted(bytes) {
    if (!isCFB(bytes)) return false;
    try { return !!readStreams(bytes); } catch (e) { return false; }
  }

  function aesEcbDecrypt(key, data) {
    const ecb = new root.aesjs.ModeOfOperation.ecb(key);
    const n = data.length - (data.length % 16);
    return ecb.decrypt(data.subarray(0, n));
  }
  function aesCbcDecrypt(key, iv, data) {
    const cbc = new root.aesjs.ModeOfOperation.cbc(key, iv);
    const n = data.length - (data.length % 16);
    return cbc.decrypt(data.subarray(0, n));
  }

  /* ---------- Standard encryption (AES-128/192/256 ECB, SHA-1, 50,000 spins) ---------- */
  function decryptStandard(info, pkg, password) {
    const dv = new DataView(info.buffer, info.byteOffset, info.byteLength);
    const headerSize = dv.getUint32(8, true);
    const h = 12;
    const algId = dv.getUint32(h + 8, true);
    const keyBits = dv.getUint32(h + 16, true);
    if (algId !== 0x660e && algId !== 0x660f && algId !== 0x6610) throw new Error("Unsupported cipher (only AES Standard encryption is supported).");
    let v = h + headerSize;
    const saltSize = dv.getUint32(v, true); v += 4;
    const salt = info.subarray(v, v + saltSize); v += saltSize;
    const encVerifier = info.subarray(v, v + 16); v += 16;
    const verHashSize = dv.getUint32(v, true); v += 4;
    const encVerHash = info.subarray(v, v + 32);

    const H = hashFn("SHA1");
    let hh = H(concat(salt, utf16le(password)));
    for (let i = 0; i < 50000; i++) hh = H(concat(le32(i), hh));
    const hfinal = H(concat(hh, le32(0)));
    const b1 = new Uint8Array(64).fill(0x36), b2 = new Uint8Array(64).fill(0x5c);
    for (let i = 0; i < hfinal.length; i++) { b1[i] ^= hfinal[i]; b2[i] ^= hfinal[i]; }
    const key = concat(H(b1), H(b2)).subarray(0, keyBits / 8);

    const ver = aesEcbDecrypt(key, encVerifier);
    const verHash = aesEcbDecrypt(key, encVerHash).subarray(0, verHashSize);
    if (!eq(H(ver), verHash)) { const e = new Error("Incorrect password"); e.code = "BAD_PASSWORD"; throw e; }

    const size = new DataView(pkg.buffer, pkg.byteOffset, 8).getUint32(0, true);
    const out = aesEcbDecrypt(key, pkg.subarray(8));
    return out.subarray(0, size);
  }

  /* ---------- Agile encryption (AES-CBC, SHA-512 etc., XML descriptor) ---------- */
  function attr(xml, el, name) {
    const re = new RegExp("<(?:\\w+:)?" + el + "\\b[^>]*?\\s" + name + "=\"([^\"]*)\"");
    const m = xml.match(re); return m ? m[1] : null;
  }
  function deriveAgile(H, salt, password, spin, blockKey, keyBytes) {
    let hh = H(concat(salt, utf16le(password)));
    for (let i = 0; i < spin; i++) hh = H(concat(le32(i), hh));
    let k = H(concat(hh, blockKey));
    if (k.length < keyBytes) { const p = new Uint8Array(keyBytes).fill(0x36); p.set(k); k = p; }
    return k.subarray(0, keyBytes);
  }
  function decryptAgile(info, pkg, password) {
    const xml = new TextDecoder("utf-8").decode(info.subarray(8));
    const kdSalt = b64(attr(xml, "keyData", "saltValue"));
    const kdHash = hashFn(attr(xml, "keyData", "hashAlgorithm"));
    const blockSize = +attr(xml, "keyData", "blockSize");
    const pSalt = b64(attr(xml, "encryptedKey", "saltValue"));
    const pHash = hashFn(attr(xml, "encryptedKey", "hashAlgorithm"));
    const spin = +attr(xml, "encryptedKey", "spinCount");
    const keyBytes = (+attr(xml, "encryptedKey", "keyBits")) / 8;
    const hashSize = +attr(xml, "encryptedKey", "hashSize");
    const encKey = b64(attr(xml, "encryptedKey", "encryptedKeyValue"));
    const encVI = b64(attr(xml, "encryptedKey", "encryptedVerifierHashInput"));
    const encVV = b64(attr(xml, "encryptedKey", "encryptedVerifierHashValue"));

    const iv = pSalt.subarray(0, 16);
    const kIn = deriveAgile(pHash, pSalt, password, spin, new Uint8Array([0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79]), keyBytes);
    const kVal = deriveAgile(pHash, pSalt, password, spin, new Uint8Array([0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e]), keyBytes);
    const vi = aesCbcDecrypt(kIn, iv, encVI).subarray(0, pSalt.length);
    const vv = aesCbcDecrypt(kVal, iv, encVV).subarray(0, hashSize);
    if (!eq(pHash(vi).subarray(0, hashSize), vv)) { const e = new Error("Incorrect password"); e.code = "BAD_PASSWORD"; throw e; }
    const kKey = deriveAgile(pHash, pSalt, password, spin, new Uint8Array([0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6]), keyBytes);
    const secret = aesCbcDecrypt(kKey, iv, encKey).subarray(0, keyBytes);

    const size = new DataView(pkg.buffer, pkg.byteOffset, 8).getUint32(0, true);
    const data = pkg.subarray(8);
    const out = new Uint8Array(data.length);
    const SEG = 4096;
    for (let i = 0, off = 0; off < data.length; i++, off += SEG) {
      const seg = data.subarray(off, Math.min(off + SEG, data.length));
      const segIv = kdHash(concat(kdSalt, le32(i))).subarray(0, blockSize);
      out.set(aesCbcDecrypt(secret, segIv, seg), off);
    }
    return out.subarray(0, size);
  }

  /** Decrypt a password-protected workbook; returns the plain .xlsx bytes. */
  function decrypt(bytes, password) {
    const s = readStreams(bytes);
    if (!s) throw new Error("File is not an encrypted Office workbook.");
    const major = s.info[0] | (s.info[1] << 8), minor = s.info[2] | (s.info[3] << 8);
    if (major === 4 && minor === 4) return decryptAgile(s.info, s.pkg, password);
    if ((major === 2 || major === 3 || major === 4) && minor === 2) return decryptStandard(s.info, s.pkg, password);
    throw new Error("Unsupported encryption version " + major + "." + minor);
  }

  root.OfficeDecrypt = { isEncrypted, decrypt };
})(typeof window !== "undefined" ? window : globalThis);
