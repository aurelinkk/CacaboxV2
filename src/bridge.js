// Remplace l'ancien preload Electron : même API window.livekgb pour overlay.js et panel.js,
// mais branchée sur Tauri.
//  - L'overlay est le « cœur » (core.js) : connexion au serveur, réglages, placement à l'écran.
//  - Le panneau lui parle par événements (petits messages), et envoie les blagues lui-même
//    sur sa propre connexion « silent » (les fichiers peuvent faire plusieurs Mo).
(() => {
  const T = window.__TAURI__;
  const me = T.webviewWindow.getCurrentWebviewWindow();
  const local = {};
  const on = (ch, cb) => { (local[ch] = local[ch] || []).push(cb); };
  const fire = (ch, d) => (local[ch] || []).forEach((f) => f(d));

  if (me.label === 'overlay') { window.livekgb = { on, _fire: fire }; return; }

  /* ---------- panneau ---------- */
  const KEY = 'livekgb-config';
  const MAX_UPLOAD = 6 * 1024 * 1024;
  let n = 0;
  const pending = new Map();
  const ready = Promise.all([
    me.listen('rpc-result', (e) => {
      const p = pending.get(e.payload.id);
      if (p) { pending.delete(e.payload.id); clearInterval(p.retry); p.resolve(e.payload.result); }
    }),
    ...['status', 'config', 'presence', 'displays'].map((ch) => me.listen(ch, (e) => fire(ch, e.payload)))
  ]);
  // appel au cœur (renvoyé tant qu'il ne répond pas : l'overlay peut démarrer après le panneau)
  const call = async (method, ...args) => {
    await ready;
    return new Promise((resolve) => {
      const id = ++n;
      const emit = () => T.event.emitTo('overlay', 'rpc', { id, method, args }).catch(() => {});
      pending.set(id, { resolve, retry: setInterval(emit, 1000) });
      emit();
    });
  };

  // connexion d'envoi : ne compte pas dans les connectés, ne reçoit pas les blagues
  let sender = null;
  const cfg = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  function getSender(c) {
    const url = `${c.server}?room=${encodeURIComponent(c.room)}&name=${encodeURIComponent(c.name || 'anonyme')}&silent=1`;
    if (sender && sender.readyState === WebSocket.OPEN && sender.__url === url) return Promise.resolve(sender);
    try { if (sender) sender.close(); } catch {}
    return new Promise((resolve) => {
      let s;
      try { s = new WebSocket(url); } catch { return resolve(null); }
      s.__url = url;
      const t = setTimeout(() => { resolve(null); try { s.close(); } catch {} }, 15000);
      s.onopen = () => {
        clearTimeout(t);
        s.send(JSON.stringify({ type: 'hello', name: c.name || 'anonyme', avatar: c.avatar || '' }));
        sender = s; resolve(s);
      };
      s.onerror = () => { clearTimeout(t); resolve(null); };
      s.onmessage = (e) => {
        try { const m = JSON.parse(e.data); if (m.type === 'error') fire('status', { text: '⚠ ' + m.message, ok: true }); } catch {}
      };
    });
  }
  async function send(m) {
    const c = cfg();
    if (!c.server || !c.room) return { ok: false, error: 'Renseigne serveur + salon' };
    if (typeof m.url === 'string' && m.url.length > MAX_UPLOAD * 1.4) return { ok: false, error: 'Fichier trop lourd (6 Mo max)' };
    const s = await getSender(c);
    if (!s) return { ok: false, error: 'Serveur injoignable' };
    s.send(JSON.stringify({ type: 'blague', url: m.url, caption: m.caption, duration: m.duration }));
    return { ok: true };
  }

  window.livekgb = {
    on,
    getConfig: () => call('getConfig'),
    saveConfig: (c) => { try { if (sender) sender.close(); } catch {} sender = null; return call('saveConfig', c); },
    send,
    panic: () => call('panic'),
    getDisplays: () => call('getDisplays'),
    saveDisplay: (d) => call('saveDisplay', d),
    preview: () => call('preview')
  };
  call('getStatus').then((s) => s && fire('status', s));
})();
