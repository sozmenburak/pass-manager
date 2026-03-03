const shortcutOpenEl = document.getElementById('shortcutOpen');
const shortcutSaveEl = document.getElementById('shortcutSave');
const btnSetOpen = document.getElementById('btnSetOpen');
const btnSetSave = document.getElementById('btnSetSave');
const btnSave = document.getElementById('btnSave');

function formatForDisplay(accel) {
  if (!accel) return '';
  return accel
    .replace('Super', 'Win')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl');
}

function loadShortcuts() {
  if (!window.passManager || !window.passManager.getShortcuts) return;
  window.passManager.getShortcuts().then((s) => {
    shortcutOpenEl.value = formatForDisplay(s.open);
    shortcutOpenEl.dataset.raw = s.open || '';
    shortcutSaveEl.value = formatForDisplay(s.save);
    shortcutSaveEl.dataset.raw = s.save || '';
  });
}

function captureShortcut(inputEl, done) {
  const msg = inputEl === shortcutOpenEl ? 'Aç kısayolu için tuşa basın...' : 'Kaydet kısayolu için tuşa basın...';
  inputEl.placeholder = msg;
  inputEl.value = '';
  inputEl.dataset.raw = '';

  const isWin = navigator.platform.toLowerCase().indexOf('win') >= 0;
  function onKeyDown(e) {
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.metaKey) parts.push(isWin ? 'Super' : 'Command');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.key === 'Meta') return;
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') {
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) parts.push(key);
      const accel = parts.join('+');
      inputEl.dataset.raw = accel;
      inputEl.value = formatForDisplay(accel);
      window.removeEventListener('keydown', onKeyDown);
      inputEl.placeholder = inputEl === shortcutOpenEl ? 'Örn. Ctrl+J' : 'Örn. Ctrl+Y';
    }
  }
  window.addEventListener('keydown', onKeyDown);
}

document.getElementById('btnClose')?.addEventListener('click', () => {
  if (window.passManager) window.passManager.closeWindow();
});

btnSetOpen.addEventListener('click', () => captureShortcut(shortcutOpenEl));
btnSetSave.addEventListener('click', () => captureShortcut(shortcutSaveEl));

btnSave.addEventListener('click', () => {
  const open = shortcutOpenEl.dataset.raw || shortcutOpenEl.value.replace(/Win/g, 'Super').replace(/Ctrl/g, 'Control').replace(/Cmd/g, 'Command');
  const save = shortcutSaveEl.dataset.raw || shortcutSaveEl.value.replace(/Win/g, 'Super').replace(/Ctrl/g, 'Control').replace(/Cmd/g, 'Command');
  if (window.passManager && window.passManager.setShortcuts) {
    window.passManager.setShortcuts(open, save).then(() => {
      window.passManager.closeWindow();
    });
  }
});

function loadOpenAtLogin() {
  const section = document.getElementById('sectionOpenAtLogin');
  const cb = document.getElementById('openAtLogin');
  if (!window.passManager || !window.passManager.getOpenAtLogin || !section || !cb) return;
  window.passManager.getOpenAtLogin().then((r) => {
    if (r.supported) {
      section.style.display = 'block';
      cb.checked = !!r.openAtLogin;
      cb.addEventListener('change', () => {
        window.passManager.setOpenAtLogin(cb.checked);
      });
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadShortcuts();
  loadOpenAtLogin();
});
