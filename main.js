const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

// ⚠️ Mets ici l'adresse de ton serveur hébergé (wss://...) AVANT de générer les installeurs :
// tes potes n'auront alors rien à configurer, juste un pseudo.
const DEFAULT_SERVER = 'wss://cacabox-server.onrender.com';

if (!app.requestSingleInstanceLock()) app.quit();

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
// Récupère les réglages de l'ancienne version (quand l'appli s'appelait Cacabox)
const OLD_CONFIG_PATH = path.join(app.getPath('appData'), 'Cacabox', 'config.json');
const DEFAULTS = { name: '', avatar: '', server: DEFAULT_SERVER, room: 'livekgb', muted: false, showPresence: true,
  display: 0, position: 'center', size: 'm' }; // display 0 = écran principal
const POSITIONS = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];
const SIZES = ['s', 'm', 'l', 'xl'];
const MAX_UPLOAD = 6 * 1024 * 1024; // 6 Mo

let cfg = { ...DEFAULTS };
let overlay, panel, tray, ws, reconnectTimer;
let presence = [];
let quitting = false;

function loadConfig() {
  const file = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : OLD_CONFIG_PATH;
  try { cfg = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
}
function saveConfig() {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); } catch {}
}
function status(text, ok = false) {
  if (panel && !panel.isDestroyed()) panel.webContents.send('status', { text, ok });
}
function pushOverlayState() {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.webContents.send('config', { showPresence: cfg.showPresence, position: cfg.position, size: cfg.size });
  overlay.webContents.send('presence', presence);
}

/* ---------- Overlay : fenêtre transparente, au-dessus de tout, clics traversants ---------- */
function targetDisplay() {
  return screen.getAllDisplays().find((d) => d.id === cfg.display) || screen.getPrimaryDisplay();
}
// L'overlay recouvre la zone utile de l'écran choisi (sans la barre des tâches / barre de menu Mac).
// Recalculé à chaque changement d'écran : résolution, branchement, débranchement…
function placeOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.setBounds(targetDisplay().workArea);
}
function listDisplays() {
  const primary = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: `Écran ${i + 1} : ${d.size.width}×${d.size.height}${d.id === primary ? ' (principal)' : ''}`
  }));
}
function onDisplaysChanged() {
  placeOverlay();
  if (panel && !panel.isDestroyed()) panel.webContents.send('displays', listDisplays());
}

function createOverlay() {
  const { x, y, width, height } = targetDisplay().workArea;
  overlay = new BrowserWindow({
    x, y, width, height, enableLargerThanScreen: true,
    transparent: true, frame: false, resizable: false, movable: false,
    skipTaskbar: true, focusable: false, hasShadow: false, alwaysOnTop: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      autoplayPolicy: 'no-user-gesture-required',
      contextIsolation: true,
      sandbox: true
    }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true);
  overlay.loadFile('overlay.html');
  overlay.webContents.on('did-finish-load', pushOverlayState);
  overlay.webContents.on('did-finish-load', pushOverlayState);
  overlay.once('ready-to-show', () => overlay.showInactive());
}

/* ---------- Panneau de contrôle ---------- */
function createPanel() {
  panel = new BrowserWindow({
    width: 460, height: Math.min(960, screen.getPrimaryDisplay().workArea.height - 40),
    title: 'LiveKgb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });
  panel.loadFile('panel.html');
  panel.on('close', (e) => { if (!quitting) { e.preventDefault(); panel.hide(); } });
}
function showPanel() { if (panel) { panel.show(); panel.focus(); } }

/* ---------- Tray ---------- */
function createTray() {
  // Mac : image « Template » noire, que macOS recolore selon la barre de menu claire/sombre
  const icon = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', icon)));
  tray.setToolTip('LiveKgb');
  const menu = () => Menu.buildFromTemplate([
    { label: 'Ouvrir le panneau', click: showPanel },
    { label: 'Muet', type: 'checkbox', checked: cfg.muted, click: (i) => setMuted(i.checked) },
    { label: "Stop (vider l'écran)", click: panic },
    { type: 'separator' },
    { label: 'Quitter', click: () => { quitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu());
  tray.on('click', showPanel);
  app._refreshTray = () => tray.setContextMenu(menu());
}

function setMuted(v) {
  cfg.muted = v; saveConfig();
  if (panel && !panel.isDestroyed()) panel.webContents.send('config', cfg);
  if (app._refreshTray) app._refreshTray();
  if (v) panic();
}
function panic() {
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send('clear');
}

/* ---------- Connexion au serveur relais ---------- */
function connect() {
  clearTimeout(reconnectTimer);
  if (ws) { ws.__manual = true; try { ws.close(); } catch {} }
  presence = []; pushOverlayState();
  if (!cfg.server || !cfg.room) { status('Renseigne serveur + salon'); return; }

  const url = `${cfg.server}?room=${encodeURIComponent(cfg.room)}&name=${encodeURIComponent(cfg.name || 'anonyme')}`;
  status('Connexion…');
  let sock;
  try { sock = new WebSocket(url, { maxPayload: 12 * 1024 * 1024 }); } catch { status('URL serveur invalide'); return; }
  ws = sock;

  sock.on('open', () => {
    status('Connecté ✔', true);
    sock.send(JSON.stringify({ type: 'hello', name: cfg.name || 'anonyme', avatar: cfg.avatar || '' }));
  });
  sock.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'blague') {
      if (!cfg.muted && overlay && !overlay.isDestroyed()) overlay.webContents.send('blague', m);
    } else if (m.type === 'presence') {
      presence = Array.isArray(m.members) ? m.members : [];
      status(`Connecté ✔ (${presence.length} en ligne)`, true);
      pushOverlayState();
    } else if (m.type === 'error') {
      status('⚠ ' + m.message, true);
    }
  });
  sock.on('close', () => {
    if (sock.__manual) return;
    presence = []; pushOverlayState();
    status('Déconnecté, nouvelle tentative…');
    reconnectTimer = setTimeout(connect, 3000);
  });
  sock.on('error', () => {});
}

ipcMain.handle('get-config', () => cfg);
ipcMain.handle('save-config', (_e, c) => {
  cfg = {
    ...cfg,
    name: String(c.name || '').slice(0, 24),
    avatar: typeof c.avatar === 'string' && c.avatar.startsWith('data:image/') ? c.avatar.slice(0, 30000) : '',
    server: String(c.server || '').trim(),
    room: String(c.room || '').trim(),
    muted: !!c.muted,
    showPresence: !!c.showPresence
  };
  saveConfig(); connect();
  if (app._refreshTray) app._refreshTray();
  if (cfg.muted) panic();
  return cfg;
});
ipcMain.handle('send', (_e, m) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return { ok: false, error: 'Pas connecté' };
  if (typeof m.url === 'string' && m.url.length > MAX_UPLOAD * 1.4) return { ok: false, error: 'Fichier trop lourd (6 Mo max)' };
  ws.send(JSON.stringify({ type: 'blague', url: m.url, caption: m.caption, duration: m.duration }));
  return { ok: true };
});
ipcMain.on('panic', panic);

/* ---------- Affichage : écran, position, taille ---------- */
ipcMain.handle('get-displays', () => listDisplays());
ipcMain.handle('save-display', (_e, d) => {
  if (Number.isInteger(d.display)) cfg.display = d.display;
  if (POSITIONS.includes(d.position)) cfg.position = d.position;
  if (SIZES.includes(d.size)) cfg.size = d.size;
  saveConfig(); placeOverlay(); pushOverlayState();
  return cfg;
});
let previewImg = '';
ipcMain.on('preview', () => {
  if (!overlay || overlay.isDestroyed()) return;
  if (!previewImg) {
    try { previewImg = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'assets', 'preview.png')).toString('base64'); } catch {}
  }
  overlay.webContents.send('clear');
  overlay.webContents.send('blague', {
    url: previewImg, caption: "C'est ici que ça s'affichera", duration: 3,
    from: { name: cfg.name || 'toi', avatar: cfg.avatar }
  });
});

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();
  loadConfig();
  createOverlay();
  createPanel();
  createTray();
  connect();
  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);
  screen.on('display-metrics-changed', onDisplaysChanged);
  globalShortcut.register('CommandOrControl+Shift+X', panic);
  globalShortcut.register('CommandOrControl+Shift+M', () => setMuted(!cfg.muted));
  globalShortcut.register('CommandOrControl+Shift+K', showPanel);
});

app.on('second-instance', showPanel);
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* on reste en tâche de fond */ });
