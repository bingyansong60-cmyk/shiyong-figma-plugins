(() => {
  const form = document.querySelector('#activation-form');
  const field = document.querySelector('#activation-code');
  const error = document.querySelector('#activation-error');
  const button = document.querySelector('#activate-button');
  const member = document.querySelector('#membership-status');
  const gate = document.querySelector('#activation-gate');
  const day = 86400000;
  const duration = 365 * day;
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
    const permanent = permanentHashes.has(state.active);
    const valid = Number.isFinite(record?.startedAt) && (
      permanent ? record.expiresAt === null
        : annualHashes.has(state.active) && record.expiresAt === record.startedAt + duration
    );
    const now = currentTime(state);
    if (!valid || (!permanent && now >= record.expiresAt)) {
      document.body.classList.add('locked');
      gate.hidden = false;
      member.textContent = valid ? '会员已到期' : '会员 · 待激活';
      member.title = '';
      const dialog = document.querySelector('#dialog');
      if (dialog?.open) dialog.close();
      return;
    }
    state.lastSeen = now;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    member.textContent = permanent ? '永久会员' : '会员剩余 ' + Math.ceil((record.expiresAt - now) / day) + ' 天';
    member.title = permanent ? '永久有效' : '到期时间：' + new Date(record.expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
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
      const permanent = permanentHashes.has(hash);
      if (!permanent && !annualHashes.has(hash)) throw Error('激活码无效，请检查后重新输入。');

      const state = read();
      const now = currentTime(state);
      state.records[hash] ??= { startedAt: now, expiresAt: permanent ? null : now + duration };
      if (!permanent && now >= state.records[hash].expiresAt) {
        throw Error('此激活码的 365 天有效期已结束，请使用新的激活码。');
      }
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
