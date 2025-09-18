"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exemple = void 0;
const StringUtils_1 = require("../../bothside/StringUtils");
const UExemple_1 = require("../../bothside/UExemple");
const UniversalCacheManager_1 = require("../../bothside/UniversalCacheManager");
const db_manager_1 = require("../db/db_manager");
const App_1 = require("../services/App");
const Rpc_1 = require("../services/Rpc");
const Entry_1 = require("./Entry");
const Oeuvre_1 = require("./Oeuvre");
// La donnée telle qu'elle sera en cache
class Exemple extends UExemple_1.UExemple {
    static panelId = 'exemples';
    static cacheDebug() { return this.cache; } // Pour les tests
    static _cacheManagerInstance = new UniversalCacheManager_1.UniversalCacheManager();
    static get cache() { return this._cacheManagerInstance; }
    ;
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
    constructor(data) {
        super(data);
        this.id = `${this.oeuvre_id}-${this.indice}`;
    }
    static cacheAllData(items) {
        this.cache.inject(items, this.prepareItemForCache.bind(this));
    }
    static prepareItemForCache(item) {
        const preparedItem = item;
        return preparedItem;
    }
    static async finalizeCachedItems() {
        await this.cache.traverse(this.finalizeCachedItem.bind(this));
        App_1.App.incAndCheckReadyCounter();
    }
    static finalizeCachedItem(item) {
        const entry = Entry_1.Entry.get(item.entry_id);
        const entree = entry.entree_min;
        const oeuvre = Oeuvre_1.Oeuvre.get(item.oeuvre_id);
        const titre_oeuvre = oeuvre.titre_affiche;
        // On remplace 'TITRE' dans le texte de l'exemple
        let content_formated;
        if (item.content.match(/TITRE/)) {
            content_formated = item.content.replace(/TITRE/g, titre_oeuvre);
        }
        else {
            content_formated = `dans ${titre_oeuvre}, ${item.content}`;
        }
        return Object.assign(item, {
            oeuvre_titre: titre_oeuvre,
            entree_formated: entree,
            content_formated: content_formated,
            content_min: StringUtils_1.StringNormalizer.toLower(content_formated),
            content_min_ra: StringUtils_1.StringNormalizer.rationalize(content_formated),
            titresLookUp: oeuvre.titresLookUp,
            entry4filter: entry.entree_min
        });
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
            return new Exemple(row);
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