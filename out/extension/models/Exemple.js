"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exemple = void 0;
const StringUtils_1 = require("../../bothside/StringUtils");
const UniversalCacheManager_1 = require("../../bothside/UniversalCacheManager");
const db_manager_1 = require("../db/db_manager");
const App_1 = require("../services/App");
const Rpc_1 = require("../services/Rpc");
const Entry_1 = require("./Entry");
const Oeuvre_1 = require("./Oeuvre");
// Classe wrapper autour d'ExempleType
class Exemple {
    data;
    static panelId = 'exemples';
    static cacheDebug() { return this.cache; } // Pour les tests
    static _cacheManagerInstance = new UniversalCacheManager_1.UniversalCacheManager();
    static get cache() { return this._cacheManagerInstance; }
    ;
    // Constructor and data access
    constructor(data) {
        this.data = data;
    }
    // Getters pour accès direct aux propriétés courantes
    get id() { return this.data.id; }
    get oeuvre_id() { return this.data.dbData.oeuvre_id; }
    get indice() { return this.data.dbData.indice; }
    get entry_id() { return this.data.dbData.entry_id; }
    get content() { return this.data.dbData.content; }
    get notes() { return this.data.dbData.notes; }
    // Méthodes statiques héritées
    static getDataSerialized() {
        return this.cache.getDataSerialized();
    }
    static completeItemForClientAfterSave(item) {
        // Logique de complétion après sauvegarde
        return item;
    }
    static sortFonction(a, b) {
        // First sort by oeuvre ID (oeuvre_id)
        const oeuvreComparison = a.oeuvre_id.localeCompare(b.oeuvre_id);
        if (oeuvreComparison !== 0) {
            return oeuvreComparison;
        }
        return a.indice - b.indice;
    }
    /**
     * @api
     *
     * Sauvegarde de l'exemple
     */
    static async saveExemple(params) {
        const dbManager = db_manager_1.DBManager.getInstance(App_1.App._context);
        params = await dbManager.saveItemIn('exemples', params.item, params, this);
        Rpc_1.CanalExemple.afterSaveItem(params);
    }
    static cacheAllData(items) {
        this.cache.inject(items, this.prepareItemForCache.bind(this));
    }
    static prepareItemForCache(item) {
        return {
            id: `${item.oeuvre_id}-${item.indice}`, // ID composite at root level
            dbData: item,
            cachedData: {
                itemType: 'exemple',
                content_formated: '',
                content_min: '',
                content_min_ra: '',
                oeuvre_titre: '',
                entree_formated: '',
                titresLookUp: [],
                entry4filter: ''
            },
            domState: {
                selected: false,
                display: 'block'
            }
        };
    }
    static async finalizeCachedItems() {
        await this.cache.traverse(this.finalizeCachedItem.bind(this));
        App_1.App.incAndCheckReadyCounter();
    }
    static finalizeCachedItem(item) {
        const entry = Entry_1.Entry.get(item.dbData.entry_id);
        const entree = entry.cachedData.entree_min;
        const oeuvre = Oeuvre_1.Oeuvre.get(item.dbData.oeuvre_id);
        const titre_oeuvre = oeuvre.dbData.titre_affiche;
        // On remplace 'TITRE' dans le texte de l'exemple
        let content_formated;
        if (item.dbData.content.match(/TITRE/)) {
            content_formated = item.dbData.content.replace(/TITRE/g, titre_oeuvre);
        }
        else {
            content_formated = `dans ${titre_oeuvre}, ${item.dbData.content}`;
        }
        item.cachedData.oeuvre_titre = titre_oeuvre;
        item.cachedData.entree_formated = entree;
        item.cachedData.content_formated = content_formated;
        item.cachedData.content_min = StringUtils_1.StringNormalizer.toLower(content_formated);
        item.cachedData.content_min_ra = StringUtils_1.StringNormalizer.rationalize(content_formated);
        item.cachedData.titresLookUp = oeuvre.cachedData.titresLookUp;
        item.cachedData.entry4filter = entry.cachedData.entree_min;
        return item;
    }
    /**
     * Convert to database row
     */
    toRow() {
        return {
            id: this.id, // Include computed id for webview
            oeuvre_id: this.oeuvre_id,
            indice: this.indice,
            entry_id: this.entry_id,
            content: this.content,
            notes: this.notes || null
        };
    }
    /**
     * Create from database row
     */
    static fromRow(row) {
        try {
            // Il faut créer un ExempleType complet depuis les données DB
            const exempleType = this.prepareItemForCache(row);
            return new Exemple(exempleType);
        }
        catch (erreur) {
            console.error("# ERREUR avec l'EXEMPLE : %s", erreur, row);
        }
    }
    /**
     * Sort function for exemples (by oeuvre_id then by indice)
     */
    static sortFunction(a, b) {
        // First sort by oeuvre ID (oeuvre_id)
        const oeuvreComparison = a.oeuvre_id.localeCompare(b.oeuvre_id);
        if (oeuvreComparison !== 0) {
            return oeuvreComparison;
        }
        // Then sort by indice
        return a.indice - b.indice;
    }
}
exports.Exemple = Exemple;
//# sourceMappingURL=Exemple.js.map