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

const missing = error => /NotFoundError|no such file|ENOENT/i.test(String(error && (error.message || error)));

/**
 * @param storage  navigator.storage-like object exposing getDirectory()
 * @param slots    two file names inside the agent-private directory
 * @param validate normalizes the payload or returns null when it is invalid
 */
export function createStore({storage, slots = ['spatial-save-a.json', 'spatial-save-b.json'], validate = value => value, debounceMs = 350, maxWaitMs = 900, onStatus = () => {}, clock = () => Date.now()} = {}) {
  const quiet = Math.max(0, debounceMs);
  const ceiling = Math.max(quiet, maxWaitMs);
  const metrics = {writes: 0, commits: 0, coalesced: 0, failures: 0, lastCommitMs: 0};
  let root = null, resolved = false, active = -1, generation = 0, committed = null, current = null, recovered = false;
  let pending = null, running = false, timer = null, force = false, last = {ok: true, unchanged: true};
  let flushWaiters = [];

  const report = event => { try { onStatus(event); } catch { /* a UI callback must not break a write */ } };
  const failed = error => ({ok: false, error: String(error && (error.message || error))});

  async function readText(index) {
    const handle = await root.getFileHandle(slots[index], {create: false});
    const file = await handle.getFile();
    if (file.size > MAX_BYTES) throw new Error('save record too large');
    const text = new TextDecoder().decode(await file.arrayBuffer());
    if (text.length > MAX_BYTES) throw new Error('save record too large');
    return text;
  }

  async function open() {
    if (root) return true;
    if (typeof storage?.getDirectory !== 'function') return false;
    try { root = await storage.getDirectory(); } catch { return false; }
    return true;
  }

  async function load() {
    if (resolved) return {ok: true, data: current, generation, recovered};
    if (!(await open())) return failed('OPFS unavailable');
    let best = null;
    recovered = false;
    for (let index = 0; index < slots.length; index += 1) {
      let text = null;
      try { text = await readText(index); } catch (error) { if (!missing(error)) recovered = true; continue; }
      const record = decodeSave(text);
      if (!record) { recovered = true; continue; }
      if (!best || record.generation > best.generation) best = {...record, index};
    }
    if (best) { active = best.index; generation = best.generation; committed = JSON.stringify(best.data); current = best.data; }
    resolved = true;
    report({state: 'ready', generation, recovered});
    return {ok: true, data: current, generation, recovered};
  }

  async function write(data) {
    if (!resolved) { const ready = await load(); if (!ready.ok) return ready; }
    const canonical = JSON.stringify(data);
    if (canonical === committed) return {ok: true, unchanged: true, generation};
    const next = generation + 1, index = active === 0 ? 1 : 0, started = clock();
    metrics.writes += 1;
    report({state: 'saving', generation: next});
    try {
      const handle = await root.getFileHandle(slots[index], {create: true});
      const writer = await handle.createWritable();
      await writer.truncate(0);
      await writer.write(encodeSave(data, next));
      await writer.close();
      const verified = decodeSave(await readText(index));
      if (!verified || verified.generation !== next || JSON.stringify(verified.data) !== canonical) throw new Error('readback did not match the write');
      active = index; generation = next; committed = canonical; current = data; metrics.commits += 1;
      const result = {ok: true, generation, fingerprint: checksum(canonical)};
      report({state: 'saved', ...result});
      return result;
    } catch (error) {
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
        while (pending) { job = pending; pending = null; last = await write(job.data); job.resolve(last); }
      } finally {
        running = false;
        if (pending) schedule(); else settle();
      }
    });
  }

  return {
    load,
    save(value) {
      const data = validate(value);
      if (!data) return Promise.resolve(failed('invalid save payload'));
      const now = clock();
      if (pending) { pending.data = data; pending.lastAt = now; metrics.coalesced += 1; }
      else {
        let resolve; const promise = new Promise(done => { resolve = done; });
        pending = {data, promise, resolve, firstAt: now, lastAt: now};
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
