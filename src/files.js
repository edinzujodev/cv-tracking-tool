// CV files live in IndexedDB (chrome.storage.local is too small for documents).
// A file is keyed by name + size + modified time, so sending the same file to ten
// jobs stores it once and a re-edited file with the same name is kept separately.

const DB = 'cv-files';
const STORE = 'cvs';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;

export const putCv = (file) => run('readwrite', (s) => s.put(file, fileKey(file)));
export const getCv = (key) => run('readonly', (s) => s.get(key));
export const deleteCv = (key) => run('readwrite', (s) => s.delete(key));
