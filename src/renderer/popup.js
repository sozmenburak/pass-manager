const searchEl = document.getElementById('search');
const listEl = document.getElementById('list');

let allPasswords = [];
let filteredPasswords = [];

function render(filter = '') {
  const q = filter.trim().toLowerCase();
  filteredPasswords = q
    ? allPasswords.filter((p) => p.name.toLowerCase().includes(q))
    : allPasswords;

  listEl.innerHTML = '';
  if (filteredPasswords.length === 0) {
    listEl.innerHTML = '<div class="empty">' + (q ? 'Eşleşme yok.' : 'Henüz şifre yok. Ctrl+Y ile kaydedin.') + '</div>';
    return;
  }
  filteredPasswords.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'item';
    const actions = document.createElement('span');
    actions.className = 'item-actions';
    actions.innerHTML = '<span class="copy-hint">Kopyala</span><button type="button" class="btn-delete" title="Sil">×</button>';
    div.innerHTML = '<span class="name">' + escapeHtml(item.name) + '</span>';
    div.appendChild(actions);
    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.passManager) showDeleteConfirm(item);
    });
    div.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete')) return;
      if (window.passManager) {
        window.passManager.copyToClipboard(item.password);
      }
    });
    listEl.appendChild(div);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function showDeleteConfirm(item) {
  const overlay = document.getElementById('confirmOverlay');
  const msg = document.getElementById('confirmMessage');
  const btnCancel = document.getElementById('confirmCancel');
  const btnDelete = document.getElementById('confirmDelete');
  msg.textContent = '"' + item.name + '" silinsin mi?';
  overlay.style.display = 'flex';
  const removeListeners = () => {
    btnCancel.onclick = null;
    btnDelete.onclick = null;
    overlay.onclick = null;
  };
  btnCancel.onclick = () => {
    overlay.style.display = 'none';
    removeListeners();
  };
  btnDelete.onclick = () => {
    window.passManager.deletePassword(item.id);
    overlay.style.display = 'none';
    removeListeners();
    loadPasswords();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      removeListeners();
    }
  };
}

function loadPasswords() {
  if (!window.passManager) return;
  window.passManager.getPasswords().then((list) => {
    allPasswords = list || [];
    render(searchEl.value);
  });
}

document.getElementById('btnClose')?.addEventListener('click', () => {
  if (window.passManager) window.passManager.closeWindow();
});

searchEl.addEventListener('input', () => render(searchEl.value));
searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (window.passManager) window.passManager.closeWindow();
    return;
  }
  if (e.key === 'Enter' && filteredPasswords.length > 0 && window.passManager) {
    e.preventDefault();
    window.passManager.copyToClipboard(filteredPasswords[0].password);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  searchEl.focus();
  loadPasswords();
  if (window.passManager && window.passManager.onFocusSearch) {
    window.passManager.onFocusSearch(() => {
      searchEl.focus();
      loadPasswords();
    });
  }
});
