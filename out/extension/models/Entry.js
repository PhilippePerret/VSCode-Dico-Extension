"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entry = void 0;
const UEntry_1 = require("../../bothside/UEntry");
const UniversalCacheManager_1 = require("../../bothside/UniversalCacheManager");
const App_1 = require("../services/App");
const StringUtils_1 = require("../../bothside/StringUtils");
// Classe de la donnée mise en cache
class Entry extends UEntry_1.UEntry {
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
    constructor(data) {
        super(data);
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
        // On finalise la donnée en cache
        const pItem = Object.assign(item, {
            display: 'block',
            selected: false,
            entree_min: entreeNormalized,
            entree_min_ra: entreeRationalized,
            genre_formated: this.genre(item.genre),
            definition_formated: item.definition // pour le moment
        });
        return pItem;
    }
    static async finalizeCachedItems() {
        await this.cache.traverse(this.finalizeCachedItem.bind(this));
        App_1.App.incAndCheckReadyCounter();
    }
    static finalizeCachedItem(item) {
        // Pour trouver la catégorie humaine
        let cat;
        if (item.categorie_id) {
            cat = this.cache.get(item.categorie_id)?.entree_min;
        }
        item = Object.assign(item, {
            categorie_format: cat || '',
        });
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
        return new Entry(row);
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