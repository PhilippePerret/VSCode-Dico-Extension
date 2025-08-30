#!/usr/bin/env node

import { build } from 'esbuild';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// // Configuration des points d'entrée pour chaque webview
// const webviewEntries = {
//   'entries': 'src/webviews/entries/main.ts',
//   'oeuvres': 'src/webviews/oeuvres/main.ts',
//   'exemples': 'src/webviews/exemples/main.ts'
// };

// Configuration des points d'entrée pour chaque webview
const webviewEntries = {
  'entries': 'src/webviews/models/Entry.ts',
  'oeuvres': 'src/webviews/models/Oeuvre.ts',
  'exemples': 'src/webviews/models/Exemple.ts'
};


// Configuration esbuild commune
const baseConfig = {
  bundle: true,
  format: 'iife', // Immediately Invoked Function Expression - pas de modules
  target: 'es2022',
  platform: 'browser',
  sourcemap: true,
  minify: false, // Garde lisible pour le debug, peut être changé pour la production
  // Pas de splitting car on veut un seul fichier par webview
  splitting: false,
  // Résoudre les imports TypeScript
  loader: {
    '.ts': 'ts'
  },
  // Configuration pour les webviews VSCode
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  // Pas de dépendances externes dans les webviews
  external: [],
};

async function buildWebview(name, entryPath) {
  const outputPath = `media/${name}-bundle.js`;
  
  // Créer le dossier de sortie si nécessaire
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🔨 Building ${name} webview...`);

  try {
    await build({
      ...baseConfig,
      entryPoints: [entryPath],
      outfile: outputPath,
    });
    
    console.log(`✅ ${name} webview built successfully -> ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error building ${name} webview:`, error);
    process.exit(1);
  }
}

async function buildAllWebviews() {
  console.log('🚀 Starting webviews build...\n');

  for (const [name, entryPath] of Object.entries(webviewEntries)) {
    if (existsSync(entryPath)) {
      await buildWebview(name, entryPath);
    } else {
      console.warn(`⚠️  Entry file not found: ${entryPath}`);
    }
  }

  console.log('\n🎉 All webviews built successfully!');
}

// Mode watch si l'argument --watch est passé
const watchMode = process.argv.includes('--watch');

if (watchMode) {
  console.log('👀 Watch mode enabled - rebuilding on changes...\n');
  
  // Configuration watch pour esbuild
  const watchConfig = {
    ...baseConfig,
    entryPoints: Object.values(webviewEntries).filter(path => existsSync(path)),
    outdir: 'media',
    outbase: 'src/webviews',
    // Noms de fichiers avec pattern pour conserver la structure
    entryNames: '[name]-bundle',
  };
  
  try {
    const ctx = await build({
      ...watchConfig,
      watch: {
        onRebuild(error, result) {
          if (error) {
            console.error('❌ Watch rebuild failed:', error);
          } else {
            console.log('✅ Watch rebuild succeeded');
          }
        },
      },
    });
    
    console.log('👀 Watching for changes...');
    
    // Garde le processus actif
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping watch mode...');
      ctx.dispose();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Watch mode failed:', error);
    process.exit(1);
  }
} else {
  // Build une seule fois
  buildAllWebviews().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
}
