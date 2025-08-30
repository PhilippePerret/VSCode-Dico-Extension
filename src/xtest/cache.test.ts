import * as assert from 'assert';
import * as vscode from 'vscode';
import { PanelManager } from '../extension/services/panels/PanelManager';
import { sleep, ensureDatabaseFixtures, allPanelsReady } from './test_utils';

suite('Cache System', () => {
    
    suiteSetup(async () => {
        // Ensure test database is populated before running tests
        await ensureDatabaseFixtures();
    });

    test('Cache can be built and retrieved for entries', async () => {
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await allPanelsReady();
        
        const dictionaryPanel = PanelManager.getPanel('Dictionnaire');
        assert.ok(dictionaryPanel, 'Le panneau Dictionnaire existe');
        
        // D'abord compter les entrées réelles pour éviter la fragilité
        const allEntries = await dictionaryPanel.getElements('div.entry');
        const expectedCount = allEntries.length;
        assert.ok(expectedCount > 0, 'Des entrées doivent être présentes');
        
        // CHECK: Les entrées ont une méthode de mise en cache
        const hasBuildCacheMethod = await dictionaryPanel.executeScript('typeof Entry.buildCache === "function"');
        assert.strictEqual(hasBuildCacheMethod, true, 'Entry class should have buildCache method');
        
        // CHECK: Les nouvelles méthodes existent
        const hasGetMethod = await dictionaryPanel.executeScript('typeof Entry.get === "function"');
        assert.strictEqual(hasGetMethod, true, 'Entry class should have get method');
        
        const hasGetAllMethod = await dictionaryPanel.executeScript('typeof Entry.getAll === "function"');
        assert.strictEqual(hasGetAllMethod, true, 'Entry class should have getAll method');
        
        // CHECK: Le cache utilise le nouveau système (CacheManager)
        const hasCacheManager = await dictionaryPanel.executeScript('Entry._cacheManagerInstance !== undefined');
        assert.strictEqual(hasCacheManager, true, 'Entry should have CacheManager instance');
        
        // CHECK: Le cache est construit (il devrait déjà l'être auto)
        const isCacheBuilt = await dictionaryPanel.executeScript('Entry.isCacheBuilt');
        assert.strictEqual(isCacheBuilt, true, 'Cache should be built automatically');
        
        // CHECK: La taille du cache correspond
        const cacheSize = await dictionaryPanel.executeScript('Entry.cacheSize');
        assert.strictEqual(cacheSize, expectedCount, `Cache should contain ${expectedCount} prepared entries`);
        
        // CHECK: Structure des données mises en cache (nouveau format)
        const firstEntry = await dictionaryPanel.executeScript(`
            const entries = Entry.getAll();
            entries.length > 0 ? {
                hasId: typeof entries[0].id === 'string',
                hasEntree: typeof entries[0].entree === 'string',
                hasEntreeMin: typeof entries[0].entree_min === 'string',
                hasEntreeMinRa: typeof entries[0].entree_min_ra === 'string'
            } : null
        `);
        
        assert.ok(firstEntry, 'Should have at least one cached entry');
        assert.strictEqual(firstEntry.hasId, true, 'Cached entry should have id');
        assert.strictEqual(firstEntry.hasEntree, true, 'Cached entry should have entree');
        assert.strictEqual(firstEntry.hasEntreeMin, true, 'Cached entry should have entree_min');
        assert.strictEqual(firstEntry.hasEntreeMinRa, true, 'Cached entry should have entree_min_ra');
        
        // CHECK: Méthode get() fonctionne
        const getMethodWorks = await dictionaryPanel.executeScript(`
            const allEntries = Entry.getAll();
            if (allEntries.length > 0) {
                const firstId = allEntries[0].id;
                const retrieved = Entry.get(firstId);
                retrieved !== null && retrieved.id === firstId;
            } else { false; }
        `);
        assert.strictEqual(getMethodWorks, true, 'get() method should retrieve entries by ID');
    });
    
    test('Cache persists between panel reloads', async () => {
        // This test will verify localStorage persistence
        // Implementation to follow once cache.js is ready
        assert.ok(true, 'Test placeholder - à implémenter avec cache.js');
    });
    
    test('Cache can be cleared', async () => {
        // Test cache clearing functionality
        assert.ok(true, 'Test placeholder - à implémenter avec cache.js');
    });
    
});
