# 📜 Changelog LiveKgb

Toutes les versions depuis le début, la plus récente en haut.

> **Installer ou mettre à jour** : si LiveKgb 0.6.0 ou plus est déjà installé, clique sur **🔄 Rechercher une mise à jour** en bas du panneau. Sinon, télécharge le fichier de ta machine dans les *Assets* ci-dessous : `x64-setup.exe` pour Windows, `aarch64.dmg` pour Mac M1/M2/M3/M4, `x64.dmg` pour Mac Intel.

---

## v0.6.1 (3 novembre 2026)

### 🐛 Corrigé
- **Mises à jour sur Mac** : le bouton « Rechercher une mise à jour » ne trouvait rien sur Mac, car la release ne contenait le paquet de mise à jour que pour Windows. Les Mac M1/M2/M3/M4 et Intel sont maintenant inclus.

### ✨ Nouveau
- Ce changelog est affiché dans chaque release.

---

## v0.6.0 (3 novembre 2026)

### ✨ Nouveau
- **Liens YouTube, TikTok, Instagram et X / Twitter** :
  - YouTube (vidéos, `youtu.be`, Shorts, `?t=` pour démarrer plus loin) et TikTok : le lecteur officiel s'affiche et démarre tout seul ;
  - X / Twitter : la vidéo ou l'image du tweet est lue directement ;
  - Instagram : l'aperçu du post s'affiche (Instagram ne lance pas ses vidéos tout seul).
  - Aucune vidéo n'est téléchargée par le serveur.
- **Texte seul ou média seul** : plus besoin de remplir les deux. Un texte seul s'affiche en gros au milieu de l'écran.
- **Mises à jour dans l'appli** : un bandeau prévient quand une nouvelle version sort (*Installer et redémarrer*), et un bouton **🔄 Rechercher une mise à jour** est en bas du panneau. Les mises à jour sont signées.
- La durée d'affichage peut aller jusqu'à **30 s**, et une vidéo qui finit avant libère l'écran plus tôt.

### ⚠️ À savoir
- C'est la dernière version à installer à la main : les suivantes arrivent par le bouton de mise à jour.
- Les messages « texte seul » et les liens de réseaux sociaux ne s'affichent pas sur les versions plus anciennes.

---

## v0.5.0 (2 novembre 2026)

### ✨ Nouveau
- **L'appli passe de ~90 Mo à moins de 2 Mo** : réécrite avec Tauri, elle utilise le moteur web déjà présent dans Windows et macOS au lieu d'embarquer son propre navigateur.
- **S'adapte à tous les écrans** (portable, Retina, 4K) : la taille du mème est calculée par rapport à l'écran.
- **Section « Affichage »** dans le panneau, réglée par chacun pour son écran :
  - choix de l'écran si tu en as plusieurs ;
  - position sur une grille de 9 cases (centre, coins, bords) ;
  - taille : Petit, Moyen, Grand ou Très grand ;
  - bouton **👀 Tester l'affichage**, pour voir un aperçu chez toi seulement.
- L'overlay évite la barre des tâches, la barre de menu et le Dock, et se replace tout seul quand un écran est branché ou change de résolution.
- Le badge « qui a envoyé » est maintenant au-dessus du mème.
- Vraies icônes : dans la barre de menu Mac (fini le carré orange), près de l'horloge sur Windows, et pour l'appli.

### 🐛 Corrigé
- **Mac** : fini le message « LiveKgb est endommagé et ne peut pas être ouvert ».

### ⚠️ À savoir
- Le pseudo, la photo et le salon sont à ressaisir une fois.

---

## v0.4.0 (2 novembre 2026)

### ✨ Nouveau
- **Cacabox devient LiveKgb** (nom de l'appli, fenêtres, installeurs).
- Le serveur en ligne (`wss://cacabox-server.onrender.com`) est **pré-rempli** : les potes n'ont plus qu'à mettre leur pseudo et le salon.
- Les réglages de l'ancienne version Cacabox sont repris automatiquement.
- Installeurs plus légers d'environ 10 Mo (langues inutiles retirées, compression maximale).
- Le serveur note dans ses logs les connexions, les blagues envoyées et les refus.

---

## v0.3.0 (2 novembre 2026)

Première version publiée, sous le nom **Cacabox**.

### ✨ Nouveau
- Overlay transparent par-dessus toutes les fenêtres, qui laisse passer les clics.
- Envoi d'une image, d'un GIF ou d'une vidéo avec une légende, par lien direct ou en joignant un fichier (6 Mo max).
- Photo de profil et pastilles des connectés en haut à droite.
- Badge « qui a envoyé » affiché avec le mème.
- File d'attente : les blagues passent l'une après l'autre.
- Mode muet, bouton stop et raccourcis clavier :
  - `Ctrl/Cmd+Shift+X` : vider l'écran ;
  - `+M` : muet ;
  - `+K` : ouvrir le panneau.
- Icône dans la barre des tâches (Windows) ou la barre de menu (Mac), et l'appli tourne en tâche de fond.
- Serveur relais avec salons, anti-spam (1 blague toutes les 2 s) et légendes limitées à 120 caractères.
