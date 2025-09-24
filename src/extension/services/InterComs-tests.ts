import * as vscode from 'vscode';

// Interface pour wrapper un panneau webview
export interface PanelWrapper {
	getElement(selector: string): Promise<any>;
	getElements(selector: string): Promise<any[]>;
	getVisibleElements(selector: string): Promise<any[]>;
	typeInElement(selector: string, text: string): Promise<void>;
	clearAndTypeInElement(selector: string, text: string): Promise<void>;
	clearElement(selector: string): Promise<void>;
	getElementFromParent(parent: any, selector: string): Promise<any>;
	executeScript(script: string): Promise<any>;
}

// Wrapper réel pour un panneau webview avec système de messages
export class WebviewPanelWrapper implements PanelWrapper {
	constructor(private webviewPanel: vscode.WebviewPanel) { }

	async getElement(selector: string): Promise<any> {
		// Use original protocol for backward compatibility
		return new Promise((resolve) => {
			// Écouter la réponse
			const disposable = this.webviewPanel.webview.onDidReceiveMessage((message) => {
				if (message.command === 'domQueryResult' && message.selector === selector) {
					disposable.dispose();
					resolve(message.element);
				}
			});

			// Envoyer la requête
			this.webviewPanel.webview.postMessage({
				command: 'queryDOM',
				selector: selector
			});

			// Timeout au bout de 1 seconde
			setTimeout(() => {
				disposable.dispose();
				resolve(null);
			}, 1000);
		});
	}

	async getElements(selector: string): Promise<any[]> {
		return this.sendQuery('queryDOMAll', { selector });
	}

	async getVisibleElements(selector: string): Promise<any[]> {
		return this.sendQuery('queryDOMVisible', { selector });
	}

	async typeInElement(selector: string, text: string): Promise<void> {
		return this.sendQuery('typeInElement', { selector, text });
	}

	async clearAndTypeInElement(selector: string, text: string): Promise<void> {
		return this.sendQuery('clearAndTypeInElement', { selector, text });
	}

	async clearElement(selector: string): Promise<void> {
		return this.sendQuery('clearElement', { selector });
	}

	async getElementFromParent(parent: any, selector: string): Promise<any> {
		return this.sendQuery('getElementFromParent', { parentId: parent.id, selector });
	}

	async executeScript(script: string): Promise<any> {
		return this.sendQuery('executeScript', { script });
	}

	private async sendQuery(command: string, params: any): Promise<any> {
		return new Promise((resolve) => {
			// Écouter la réponse
			const disposable = this.webviewPanel.webview.onDidReceiveMessage((message) => {
				if (message.command === command + 'Result' &&
					JSON.stringify(message.params) === JSON.stringify(params)) {
					disposable.dispose();
					resolve(message.result);
				}
			});

			// Envoyer la requête
			this.webviewPanel.webview.postMessage({
				command,
				params
			});

			// Timeout au bout de 2 secondes
			setTimeout(() => {
				disposable.dispose();
				resolve(null);
			}, 2000);
		});
	}
}

