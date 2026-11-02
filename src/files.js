// CV files live in IndexedDB (chrome.storage.local is too small for documents).
// A file is keyed by name + size + modified time, so sending the same file to ten
// jobs stores it once and a re-edited file with the same name is kept separately.

const DB = 'cv-files';
const STORE = 'cvs';
const HANDLES = 'handles';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(HANDLES)) db.createObjectStore(HANDLES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn, store = STORE) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;

export const putCv = (file) => run('readwrite', (s) => s.put(file, fileKey(file)));
export const getCv = (key) => run('readonly', (s) => s.get(key));
export const deleteCv = (key) => run('readwrite', (s) => s.delete(key));

// ---- Folder on disk -------------------------------------------------------
// The user picks the root folder once (File System Access API). The handle is kept
// in IndexedDB; Chrome asks again for permission when a new session first writes.

export const getRoot = () => run('readonly', (s) => s.get('root'), HANDLES);
export const setRoot = (handle) => run('readwrite', (s) => s.put(handle, 'root'), HANDLES);

export async function ensureWritable(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

// Folder and file names Windows accepts.
export function safeName(name, fallback = 'Unnamed') {
  const cleaned = String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return cleaned || fallback;
}

async function exists(dir, name) {
  try {
    return await dir.getFileHandle(name);
  } catch {
    return null;
  }
}

// Writes <root>/<client>/<file name>. A file already there with the same size is
// treated as the same CV and left alone; a different one gets " (2)", " (3)"...
// Returns the path shown to the user.
export async function saveToClientFolder(root, client, file) {
  const folder = safeName(client);
  const dir = await root.getDirectoryHandle(folder, { create: true });
  const dot = file.name.lastIndexOf('.');
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  const ext = dot > 0 ? file.name.slice(dot) : '';

  let name = safeName(file.name, 'CV');
  for (let n = 2; ; n++) {
    const found = await exists(dir, name);
    if (!found) break;
    if ((await found.getFile()).size === file.size) return `${root.name}\\${folder}\\${name}`;
    name = `${safeName(base, 'CV')} (${n})${ext}`;
  }
  const out = await (await dir.getFileHandle(name, { create: true })).createWritable();
  await out.write(file);
  await out.close();
  return `${root.name}\\${folder}\\${name}`;
}
