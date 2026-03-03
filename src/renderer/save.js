const nameEl = document.getElementById('name');
const passwordEl = document.getElementById('password');
const btnSave = document.getElementById('btnSave');
const btnFromClipboard = document.getElementById('btnFromClipboard');

function setPasswordFromClipboard() {
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then((text) => {
      passwordEl.value = text != null ? String(text) : '';
    }).catch(() => {});
  }
}

document.getElementById('btnClose')?.addEventListener('click', () => {
  if (window.passManager && window.passManager.closeSaveWindow) {
    window.passManager.closeSaveWindow();
  }
});

if (btnFromClipboard) {
  btnFromClipboard.addEventListener('click', setPasswordFromClipboard);
}

if (window.passManager) {
  if (window.passManager.onInitialPassword) {
    window.passManager.onInitialPassword((text) => {
      passwordEl.value = text != null ? String(text) : '';
    });
  }
  if (window.passManager.onResetAndPassword) {
    window.passManager.onResetAndPassword((text) => {
      nameEl.value = '';
      passwordEl.value = text != null ? String(text) : '';
    });
  }
  if (window.passManager.onFocusName) {
    window.passManager.onFocusName(() => nameEl.focus());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  nameEl.focus();
  setPasswordFromClipboard();
});

window.addEventListener('blur', () => {
  if (window.passManager && window.passManager.closeSaveWindow) {
    window.passManager.closeSaveWindow();
  }
});

btnSave.addEventListener('click', () => {
  const name = nameEl.value.trim();
  const password = passwordEl.value;
  if (!name) {
    nameEl.focus();
    return;
  }
  if (!window.passManager) return;
  window.passManager.savePassword(name, password);
});

nameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSave.click();
});

