"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entry = void 0;
const UniversalCacheManager_1 = require("../../bothside/UniversalCacheManager");
const App_1 = require("../services/App");
const StringUtils_1 = require("../../bothside/StringUtils");
const db_manager_1 = require("../db/db_manager");
const Rpc_1 = require("../services/Rpc");
// Classe wrapper autour d'EntryType
class Entry {
    data;
    static panelId = 'entries';
    static cacheDebug() { return this.cache; }
    static _cacheManagerInstance = new UniversalCacheManager_1.UniversalCacheManager();
    static get cache() { return this._cacheManagerInstance; }
    ;
    static get(entry_id) { return this.cache.get(entry_id); }
    static sortFonction(a, b) {
        return a.entree.localeCompare(b.entree, 'fr', {
            sensitivity: 'base',
            numeric: true,
            caseFirst: 'lower'
        });
    }
    // Constructor and data access
    constructor(data) {
        this.data = data;
    }
    // Getters pour accès direct aux propriétés courantes
    get id() { return this.data.id; }
    get entree() { return this.data.dbData.entree; }
    get genre() { return this.data.dbData.genre; }
    get categorie_id() { return this.data.dbData.categorie_id; }
    get definition() { return this.data.dbData.definition; }
    // Méthodes statiques héritées
    static genre(id) {
        const GENRES = {
            m: "masculin",
            f: "féminin",
            n: "neutre"
        };
        return GENRES[id] || "inconnu";
    }
    static getDataSerialized() {
        return this.cache.getDataSerialized();
    }
    static completeItemForClientAfterSave(item) {
        // Logique de complétion après sauvegarde
        return item;
    }
    /**
     * Sauvegarde de l'entrée
     */
    static async saveItem(params) {
        const dbManager = db_manager_1.DBManager.getInstance(App_1.App._context);
        params = await dbManager.saveItemIn('entrees', params.item, params, this);
        console.log("Params quand on revient dans Entry", params);
        // On retourne le résultat au panneau
        Rpc_1.CanalEntry.afterSaveItem(params);
    }
    /**
     * Méthode pour mettre simplement les données en cache sans aucun
     * traitement (parce que pour les traiter, il faut impérativement
     * que toutes les données sont en cache).
     */
    static cacheAllData(items) {
        this.cache.inject(items, this.prepareItemForCache.bind(this));
    }
    /**
     * Méthode de préparation de la donnée pour le cache. Cette méthode
     * ne procède qu'aux préparations qui ne font pas appel aux autres
     * données (voir la méthode finalizeCachedData pour ça).
     */
    static prepareItemForCache(item) {
        const entreeNormalized = StringUtils_1.StringNormalizer.toLower(item.entree);
        const entreeRationalized = StringUtils_1.StringNormalizer.rationalize(item.entree);
        const cachedData = {
            itemType: 'entry',
            entree_min: entreeNormalized,
            entree_min_ra: entreeRationalized,
            genre_formated: this.genre(item.genre),
            definition_formated: item.definition
        };
        const domState = {
            display: 'block',
            selected: false
        };
        const entryType = {
            id: item.id, // ID at root level for easy access
            dbData: item,
            cachedData: cachedData,
            domState: domState
        };
        return entryType;
    }
    static async finalizeCachedItems() {
        await this.cache.traverse(this.finalizeCachedItem.bind(this));
        App_1.App.incAndCheckReadyCounter();
    }
    static finalizeCachedItem(item) {
        // Pour trouver la catégorie humaine
        let cat;
        if (item.dbData.categorie_id) {
            const categoryEntry = this.cache.get(item.dbData.categorie_id);
            cat = categoryEntry?.cachedData.entree_min;
        }
        // Mettre à jour les données cachées
        item.cachedData.categorie_formated = cat || '';
        return item;
    }
    /**
     * Generate unique ID from entry text (lowercase, no accents, only letters/numbers)
     *
     * TODO:
     *      1. Ne pas supprimer les diacritics, les remplacer par leur équivalent ("ç" -> "c")
     *      2. Demander confirmation pour l'identifiant, avec possibilité de le changer
     *          (et donc vérification de l'unicité avant enregistrement)
     */
    static generateId(entree) {
        return entree
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 50); // Limit length
    }
    /**
     * Convert to database row
     */
    toRow() {
        return {
            id: this.id,
            entree: this.entree,
            genre: this.genre,
            categorie_id: this.categorie_id || null,
            definition: this.definition
        };
    }
    /**
     * Create from database row
     */
    static fromRow(row) {
        try {
            // Il faut créer un EntryType complet depuis les données DB
            const entryType = this.prepareItemForCache(row);
            return new Entry(entryType);
        }
        catch (erreur) {
            console.error("# ERREUR avec L'entrée : %s", erreur, row);
        }
    }
    /**
     * Post-processing after DOM elements are displayed
     * Called after all entries are rendered in the panel
     */
    static afterDisplayElements() {
        // No special post-processing needed for entries panel
        // Elements are displayed in simple list format
    }
}
exports.Entry = Entry;
//# sourceMappingURL=Entry.js.map