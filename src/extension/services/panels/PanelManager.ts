import * as vscode from 'vscode';
import { PanelWrapper, WebviewPanelWrapper } from '../InterComs-tests';
import { PanelClass } from './panelClass';
import { PanelClassEntry } from './panelClassEntry'; 
import { PanelClassOeuvre } from './panelClassOeuvre';
import { PanelClassExemple } from './panelClassExemple';
import { App } from '../App';
import { CanalEntry, CanalOeuvre, CanalExemple } from '../Rpc';

export class PanelManager {
	private static _panels: PanelClass[] = [];
	private static activePanels: vscode.WebviewPanel[] = [];

	/**
	 * Appelé à l'ouverture normale de l'application.
	 * @param context Les contexte de l'extension
	 */
	static async openPanels(c: vscode.ExtensionContext): Promise<void> {
		// Fermer les panneaux existants d'abord
		this.closeAllPanels();
		
		// On définit les options communes pour la construction des
		// panneaux
		PanelClass.defineCommonPanelOptions(c) ; 
		
		this._panels.push(new PanelClassEntry(c, 'entries', 'Entrées', 2 ));
		this._panels.push(new PanelClassOeuvre(c, 'oeuvres', 'Œuvres', 1));
		this._panels.push(new PanelClassExemple(c, 'exemples', 'Exemples', 3));
		
		console.log("Fin de l'ouverture des panneaux.");
	}
	/**
	 * Appelée après la fabrication des panneaux pour ouvrir les canaux Rpc
	 */
	public static async openRpcChanels(): Promise<void> {
		App.resetReadyCounter(3);
		CanalEntry.initialize(this._panels[0].panel);
		CanalOeuvre.initialize(this._panels[1].panel);
		CanalExemple.initialize(this._panels[2].panel);
		App.waitUntilReady();
		console.log("[EXTENSION] Fin d'initialisaton des canaux RPC.");
	}
	/**
	 * Appelée après la mise en cache des données pour peupler les panneaux.
	 */
	public static async populatePanels(): Promise<void> {
		App.resetReadyCounter(3);
		this._panels.forEach((panel: PanelClass) => { 
			console.log("Panneau à peupler : %s", panel.title); // OK ici, c'est le bon panneau
			panel.populate(); 
		});
		App.waitUntilReady();
		console.info("[EXTENSION] Fin de peuplement des panneaux.");
	}

	private static _currentPanel: PanelClass;
	private static get currentPanel(): PanelClass { return this._currentPanel; }
	private static set currentPanel(p: PanelClass) { this._currentPanel = p; }

	// On place des observeurs d'évènement pour savoir quand les
	// panneaux changent d'état (actif/inactif).
	// La méthode sert aussi à placer l'activité sur le premier panneau.
	static async observePanels(): Promise<void> {
		this._panels.forEach((panel: PanelClass) => {
			// On place un observateur pour savoir quel est le panneau actif
			panel.panel.onDidChangeViewState(e => {
				this.desactivatePanel(this.currentPanel);
				this.activatePanel(panel);
			});
		});
}
	static startPanelEntries() {
		const panel: PanelClass = this.revealAndActivatePanelByIndex(0);
		panel.rpc.notify('start');
	}

	static revealAndActivatePanelByIndex(panelIndex: 0 | 1 | 2): PanelClass {
		const panel = this._panels[panelIndex];
		panel.panel.reveal(); // forcer sa réactivation
		this.activatePanel(panel);
		return panel;
	}
	static activatePanel(panel: PanelClass) {
		// panel.webview.postMessage({ command: 'activate' });
		panel.rpc.notify('activate');
		this.currentPanel = panel;
	}
	static desactivatePanel(panel: PanelClass): void {
		// this.currentPanel.webview.postMessage({ command: 'desactivate' });
		panel.rpc.notify('desactivate');
	}
	// Retourne les trois panneaux (Dictionnaire, Oeuvres et Exemples)
	static getActivePanels(): vscode.WebviewPanel[] {
		return this.activePanels;
	}
	static addActivePanel(panel: vscode.WebviewPanel){
		this.activePanels.push(panel);
	}

	// Pour fermer les trois panneaux (je crois que c'est seulement
	// utile pour les tests)
	static closeAllPanels(): void {
		this.activePanels.forEach(panel => { panel.dispose(); });
		this.activePanels = [];
	}

	// Retourne le panneau par son titre
	static getPanel(title: string): PanelWrapper | null {
		// Trouve le vrai panneau par son titre
		const panel = this.activePanels.find(p => p.title === title);
		if (!panel) { return null; }
		return new WebviewPanelWrapper(panel);
	}
}
