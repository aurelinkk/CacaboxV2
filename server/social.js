// Liens YouTube / TikTok / Instagram / X (Twitter) : on ne télécharge JAMAIS la vidéo.
//  - YouTube, TikTok, Instagram : l'appli affiche le lecteur officiel du site, via une petite page
//    servie par ce serveur (/embed/...). Passer par une vraie page https évite les refus des lecteurs
//    quand ils sont intégrés dans une appli de bureau.
//  - X / Twitter : on demande à api.fxtwitter.com l'adresse du fichier (quelques Ko de JSON),
//    et l'appli lit la vidéo directement depuis les serveurs de Twitter.

const FETCH_TIMEOUT = 6000;

function parseTime(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0;
}

async function get(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 LiveKgb', ...(opts.headers || {}) } });
  } finally { clearTimeout(timer); }
}

// Liens courts (vm.tiktok.com, tiktok.com/t/…) : on suit la redirection pour trouver l'id de la vidéo
async function resolveRedirect(url) {
  try {
    const res = await get(url, { redirect: 'follow' });
    if (res.body) res.body.cancel().catch(() => {});
    return res.url || url;
  } catch { return url; }
}

/**
 * Reconnaît un lien de réseau social.
 * Renvoie null si ce n'en est pas un, sinon :
 *   { kind, embed: { path, ratio } }  -> lecteur officiel affiché via /embed/...
 *   { kind, url }                      -> fichier direct (image / mp4) lu par l'appli
 *   { kind, error }                    -> reconnu mais inutilisable
 */
async function resolveSocial(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^(www|m|mobile|music)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);

  /* ----- YouTube ----- */
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    let id = null, vertical = false;
    if (host === 'youtu.be') id = parts[0];
    else if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'embed') { id = parts[1]; vertical = parts[0] === 'shorts'; }
    if (!id || !/^[\w-]{6,20}$/.test(id)) return { kind: 'youtube', error: 'Lien YouTube non reconnu' };
    const start = parseTime(u.searchParams.get('t') || u.searchParams.get('start'));
    return {
      kind: 'youtube',
      embed: { path: `/embed/youtube?id=${id}&start=${start}`, ratio: vertical ? 9 / 16 : 16 / 9 }
    };
  }

  /* ----- TikTok ----- */
  if (host.endsWith('tiktok.com')) {
    let target = u;
    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || parts[0] === 't') {
      try { target = new URL(await resolveRedirect(u.href)); } catch {}
    }
    const m = /\/(?:video|photo)\/(\d{8,25})/.exec(target.pathname) || /^(\d{8,25})$/.exec(target.searchParams.get('item_id') || '');
    if (!m) return { kind: 'tiktok', error: 'Lien TikTok non reconnu' };
    return { kind: 'tiktok', embed: { path: `/embed/tiktok?id=${m[1]}`, ratio: 9 / 16 } };
  }

  /* ----- Instagram ----- */
  if (host === 'instagram.com' || host === 'ddinstagram.com') {
    const i = parts.findIndex((p) => ['p', 'reel', 'reels', 'tv'].includes(p));
    const code = i >= 0 ? parts[i + 1] : null;
    if (!code || !/^[\w-]{5,40}$/.test(code)) return { kind: 'instagram', error: 'Lien Instagram non reconnu' };
    return { kind: 'instagram', embed: { path: `/embed/instagram?code=${code}`, ratio: 9 / 16 } };
  }

  /* ----- X / Twitter ----- */
  if (['x.com', 'twitter.com', 'fxtwitter.com', 'vxtwitter.com', 'fixupx.com', 'fixvx.com', 'twittpr.com'].includes(host)) {
    const i = parts.indexOf('status');
    const id = i >= 0 ? parts[i + 1] : null;
    if (!id || !/^\d{1,25}$/.test(id)) return { kind: 'x', error: 'Lien X / Twitter non reconnu' };
    try {
      const res = await get(`https://api.fxtwitter.com/status/${id}`);
      const j = await res.json();
      const media = (j && j.tweet && j.tweet.media) || {};
      const video = (media.videos || [])[0];
      if (video && video.url) return { kind: 'x', url: video.url, text: j.tweet.text };
      const photo = (media.photos || [])[0];
      if (photo && photo.url) return { kind: 'x', url: photo.url, text: j.tweet.text };
    } catch {}
    // pas de média trouvé (ou API indisponible) : on affiche le tweet tel quel
    return { kind: 'x', embed: { path: `/embed/x?id=${id}`, ratio: 4 / 5 } };
  }

  return null;
}

/* ---------- Pages /embed/... (le lecteur officiel, plein cadre, fond noir) ---------- */
const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p,iframe{display:block;width:100%;height:100%;border:0}</style>
</head><body>${body}</body></html>`;
// prévient l'appli quand la vidéo est finie (pour libérer l'écran plus tôt)
const tell = (what) => `parent.postMessage({ livekgb: '${what}' }, '*')`;

function embedPage(pathname, q) {
  if (pathname === '/embed/youtube') {
    const id = q.get('id') || '';
    const start = Number(q.get('start')) || 0;
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return page(`<div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
function onYouTubeIframeAPIReady() {
  var p = new YT.Player('p', {
    host: 'https://www.youtube-nocookie.com', videoId: '${id}',
    playerVars: { autoplay: 1, controls: 0, start: ${start}, playsinline: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0 },
    events: {
      onReady: function (e) {
        e.target.playVideo();
        // si la lecture avec le son est bloquée, on relance en muet
        setTimeout(function () { if (p.getPlayerState() !== 1) { p.mute(); p.playVideo(); } }, 1500);
      },
      onStateChange: function (e) { if (e.data === 0) ${tell('ended')}; },
      onError: function () { ${tell('error')}; }
    }
  });
}
</script>`);
  }
  if (pathname === '/embed/tiktok') {
    const id = q.get('id') || '';
    if (!/^\d{8,25}$/.test(id)) return null;
    const params = 'autoplay=1&loop=0&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0';
    return page(`<iframe id="f" src="https://www.tiktok.com/player/v1/${id}?${params}" allow="autoplay; encrypted-media; fullscreen"></iframe>
<script>
var f = document.getElementById('f');
function cmd(type) { f.contentWindow.postMessage({ type: type, 'x-tiktok-player': true }, '*'); }
window.addEventListener('message', function (e) {
  var d = e.data || {};
  if (!d['x-tiktok-player']) return;
  if (d.type === 'onPlayerReady') { cmd('unMute'); cmd('play'); }
  if (d.type === 'onStateChange' && d.value === 0) ${tell('ended')};
});
</script>`);
  }
  if (pathname === '/embed/instagram') {
    const code = q.get('code') || '';
    if (!/^[\w-]{5,40}$/.test(code)) return null;
    return page(`<iframe src="https://www.instagram.com/reel/${code}/embed/" allow="autoplay; encrypted-media" scrolling="no"></iframe>`);
  }
  if (pathname === '/embed/x') {
    const id = q.get('id') || '';
    if (!/^\d{1,25}$/.test(id)) return null;
    return page(`<iframe src="https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true&hideThread=true" allow="autoplay; encrypted-media" scrolling="no"></iframe>`);
  }
  return null;
}

module.exports = { resolveSocial, embedPage };
