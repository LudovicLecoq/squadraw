# Squadraw

Créez des compositions de football et de rugby, déplacez les joueurs sur le terrain et exportez votre équipe en image.

Site : [squadraw.com](https://squadraw.com/)

Ce dépôt reprend la version à fichiers séparés de l'archive `ONZE-mini-site-v4.zip`, choisie comme référence pour le site hébergé sur Hostinger. L'ancien nom ONZE a été remplacé par Squadraw dans l'interface.

## Fonctionnalités

- Football à 11 et rugby à 7, 13 ou 15, avec une composition mémorisée par format.
- Interface en français et en anglais.
- Noms, numéros et maillots personnalisables ; joueurs déplaçables à la souris, au doigt et au clavier.
- Banc repliable, remplacements et gardiens remplaçants au football.
- Export PNG avec les remplaçants, sauvegarde et import JSON.
- Sauvegarde automatique dans le navigateur, sans compte.

## Ouvrir en local

Téléchargez le dépôt avec **Code → Download ZIP**, extrayez tout le dossier, puis ouvrez `index.html`.

Les fichiers `i18n.js`, `sports.js`, `graphics.js` et `app.js` doivent rester à côté d'`index.html`. Aucune compilation ni installation de dépendances n'est nécessaire pour utiliser le site.

## Mettre à jour le site sur Hostinger

1. Conservez une copie de la version actuellement en ligne.
2. Ouvrez le gestionnaire de fichiers du site dans Hostinger.
3. Envoyez ensemble `index.html`, `i18n.js`, `sports.js`, `graphics.js` et `app.js` dans le dossier public du domaine (généralement `public_html`).
4. Vérifiez les changements sur [squadraw.com](https://squadraw.com/) et videz le cache Hostinger si nécessaire.

Le dépôt conserve l'historique du code. Aucun déploiement automatique vers Hostinger n'est configuré.

## Organisation et vérifications

| Fichier | Contenu |
| --- | --- |
| `index.html` | Interface et styles |
| `i18n.js` | Traductions français/anglais |
| `sports.js` | Sports, formations, validation et migration des sauvegardes |
| `graphics.js` | Maillots, écussons et terrains |
| `app.js` | Interactions, stockage et exports |
| `tests/check.cjs` | Vérifications de non-régression sans dépendances externes |

Pour lancer les vérifications, installez Node.js puis exécutez à la racine du dépôt :

```sh
node tests/check.cjs
```

Le guide d'utilisation complet est dans [LISEZMOI.txt](LISEZMOI.txt). Les explications pour ajouter des sports et des langues sont dans [DEVELOPMENT.md](DEVELOPMENT.md).

Les sauvegardes personnelles des utilisateurs restent dans leur navigateur ou leurs fichiers JSON ; elles ne font pas partie du dépôt.

## English

Squadraw is a browser-based football and rugby lineup builder with drag-and-drop players, custom kits, substitutes, French/English UI, PNG export and JSON backups. Open `index.html` with all four JavaScript files beside it, or upload these five files together to your static web host. No build step or runtime dependencies are required.
