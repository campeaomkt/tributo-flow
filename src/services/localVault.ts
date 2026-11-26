// Encrypted browser-local persistence vault using IndexedDB + Web Crypto AES-GCM.
// Allows user-entered A1 certificate (.pfx + password) and Kiwify Client Secret
// to stay saved across browser restarts without writing plaintext secrets to localStorage.

const DB_NAME = 'tributoflow_vault_v1';
const DB_VERSION = 2;
const STORE_KEYS = 'keys';
const STORE_SECRETS = 'secrets';
const STORE_APPDATA = 'appdata';
const MASTER_KEY_ID = 'aes_gcm_master';

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS);
      }
      if (!db.objectStoreNames.contains(STORE_SECRETS)) {
        db.createObjectStore(STORE_SECRETS);
      }
      if (!db.objectStoreNames.contains(STORE_APPDATA)) {
        db.createObjectStore(STORE_APPDATA);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir cofre local.'));
  });
}

function idbGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, storeName: string, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateMasterKey(db: IDBDatabase): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const existing = await idbGet<CryptoKey>(db, STORE_KEYS, MASTER_KEY_ID);
  if (existing) return existing;

  const newKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable key stored securely by the browser
    ['encrypt', 'decrypt']
  );
  await idbPut(db, STORE_KEYS, MASTER_KEY_ID, newKey);
  return newKey;
}

interface EncryptedRecord {
  encrypted: boolean;
  iv?: number[];
  data: number[] | string;
}

export async function saveVaultItem(key: string, plaintext: string): Promise<void> {
  try {
    const db = await openVaultDb();
    const masterKey = await getOrCreateMasterKey(db);

    if (masterKey && typeof crypto !== 'undefined' && crypto.subtle) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(plaintext);
      const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, masterKey, encoded);
      const record: EncryptedRecord = {
        encrypted: true,
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(cipherBuf)),
      };
      await idbPut(db, STORE_SECRETS, key, record);
    } else {
      const record: EncryptedRecord = {
        encrypted: false,
        data: plaintext,
      };
      await idbPut(db, STORE_SECRETS, key, record);
    }
    db.close();
  } catch {
    // Non-fatal fallback if IndexedDB is blocked in private mode
  }
}

export async function loadVaultItem(key: string): Promise<string | null> {
  try {
    const db = await openVaultDb();
    const record = await idbGet<EncryptedRecord>(db, STORE_SECRETS, key);
    if (!record) {
      db.close();
      return null;
    }

    if (record.encrypted && Array.isArray(record.iv) && Array.isArray(record.data)) {
      const masterKey = await getOrCreateMasterKey(db);
      if (!masterKey || typeof crypto === 'undefined' || !crypto.subtle) {
        db.close();
        return null;
      }
      const iv = new Uint8Array(record.iv);
      const cipher = new Uint8Array(record.data);
      const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, masterKey, cipher);
      db.close();
      return new TextDecoder().decode(plainBuf);
    }

    db.close();
    return typeof record.data === 'string' ? record.data : null;
  } catch {
    return null;
  }
}

export async function deleteVaultItem(key: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await idbDelete(db, STORE_SECRETS, key);
    db.close();
  } catch {
    // Ignore errors
  }
}

export async function saveAppData<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openVaultDb();
    await idbPut(db, STORE_APPDATA, key, value);
    db.close();
  } catch {
    // Ignore quota/private-mode errors without crashing UI
  }
}

export async function loadAppData<T>(key: string): Promise<T | null> {
  try {
    const db = await openVaultDb();
    const val = await idbGet<T>(db, STORE_APPDATA, key);
    db.close();
    return val !== undefined ? val : null;
  } catch {
    return null;
  }
}

export async function deleteAppData(key: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await idbDelete(db, STORE_APPDATA, key);
    db.close();
  } catch {
    // Ignore errors
  }
}

