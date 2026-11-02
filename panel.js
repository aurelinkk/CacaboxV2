const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const MAX_FILE = 6 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];

let avatar = '';
let attached = null; // File

function setStatus({ text, ok }) {
  statusEl.textContent = text;
  statusEl.className = ok ? 'ok' : '';
}
function setPic(dataUrl) {
  avatar = dataUrl || '';
  $('pic').src = avatar || 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#33343c"/></svg>');
}
function fill(c) {
  $('name').value = c.name; $('server').value = c.server; $('room').value = c.room;
  $('muted').checked = c.muted; $('showPresence').checked = c.showPresence !== false;
  setPic(c.avatar);
  fillDisplay(c);
}

/* ----- affichage : écran, position, taille (enregistré tout de suite, sans reconnexion) ----- */
let disp = { display: 0, position: 'center', size: 'm' };
function fillDisplay(c) {
  disp = { display: c.display || 0, position: c.position || 'center', size: c.size || 'm' };
  $('size').value = disp.size;
  for (const b of document.querySelectorAll('#posGrid button')) b.classList.toggle('on', b.dataset.pos === disp.position);
  if ([...$('display').options].some((o) => Number(o.value) === disp.display)) $('display').value = String(disp.display);
}
function fillDisplays(list) {
  const sel = $('display');
  sel.innerHTML = '';
  for (const d of list) {
    const o = document.createElement('option');
    o.value = String(d.id); o.textContent = d.label;
    sel.appendChild(o);
  }
  if (list.some((d) => d.id === disp.display)) sel.value = String(disp.display);
  else sel.value = String((list.find((d) => d.label.includes('principal')) || list[0] || {}).id);
}
async function saveDisplay(preview = true) {
  const c = await window.livekgb.saveDisplay(disp);
  fillDisplay(c);
  if (preview) window.livekgb.preview();
}
$('display').onchange = () => { disp.display = Number($('display').value); saveDisplay(); };
$('size').onchange = () => { disp.size = $('size').value; saveDisplay(); };
for (const b of document.querySelectorAll('#posGrid button')) {
  b.onclick = () => { disp.position = b.dataset.pos; saveDisplay(); };
}
$('preview').onclick = () => window.livekgb.preview();

window.livekgb.getDisplays().then(fillDisplays).then(() => window.livekgb.getConfig()).then(fill);
window.livekgb.on('displays', fillDisplays);
window.livekgb.on('status', setStatus);
window.livekgb.on('config', fill);

/* ----- photo de profil : recadrée en carré 80x80 puis stockée en JPEG ----- */
$('pickAvatar').onclick = () => $('avatarFile').click();
$('avatarFile').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const bmp = await createImageBitmap(f);
    const size = 80, s = Math.min(bmp.width, bmp.height);
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
    setPic(c.toDataURL('image/jpeg', 0.8));
    saveAll(); // on enregistre tout de suite pour que les potes voient la photo
  } catch { setStatus({ text: '⚠ Image illisible' }); }
  e.target.value = '';
};

function saveAll() {
  return window.livekgb.saveConfig({
    name: $('name').value, avatar, server: $('server').value, room: $('room').value,
    muted: $('muted').checked, showPresence: $('showPresence').checked
  });
}
$('save').onclick = saveAll;

/* ----- fichier à envoyer ----- */
$('pickFile').onclick = () => $('mediaFile').click();
$('mediaFile').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (!ALLOWED.includes(f.type)) { setStatus({ text: '⚠ Format non supporté' }); e.target.value = ''; return; }
  if (f.size > MAX_FILE) { setStatus({ text: '⚠ Fichier trop lourd (6 Mo max)' }); e.target.value = ''; return; }
  attached = f;
  $('fileName').textContent = f.name;
  $('clearFile').style.display = '';
  $('url').value = '';
};
$('clearFile').onclick = () => {
  attached = null; $('mediaFile').value = '';
  $('fileName').textContent = 'aucun fichier (6 Mo max)';
  $('clearFile').style.display = 'none';
};

const readDataUrl = (f) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result); r.onerror = rej;
  r.readAsDataURL(f);
});

$('send').onclick = async () => {
  let url = $('url').value.trim();
  try {
    if (attached) { setStatus({ text: 'Envoi du fichier…', ok: true }); url = await readDataUrl(attached); }
  } catch { return setStatus({ text: '⚠ Lecture du fichier impossible' }); }
  if (!url) return setStatus({ text: 'Mets un lien ou joins un fichier 🙂' });

  const r = await window.livekgb.send({
    url, caption: $('caption').value, duration: Number($('duration').value) || 6
  });
  if (!r.ok) setStatus({ text: '⚠ ' + r.error });
  else if (attached) $('clearFile').click();
};
$('panic').onclick = () => window.livekgb.panic();
