# 💩 LiveKgb

Overlay de blagues entre potes, pour **Windows et Mac**. Quelqu'un envoie un mème, et il s'affiche au milieu de l'écran de tout le monde, par-dessus n'importe quelle appli, même le bureau ou un jeu en fenêtré. C'est l'idée des alertes Streamlabs, mais en appli de bureau, sans streaming.

- 🖼️ Image, GIF ou vidéo + légende au centre de l'écran
- 🟢 Pastilles des connectés en haut à droite, avec photo de profil
- 👤 Badge « qui a envoyé » au-dessus du mème
- 🖥️ S'adapte à tous les écrans (portable, Retina, 4K…) : chacun choisit son écran, la position et la taille
- 📎 Lien direct **ou** fichier envoyé depuis ton disque (6 Mo max)
- 🔇 Mode muet, bouton stop, raccourcis clavier
- 🫥 Clics traversants : l'overlay ne gêne jamais ce que tu fais

---

## Sommaire
1. [Installation pour les potes](#1-installation-pour-les-potes)
2. [Utilisation](#2-utilisation)
3. [Le serveur](#3-le-serveur)
4. [Développement en local](#4-développement-en-local)
5. [Publier une nouvelle version](#5-publier-une-nouvelle-version)
6. [Comment ça marche](#6-comment-ça-marche)
7. [Limites connues](#7-limites-connues)
8. [Problèmes fréquents](#8-problèmes-fréquents)

---

## 1. Installation pour les potes

Télécharge le fichier qui correspond à ta machine dans la dernière version de l'onglet **[Releases](../../releases/latest)** :

| Machine | Fichier |
|---|---|
| Windows 10 / 11 | `LiveKgb_x.y.z_x64-setup.exe` |
| Mac Apple Silicon (M1/M2/M3/M4) | `LiveKgb_x.y.z_aarch64.dmg` |
| Mac Intel | `LiveKgb_x.y.z_x64.dmg` |

L'appli n'est pas signée (il faut un certificat payant chez Microsoft et Apple), donc l'OS va râler au premier lancement :

- **Windows** : écran bleu SmartScreen → *Informations complémentaires* → *Exécuter quand même*.
- **Mac** : glisse LiveKgb dans Applications et lance-la. macOS dit qu'il ne peut pas vérifier le développeur : va dans **Réglages Système → Confidentialité et sécurité**, tout en bas, et clique sur **Ouvrir quand même**. À faire une seule fois.
  Si macOS dit que l'appli est « endommagée » (anciennes versions), ouvre le Terminal et tape :
  ```bash
  xattr -cr /Applications/LiveKgb.app
  ```

Une fois lancée, LiveKgb tourne en tâche de fond : son icône est près de l'horloge sur Windows (parfois cachée derrière la flèche `^`) et dans la barre de menu en haut sur Mac. Clique dessus pour ouvrir le panneau.

> L'appli pèse quelques Mo : elle utilise le moteur web déjà présent dans le système (WebView2 sur Windows, WebKit sur Mac) au lieu d'embarquer son propre navigateur. Sur un vieux Windows 10 sans WebView2, l'installeur le télécharge tout seul.

---

## 2. Utilisation

**Au premier lancement**, dans le panneau :
1. Mets ton **pseudo** et choisis ta **photo de profil** (c'est elle qui apparaît dans les pastilles).
2. Le **serveur** est déjà rempli (`wss://cacabox-server.onrender.com`). Mets le **salon** que t'a donné ton pote : tout le monde doit avoir exactement le même pour se voir.
3. Clique sur **Enregistrer & connecter**. Le statut passe à « Connecté ✓ (N en ligne) ».

> Le nom du salon sert de mot de passe : qui le connaît peut t'afficher des trucs à l'écran. Choisis un nom pas devinable, genre `livekgb-k7f2q`.

**Où ça s'affiche** (section *Affichage* du panneau, réglée par chacun pour son écran) :
- **Écran** : si tu as plusieurs écrans, choisis celui où les mèmes apparaissent.
- **Position** : clique sur une des 9 cases (centre, coins, bords).
- **Taille** : Petit, Moyen, Grand ou Très grand. Tout est calculé par rapport à la taille de ton écran, donc ça rend pareil sur un portable 13" que sur un écran 4K.
- **👀 Tester l'affichage** montre un aperçu chez toi seulement, sans rien envoyer aux autres.

L'overlay évite la barre des tâches (Windows) et la barre de menu / le Dock (Mac), et se replace tout seul si tu branches un écran ou changes de résolution.

**Pour envoyer un mème :**
- Soit tu colles un **lien direct** en `https`, qui finit par `.gif`, `.png`, `.jpg`, `.webp`, `.mp4` ou `.webm`. Un lien de page comme `giphy.com/gifs/...` ne marche pas : il faut l'adresse du fichier (clic droit sur l'image → *Copier l'adresse de l'image*).
- Soit tu cliques sur **📎 Joindre un fichier** et tu choisis une image ou une vidéo sur ton disque (6 Mo max).

Ajoute une légende, règle la durée (2 à 15 s), puis **Envoyer 🚀**. Le mème s'affiche chez tout le monde dans le salon, toi compris.

**Raccourcis clavier** (ils marchent depuis n'importe quelle appli) :

| Raccourci | Effet |
|---|---|
| `Ctrl/Cmd + Shift + X` | Stop : vide l'écran immédiatement |
| `Ctrl/Cmd + Shift + M` | Muet on/off : ne plus rien recevoir |
| `Ctrl/Cmd + Shift + K` | Ouvrir le panneau |

Pratique si quelqu'un envoie une bêtise pendant que tu partages ton écran.

---

## 3. Le serveur

Les applis ne se parlent pas directement : elles passent par un petit serveur relais (`server/`). Il est hébergé gratuitement sur **Render** :

- Adresse : `https://cacabox-server.onrender.com` (dans l'appli : **`wss://`**`cacabox-server.onrender.com`)
- Ouvre l'adresse dans un navigateur : si tu vois `livekgb ok`, il tourne.
- Il se **redéploie tout seul** à chaque push sur `main`.

> ⚠️ L'offre gratuite met le serveur en veille après ~15 min sans activité. La première connexion peut alors prendre 30 à 60 s : l'appli réessaie toute seule.

### Voir ce qui se passe (logs)

Dans Render → ton service → **Logs** :

```
[livekgb-k7f2q] + Aurelink connecté (1 dans le salon)
[livekgb-k7f2q] > Aurelink envoie fichier image/jpeg 0.3 Mo « légende » -> 2 personne(s)
[livekgb-k7f2q] x Toto : média refusé
[livekgb-k7f2q] - Aurelink déconnecté (1 restant(s))
```

| Symbole | Signification |
|---|---|
| `+` / `-` | connexion / déconnexion |
| `>` | blague envoyée, et à combien de personnes |
| `x` | blague refusée (trop rapide, lien invalide…) |

Le contenu des fichiers n'est jamais écrit dans les logs, seulement leur type et leur taille. Quand tu cliques sur *Enregistrer & connecter*, tu peux voir passer « 2 dans le salon » puis une déconnexion : c'est l'ancienne connexion qui se ferme, c'est normal.

### Recréer le serveur ailleurs

Sur [render.com](https://render.com) : *New* → *Web Service* → ce dépôt, puis :

| Champ | Valeur |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Region | Frankfurt (EU) |
| Instance Type | Free |

Si l'adresse change, mets-la dans `DEFAULTS.server` en haut de `src/core.js` avant de publier une nouvelle version, pour que les potes n'aient rien à taper.

---

## 4. Développement en local

Il te faut [Node.js](https://nodejs.org) (version LTS) et [Rust](https://rustup.rs). Sur Windows, installe aussi les *Build Tools* de Visual Studio (C++) ; sur Mac, `xcode-select --install`. Le guide complet : [prérequis Tauri](https://v2.tauri.app/start/prerequisites/).

**Terminal 1, le serveur :**
```bash
cd server
npm install
npm start          # → LiveKgb server sur le port 8080
```

**Terminal 2, l'appli :**
```bash
npm install
npm run dev        # la 1re compilation Rust prend quelques minutes
```

Dans le panneau, mets `ws://localhost:8080` comme serveur.

**Tester seul**, sans pote sous la main : un faux pote se connecte et envoie un mème au bout de 2 s, histoire de voir sa pastille et son badge.
```bash
cd server
node bot.js
node bot.js "https://exemple.com/truc.gif" "une légende"
SERVER=wss://cacabox-server.onrender.com ROOM=monsalon node bot.js   # contre le serveur en ligne
```

### Structure

```
src/                     les pages de l'appli (HTML / CSS / JS)
  overlay.html/.js       la fenêtre transparente (mème, badge expéditeur, pastilles)
  core.js                le cœur, dans l'overlay : réglages, connexion au serveur, placement à l'écran
  panel.html/.js         le panneau de contrôle (profil, connexion, affichage, envoi)
  bridge.js              relie le panneau et l'overlay (événements Tauri)
src-tauri/               la partie Rust
  src/main.rs            fenêtres, icône tray + menu, raccourcis globaux
  tauri.conf.json        nom, version, fenêtres, installeurs
  capabilities/          ce que les pages ont le droit de faire
  icons/                 icônes de l'appli et de la barre des tâches / barre de menu
build/icon.png           icône source (régénérer : npx tauri icon build/icon.png -o src-tauri/icons)
server/server.js   le relais WebSocket (salons, présence, anti-spam, logs)
server/bot.js      faux client pour tester seul
```

---

## 5. Publier une nouvelle version

Les installeurs sont construits par **GitHub Actions** (`.github/workflows/build.yml`), pas besoin d'avoir un Mac.

1. Monte la version dans `src-tauri/tauri.conf.json` (ex. `"version": "0.6.0"`).
2. Commit + push sur `main`.
3. Crée un tag sur ce commit et pousse-le. Dans GitHub Desktop : *History* → clic droit sur le commit → *Create Tag* → `v0.6.0` → *Push origin*. En ligne de commande :
   ```bash
   git tag v0.6.0
   git push origin v0.6.0
   ```
4. Onglet **Actions** : le build prend 5 à 10 min, puis le `.exe` et les `.dmg` apparaissent dans **Releases**.

> ⚠️ Ne clique pas sur « Create a new release » à la main : le workflow le fait et y attache les installeurs. Et le tag doit pointer sur le **dernier** commit, sinon c'est l'ancien code qui est construit.

**En local** : `npm run dist`. Les fichiers sortent dans `src-tauri/target/release/bundle/`, mais seulement pour ton OS (`.exe` sur Windows, `.dmg` sur Mac).

> La version est dans `src-tauri/tauri.conf.json` (c'est elle qui donne le nom des fichiers). Monte-la là, et dans `package.json` / `src-tauri/Cargo.toml` pour rester cohérent.

---

## 6. Comment ça marche

```
   Toi                     Serveur relais                 Tes potes
┌──────────┐   WebSocket   ┌──────────────┐   WebSocket   ┌──────────┐
│  Panneau │ ────────────► │    salon     │ ────────────► │  Overlay │
│  Overlay │ ◄──────────── │ « livekgb-…» │ ◄──────────── │  Panneau │
└──────────┘               └──────────────┘               └──────────┘
```

L'appli est faite avec [Tauri](https://tauri.app). L'overlay est une fenêtre transparente sans bordure, toujours au premier plan, qui ignore la souris pour que les clics la traversent. Sur Mac, elle est au niveau « économiseur d'écran » et visible sur tous les bureaux, y compris par-dessus les applis en plein écran.

L'overlay garde la connexion au serveur et les réglages. Le panneau envoie les mèmes sur sa propre connexion « silencieuse », que le serveur ne compte pas dans les connectés.

Le serveur ne stocke rien : il relaie les messages aux membres du salon et garde la liste des présents en mémoire. Il accepte uniquement des liens `https` ou des fichiers en base64 aux formats autorisés, limite les envois à 1 toutes les 2 s (4 s pour un fichier), coupe les légendes à 120 caractères et refuse plus de 30 personnes par salon.

---

## 7. Limites connues

- **Jeux en plein écran exclusif** sur Windows : l'overlay n'apparaît pas. En « fenêtré sans bordure », ça marche.
- **Un écran à la fois** : l'overlay s'affiche sur l'écran choisi dans le panneau, pas sur tous en même temps.
- **Pas de signature de code** : avertissements au premier lancement (voir l'installation).
- **Fichiers limités à 6 Mo** : ils transitent en base64 par le WebSocket, il n'y a pas de stockage. Pour du plus lourd, héberge le fichier et envoie le lien.
- **Pas d'historique** : un mème raté est perdu.
- Le salon est un simple mot de passe partagé, il n'y a pas de comptes.

---

## 8. Problèmes fréquents

**« Déconnecté, nouvelle tentative… »**
Le serveur dort ou l'adresse est fausse. Vérifie qu'elle commence par `wss://` et pas `https://`, ouvre `https://cacabox-server.onrender.com` dans ton navigateur pour le réveiller, et patiente une minute.

**Je suis connecté mais je ne vois pas mes potes**
Vérifiez que vous avez tous écrit le salon exactement pareil, majuscules comprises. Dans les logs Render, le nom entre crochets doit être identique pour tout le monde.

**Rien ne s'affiche quand j'envoie**
Regarde les logs Render : une ligne `x` donne la raison. Souvent le lien n'est pas un lien *direct* : teste-le dans ton navigateur, tu dois voir l'image seule, pas une page web. Vérifie aussi que le mode muet est désactivé.

**Le build échoue dans Actions / pas de release**
Le tag doit commencer par `v` ou un chiffre (`v0.6.0`, `1.0`) et pointer sur le dernier commit. Ouvre le run en échec dans l'onglet Actions pour voir l'erreur.

**« npm : Impossible de charger le fichier ... npm.ps1 » (Windows)**
PowerShell bloque les scripts. Une fois pour toutes :
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**`npm install` affiche des « vulnerabilities »**
Elles viennent des outils de build, pas de l'appli. Ne lance pas `npm audit fix --force`.

**L'overlay est resté coincé à l'écran**
`Ctrl/Cmd + Shift + X`. Sinon, clique sur l'icône dans la barre des tâches → *Quitter*.

---

## Licence

MIT : fais-en ce que tu veux.
