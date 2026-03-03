const Store = require('electron-store');
const { safeStorage } = require('electron');

const isWindows = process.platform === 'win32';
const defaultShortcutOpen = isWindows ? 'Control+J' : 'Command+J';
const defaultShortcutSave = isWindows ? 'Control+Y' : 'Command+Y';

const schema = {
  passwords: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        passwordEncrypted: { type: 'string' },
        createdAt: { type: 'number' }
      }
    }
  },
  shortcutOpen: { type: 'string', default: defaultShortcutOpen },
  shortcutSave: { type: 'string', default: defaultShortcutSave },
  openAtLogin: { type: 'boolean', default: true }
};

const store = new Store({ schema });

function encryptPassword(plain) {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(plain, 'utf8').toString('base64');
  }
  return safeStorage.encryptString(plain).toString('base64');
}

function decryptPassword(encrypted) {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
}

function getAllPasswords() {
  const list = store.get('passwords', []);
  return list.map((item) => ({
    id: item.id,
    name: item.name,
    password: decryptPassword(item.passwordEncrypted),
    createdAt: item.createdAt
  }));
}

function addPassword(name, password) {
  const list = store.get('passwords', []);
  const id = `pw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  list.push({
    id,
    name: name.trim(),
    passwordEncrypted: encryptPassword(password),
    createdAt: Date.now()
  });
  store.set('passwords', list);
  return id;
}

function deletePassword(id) {
  const list = store.get('passwords', []).filter((p) => p.id !== id);
  store.set('passwords', list);
}

function normalizeShortcut(accel, defaultVal) {
  if (!accel) return defaultVal;
  if (accel.startsWith('Super+')) return defaultVal;
  if (process.platform !== 'win32') return accel;
  if (!accel.startsWith('Shift+')) return accel;
  if (accel.includes('Control+') || accel.includes('Alt+')) return accel;
  const key = accel.replace(/^Shift\+/, '');
  if (!key || key === accel) return accel;
  return 'Control+' + key;
}

function getShortcuts() {
  let open = store.get('shortcutOpen', defaultShortcutOpen);
  let save = store.get('shortcutSave', defaultShortcutSave);
  const oldOpen = isWindows ? 'Control+Alt+J' : 'Command+Alt+J';
  const oldSave = isWindows ? 'Control+Alt+Y' : 'Command+Alt+Y';
  if (open.startsWith('Super+')) {
    open = defaultShortcutOpen;
    store.set('shortcutOpen', open);
  }
  if (save.startsWith('Super+')) {
    save = defaultShortcutSave;
    store.set('shortcutSave', save);
  }
  if (open === oldOpen) {
    open = defaultShortcutOpen;
    store.set('shortcutOpen', open);
  }
  if (save === oldSave) {
    save = defaultShortcutSave;
    store.set('shortcutSave', save);
  }
  const openNorm = normalizeShortcut(open, defaultShortcutOpen);
  const saveNorm = normalizeShortcut(save, defaultShortcutSave);
  if (openNorm !== open) {
    store.set('shortcutOpen', openNorm);
    open = openNorm;
  }
  if (saveNorm !== save) {
    store.set('shortcutSave', saveNorm);
    save = saveNorm;
  }
  return { open, save };
}

function setShortcuts(open, save) {
  if (open) store.set('shortcutOpen', open);
  if (save) store.set('shortcutSave', save);
}

function getOpenAtLogin() {
  return store.get('openAtLogin', true);
}

function setOpenAtLogin(value) {
  store.set('openAtLogin', !!value);
}

module.exports = {
  getAllPasswords,
  addPassword,
  deletePassword,
  encryptPassword,
  decryptPassword,
  getShortcuts,
  setShortcuts,
  getOpenAtLogin,
  setOpenAtLogin
};
