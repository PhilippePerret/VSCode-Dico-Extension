#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Script de reconstruction de la base de données de développement
 * Utilise les données de test (TestData.ts) pour peupler la base de développement
 */

async function main() {
    console.log('🗄️  Script de reconstruction de la base de données de développement');
    
    try {
        // 1. Construire le chemin vers la base de développement
        const devDbPath = path.join(
            os.homedir(),
            'Library/Application Support/Code - Insiders/User/globalStorage/undefined_publisher.dico-cnario/dico.db'
        );
        
        console.log(`📍 Chemin de la base : ${devDbPath}`);
        
        // 2. Supprimer l'ancien fichier s'il existe
        if (fs.existsSync(devDbPath)) {
            console.log('🗑️  Suppression de l\'ancienne base...');
            fs.rmSync(devDbPath, { force: true });
        }
        
        // 3. S'assurer que les modules compilés existent
        console.log('🔧 Compilation des modules...');
        const { execSync } = await import('child_process');
        execSync('npm run compile', { cwd: projectRoot, stdio: 'inherit' });
        
        // 4. Importer les modules compilés
        const { DatabaseService } = await import('../out/extension/services/db/DatabaseService.js');
        const { TestData } = await import('../out/xtest/fixtures/TestData.js');
        
        // 5. Reset du singleton (au cas où)
        if (DatabaseService.reset) {
            await DatabaseService.reset();
        }
        
        // 6. Créer un contexte VSCode minimal
        const globalStorageDir = path.dirname(devDbPath);
        
        // S'assurer que le dossier existe
        if (!fs.existsSync(globalStorageDir)) {
            fs.mkdirSync(globalStorageDir, { recursive: true });
        }
        
        const fakeContext = {
            extensionPath: projectRoot,
            globalStorageUri: {
                fsPath: globalStorageDir
            },
            extensionMode: 2 // Development mode
        };
        
        // 7. Initialiser la base de données
        console.log('📋 Initialisation de la nouvelle base...');
        const dbService = DatabaseService.getInstance(fakeContext, false);
        await dbService.initialize();
        
        // 8. Peupler avec les données de test
        console.log('📊 Population avec les données de test...');
        await TestData.populateTestDatabase(dbService);
        
        // 9. Vérifier les données insérées
        const counts = await Promise.all([
            dbService.all('SELECT COUNT(*) as count FROM entries'),
            dbService.all('SELECT COUNT(*) as count FROM oeuvres'),  
            dbService.all('SELECT COUNT(*) as count FROM examples')
        ]);
        
        console.log('✅ Base de données reconstruite avec succès !');
        console.log(`   • Entrées    : ${counts[0][0].count}`);
        console.log(`   • Œuvres     : ${counts[1][0].count}`);
        console.log(`   • Exemples   : ${counts[2][0].count}`);
        
        // 10. Fermer proprement
        await dbService.close();
        
        console.log('🎯 Pour voir les changements dans VSCode :');
        console.log('   • Soit relancez la commande "Dico: Ouvre"');
        console.log('   • Soit exécutez "Dico: Recharger Base de Données"');
        
    } catch (error) {
        console.error('❌ Erreur lors de la reconstruction :', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();
