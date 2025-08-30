import * as assert from 'assert';
import * as vscode from 'vscode';
import { PanelManager } from '../extension/services/panels/PanelManager';
import { sleep, ensureDatabaseFixtures, allPanelsReady } from './test_utils';
import { DatabaseService } from '../extension/services/db/DatabaseService';
import { TestData } from './fixtures/TestData';

suite('Panneau Dictionnaire', () => {
    
    suiteSetup(async () => {
        // Ensure test database is populated before running tests
        await ensureDatabaseFixtures();
    });

    test('Le panneau Dictionnaire possède la structure HTML correcte', async () => {
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await sleep(0.5);

        //-CHECK: Le panneau Dictionnaire existe
        const dictionaryPanel = PanelManager.getPanel('Dictionnaire');
        assert.ok(dictionaryPanel, 'Le panneau Dictionnaire existe');

        //-CHECK: Header avec titre et search-bar
        const header = await dictionaryPanel.getElement('header');
        assert.ok(header, 'Le header existe');
        
        const title = await dictionaryPanel.getElement('header h2');
        assert.ok(title, 'Le titre existe dans le header');
        assert.strictEqual(title.textContent, 'Dictionnaire', 'Le titre est "Dictionnaire"');
        
        const searchBar = await dictionaryPanel.getElement('#search-bar');
        assert.ok(searchBar, 'La search-bar existe');
        
        const searchInput = await dictionaryPanel.getElement('#search-input');
        assert.ok(searchInput, 'L\'input de recherche existe');
        
        const tips = await dictionaryPanel.getElement('.tips');
        assert.ok(tips, 'Les tips existent');
        assert.ok(tips.textContent.includes('f: rechercher'), 'Les tips contiennent les raccourcis');

        //-CHECK: Main avec id="items"
        const itemsContainer = await dictionaryPanel.getElement('#items');
        assert.ok(itemsContainer, 'Le container #items existe');
        assert.strictEqual(itemsContainer.tagName.toLowerCase(), 'main', 'Le container items est un élément main');

        //-CHECK: Formulaire d\'\u00e9dition caché
        const editForm = await dictionaryPanel.getElement('#edit-form');
        assert.ok(editForm, 'Le formulaire d\'\u00e9dition existe');
        assert.strictEqual(editForm.tagName.toLowerCase(), 'form', 'L\'\u00e9lément edit-form est un formulaire');
        assert.ok(editForm.classList.includes('hidden'), 'Le formulaire d\'\u00e9dition est caché');

        //-CHECK: Footer avec console et outils
        const footer = await dictionaryPanel.getElement('footer');
        assert.ok(footer, 'Le footer existe');
        
        const console = await dictionaryPanel.getElement('#panel-console');
        assert.ok(console, 'La console existe');
        assert.strictEqual(console.tagName.toLowerCase(), 'input', 'La console est un input');
        
        const toolsContainer = await dictionaryPanel.getElement('#main-tools-container');
        assert.ok(toolsContainer, 'Le container d\'outils existe');
    });
    
    test('Le panneau Dictionnaire affiche au moins une entrée avec la structure attendue', async () => {
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await allPanelsReady(); // Attendre que tous les panneaux soient prêts
        
        const dictionaryPanel = PanelManager.getPanel('Dictionnaire');
        assert.ok(dictionaryPanel, 'Le panneau Dictionnaire existe');
        
        //-CHECK: Au moins une entrée existe
        const entry = await dictionaryPanel.getElement('div.entry');
        assert.ok(entry, 'Au moins une entrée div.entry existe');
        
        //-CHECK: Structure de l\'entrée - header
        const entryHeader = await dictionaryPanel.getElement('div.entry .entry-header');
        assert.ok(entryHeader, 'L\'entrée contient un .entry-header');
        
        //-CHECK: Éléments dans le header
        const entryEntree = await dictionaryPanel.getElement('div.entry .entry-entree');
        assert.ok(entryEntree, 'L\'entrée contient .entry-entree');
        
        const entryGenre = await dictionaryPanel.getElement('div.entry .entry-genre');
        assert.ok(entryGenre, 'L\'entrée contient .entry-genre');
        
        //-CHECK: Définition
        const entryDefinition = await dictionaryPanel.getElement('div.entry .entry-definition');
        assert.ok(entryDefinition, 'L\'entrée contient .entry-definition');
        
        //-CHECK: Footer caché avec boutons
        const entryFooter = await dictionaryPanel.getElement('div.entry .item-footer');
        assert.ok(entryFooter, 'L\'entrée contient .item-footer');
        assert.ok(entryFooter.classList.includes('hidden'), 'Le footer est caché par défaut');
        
        const btnEdit = await dictionaryPanel.getElement('div.entry .btn-edit');
        assert.ok(btnEdit, 'Le footer contient .btn-edit');
        
        const btnNewExemple = await dictionaryPanel.getElement('div.entry .btn-new-exemple');
        assert.ok(btnNewExemple, 'Le footer contient .btn-new-exemple');
        
        const btnRemove = await dictionaryPanel.getElement('div.entry .btn-remove');
        assert.ok(btnRemove, 'Le footer contient .btn-remove');
        
        const btnMove = await dictionaryPanel.getElement('div.entry .btn-move');
        assert.ok(btnMove, 'Le footer contient .btn-move');
    });
    
    test('Le panneau Dictionnaire affiche les valeurs correctes de la première entrée', async () => {
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await allPanelsReady(); // Attendre que tous les panneaux soient prêts
        
        const dictionaryPanel = PanelManager.getPanel('Dictionnaire');
        assert.ok(dictionaryPanel, 'Le panneau Dictionnaire existe');
        
        // Get first entry from test data for comparison
        const expectedEntry = TestData.getTestEntry('personnage');
        assert.ok(expectedEntry, 'L\'entrée de test "personnage" existe dans les fixtures');
        
        //-CHECK: L'entrée "personnage" est affichée
        const personnageEntry = await dictionaryPanel.getElement('div.entry[data-id="personnage"]');
        assert.ok(personnageEntry, 'L\'entrée "personnage" est affichée');
        
        //-CHECK: Titre de l'entrée
        const entryTitle = await dictionaryPanel.getElement('div.entry[data-id="personnage"] .entry-entree');
        assert.ok(entryTitle, 'Le titre de l\'entrée personnage existe');
        assert.strictEqual(entryTitle.textContent, expectedEntry.entree, `Le titre affiché est "${expectedEntry.entree}"`);
        
        //-CHECK: Genre de l'entrée
        const entryGenre = await dictionaryPanel.getElement('div.entry[data-id="personnage"] .entry-genre');
        assert.ok(entryGenre, 'Le genre de l\'entrée personnage existe');
        assert.strictEqual(entryGenre.textContent, 'n.m.', 'Le genre est transformé en "n.m."');
        
        //-CHECK: Définition de l'entrée
        const entryDefinition = await dictionaryPanel.getElement('div.entry[data-id="personnage"] .entry-definition');
        assert.ok(entryDefinition, 'La définition de l\'entrée personnage existe');
        assert.ok(entryDefinition.textContent.includes('Être fictif'), 'La définition contient le texte attendu');
        assert.ok(entryDefinition.textContent.includes('construction dramatique'), 'La définition est complète');
    });
    
});
