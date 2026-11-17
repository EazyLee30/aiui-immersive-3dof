// Two-slot agent-private save journal over OPFS.
//
// A save is acknowledged only after the record is closed and read back with a
// matching checksum. Two slots alternate, so an interrupted write leaves the
// previous committed record intact; the loader takes the highest valid
// generation and reports whether it had to recover past damage.
//
// The storage object is injected, so this runs under node with a fake OPFS.

const FORMAT = 1;
const MAX_BYTES = 16384;

/** FNV-1a over UTF-16 code units; a corruption detector, not a signature. */
export function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

export function encodeSave(data, generation) {
  return JSON.stringify({format: FORMAT, generation, data, checksum: checksum(JSON.stringify({generation, data}))});
}

/** @returns {{data:object, generation:number}|null} null for any damaged record. */
export function decodeSave(text) {
  let record;
  try { record = JSON.parse(text); } catch { return null; }
  if (!record || record.format !== FORMAT) return null;
  if (!Number.isSafeInteger(record.generation) || record.generation < 1) return null;
  if (!record.data || typeof record.data !== 'object') return null;
  if (record.checksum !== checksum(JSON.stringify({generation: record.generation, data: record.data}))) return null;
  return {data: record.data, generation: record.generation};
}

const missing = error => error?.name === 'NotFoundError' || error?.code === 'ENOENT' || /^NotFoundError\b/.test(String(error?.message));
class InvalidRecord extends Error {}

/**
 * @param storage  navigator.storage-like object exposing getDirectory()
 * @param slots    two file names inside the agent-private directory
 * @param validate normalizes the payload or returns null when it is invalid
 */
export function createStore({storage, slots = ['spatial-save-a.json', 'spatial-save-b.json'], validate = value => value, debounceMs = 350, maxWaitMs = 900, onStatus = () => {}, clock = () => Date.now()} = {}) {
  const quiet = Math.max(0, debounceMs);
  const ceiling = Math.max(quiet, maxWaitMs);
  const metrics = {writes: 0, commits: 0, coalesced: 0, failures: 0, lastCommitMs: 0};
  let root = null, initialLoad = null, active = -1, generation = 0, committed = null, recovered = false;
  let pending = null, running = false, timer = null, force = false, last = {ok: true, unchanged: true};
  let flushWaiters = [];

  const report = event => { try { onStatus(event); } catch { /* a UI callback must not break a write */ } };
  const failed = error => ({ok: false, error: String(error && (error.message || error))});

  async function readRecord(handle) {
    const file = await handle.getFile();
    if (file.size > MAX_BYTES) throw new InvalidRecord('save record too large');
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new InvalidRecord('save record too large');
    const record = decodeSave(new TextDecoder().decode(bytes));
    const data = record && validate(record.data);
    if (!data || typeof data !== 'object') throw new InvalidRecord('invalid save record or payload');
    return {data, generation: record.generation};
  }

  async function readSlot(index) {
    let handle;
    try { handle = await root.getFileHandle(slots[index], {create: false}); }
    catch (error) { if (missing(error)) return null; throw error; }
    try { return {...await readRecord(handle), index}; }
    catch (error) { if (error instanceof InvalidRecord) { recovered = true; return null; } throw error; }
  }

  async function restore() {
    try {
      if (typeof storage?.getDirectory !== 'function') throw new Error('OPFS unavailable');
      root = await storage.getDirectory();
      let best = null;
      for (let index = 0; index < slots.length; index += 1) {
        const record = await readSlot(index);
        if (record && (!best || record.generation > best.generation)) best = record;
      }
      if (!best && recovered) throw new InvalidRecord('no intact save record');
      if (best) {
        active = best.index;
        generation = best.generation;
        committed = JSON.stringify(best.data);
      }
      report({state: 'ready', generation, recovered});
      return {ok: true};
    } catch (error) {
      const result = failed(error);
      report({state: 'error', ...result});
      return result;
    }
  }

  // Share the initial read with every caller. A failed restore locks writes for this instance.
  function ensureLoaded() {
    initialLoad ??= restore();
    return initialLoad;
  }

  async function load() {
    const result = await ensureLoaded();
    if (!result.ok) return result;
    return {ok: true, data: committed === null ? null : JSON.parse(committed), generation, recovered};
  }

  async function write(canonical) {
    const ready = await ensureLoaded();
    if (!ready.ok) return ready;
    if (canonical === committed) return {ok: true, unchanged: true, generation};
    const next = generation + 1, index = active === 0 ? 1 : 0, started = clock();
    let writer;
    try {
      if (!Number.isSafeInteger(next)) throw new Error('save generation exhausted');
      const record = encodeSave(JSON.parse(canonical), next);
      if (new TextEncoder().encode(record).byteLength > MAX_BYTES) throw new InvalidRecord('save record too large');
      metrics.writes += 1;
      report({state: 'saving', generation: next});
      const handle = await root.getFileHandle(slots[index], {create: true});
      writer = await handle.createWritable();
      await writer.truncate(0);
      await writer.write(record);
      await writer.close();
      writer = null;
      const verified = await readRecord(handle);
      if (verified.generation !== next || JSON.stringify(verified.data) !== canonical) throw new Error('readback did not match the write');
      active = index; generation = next; committed = canonical; recovered = false; metrics.commits += 1;
      const result = {ok: true, generation, fingerprint: checksum(canonical)};
      report({state: 'saved', ...result});
      return result;
    } catch (error) {
      try { await writer?.abort?.(); } catch { /* Keep the original write failure. */ }
      metrics.failures += 1;
      report({state: 'error', error: String(error && error.message || error)});
      return failed(error);
    } finally { metrics.lastCommitMs = Math.max(0, clock() - started); }
  }

  function settle() {
    const waiting = flushWaiters; flushWaiters = []; force = false;
    for (const resolve of waiting) resolve(last);
  }

  function schedule() {
    if (running || !pending) return;
    if (timer !== null) { clearTimeout(timer); timer = null; }
    const wait = force ? 0 : Math.max(0, Math.min(pending.lastAt + quiet, pending.firstAt + ceiling) - clock());
    if (wait > 0) { timer = setTimeout(() => { timer = null; schedule(); }, wait); return; }
    running = true;
    Promise.resolve().then(async () => {
      let job = null;
      try {
        while (pending) { job = pending; pending = null; last = await write(job.canonical); job.resolve(last); }
      } finally {
        running = false;
        if (pending) schedule(); else settle();
      }
    });
  }

  return {
    load,
    save(value) {
      let canonical;
      try {
        const data = validate(value);
        if (!data || typeof data !== 'object') throw new InvalidRecord('invalid save payload');
        canonical = JSON.stringify(data);
        if (!canonical || typeof JSON.parse(canonical) !== 'object' || canonical === 'null') throw new InvalidRecord('invalid save payload');
      } catch (error) { return Promise.resolve(failed(error)); }
      const now = clock();
      if (pending) { pending.canonical = canonical; pending.lastAt = now; metrics.coalesced += 1; }
      else {
        let resolve; const promise = new Promise(done => { resolve = done; });
        pending = {canonical, promise, resolve, firstAt: now, lastAt: now};
      }
      const result = pending.promise;
      schedule();
      return result;
    },
    flush() {
      if (!pending && !running) return Promise.resolve(last);
      force = true;
      const result = new Promise(resolve => flushWaiters.push(resolve));
      schedule();
      return result;
    },
    get metrics() { return metrics; },
  };
}
