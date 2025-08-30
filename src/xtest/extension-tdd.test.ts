import * as assert from 'assert';
import * as vscode from 'vscode';
import { PanelManager } from '../extension/services/panels/PanelManager';
import { allPanelsReady, sleep, tabGroupsCount, closeAllTabs, setZoomLevel } from './test_utils';

suite('Extension Main Functionality', () => {
    
	test('La commande "dico-cnario.ouvre" ouvre 3 panneaux possédant les bons titres', async () => {
		// Nettoyer tous les onglets existants
		await closeAllTabs();
		await sleep(0.2);
		
		// TODO: Configurer le zoom
		// await setZoomLevel(2);
		// await sleep(0.2);
		
		// État précédent
		const initTabCount: number = tabGroupsCount();

		// --- Test ---
		await vscode.commands.executeCommand('dico-cnario.ouvre');
		await allPanelsReady(); // Attendre que tous les panneaux soient prêts

		//-TEST Trois nouveaux onglets créés
		const newTabCount: number = tabGroupsCount();
		assert.strictEqual(newTabCount, initTabCount + 3, 'Trois onglets auraient dû être créés');

		//-TEST Trois panneaux sont créés
		const panels = PanelManager.getActivePanels();
		assert.strictEqual(panels.length, 3, 'Should open exactly 3 panels');

		//--TEST Panneau "Dictionnaire", "Oeuvres" et "Exemples"
		assert.strictEqual(panels[0].title, 'Dictionnaire', 'First panel should be "Dictionnaire"');
		assert.strictEqual(panels[1].title, 'Oeuvres', 'Second panel should be "Oeuvres"');
		assert.strictEqual(panels[2].title, 'Exemples', 'Third panel should be "Exemples"');
	});
});
