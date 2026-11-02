const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const MAX_PER_ROOM = 30;
const MAX_DATA_URL = 8.5 * 1024 * 1024;   // ~6 Mo de fichier une fois en base64
const rooms = new Map();                   // nom du salon -> Set de sockets

const DATA_RE = /^data:(image\/(png|jpeg|gif|webp)|video\/(mp4|webm));base64,/;

const server = http.createServer((_req, res) => { res.writeHead(200); res.end('livekgb ok'); });
const wss = new WebSocketServer({ server, maxPayload: 9 * 1024 * 1024 });

function validMedia(u) {
  if (typeof u !== 'string') return false;
  if (u.startsWith('data:')) return u.length <= MAX_DATA_URL && DATA_RE.test(u);
  try { return new URL(u).protocol === 'https:' && u.length <= 500; } catch { return false; }
}
function validAvatar(a) {
  return typeof a === 'string' && a.startsWith('data:image/') && a.length <= 30000;
}
function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const c of rooms.get(room) || []) if (c.readyState === 1) c.send(data);
}
function sendPresence(room) {
  const members = [...(rooms.get(room) || [])].map((c) => ({ id: c.id, name: c.profile.name, avatar: c.profile.avatar }));
  broadcast(room, { type: 'presence', members });
}
const log = (room, msg) => console.log(`[${room}] ${msg}`);
const err = (ws, message) => ws.send(JSON.stringify({ type: 'error', message }));

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://x').searchParams;
  const room = (params.get('room') || '').trim().slice(0, 40);
  if (!room) return ws.close(1008, 'salon manquant');
  // connexion « silent » : sert seulement à envoyer (panneau de l'appli), pas comptée dans les connectés
  const silent = params.get('silent') === '1';

  if (!rooms.has(room)) rooms.set(room, new Set());
  const set = rooms.get(room);
  if (!silent && set.size >= MAX_PER_ROOM) return ws.close(1013, 'salon plein');

  ws.id = crypto.randomUUID().slice(0, 8);
  ws.profile = { name: (params.get('name') || 'anonyme').slice(0, 24), avatar: '' };
  ws.isAlive = true;
  ws.lastSent = 0;
  if (!silent) {
    set.add(ws);
    log(room, `+ ${ws.profile.name} connecté (${set.size} dans le salon)`);
    sendPresence(room);
  } else if (!set.size) rooms.delete(room);

  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'hello') {
      ws.profile = { name: String(m.name || 'anonyme').slice(0, 24), avatar: validAvatar(m.avatar) ? m.avatar : '' };
      return silent ? undefined : sendPresence(room);
    }

    if (m.type === 'blague') {
      // texte seul, média seul, ou les deux
      const url = typeof m.url === 'string' ? m.url.trim() : '';
      const caption = String(m.caption || '').trim().slice(0, 120);
      if (!url && !caption) return err(ws, 'Mets un texte, une image ou une vidéo');
      const isData = url.startsWith('data:');
      const now = Date.now();
      if (now - ws.lastSent < (isData ? 4000 : 2000)) return log(room, `x ${ws.profile.name} : trop rapide`), err(ws, isData ? 'Doucement : 1 upload toutes les 4 s' : 'Doucement : 1 blague toutes les 2 s');
      if (url && !validMedia(url)) return log(room, `x ${ws.profile.name} : média refusé`), err(ws, 'Média invalide (https, png/jpg/gif/webp/mp4/webm)');
      ws.lastSent = now;
      const kind = !url ? 'texte' : isData ? `fichier ${url.slice(5, url.indexOf(';'))} ${(url.length * 0.75 / 1024 / 1024).toFixed(1)} Mo` : `lien ${url}`;
      log(room, `> ${ws.profile.name} envoie ${kind} « ${caption} » -> ${(rooms.get(room) || []).size || 0} personne(s)`);

      broadcast(room, {
        type: 'blague',
        from: { name: ws.profile.name, avatar: ws.profile.avatar },
        url,
        caption,
        duration: Math.min(Math.max(Number(m.duration) || 6, 2), 15)
      });
    }
  });
  ws.on('close', () => {
    if (silent) return;
    set.delete(ws);
    log(room, `- ${ws.profile.name} déconnecté (${set.size} restant(s))`);
    if (!set.size) rooms.delete(room); else sendPresence(room);
  });
});

// ping régulier : garde la connexion vivante et nettoie les connexions mortes
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log('LiveKgb server sur le port', PORT));
