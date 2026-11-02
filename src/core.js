// Le « cœur » de LiveKgb, chargé dans la fenêtre overlay (toujours ouverte) :
// réglages, connexion au serveur, placement de l'overlay sur l'écran choisi.
(() => {
  const T = window.__TAURI__;
  const me = T.webviewWindow.getCurrentWebviewWindow();
  const { PhysicalPosition, PhysicalSize } = T.dpi;
  const fire = window.livekgb._fire;

  const KEY = 'livekgb-config';
  const DEFAULTS = {
    name: '', avatar: '', server: 'wss://cacabox-server.onrender.com', room: 'livekgb',
    muted: false, showPresence: true, display: '', position: 'center', size: 'm'
  };
  const POSITIONS = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];
  const SIZES = ['s', 'm', 'l', 'xl'];

  let cfg = { ...DEFAULTS };
  try { cfg = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };
  save();

  let ws = null, timer = null, presence = [], lastStatus = null;
  const toPanel = (ch, d) => T.event.emitTo('panel', ch, d).catch(() => {});
  const status = (text, ok = false) => { lastStatus = { text, ok }; toPanel('status', lastStatus); };
  const pushState = () => {
    fire('config', { showPresence: cfg.showPresence, position: cfg.position, size: cfg.size });
    fire('presence', presence);
  };
  const panic = () => fire('clear');

  /* ---------- écrans ---------- */
  async function monitors() {
    const [list, prim] = await Promise.all([T.window.availableMonitors(), T.window.primaryMonitor()]);
    return list.map((m, i) => ({
      id: `${m.name || 'ecran'}@${m.position.x},${m.position.y}`, m, i,
      primary: !!prim && m.name === prim.name && m.position.x === prim.position.x && m.position.y === prim.position.y
    }));
  }
  async function listDisplays() {
    return (await monitors()).map((d) => ({
      id: d.id,
      label: `Écran ${d.i + 1} : ${Math.round(d.m.size.width / d.m.scaleFactor)}×${Math.round(d.m.size.height / d.m.scaleFactor)}${d.primary ? ' (principal)' : ''}`
    }));
  }
  // l'overlay recouvre la zone utile de l'écran choisi (sans barre des tâches / barre de menu / Dock)
  let lastSig = '';
  async function place() {
    const ds = await monitors();
    const d = ds.find((x) => x.id === cfg.display) || ds.find((x) => x.primary) || ds[0];
    if (!d) return;
    const a = d.m.workArea || { position: d.m.position, size: d.m.size };
    await me.setPosition(new PhysicalPosition(a.position.x, a.position.y));
    await me.setSize(new PhysicalSize(a.size.width, a.size.height));
    await me.setPosition(new PhysicalPosition(a.position.x, a.position.y)); // 2e passe : écrans à zoom différent
    lastSig = JSON.stringify(ds.map((x) => [x.id, x.m.size, x.m.workArea, x.m.scaleFactor]));
  }
  // écran branché / débranché / changement de résolution
  setInterval(async () => {
    try {
      const ds = await monitors();
      const sig = JSON.stringify(ds.map((x) => [x.id, x.m.size, x.m.workArea, x.m.scaleFactor]));
      if (sig !== lastSig) { await place(); toPanel('displays', await listDisplays()); }
    } catch {}
  }, 3000);

  /* ---------- connexion au serveur relais ---------- */
  function connect() {
    clearTimeout(timer);
    if (ws) { ws.__manual = true; try { ws.close(); } catch {} }
    presence = []; pushState();
    if (!cfg.server || !cfg.room) { status('Renseigne serveur + salon'); return; }
    const url = `${cfg.server}?room=${encodeURIComponent(cfg.room)}&name=${encodeURIComponent(cfg.name || 'anonyme')}`;
    status('Connexion…');
    let s;
    try { s = new WebSocket(url); } catch { status('URL serveur invalide'); return; }
    ws = s;
    s.onopen = () => {
      status('Connecté ✔', true);
      s.send(JSON.stringify({ type: 'hello', name: cfg.name || 'anonyme', avatar: cfg.avatar || '' }));
    };
    s.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'blague') { if (!cfg.muted) fire('blague', m); }
      else if (m.type === 'presence') {
        presence = Array.isArray(m.members) ? m.members : [];
        status(`Connecté ✔ (${presence.length} en ligne)`, true);
        pushState();
      } else if (m.type === 'error') status('⚠ ' + m.message, true);
    };
    s.onclose = () => {
      if (s.__manual) return;
      presence = []; pushState();
      status('Déconnecté, nouvelle tentative…');
      timer = setTimeout(connect, 3000);
    };
  }

  /* ---------- ce que le panneau peut demander ---------- */
  const api = {
    getConfig: () => cfg,
    getStatus: () => lastStatus,
    saveConfig: (c) => {
      cfg = {
        ...cfg,
        name: String(c.name || '').slice(0, 24),
        avatar: typeof c.avatar === 'string' && c.avatar.startsWith('data:image/') ? c.avatar.slice(0, 30000) : '',
        server: String(c.server || '').trim(),
        room: String(c.room || '').trim(),
        muted: !!c.muted,
        showPresence: !!c.showPresence
      };
      save(); connect(); pushState();
      if (cfg.muted) panic();
      return cfg;
    },
    panic: () => { panic(); return true; },
    getDisplays: listDisplays,
    saveDisplay: async (d) => {
      if (typeof d.display === 'string') cfg.display = d.display;
      if (POSITIONS.includes(d.position)) cfg.position = d.position;
      if (SIZES.includes(d.size)) cfg.size = d.size;
      save(); await place(); pushState();
      return cfg;
    },
    preview: () => {
      panic();
      fire('blague', {
        url: 'assets/preview.png', caption: "C'est ici que ça s'affichera", duration: 3,
        from: { name: cfg.name || 'toi', avatar: cfg.avatar }
      });
      return true;
    }
  };
  const handled = new Set();
  me.listen('rpc', async (e) => {
    const { id, method, args } = e.payload || {};
    if (!api[method] || handled.has(id)) return;
    handled.add(id);
    let result;
    try { result = await api[method](...(args || [])); } catch (err) { result = { ok: false, error: String(err) }; }
    toPanel('rpc-result', { id, result });
  });
  // tray et raccourcis globaux (envoyés par le Rust)
  me.listen('panic', panic);
  me.listen('toggle-mute', () => {
    cfg.muted = !cfg.muted; save();
    if (cfg.muted) panic();
    toPanel('config', cfg);
    status(cfg.muted ? '🔇 Muet' : 'Son des blagues réactivé', true);
  });

  place().catch(() => {});
  pushState();
  connect();
})();
