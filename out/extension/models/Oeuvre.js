"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Oeuvre = void 0;
const UniversalCacheManager_1 = require("../../bothside/UniversalCacheManager");
const UOeuvre_1 = require("../../bothside/UOeuvre");
const App_1 = require("../services/App");
const StringUtils_1 = require("../../bothside/StringUtils");
class Oeuvre extends UOeuvre_1.UOeuvre {
    static panelId = 'oeuvres';
    static REG_ARTICLES = /\b(an|a|the|le|la|les|l'|de|du)\b/i;
    static cacheDebug() { return this.cache; }
    static _cacheManagerInstance = new UniversalCacheManager_1.UniversalCacheManager();
    static get cache() { return this._cacheManagerInstance; }
    ;
    static get(oeuvre_id) { return this.cache.get(oeuvre_id); }
    static sortFonction(a, b) {
        const titleA = a.titre_original || a.titre_affiche;
        const titleB = b.titre_original || b.titre_affiche;
        return titleA.localeCompare(titleB, 'fr', {
            sensitivity: 'base',
            numeric: true,
            caseFirst: 'lower'
        });
    }
    constructor(data) {
        super(data);
    }
    /**
     * Méthode pour préparation tous les items pour le cache
     */
    static cacheAllData(items) {
        this.cache.inject(items, this.prepareItemForCache.bind(this));
    }
    /**
     * Méthode de préparation de la donnée pour le cache
     */
    static prepareItemForCache(item) {
        const preparedItem = item;
        preparedItem.titres = ["Un titre", "un autre titre", "et encore un"];
        return preparedItem;
    }
    static async finalizeCachedItems() {
        await this.cache.traverse(this.finalizeCachedItem.bind(this));
        App_1.App.incAndCheckReadyCounter();
    }
    static finalizeCachedItem(oeuvre) {
        // Créer un array avec tous les titres disponibles
        const titres = [];
        if (oeuvre.titre_francais) {
            titres.push(StringUtils_1.StringNormalizer.rationalize(oeuvre.titre_francais));
        }
        if (oeuvre.titre_original) {
            titres.push(StringUtils_1.StringNormalizer.rationalize(oeuvre.titre_original));
        }
        if (oeuvre.titre_affiche) {
            titres.push(StringUtils_1.StringNormalizer.rationalize(oeuvre.titre_affiche));
        }
        // Il faut supprimer les articles dans les titres
        titres.forEach(titre => {
            if (titre.match(this.REG_ARTICLES)) {
                titres.push(titre.replace(this.REG_ARTICLES, ""));
            }
        });
        const uniqTitres = [];
        titres.forEach(titre => {
            if (uniqTitres.includes(titre)) {
                return;
            }
            uniqTitres.push(titre);
        });
        // Versions minuscules pour recherche
        const titresLookUp = uniqTitres.map(titre => StringUtils_1.StringNormalizer.toLower(titre));
        return Object.assign(oeuvre, {
            titres: titres,
            titre_affiche_formated: oeuvre.titre_affiche,
            auteurs_formated: oeuvre.auteurs && Oeuvre.mef_auteurs(oeuvre.auteurs),
            titresLookUp: titresLookUp
        });
    }
    /**
     * Get the title to use for sorting (French if exists, otherwise original)
     */
    get sortTitle() {
        return this.titre_francais || this.titre_original || this.titre_affiche;
    }
    /**
     * Articles to ignore when generating IDs
     */
    static ARTICLES = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'the', 'a', 'an'];
    /**
     * Map of diacritics to their base equivalents
     */
    static DIACRITIC_MAP = {
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'ý': 'y', 'ÿ': 'y',
        'ç': 'c', 'ñ': 'n',
        'œ': 'oe', 'æ': 'ae',
        // Uppercase versions
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
        'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
        'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
        'Ý': 'Y', 'Ÿ': 'Y',
        'Ç': 'C', 'Ñ': 'N',
        'Œ': 'OE', 'Æ': 'AE'
    };
    /**
     * Replace diacritics with their base equivalents
     */
    static replaceDiacritics(text) {
        return text.replace(/./g, char => this.DIACRITIC_MAP[char] || char);
    }
    /**
     * Clean and split title into words, removing articles
     */
    static cleanTitle(titre) {
        return this.replaceDiacritics(titre)
            .toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, '') // Keep letters (both cases), numbers, spaces
            .split(/\s+/)
            .filter(word => word.length > 0 && !this.ARTICLES.includes(word));
    }
    /**
     * Generate base ID from title
     */
    static generateBaseId(titre) {
        const words = this.cleanTitle(titre);
        if (words.length >= 3) {
            // Take first letter of each word
            return words.map(word => word[0]).join('').toUpperCase();
        }
        else {
            // Take first 4 letters of combined words
            const combined = words.join('');
            return combined.substring(0, 4).toUpperCase();
        }
    }
    /**
     * Generate unique ID with incremental length if needed
     * Note: This method needs access to existing IDs for uniqueness check
     */
    static generateId(titre, annee, existingIds = new Set()) {
        const baseId = this.generateBaseId(titre);
        const yearSuffix = annee ? (annee % 100).toString().padStart(2, '0') : '';
        // Start with base ID + year
        let candidateId = baseId + yearSuffix;
        // If not unique, try extending the base part
        let letterCount = baseId.length;
        const words = this.cleanTitle(titre);
        const combined = words.join('');
        while (existingIds.has(candidateId)) {
            letterCount++;
            if (words.length >= 3) {
                // For multi-word titles, add next letters cyclically
                const extendedBase = words
                    .map(word => word.substring(0, Math.ceil(letterCount / words.length)))
                    .join('')
                    .substring(0, letterCount)
                    .toUpperCase();
                candidateId = extendedBase + yearSuffix;
            }
            else {
                // For short titles, just extend length
                const extendedBase = combined.substring(0, letterCount).toUpperCase();
                candidateId = extendedBase + yearSuffix;
            }
            // Safety break if title is too short
            if (letterCount > combined.length + 5) {
                candidateId += Math.random().toString(36).substring(2, 5).toUpperCase();
                break;
            }
        }
        return candidateId;
    }
    /**
     * Validate oeuvre data
     */
    static validate(data) {
        const errors = [];
        if (!data.titre_affiche?.trim()) {
            errors.push('Titre affiché requis');
        }
        if (!data.id?.trim()) {
            errors.push('ID requis');
        }
        return errors;
    }
    /**
     * Convert to database row
     */
    toRow() {
        return {
            id: this.id,
            titre_affiche: this.titre_affiche,
            titre_original: this.titre_original || null,
            titre_francais: this.titre_francais || null,
            annee: this.annee || null,
            auteurs: this.auteurs || null,
            notes: this.notes || null,
            resume: this.resume || null
        };
    }
    /**
     * Create from database row
     */
    static fromRow(row) {
        return new Oeuvre(row);
    }
    /**
     * Sort function for oeuvres (by titre_original, respecting accents/diacritics)
     */
    static sortFunction(a, b) {
        const titleA = a.titre_original || a.titre_affiche;
        const titleB = b.titre_original || b.titre_affiche;
        return titleA.localeCompare(titleB, 'fr', {
            sensitivity: 'base',
            numeric: true,
            caseFirst: 'lower'
        });
    }
}
exports.Oeuvre = Oeuvre;
//# sourceMappingURL=Oeuvre.js.map