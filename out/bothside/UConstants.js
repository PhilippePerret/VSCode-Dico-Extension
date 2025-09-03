"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
class Constants {
    static ENTRIES_GENRES = {
        'nm': 'n.m.',
        'nf': 'n.f.',
        'np': 'n.pl.',
        'vb': 'verbe',
        'adj': 'adj.',
        'adv': 'adv.'
    };
    /**
     * Les préfixes/marques qui introduisent des index dans les définitions
     * principalement. Permet, par exemple dans le check des valeurs des
     * définitions, de vérifier l'existence des mots référencés.
     *
     * Leur forme canonique est :
     *
     *  <mark>(<id entrée>) ou <mark>(<texte écrit>|<id entrée>)
     */
    static MARK_ENTRIES = {
        '->': { name: "Envoi simple" },
        'index': { name: 'Simple indexation' },
        'tt': { name: 'simple terme technique (sans page)' }
    };
}
exports.Constants = Constants;
//# sourceMappingURL=UConstants.js.map