import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { PanelManager } from './panels/PanelManager';
import { DatabaseService } from './db/DatabaseService';
import { Entry } from '../models/Entry';
import { Oeuvre } from '../models/Oeuvre';
import { Exemple } from '../models/Exemple';
import { AnyElementClass } from '../models/AnyElement';



export class App {
  public static _context: vscode.ExtensionContext;

  /**
   * Point d'entrée de l'extension activé par la commande dico-cnario.ouvre'
   * 
   * @param context Le contexte de l'extension
   */
  public static async run(context: vscode.ExtensionContext){
    this._context = context; 
    PanelManager.openPanels(context);
    await this.loadAndCacheAllData();
    await PanelManager.openRpcChanels();
    await PanelManager.populatePanels();
    await PanelManager.observePanels();
    PanelManager.startPanelEntries();
  }

  public static activatePanel(panelName: 'entries' | 'oeuvres' | 'exemples') {
    const panelIndex = ((name) => { switch (name) {
        case 'entries': return 0;
        case 'oeuvres': return 1;
        case 'exemples': return 2;
    }})(panelName);
    PanelManager.revealAndActivatePanelByIndex(panelIndex);
  }
  

  private static get configFilePath(){
    return this._conffilepath || (this._conffilepath = path.join(this._context.extensionPath, 'config/config.json'));
  }
  private static _conffilepath?: string;

  public static get supportFolder() {
    if (undefined === this._supportfolder) {
      let dos: string | undefined;
      if (fs.existsSync(this.configFilePath)) {
        const config = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
        // console.log("Configuration", config);
        if (config.support_dir) {
          dos = path.join(os.homedir(), config.support_dir);
        }
      }
      dos || (dos = this._context.globalStorageUri?.fsPath || this._context.extensionPath);
      // console.log("Dossier support final : %s", dos);
      this._supportfolder = dos;
    }; return this._supportfolder;
  }
  private static _supportfolder?: string;
 
  /**
   * La mise en place de fonctions simples pour des boucles d'attente
   * incrémentiel.
   * Ça fonctionne à l'aide d'un compteur (readyCounter) qui doit at-
   * teindre une valeur après laquelle on résoud la promesse pour 
   * passer à la suite.
   */
	public static readyCounter = 0 ;
	public static okWhenReady: Function;

  public static resetReadyCounter(value: number) { this.readyCounter = value ;}
	public static async waitUntilReady(readyInitCounter?: number) {
		return new Promise<void>((ok) => {
      if ( readyInitCounter ) {
			  this.readyCounter = readyInitCounter;
      }
      // console.info("readyCounter mis à %i", this.readyCounter);
			this.okWhenReady = ok;
		});
	}
	public static incAndCheckReadyCounter(){
		-- this.readyCounter;
    if (this.readyCounter <= 0) { this.okWhenReady(); }
	}
	
  /**
   * @async
   * Méthode principale qui récupère les données de la base de données
   * et les met en cache.
   */
  private static async loadAndCacheAllData() {
    const { EntryDb }   = require('../db/EntryDb');
    const { OeuvreDb }  = require('../db/OeuvreDb');
    const { ExempleDb } = require('../db/ExempleDb');
    Promise.all([
      this.loadAndCacheDataFor(EntryDb, Entry),
      this.loadAndCacheDataFor(OeuvreDb, Oeuvre),
      this.loadAndCacheDataFor(ExempleDb, Exemple)
    ]);
    await this.waitUntilReady(3);
		console.info("[EXTENSION] Fin de mise en cache de toutes les données");

    this.resetReadyCounter(3);
    Promise.all([
      Entry.finalizeCachedItems.call(Entry),
      Oeuvre.finalizeCachedItems.call(Oeuvre),
      Exemple.finalizeCachedItems.call(Exemple)
    ]);
    await this.waitUntilReady();
    console.info("[EXTENSION] Fin de préparation des données caches.");

    /*
    // Pour voir les données ici
    console.info("Données Entrée formatées", Entry.cacheDebug().getAll());
    console.info("Données Oeuvres formatées", Oeuvre.cacheDebug().getAll());
    console.info("Données Exemples formatées", Exemple.cacheDebug().getAll());
    //*/
  }

  private static async loadAndCacheDataFor(
    Db:any,
    classI: AnyElementClass 
  ): Promise<boolean> {
    const context = this._context ;
    const isTest = process.env.NODE_ENV === 'test' || context.extensionMode === vscode.ExtensionMode.Test;
    const dbService = DatabaseService.getInstance(context, isTest);
    dbService.initialize();
    const db = new Db(dbService);
    const rawData = await db.getAll();
    console.log("Nombre de données %s persistante relevées : %i", classI.name, rawData.length);
    const sortedItems = rawData.sort(classI.sortFonction.bind(classI)) ; 
    (classI as AnyElementClass).cacheAllData.call(classI, sortedItems);
    this.incAndCheckReadyCounter(); // asynchronicité
    return true ;
  }

  public static getTMDBSecrets(){
    const secretsPath = path.join(process.env.HOME as string, '.secret', 'TMDB.json');
    return JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  }
}