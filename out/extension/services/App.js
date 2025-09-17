"use strict";
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
exports.App = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const PanelManager_1 = require("./panels/PanelManager");
const DatabaseService_1 = require("./db/DatabaseService");
const Entry_1 = require("../models/Entry");
const Oeuvre_1 = require("../models/Oeuvre");
const Exemple_1 = require("../models/Exemple");
class App {
    static _context;
    /**
     * Point d'entrée de l'extension activé par la commande dico-cnario.ouvre'
     *
     * @param context Le contexte de l'extension
     */
    static async run(context) {
        this._context = context;
        PanelManager_1.PanelManager.openPanels(context);
        await this.loadAndCacheAllData();
        await PanelManager_1.PanelManager.openRpcChanels();
        await PanelManager_1.PanelManager.populatePanels();
        await PanelManager_1.PanelManager.observePanels();
        PanelManager_1.PanelManager.activatePanelEntries();
    }
    static get configFilePath() {
        return this._conffilepath || (this._conffilepath = path.join(this._context.extensionPath, 'config/config.json'));
    }
    static _conffilepath;
    static get supportFolder() {
        if (undefined === this._supportfolder) {
            let dos;
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
        }
        ;
        return this._supportfolder;
    }
    static _supportfolder;
    /**
     * La mise en place de fonctions simples pour des boucles d'attente
     * incrémentiel.
     * Ça fonctionne à l'aide d'un compteur (readyCounter) qui doit at-
     * teindre une valeur après laquelle on résoud la promesse pour
     * passer à la suite.
     */
    static readyCounter = 0;
    static okWhenReady;
    static resetReadyCounter(value) { this.readyCounter = value; }
    static async waitUntilReady(readyInitCounter) {
        return new Promise((ok) => {
            if (readyInitCounter) {
                this.readyCounter = readyInitCounter;
            }
            // console.info("readyCounter mis à %i", this.readyCounter);
            this.okWhenReady = ok;
        });
    }
    static incAndCheckReadyCounter() {
        --this.readyCounter;
        if (this.readyCounter <= 0) {
            this.okWhenReady();
        }
    }
    /**
     * @async
     * Méthode principale qui récupère les données de la base de données
     * et les met en cache.
     */
    static async loadAndCacheAllData() {
        const { EntryDb } = require('../db/EntryDb');
        const { OeuvreDb } = require('../db/OeuvreDb');
        const { ExempleDb } = require('../db/ExempleDb');
        Promise.all([
            this.loadAndCacheDataFor(EntryDb, Entry_1.Entry),
            this.loadAndCacheDataFor(OeuvreDb, Oeuvre_1.Oeuvre),
            this.loadAndCacheDataFor(ExempleDb, Exemple_1.Exemple)
        ]);
        await this.waitUntilReady(3);
        console.info("[EXTENSION] Fin de mise en cache de toutes les données");
        this.resetReadyCounter(3);
        Promise.all([
            Entry_1.Entry.finalizeCachedItems.call(Entry_1.Entry),
            Oeuvre_1.Oeuvre.finalizeCachedItems.call(Oeuvre_1.Oeuvre),
            Exemple_1.Exemple.finalizeCachedItems.call(Exemple_1.Exemple)
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
    static async loadAndCacheDataFor(Db, classI) {
        const context = this._context;
        const isTest = process.env.NODE_ENV === 'test' || context.extensionMode === vscode.ExtensionMode.Test;
        const dbService = DatabaseService_1.DatabaseService.getInstance(context, isTest);
        dbService.initialize();
        const db = new Db(dbService);
        const rawData = await db.getAll();
        console.log("Nombre de données %s persistante relevées : %i", classI.name, rawData.length);
        const sortedItems = rawData.sort(classI.sortFonction.bind(classI));
        classI.cacheAllData.call(classI, sortedItems);
        this.incAndCheckReadyCounter(); // asynchronicité
        return true;
    }
    static getTMDBSecrets() {
        const secretsPath = path.join(process.env.HOME, '.secret', 'TMDB.json');
        return JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    }
}
exports.App = App;
//# sourceMappingURL=App.js.map