const path = require('path');
const {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  clipboard,
  ipcMain,
  Tray,
  nativeImage,
  Menu
} = require('electron');
const store = require('./store');

// Varsayılan menü (File, Edit, View vb.) ve pencere çerçevesini kaldır
Menu.setApplicationMenu(null);

// Cache/GPU hatalarını önlemek için cache dizinini userData içine al (yazılabilir konum)
const userDataPath = app.getPath('userData');
app.commandLine.appendSwitch('disk-cache-dir', path.join(userDataPath, 'Cache'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Tek instance: aynı anda birden fazla uygulama açılmasın (cache çakışması önlenir)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let tray = null;
let popupWindow = null;
let saveWindow = null;
let settingsWindow = null;
let hiddenWindow = null;

const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 420;

function getPreloadPath() {
  return path.join(__dirname, '..', 'preload', 'preload.js');
}

function getShortcuts() {
  return store.getShortcuts();
}

function createPopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.show();
    positionPopupAtCursor();
    popupWindow.focus();
    popupWindow.webContents.send('popup:focusSearch');
    return;
  }
  popupWindow = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  popupWindow.setMinimumSize(280, 300);
  popupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'popup.html'));
  popupWindow.on('closed', () => { popupWindow = null; });
  popupWindow.on('blur', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
    }
  });
  popupWindow.once('ready-to-show', () => {
    positionPopupAtCursor();
    popupWindow.show();
    popupWindow.focus();
    popupWindow.webContents.send('popup:focusSearch');
  });
}

function positionPopupAtCursor() {
  if (!popupWindow || popupWindow.isDestroyed()) return;
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { workArea } = display;
  let x = point.x + 15;
  let y = point.y + 15;
  if (x + POPUP_WIDTH > workArea.x + workArea.width) x = workArea.x + workArea.width - POPUP_WIDTH;
  if (y + POPUP_HEIGHT > workArea.y + workArea.height) y = workArea.y + workArea.height - POPUP_HEIGHT;
  if (x < workArea.x) x = workArea.x;
  if (y < workArea.y) y = workArea.y;
  popupWindow.setPosition(Math.round(x), Math.round(y));
}

const SAVE_WIDTH = 380;
const SAVE_HEIGHT = 300;

function setForegroundWindowWin(win) {
  if (process.platform !== 'win32' || !win || win.isDestroyed()) return;
  try {
    const buf = win.getNativeWindowHandle();
    const hwnd64 = process.arch === 'x64' ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0));
    const hwndStr = String(hwnd64);
    let koffi;
    try {
      koffi = require('koffi');
    } catch (_) {}
    if (koffi) {
      const user32 = koffi.load('user32.dll');
      const SetForegroundWindow = user32.func('bool __stdcall SetForegroundWindow(void *hwnd)');
      SetForegroundWindow(hwnd64);
      return;
    }
    const { spawn } = require('child_process');
    const ps = spawn('powershell', [
      '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden',
      '-Command',
      `Add-Type -Name Win32 -Namespace User32 -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'; [User32.Win32]::SetForegroundWindow([IntPtr]${hwndStr});`
    ], { windowsHide: true, stdio: 'ignore' });
    ps.on('error', () => {});
  } catch (_) {}
}

function focusSaveWindowByClick(win) {
  if (!win || win.isDestroyed()) return;
  let robot;
  try {
    robot = require('robotjs');
  } catch (_) {}
  if (!robot) return;
  try {
    const pos = robot.getMousePos();
    const b = win.getBounds();
    const cx = Math.round(b.x + b.width / 2);
    const cy = Math.round(b.y + b.height / 2);
    robot.setMouseDelay(10);
    robot.moveMouse(cx, cy);
    robot.mouseClick();
    robot.moveMouse(pos.x, pos.y);
  } catch (_) {}
}

function createSaveWindow(initialPassword = '') {
  if (saveWindow && !saveWindow.isDestroyed()) {
    saveWindow.show();
    positionSaveAtCursor();
    saveWindow.focus();
    setForegroundWindowWin(saveWindow);
    saveWindow.webContents.send('save:resetAndPassword', initialPassword);
    setTimeout(() => {
      if (saveWindow && !saveWindow.isDestroyed()) {
        setForegroundWindowWin(saveWindow);
        saveWindow.focus();
        saveWindow.webContents.send('save:focusName');
      }
    }, 120);
    if (process.platform === 'win32') {
      setTimeout(() => {
        if (saveWindow && !saveWindow.isDestroyed()) {
          focusSaveWindowByClick(saveWindow);
          saveWindow.webContents.send('save:focusName');
        }
      }, 220);
    }
    return;
  }
  saveWindow = new BrowserWindow({
    width: SAVE_WIDTH,
    height: SAVE_HEIGHT,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  saveWindow.loadFile(path.join(__dirname, '..', 'renderer', 'save.html'));
  saveWindow.on('closed', () => { saveWindow = null; });
  saveWindow.on('blur', () => {
    if (saveWindow && !saveWindow.isDestroyed()) saveWindow.close();
  });
  saveWindow.webContents.once('did-finish-load', () => {
    saveWindow.webContents.send('save:resetAndPassword', initialPassword);
  });
  saveWindow.once('ready-to-show', () => {
    positionSaveAtCursor();
    saveWindow.show();
    saveWindow.focus();
    setForegroundWindowWin(saveWindow);
    setTimeout(() => {
      if (saveWindow && !saveWindow.isDestroyed()) {
        setForegroundWindowWin(saveWindow);
        saveWindow.focus();
        saveWindow.webContents.send('save:focusName');
      }
    }, 120);
    if (process.platform === 'win32') {
      setTimeout(() => {
        if (saveWindow && !saveWindow.isDestroyed()) {
          focusSaveWindowByClick(saveWindow);
          saveWindow.webContents.send('save:focusName');
        }
      }, 220);
    }
  });
}

function positionSaveAtCursor() {
  if (!saveWindow || saveWindow.isDestroyed()) return;
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { workArea } = display;
  let x = point.x + 15;
  let y = point.y + 15;
  if (x + SAVE_WIDTH > workArea.x + workArea.width) x = workArea.x + workArea.width - SAVE_WIDTH;
  if (y + SAVE_HEIGHT > workArea.y + workArea.height) y = workArea.y + workArea.height - SAVE_HEIGHT;
  if (x < workArea.x) x = workArea.x;
  if (y < workArea.y) y = workArea.y;
  saveWindow.setPosition(Math.round(x), Math.round(y));
}

const SETTINGS_WIDTH = 440;
const SETTINGS_HEIGHT = 400;

function positionSettingsAtCursor() {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { workArea } = display;
  let x = point.x + 15;
  let y = point.y + 15;
  if (x + SETTINGS_WIDTH > workArea.x + workArea.width) x = workArea.x + workArea.width - SETTINGS_WIDTH;
  if (y + SETTINGS_HEIGHT > workArea.y + workArea.height) y = workArea.y + workArea.height - SETTINGS_HEIGHT;
  if (x < workArea.x) x = workArea.x;
  if (y < workArea.y) y = workArea.y;
  settingsWindow.setPosition(Math.round(x), Math.round(y));
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    positionSettingsAtCursor();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
  settingsWindow.on('blur', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
  });
  settingsWindow.once('ready-to-show', () => {
    positionSettingsAtCursor();
    settingsWindow.show();
    settingsWindow.focus();
  });
}

function simulatePaste() {
  let robotjs;
  try {
    robotjs = require('robotjs');
  } catch (_) {}
  const isMac = process.platform === 'darwin';
  if (robotjs) {
    const modifier = isMac ? 'command' : 'control';
    robotjs.keyTap('v', modifier);
    return;
  }
  if (process.platform === 'win32') {
    try {
      const { spawnSync } = require('child_process');
      spawnSync(
        'powershell',
        ['-WindowStyle', 'Hidden', '-NoProfile', '-Command',
          'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')'],
        { windowsHide: true, timeout: 2000 }
      );
    } catch (_) {}
  }
}

function simulateCopyAndGetSelection() {
  const backup = clipboard.readText();
  const isMac = process.platform === 'darwin';

  function readAfterDelay() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const selected = clipboard.readText();
        clipboard.writeText(backup);
        resolve(selected);
      }, 180);
    });
  }

  let robotjs;
  try {
    robotjs = require('robotjs');
  } catch (_) {}
  if (robotjs) {
    const modifier = isMac ? 'command' : 'control';
    robotjs.keyTap('c', modifier);
    return readAfterDelay();
  }

  if (process.platform === 'win32') {
    try {
      const { spawnSync } = require('child_process');
      spawnSync(
        'powershell',
        ['-WindowStyle', 'Hidden', '-NoProfile', '-Command',
          'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^c\')'],
        { windowsHide: true, timeout: 2000 }
      );
      return readAfterDelay();
    } catch (_) {}
  }

  return Promise.resolve('');
}

function onSaveShortcut() {
  simulateCopyAndGetSelection().then((selectedText) => {
    createSaveWindow(selectedText || '');
  });
}

function unregisterShortcuts() {
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
}

function registerShortcuts() {
  unregisterShortcuts();
  const { open: openAccel, save: saveAccel } = getShortcuts();
  const okOpen = openAccel && globalShortcut.register(openAccel, () => createPopupWindow());
  const okSave = saveAccel && globalShortcut.register(saveAccel, () => onSaveShortcut());
  if (!okOpen) console.warn('Kısayol kaydedilemedi (Aç):', openAccel);
  if (!okSave) console.warn('Kısayol kaydedilemedi (Kaydet):', saveAccel);
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const { open, save } = getShortcuts();
  const openLabel = formatShortcutLabel(open);
  const saveLabel = formatShortcutLabel(save);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Aç – ' + openLabel, click: () => createPopupWindow() },
    { label: 'Şifre Kaydet – ' + saveLabel, click: () => onSaveShortcut() },
    { type: 'separator' },
    { label: 'Ayarlar', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Çıkış', click: () => {
      if (hiddenWindow && !hiddenWindow.isDestroyed()) hiddenWindow.close();
      app.quit();
    } }
  ]));
}

function formatShortcutLabel(accel) {
  if (!accel) return '';
  return accel
    .replace('Super', 'Win')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl')
    .replace('Alt', 'Alt')
    .replace('+', '+');
}

function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (!icon || icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(TRAY_ICON_BASE64);
  }
  const size = process.platform === 'win32' ? 16 : 22;
  if (icon.getSize().width !== size) {
    icon = icon.resize({ width: size, height: size });
  }
  tray = new Tray(icon);
  tray.setToolTip('Pass Manager');
  updateTrayMenu();
  tray.on('double-click', () => createPopupWindow());
}

const TRAY_ICON_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAvklEQVQ4T2NkYGD4z0ABYBzVMCMj439GBob/jAwM/xj+M/xn+M/4n4GB4T8DA8N/BgaG/4wMDP8ZGBj+MzAw/GdgYPjPwMDwn4GB4T8DA8N/BgaG/4wMDP8ZGBj+MzAw/GdgYPjPwMDwn4GB4T8DA8N/BgaG/4wMDP8ZGBj+MzAw/GdgYPjPwMDwn4GB4T8DAwMDIwPDfwYGhv8MDAz/GRgY/jMwMPxnYGD4z8DA8J+BgeE/AwPDfwYGhv8MDAz/GQDu1g0M/0d1AwD0EBkMqtQb0AAAAABJRU5ErkJggg==';

function createHiddenWindow() {
  hiddenWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  hiddenWindow.setFocusable(false);
  hiddenWindow.loadURL('about:blank');
  hiddenWindow.on('closed', () => { hiddenWindow = null; });
}

app.on('second-instance', () => {
  createPopupWindow();
});

app.whenReady().then(() => {
  ipcMain.handle('passManager:getPasswords', () => store.getAllPasswords());
  ipcMain.handle('passManager:savePassword', (_e, name, password) => {
    store.addPassword(name, password);
    if (saveWindow && !saveWindow.isDestroyed()) saveWindow.close();
  });
  ipcMain.handle('passManager:deletePassword', (_e, id) => {
    store.deletePassword(id);
  });
  ipcMain.handle('passManager:copyToClipboard', (_e, text) => {
    clipboard.writeText(text);
    if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();
    setTimeout(() => simulatePaste(), 120);
  });
  ipcMain.handle('passManager:closeWindow', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });
  ipcMain.handle('passManager:closeSaveWindow', () => {
    if (saveWindow && !saveWindow.isDestroyed()) saveWindow.close();
  });
  ipcMain.handle('passManager:getShortcuts', () => getShortcuts());
  ipcMain.handle('passManager:setShortcuts', (_e, open, save) => {
    store.setShortcuts(open, save);
    registerShortcuts();
  });
  ipcMain.handle('passManager:getOpenAtLogin', () => {
    const supported = process.platform === 'win32' || process.platform === 'darwin';
    return { supported, openAtLogin: store.getOpenAtLogin() };
  });
  ipcMain.handle('passManager:setOpenAtLogin', (_e, value) => {
    store.setOpenAtLogin(value);
    if (process.platform === 'win32' || process.platform === 'darwin') {
      app.setLoginItemSettings({ openAtLogin: !!value });
    }
  });

  createHiddenWindow();
  createTray();
  registerShortcuts();
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({ openAtLogin: store.getOpenAtLogin() });
  }
});

app.on('window-all-closed', () => {});
app.on('will-quit', () => {
  unregisterShortcuts();
});
app.on('before-quit', () => {
  if (tray) tray.destroy();
});
