"use strict";
/**
 * Utilitaires communs pour tous les tests de l'extension dico-cnario
 * Ces fonctions peuvent être réutilisées dans d'autres extensions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.tabGroupsCount = tabGroupsCount;
exports.closeAllTabs = closeAllTabs;
exports.setZoomLevel = setZoomLevel;
exports.ensureDatabaseFixtures = ensureDatabaseFixtures;
exports.allPanelsReady = allPanelsReady;
const vscode = __importStar(require("vscode"));
const DatabaseService_1 = require("../extension/services/db/DatabaseService");
const TestData_1 = require("./fixtures/TestData");
const EntryDb_1 = require("../extension/db/EntryDb");
/**
 * Fait une pause dans l'exécution pendant un nombre donné de secondes
 * @param secondes Nombre de secondes à attendre
 */
async function sleep(secondes) {
    return new Promise(ok => setTimeout(ok, secondes * 1000));
}
/**
 * Compte le nombre total d'onglets ouverts dans VSCode
 */
function tabGroupsCount() {
    return vscode.window.tabGroups.all.reduce((total, group) => total + group.tabs.length, 0);
}
/**
 * Ferme tous les onglets ouverts dans VSCode
 */
async function closeAllTabs() {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}
/**
 * Définit le niveau de zoom de VSCode
 */
async function setZoomLevel(level) {
    // Utiliser la configuration directe
    await vscode.workspace.getConfiguration().update('window.zoomLevel', level, vscode.ConfigurationTarget.Global);
}
/**
 * S'assure que la base de données de test contient les fixtures
 * ATTENTION: Cette fonction ne doit être utilisée qu'en cas d'absolue nécessité
 * Elle ne peuple la base QUE si elle est complètement vide
 */
async function ensureDatabaseFixtures() {
    const context = {
        extensionPath: __dirname + '/../..',
        extensionMode: vscode.ExtensionMode.Test,
        globalStorageUri: { fsPath: '/tmp/vscode-test' }
    };
    const dbService = DatabaseService_1.DatabaseService.getInstance(context, true);
    await dbService.initialize();
    // Check if database has entries, populate ONLY if completely empty
    const entryDb = new EntryDb_1.EntryDb(dbService);
    const existingEntries = await entryDb.getAll();
    if (existingEntries.length === 0) {
        console.log('Base de données vide détectée - population avec fixtures...');
        console.log('ATTENTION: Cette action ajoute des données de test');
        await TestData_1.TestData.populateTestDatabase(dbService);
    }
    else {
        console.log(`Base de données existante avec ${existingEntries.length} entrées - aucune modification`);
    }
}
/**
 * Classe pour surveiller le nombre de panneaux prêts
 */
class ReadyWatcher {
    counter = 0;
    messageDisposables = [];
    /**
     * Initialise l'écoute des messages panel-ready sur tous les panels actifs
     */
    initializeListener() {
        // Nettoie les anciens listeners s'ils existent
        this.messageDisposables.forEach(disposable => disposable.dispose());
        this.messageDisposables = [];
        // Importer PanelManager
        const { PanelManager } = require('../extension/services/PanelManager');
        const panels = PanelManager.getActivePanels();
        // Écoute les messages depuis chaque webview
        panels.forEach((panel) => {
            const disposable = panel.webview.onDidReceiveMessage((message) => {
                if (message.command === 'panel-ready') {
                    this.counter++;
                    console.log(`Panneau prêt: ${this.counter}/3`);
                }
            });
            this.messageDisposables.push(disposable);
        });
    }
    /**
     * Reset du compteur
     */
    reset() {
        this.counter = 0;
    }
    /**
     * Attend que tous les panneaux soient prêts (counter === 3)
     * @param timeoutMs Timeout en millisecondes (défaut 10000)
     */
    async isReady(timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            const deadline = Date.now() + timeoutMs;
            const checkInterval = setInterval(() => {
                if (this.counter >= 3) {
                    clearInterval(checkInterval);
                    console.log('Tous les panneaux sont prêts!');
                    resolve();
                }
                else if (Date.now() > deadline) {
                    clearInterval(checkInterval);
                    reject(new Error(`Timeout: seulement ${this.counter}/3 panneaux prêts après ${timeoutMs}ms`));
                }
            }, 100);
        });
    }
    /**
     * Nettoie les ressources
     */
    dispose() {
        this.messageDisposables.forEach(disposable => disposable.dispose());
        this.messageDisposables = [];
    }
}
// Instance globale du watcher
const readyWatcher = new ReadyWatcher();
/**
 * Attend que tous les panneaux soient prêts
 * @param andWait Temps d'attente supplémentaire en secondes après que tous les panneaux soient prêts (pour déboguer)
 * @param timeoutMs Timeout en millisecondes (défaut 10000)
 */
async function allPanelsReady(andWait = null, timeoutMs = 10000) {
    readyWatcher.reset();
    readyWatcher.initializeListener();
    await readyWatcher.isReady(timeoutMs);
    // Si andWait est spécifié, attendre le temps demandé pour pouvoir observer
    if (andWait !== null) {
        await sleep(andWait);
    }
}
//# sourceMappingURL=test_utils.js.map