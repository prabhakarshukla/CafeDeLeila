const preference = 'cdl-admin:keep-signed-in';

export function adminSessionStorage(storageKey) {
  function browserStorage(name, operation) {
    try { return operation(window[name]); }
    catch { return null; }
  }

  let keepSignedIn = browserStorage('localStorage', storage => storage.getItem(preference)) === 'true';
  const selected = () => keepSignedIn ? 'localStorage' : 'sessionStorage';
  function removeItem(key) {
    for (const name of ['localStorage','sessionStorage']) browserStorage(name, storage => storage.removeItem(key));
  }

  function clear() {
    for (const key of [storageKey, storageKey + '-code-verifier', storageKey + '-user']) removeItem(key);
  }
  if (!keepSignedIn) {
    // Discard an older client’s persistent session until the device opts in.
    for (const key of [storageKey, storageKey + '-code-verifier', storageKey + '-user']) {
      browserStorage('localStorage', storage => storage.removeItem(key));
    }
  }

  return {
    get keepSignedIn() { return keepSignedIn; },
    setPreference(value) {
      if (value !== keepSignedIn) clear();
      keepSignedIn = value;
      browserStorage('localStorage', storage => storage.setItem(preference, String(value)));
    },
    getItem: key => browserStorage(selected(), storage => storage.getItem(key)),
    setItem(key, value) {
      const other = keepSignedIn ? 'sessionStorage' : 'localStorage';
      browserStorage(other, storage => storage.removeItem(key));
      browserStorage(selected(), storage => storage.setItem(key,value));
    },
    removeItem,
    clear,
  };
}
