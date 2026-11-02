const stage = document.getElementById('stage');
const fromEl = document.getElementById('from');
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
window.cacabox.on('presence', renderPresence);
window.cacabox.on('config', (c) => { presenceEl.style.display = c.showPresence === false ? 'none' : ''; });

/* ---------- blagues ---------- */
window.cacabox.on('blague', (m) => { queue.push(m); next(); });
window.cacabox.on('clear', () => {
  queue.length = 0; clearTimeout(timer);
  stage.innerHTML = ''; fromEl.classList.remove('in'); busy = false;
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

  let media;
  if (isVideo(m.url)) {
    media = document.createElement('video');
    media.autoplay = true; media.playsInline = true; media.volume = 0.6;
    media.onended = hide;
  } else {
    media = document.createElement('img');
  }
  media.onerror = hide;
  media.src = m.url;
  card.appendChild(media);

  if (m.caption) {
    const cap = document.createElement('div');
    cap.className = 'caption';
    cap.textContent = m.caption;
    card.appendChild(cap);
  }
  stage.appendChild(card);

  // badge « qui a envoyé » en haut à gauche, en même temps
  fromEl.innerHTML = '';
  fromEl.appendChild(avatarEl(m.from));
  const nm = document.createElement('span');
  nm.textContent = (m.from && m.from.name) || 'anonyme';
  fromEl.appendChild(nm);

  requestAnimationFrame(() => { card.classList.add('in'); fromEl.classList.add('in'); });
  timer = setTimeout(hide, (m.duration || 6) * 1000);
}

function hide() {
  clearTimeout(timer);
  const card = stage.firstChild;
  fromEl.classList.remove('in');
  if (!card) { busy = false; next(); return; }
  card.classList.remove('in');
  setTimeout(() => { stage.innerHTML = ''; busy = false; next(); }, 300);
}
