# Architecture des Webviews avec bundling esbuild

## Problème résolu

Auparavant, les webviews VSCode avaient des problèmes avec les modules ES6/TypeScript natifs car elles s'exécutent dans un contexte web sandboxé qui ne supporte pas directement :
- Les imports/exports ES6 natifs
- Le système de modules Node.js
- Les chemins relatifs TypeScript

## Solution : Bundling avec esbuild

### Configuration

Nous utilisons **esbuild** pour bundler le code TypeScript en JavaScript autonome compatible avec les webviews VSCode.

#### Fichiers clés :
- `build-webviews.mjs` : Script de build esbuild
- `package.json` : Scripts npm mis à jour
- Chaque webview génère un bundle : `media/{nom}-bundle.js`

### Structure des webviews

```
src/webviews/
├── CommonClassItem.ts          # Classe commune partagée
├── common.ts                   # Fonctions communes à tous les panneaux
├── entries/
│   ├── main.ts                 # Point d'entrée pour bundle entries
│   └── Entry.ts                # Classe spécifique entries
├── films/
│   ├── main.ts                 # Point d'entrée pour bundle films
│   └── Film.ts                 # Classe spécifique films
└── exemples/
    ├── main.ts                 # Point d'entrée pour bundle exemples
    └── Exemple.ts              # Classe spécifique exemples
```

### Processus de build

1. **Compilation extension** : `tsc -p ./` (comme avant)
2. **Bundling webviews** : `node build-webviews.mjs`
   - Bundle tous les imports/exports en un seul fichier IIFE
   - Génère `media/{panel}-bundle.js` pour chaque webview
   - Génère les source maps pour le debug

### Configuration esbuild

```javascript
{
  bundle: true,
  format: 'iife',        // Pas de modules - code auto-exécuté
  target: 'es2022',
  platform: 'browser',
  sourcemap: true,
  minify: false,         // Lisible en debug
  splitting: false       // Un seul fichier par webview
}
```

### Chargement dans VSCode

L'extension charge maintenant `{panel}-bundle.js` au lieu des anciens fichiers modulaires :

```typescript
// PanelManager.ts ligne 300
const mainJsPath = vscode.Uri.file(
  path.join(context.extensionPath, 'media', `${panelId}-bundle.js`)
);
```

### Scripts npm

```bash
# Compilation complète
npm run compile              # Extension + webviews

# Compilation séparée
npm run compile:extension    # TypeScript vers CommonJS
npm run compile:webviews     # esbuild bundling

# Mode développement
npm run dev                  # Watch extension + webviews
npm run watch:extension      # Watch extension seulement
npm run watch:webviews       # Watch webviews seulement

# Nettoyage
npm run clean               # Supprime out/ et bundles
npm run rebuild             # Clean + compile
```

## Avantages obtenus

### ✅ Modules TypeScript fonctionnels
- Import/export entre fichiers webview
- Partage de code via `CommonClassItem.ts` et `common.ts`
- Architecture modulaire propre

### ✅ Compatibilité webview VSCode
- Plus d'erreurs de modules ES6
- Bundles autonomes sans dépendances externes
- Chargement rapide (un seul fichier par webview)

### ✅ Workflow de développement amélioré
- Mode watch pour rebuild automatique
- Source maps pour debug
- Scripts npm intuitifs

### ✅ Performance
- Bundles optimisés (12K par webview)
- Un seul fichier HTTP request par webview
- Pas de résolution de modules à l'exécution

## Mode développement recommandé

```bash
# Terminal 1 - Compilation en continu
npm run dev

# Terminal 2 - Tests
npm test

# Ou pour lancer l'extension en mode debug dans VSCode
# F5 dans VSCode après avoir compilé
```

## Notes importantes

### Warning eval()
Le bundler affiche un warning à propos de `eval()` dans `common.ts` ligne 200. Ce n'est pas critique - c'est pour l'exécution de scripts dans les tests. On peut l'ignorer ou le refactoriser plus tard.

### TypeScript Configuration
- `tsconfig.json` : Configuration pour l'extension (Node.js)
- `tsconfig.webview.json` : Maintenu mais plus utilisé (remplacé par esbuild)

### Ajout de nouvelles webviews
1. Créer le dossier `src/webviews/{nom}/`
2. Ajouter `main.ts` comme point d'entrée
3. Mettre à jour `build-webviews.mjs` avec le nouvel entry point
4. Mettre à jour `PanelManager.ts` si besoin

Cette architecture respecte les bonnes pratiques VSCode tout en permettant une organisation modulaire TypeScript moderne.
