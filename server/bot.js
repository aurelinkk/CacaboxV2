// Petit « faux pote » pour tester seul : node bot.js [lienImage] ["légende"]
// Variables optionnelles : SERVER=wss://... ROOM=monsalon
const WebSocket = require('ws');
const url = process.argv[2] || 'https://picsum.photos/480/320.jpg';
const caption = process.argv[3] || "Salut, c'est le bot !";
const server = process.env.SERVER || 'ws://localhost:8080';
const room = process.env.ROOM || 'livekgb';

const ws = new WebSocket(`${server}?room=${encodeURIComponent(room)}&name=Robot`);
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'hello', name: 'Robot', avatar: '' }));
  setTimeout(() => ws.send(JSON.stringify({ type: 'blague', url, caption, duration: 6 })), 2000);
  setTimeout(() => process.exit(0), 20000); // reste connecté 20 s pour voir sa pastille
});
ws.on('error', (e) => { console.error('Erreur :', e.message); process.exit(1); });
