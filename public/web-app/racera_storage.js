(function () {
  const databaseName = "racera-web-cache";
  const storeName = "entries";

  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  async function run(mode, callback) {
    const db = await database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  window.raceraStorage = {
    get(key) {
      return run("readonly", (store) => store.get(key));
    },
    set(key, value) {
      return run("readwrite", (store) => store.put(value, key));
    },
    remove(key) {
      return run("readwrite", (store) => store.delete(key));
    },
    async keys(prefix) {
      const keys = await run("readonly", (store) => store.getAllKeys());
      return JSON.stringify(
        (keys || []).map(String).filter((key) => key.startsWith(prefix)),
      );
    },
  };
})();
