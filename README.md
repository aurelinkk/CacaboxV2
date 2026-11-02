# 💩 Cacabox

Overlay de blagues entre potes, pour **Windows et Mac**. Quelqu'un envoie un mème, et il s'affiche au milieu de l'écran de tout le monde — par-dessus n'importe quelle appli, même le bureau ou un jeu en fenêtré. C'est l'idée des alertes Streamlabs, mais en appli de bureau, sans streaming.

- 🖼️ Image, GIF ou vidéo + légende au centre de l'écran
- 🟢 Pastilles des connectés en haut à droite, avec photo de profil
- 👤 Badge « qui a envoyé » en haut à gauche, affiché en même temps que le mème
- 📎 Lien direct **ou** fichier envoyé depuis ton disque (6 Mo max)
- 🔇 Mode muet, bouton stop, raccourcis clavier
- 🫥 Clics traversants : l'overlay ne gêne jamais ce que tu fais

---

## Sommaire
1. [Installation pour les potes](#1-installation-pour-les-potes)
2. [Utilisation](#2-utilisation)
3. [Héberger le serveur](#3-héberger-le-serveur)
4. [Développement en local](#4-développement-en-local)
5. [Générer les installeurs](#5-générer-les-installeurs)
6. [Comment ça marche](#6-comment-ça-marche)
7. [Limites connues](#7-limites-connues)
8. [Problèmes fréquents](#8-problèmes-fréquents)

---

## 1. Installation pour les potes

Télécharge le fichier qui correspond à ta machine dans l'onglet **[Releases](../../releases)** :

| Machine | Fichier |
|---|---|
| Windows | `Cacabox-x.y.z-win-x64.exe` |
| Mac Apple Silicon (M1/M2/M3/M4) | `Cacabox-x.y.z-mac-arm64.dmg` |
| Mac Intel | `Cacabox-x.y.z-mac-x64.dmg` |

L'appli n'est pas signée (il faut un certificat payant chez Microsoft et Apple), donc l'OS va râler au premier lancement :

- **Windows** : écran bleu SmartScreen → *Informations complémentaires* → *Exécuter quand même*.
- **Mac** : glisse Cacabox dans Applications, puis **clic droit sur l'appli → Ouvrir** → *Ouvrir*. Un double-clic classique serait refusé. À faire une seule fois.

Une fois lancée, Cacabox tourne en tâche de fond : son icône est près de l'horloge sur Windows (parfois cachée derrière la flèche `^`) et dans la barre de menu en haut sur Mac. Clique dessus pour ouvrir le panneau.

---

## 2. Utilisation

**Au premier lancement**, dans le panneau :
1. Mets ton **pseudo** et choisis ta **photo de profil** (c'est elle qui apparaît dans les pastilles).
2. Vérifie le **serveur** (`wss://...`) et le **salon**. Tout le monde doit avoir exactement le même salon pour se voir.
3. Clique sur **Enregistrer & connecter**. Le statut passe à « Connecté ✔ (N en ligne) ».

> Le nom du salon sert de mot de passe : qui le connaît peut entrer. Prends autre chose que `cacabox`.

**Pour envoyer un mème :**
- Soit tu colles un **lien direct** en `https`, qui finit par `.gif`, `.png`, `.jpg`, `.webp`, `.mp4` ou `.webm`. Un lien de page comme `giphy.com/gifs/...` ne marche pas : il faut l'adresse du fichier (clic droit sur l'image → *Copier l'adresse de l'image*).
- Soit tu cliques sur **📎 Joindre un fichier** et tu choisis une image ou une vidéo sur ton disque (6 Mo max).

Ajoute une légende, règle la durée (2 à 15 s), puis **Envoyer 🚀**. Le mème s'affiche chez tout le monde dans le salon, toi compris.

**Raccourcis clavier** (ils marchent depuis n'importe quelle appli) :

| Raccourci | Effet |
|---|---|
| `Ctrl/Cmd + Shift + X` | Stop — vide l'écran immédiatement |
| `Ctrl/Cmd + Shift + M` | Muet on/off — ne plus rien recevoir |
| `Ctrl/Cmd + Shift + K` | Ouvrir le panneau |

Pratique si quelqu'un envoie une bêtise pendant que tu partages ton écran.

---

## 3. Héberger le serveur

Les applis ne se parlent pas directement : elles passent par un petit serveur relais. Tant qu'il tourne sur ton PC (`ws://localhost:8080`), seul toi peux te connecter. Pour tes potes, il faut le mettre en ligne. **Render** est gratuit et suffit largement.

1. Pousse ce dépôt sur GitHub.
2. Sur [render.com](https://render.com) : *New* → *Web Service* → connecte ton dépôt.
3. Réglages :
   - **Root Directory** : `server`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free
4. Render te donne une adresse en `https://xxx.onrender.com`. Dans Cacabox, mets-la en remplaçant `https` par **`wss`** : `wss://xxx.onrender.com`.

> ⚠️ L'offre gratuite de Render met le serveur en veille après quelques minutes sans activité. La première connexion peut alors prendre ~30 s : l'appli réessaie toute seule. Railway et Fly.io fonctionnent pareil, à toi de voir.

**Pour éviter que tes potes aient à taper l'adresse**, ouvre `main.js` et mets ton serveur en dur avant de générer les installeurs :

```js
const DEFAULT_SERVER = 'wss://xxx.onrender.com';
```

---

## 4. Développement en local

Il te faut [Node.js](https://nodejs.org) (version LTS).

**Terminal 1 — le serveur :**
```bash
cd server
npm install
npm start          # → Cacabox server sur le port 8080
```

**Terminal 2 — l'appli :**
```bash
npm install
npm start
```

Dans le panneau, mets `ws://localhost:8080` comme serveur.

**Tester seul**, sans pote sous la main : un faux pote se connecte et envoie un mème au bout de 2 s, histoire de voir sa pastille et son badge.
```bash
cd server
node bot.js
node bot.js "https://exemple.com/truc.gif" "une légende"
SERVER=wss://xxx.onrender.com ROOM=monsalon node bot.js   # contre ton serveur en ligne
```

### Structure

```
main.js            processus principal : fenêtres, tray, WebSocket, raccourcis
preload.js         pont sécurisé entre le main et les pages
overlay.html/.js   la fenêtre transparente (mème, badge expéditeur, pastilles)
panel.html/.js     le panneau de contrôle (profil, connexion, envoi)
server/server.js   le relais WebSocket (salons, présence, anti-spam)
server/bot.js      faux client pour tester seul
```

---

## 5. Générer les installeurs

### Le plus simple : GitHub Actions (pas besoin d'avoir un Mac)

Le workflow `.github/workflows/build.yml` construit le `.exe` et les `.dmg` sur les machines de GitHub, puis les publie dans les Releases.

```bash
git tag v0.2.0
git push origin v0.2.0
```

Va voir l'onglet **Actions**, attends quelques minutes, et les fichiers apparaissent dans **Releases**. Tu peux aussi le lancer à la main depuis l'onglet Actions (*Run workflow*).

### En local

```bash
npm run dist
```

Les fichiers sortent dans `dist/`. Attention : on ne peut construire que pour son propre OS. Lancé sur Windows tu obtiens le `.exe`, sur Mac le `.dmg`.

---

## 6. Comment ça marche

```
   Toi                     Serveur relais                 Tes potes
┌──────────┐   WebSocket   ┌──────────────┐   WebSocket   ┌──────────┐
│  Panneau │ ────────────► │   salon      │ ────────────► │  Overlay │
│  Overlay │ ◄──────────── │  « lesPotes »│ ◄──────────── │  Panneau │
└──────────┘               └──────────────┘               └──────────┘
```

L'overlay est une fenêtre Electron plein écran, transparente, sans bordure, `alwaysOnTop` au niveau `screen-saver`, avec `setIgnoreMouseEvents(true)` pour que les clics la traversent. Sur Mac, `setVisibleOnAllWorkspaces` lui permet de s'afficher aussi par-dessus les applis en plein écran.

Le serveur ne stocke rien : il relaie les messages aux membres du salon et garde la liste des présents en mémoire. Il accepte uniquement des liens `https` ou des fichiers en base64 aux formats autorisés, limite les envois à 1 toutes les 2 s (4 s pour un fichier), coupe les légendes à 120 caractères et refuse plus de 30 personnes par salon.

---

## 7. Limites connues

- **Jeux en plein écran exclusif** sur Windows : l'overlay n'apparaît pas. En « fenêtré sans bordure », ça marche.
- **Un seul écran** : l'overlay s'affiche sur l'écran principal.
- **Pas de signature de code** : avertissements au premier lancement (voir l'installation).
- **Fichiers limités à 6 Mo** : ils transitent en base64 par le WebSocket, il n'y a pas de stockage. Pour du plus lourd, héberge le fichier et envoie le lien.
- **Pas d'historique** : un mème raté est perdu.
- Le salon est un simple mot de passe partagé, il n'y a pas de comptes.

---

## 8. Problèmes fréquents

**« Déconnecté, nouvelle tentative… »**
Le serveur ne tourne pas, ou l'adresse est fausse. En local, vérifie le terminal du serveur. En ligne, vérifie que l'adresse commence bien par `wss://` et pas `https://`, et patiente ~30 s si l'hébergeur sortait de veille.

**Je suis connecté mais je ne vois pas mes potes**
Vérifiez que vous avez tous écrit le salon exactement pareil, majuscules comprises.

**Rien ne s'affiche quand j'envoie**
Le lien n'est sans doute pas un lien *direct*. Teste-le dans ton navigateur : tu dois voir l'image seule, pas une page web. Vérifie aussi que le mode muet est désactivé.

**« npm : Impossible de charger le fichier ... npm.ps1 » (Windows)**
PowerShell bloque les scripts. Une fois pour toutes :
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Si c'est bloqué par ton entreprise, utilise `npm.cmd install` ou passe le terminal de VS Code en *Command Prompt*.

**`npm install` affiche des « vulnerabilities »**
Elles viennent des outils de build, pas de l'appli. Ne lance pas `npm audit fix --force`, ça casse souvent Electron.

**L'overlay est resté coincé à l'écran**
`Ctrl/Cmd + Shift + X`. Sinon, clique sur l'icône dans la barre des tâches → *Quitter*.

---

## Licence

MIT — fais-en ce que tu veux.
