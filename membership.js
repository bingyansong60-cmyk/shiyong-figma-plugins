(() => {
  const form = document.querySelector('#activation-form');
  const field = document.querySelector('#activation-code');
  const error = document.querySelector('#activation-error');
  const button = document.querySelector('#activate-button');
  const member = document.querySelector('#membership-status');
  const gate = document.querySelector('#activation-gate');
  const legacyDuration = 365 * 86400000;
  const storageKey = 'shiyong-membership-v2';

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved?.records && typeof saved.records === 'object') return saved;
    } catch {}
    return { records: {}, active: null };
  }

  function currentTime(state) {
    return Math.max(Date.now(), state.lastSeen || 0);
  }

  function refresh() {
    const state = read();
    const record = state.records[state.active];
    const legacy = annualHashes.has(state.active);
    const valid = Number.isFinite(record?.startedAt) && (
      (record.expiresAt === null && (legacy || permanentHashes.has(state.active))) ||
      (legacy && record.expiresAt === record.startedAt + legacyDuration)
    );
    if (!valid) {
      document.body.classList.add('locked');
      gate.hidden = false;
      member.textContent = '会员 · 待激活';
      member.title = '';
      const dialog = document.querySelector('#dialog');
      if (dialog?.open) dialog.close();
      return;
    }
    record.expiresAt = null;
    state.lastSeen = currentTime(state);
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    member.textContent = '永久会员';
    member.title = '永久有效';
    document.body.classList.remove('locked');
    gate.hidden = true;
  }

  field.addEventListener('input', () => {
    field.value = field.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    error.textContent = '';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    error.textContent = '正在验证…';
    try {
      const code = field.value.trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw Error('请输入有效的 12 位激活码。');
      if (!globalThis.crypto?.subtle) throw Error('请通过 HTTPS 访问网站。');
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
      const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
      if (!permanentHashes.has(hash) && !annualHashes.has(hash)) {
        throw Error('激活码无效，请检查后重新输入。');
      }

      const state = read();
      const now = currentTime(state);
      const startedAt = state.records[hash]?.startedAt;
      state.records[hash] = { startedAt: Number.isFinite(startedAt) ? startedAt : now, expiresAt: null };
      state.active = hash;
      state.lastSeen = now;
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        throw Error('无法保存激活记录，请允许本站使用浏览器本地存储后重试。');
      }
      try { localStorage.removeItem('shiyong-license-v1'); } catch {}
      field.value = '';
      refresh();
      error.textContent = '';
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      button.disabled = false;
    }
  });

  member.addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  globalThis.addEventListener('storage', event => { if (event.key === storageKey) refresh(); });
  setInterval(refresh, 60000);
  refresh();
})();
