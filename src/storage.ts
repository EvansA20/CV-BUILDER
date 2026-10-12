import type { CVDocument } from "./types";

const DB_NAME = "careerfy-local";
const DB_VERSION = 1;
const STORE_NAME = "documents";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
    request.onblocked = () => reject(new Error("Careerfy storage is blocked by another browser tab."));
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    let result: T | undefined;
    let failed = false;
    request.onsuccess = () => { result = request.result; };
    const fail = (error: Error | null, fallback: string) => {
      if (failed) return;
      failed = true;
      reject(error ?? new Error(fallback));
    };
    request.onerror = () => fail(request.error, "Could not complete the local storage operation.");
    transaction.onabort = () => {
      db.close();
      fail(transaction.error, "The local storage operation was cancelled.");
    };
    transaction.onerror = () => {
      db.close();
      fail(transaction.error, "The local storage operation failed.");
    };
    transaction.oncomplete = () => { db.close(); if (!failed) resolve(result as T); };
  });
}

export const cvStore = {
  async all(): Promise<CVDocument[]> {
    const docs = await transact<CVDocument[]>("readonly", (store) => store.getAll());
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  put(document: CVDocument): Promise<IDBValidKey> {
    return transact<IDBValidKey>("readwrite", (store) => store.put(document));
  },
  async putMany(documents: CVDocument[]): Promise<void> {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      documents.forEach((document) => store.put(document));
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("The import could not be saved."));
      transaction.onerror = () => reject(transaction.error ?? new Error("The import could not be saved."));
    }).finally(() => db.close());
  },
  remove(id: string): Promise<undefined> {
    return transact<undefined>("readwrite", (store) => store.delete(id));
  },
  clear(): Promise<undefined> {
    return transact<undefined>("readwrite", (store) => store.clear());
  },
};
