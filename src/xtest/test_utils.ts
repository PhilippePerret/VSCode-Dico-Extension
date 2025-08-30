/**
 * Utilitaires communs pour tous les tests de l'extension dico-cnario
 * Ces fonctions peuvent être réutilisées dans d'autres extensions
 */

import * as vscode from 'vscode';
import { DatabaseService } from '../extension/services/db/DatabaseService';
import { TestData } from './fixtures/TestData';
import { EntryDb } from '../extension/db/EntryDb';

/**
 * Fait une pause dans l'exécution pendant un nombre donné de secondes
 * @param secondes Nombre de secondes à attendre
 */
export async function sleep(secondes: number): Promise<void> {
  return new Promise(ok => setTimeout(ok, secondes * 1000));
}

/**
 * Compte le nombre total d'onglets ouverts dans VSCode
 */
export function tabGroupsCount(): number {
  return vscode.window.tabGroups.all.reduce((total: number, group: any) => total + group.tabs.length, 0);
}

/**
 * Ferme tous les onglets ouverts dans VSCode
 */
export async function closeAllTabs(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

/**
 * Définit le niveau de zoom de VSCode
 */
export async function setZoomLevel(level: number): Promise<void> {
  // Utiliser la configuration directe
  await vscode.workspace.getConfiguration().update('window.zoomLevel', level, vscode.ConfigurationTarget.Global);
}

/**
 * S'assure que la base de données de test contient les fixtures
 * ATTENTION: Cette fonction ne doit être utilisée qu'en cas d'absolue nécessité
 * Elle ne peuple la base QUE si elle est complètement vide
 */
export async function ensureDatabaseFixtures(): Promise<void> {
  const context = { 
    extensionPath: __dirname + '/../..', 
    extensionMode: vscode.ExtensionMode.Test,
    globalStorageUri: { fsPath: '/tmp/vscode-test' }
  } as vscode.ExtensionContext;
  
  const dbService = DatabaseService.getInstance(context, true);
  await dbService.initialize();
  
  // Check if database has entries, populate ONLY if completely empty
  const entryDb = new EntryDb(dbService);
  const existingEntries = await entryDb.getAll();
  if (existingEntries.length === 0) {
    console.log('Base de données vide détectée - population avec fixtures...');
    console.log('ATTENTION: Cette action ajoute des données de test');
    await TestData.populateTestDatabase(dbService);
  } else {
    console.log(`Base de données existante avec ${existingEntries.length} entrées - aucune modification`);
  }
}

/**
 * Classe pour surveiller le nombre de panneaux prêts
 */
class ReadyWatcher {
  public counter = 0;
  private messageDisposables: vscode.Disposable[] = [];
  
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
    panels.forEach((panel: any) => {
      const disposable = panel.webview.onDidReceiveMessage((message: any) => {
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
  async isReady(timeoutMs: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      
      const checkInterval = setInterval(() => {
        if (this.counter >= 3) {
          clearInterval(checkInterval);
          console.log('Tous les panneaux sont prêts!');
          resolve();
        } else if (Date.now() > deadline) {
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
export async function allPanelsReady(andWait: number | null = null, timeoutMs: number = 10000): Promise<void> {
  readyWatcher.reset();
  readyWatcher.initializeListener();
  await readyWatcher.isReady(timeoutMs);
  
  // Si andWait est spécifié, attendre le temps demandé pour pouvoir observer
  if (andWait !== null) {
    await sleep(andWait);
  }
}
