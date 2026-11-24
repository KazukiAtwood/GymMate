const memory = new Map();

const AsyncStorage = {
  getItem(key) {
    return Promise.resolve(memory.has(key) ? memory.get(key) : null);
  },
  setItem(key, value) {
    memory.set(key, value);
    return Promise.resolve();
  },
  removeItem(key) {
    memory.delete(key);
    return Promise.resolve();
  },
};

export default AsyncStorage;
