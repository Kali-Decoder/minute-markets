type AsyncStorageKey = string;
type AsyncStorageValue = string;

const store = new Map<AsyncStorageKey, AsyncStorageValue>();

const AsyncStorage = {
  getItem: async (key: AsyncStorageKey): Promise<string | null> => store.get(key) ?? null,
  setItem: async (key: AsyncStorageKey, value: AsyncStorageValue): Promise<void> => {
    store.set(key, value);
  },
  removeItem: async (key: AsyncStorageKey): Promise<void> => {
    store.delete(key);
  },
  clear: async (): Promise<void> => {
    store.clear();
  },
  getAllKeys: async (): Promise<string[]> => Array.from(store.keys()),
  multiGet: async (keys: readonly AsyncStorageKey[]): Promise<[string, string | null][]> =>
    keys.map((key) => [key, store.get(key) ?? null]),
  multiSet: async (keyValuePairs: readonly [AsyncStorageKey, AsyncStorageValue][]): Promise<void> => {
    for (const [key, value] of keyValuePairs) store.set(key, value);
  },
  multiRemove: async (keys: readonly AsyncStorageKey[]): Promise<void> => {
    for (const key of keys) store.delete(key);
  },
};

export default AsyncStorage;

