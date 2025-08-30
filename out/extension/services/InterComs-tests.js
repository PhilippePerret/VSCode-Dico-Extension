"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebviewPanelWrapper = void 0;
// Wrapper réel pour un panneau webview avec système de messages
class WebviewPanelWrapper {
    webviewPanel;
    constructor(webviewPanel) {
        this.webviewPanel = webviewPanel;
    }
    async getElement(selector) {
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
    async getElements(selector) {
        return this.sendQuery('queryDOMAll', { selector });
    }
    async getVisibleElements(selector) {
        return this.sendQuery('queryDOMVisible', { selector });
    }
    async typeInElement(selector, text) {
        return this.sendQuery('typeInElement', { selector, text });
    }
    async clearAndTypeInElement(selector, text) {
        return this.sendQuery('clearAndTypeInElement', { selector, text });
    }
    async clearElement(selector) {
        return this.sendQuery('clearElement', { selector });
    }
    async getElementFromParent(parent, selector) {
        return this.sendQuery('getElementFromParent', { parentId: parent.id, selector });
    }
    async executeScript(script) {
        return this.sendQuery('executeScript', { script });
    }
    async sendQuery(command, params) {
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
exports.WebviewPanelWrapper = WebviewPanelWrapper;
//# sourceMappingURL=InterComs-tests.js.map