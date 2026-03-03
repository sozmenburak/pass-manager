const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('passManager', {
  getPasswords: () => ipcRenderer.invoke('passManager:getPasswords'),
  savePassword: (name, password) => ipcRenderer.invoke('passManager:savePassword', name, password),
  deletePassword: (id) => ipcRenderer.invoke('passManager:deletePassword', id),
  copyToClipboard: (text) => ipcRenderer.invoke('passManager:copyToClipboard', text),
  closeWindow: () => ipcRenderer.invoke('passManager:closeWindow'),
  closeSaveWindow: () => ipcRenderer.invoke('passManager:closeSaveWindow'),
  getShortcuts: () => ipcRenderer.invoke('passManager:getShortcuts'),
  setShortcuts: (open, save) => ipcRenderer.invoke('passManager:setShortcuts', open, save),
  getOpenAtLogin: () => ipcRenderer.invoke('passManager:getOpenAtLogin'),
  setOpenAtLogin: (value) => ipcRenderer.invoke('passManager:setOpenAtLogin', value),
  onFocusSearch: (cb) => ipcRenderer.on('popup:focusSearch', () => cb()),
  onInitialPassword: (cb) => ipcRenderer.on('save:initialPassword', (_e, text) => cb(text)),
  onResetAndPassword: (cb) => ipcRenderer.on('save:resetAndPassword', (_e, text) => cb(text)),
  onFocusName: (cb) => ipcRenderer.on('save:focusName', () => cb())
});
