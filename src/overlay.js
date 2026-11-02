const stage = document.getElementById('stage');
const presenceEl = document.getElementById('presence');
const queue = [];
let busy = false;
let timer = null;

const isVideo = (u) => /^data:video\//i.test(u) || /\.(mp4|webm)(\?|#|$)/i.test(u);

/* ---------- avatars ---------- */
function colorFor(name) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
}
function avatarEl(user) {
  if (user && user.avatar) {
    const img = document.createElement('img');
    img.className = 'av'; img.src = user.avatar;
    return img;
  }
  const d = document.createElement('div');
  d.className = 'av ini';
  d.style.background = colorFor((user && user.name) || '?');
  d.textContent = ((user && user.name) || '?').trim().charAt(0) || '?';
  return d;
}

/* ---------- connectés ---------- */
function renderPresence(list) {
  presenceEl.innerHTML = '';
  for (const m of list || []) {
    const u = document.createElement('div'); u.className = 'user';
    const wrap = document.createElement('div'); wrap.className = 'wrap';
    wrap.appendChild(avatarEl(m));
    const dot = document.createElement('div'); dot.className = 'dot';
    wrap.appendChild(dot);
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = m.name;
    u.appendChild(wrap); u.appendChild(nm);
    presenceEl.appendChild(u);
  }
}
window.livekgb.on('presence', renderPresence);
const SIZE = { s: 0.6, m: 1, l: 1.35, xl: 1.6 };
const FLEX = { top: 'flex-start', left: 'flex-start', center: 'center', bottom: 'flex-end', right: 'flex-end' };
window.livekgb.on('config', (c) => {
  presenceEl.style.display = c.showPresence === false ? 'none' : '';
  // position : « top-left », « bottom », « center »… -> alignement vertical / horizontal
  const p = c.position || 'center';
  const v = p.includes('top') ? 'top' : p.includes('bottom') ? 'bottom' : 'center';
  const h = p.includes('left') ? 'left' : p.includes('right') ? 'right' : 'center';
  stage.style.alignItems = FLEX[v];
  stage.style.justifyContent = FLEX[h];
  document.documentElement.style.setProperty('--align', FLEX[h]);
  document.documentElement.style.setProperty('--text', h === 'center' ? 'center' : h);
  // sur un côté, le mème laisse la place aux connectés en haut à droite
  stage.style.paddingTop = v === 'top' && h === 'right' ? 'calc(4vmin + 70px)' : '';
  document.documentElement.style.setProperty('--s', SIZE[c.size] || 1);
});

/* ---------- blagues ---------- */
window.livekgb.on('blague', (m) => { queue.push(m); next(); });
window.livekgb.on('clear', () => {
  queue.length = 0; clearTimeout(timer);
  stage.innerHTML = ''; busy = false;
});

function next() {
  if (busy || !queue.length) return;
  busy = true;
  show(queue.shift());
}

function show(m) {
  stage.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';

  // badge « qui a envoyé », au-dessus du mème
  const from = document.createElement('div');
  from.className = 'from';
  from.appendChild(avatarEl(m.from));
  const nm = document.createElement('span');
  nm.textContent = (m.from && m.from.name) || 'anonyme';
  from.appendChild(nm);
  card.appendChild(from);

  if (m.url) showMedia(card, m);

  if (m.caption) {
    const cap = document.createElement('div');
    cap.className = m.url ? 'caption' : 'caption solo'; // texte seul : plus gros
    cap.textContent = m.caption;
    card.appendChild(cap);
  }
  stage.appendChild(card);
  requestAnimationFrame(() => card.classList.add('in'));
  timer = setTimeout(hide, (m.duration || 6) * 1000);
}

function showMedia(card, m) {
  let media;
  if (isVideo(m.url)) {
    media = document.createElement('video');
    media.autoplay = true; media.playsInline = true; media.volume = 0.6;
    media.onended = hide;
  } else {
    media = document.createElement('img');
  }
  media.className = 'media';
  media.onerror = hide;
  // agrandit ou réduit le mème pour qu'il ait la même place sur tous les écrans (HD, Retina, 4K…)
  const fit = () => {
    const nw = media.naturalWidth || media.videoWidth, nh = media.naturalHeight || media.videoHeight;
    if (!nw || !nh) return;
    const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
    const maxW = Math.min(innerWidth * 0.6 * s, innerWidth * 0.92);
    const maxH = Math.min(innerHeight * 0.5 * s, innerHeight * 0.72);
    const r = Math.min(maxW / nw, maxH / nh);
    media.style.width = Math.round(nw * r) + 'px';
    media.style.height = Math.round(nh * r) + 'px';
  };
  media.addEventListener(isVideo(m.url) ? 'loadedmetadata' : 'load', fit);
  media.src = m.url;
  // si le navigateur bloque la lecture avec le son, on relance en muet plutôt que de ne rien montrer
  if (media.play) media.play().catch(() => { media.muted = true; media.play().catch(() => {}); });
  card.appendChild(media);
}

function hide() {
  clearTimeout(timer);
  const card = stage.firstChild;
  if (!card) { busy = false; next(); return; }
  card.classList.remove('in');
  setTimeout(() => { stage.innerHTML = ''; busy = false; next(); }, 300);
}
