"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalDicoElement = void 0;
/**
 * Class Universelle pour un Element quelconque
 *
 * Signifie que ça sert :
 *  - Côté Extension/Côté Webview (server/client)
 *  - Pour les Entry, Oeuvre et Exemples
 *
 */
class UniversalDicoElement {
    static cache;
    // Le constructeur reçoit toujours un objet contenant
    // Les données. Dans un cas (extension) ce sont les données
    // provenant de la base de données, dans l'autre cas (webview)
    // ce sont les données cachées et préparées
    constructor(data) {
        for (const k in data) {
            if (Object.prototype.hasOwnProperty.call(data, k)) {
                this[k] = data[k];
            }
        }
    }
    static getDataSerialized() {
        return this.cache.getDataSerialized();
    }
}
exports.UniversalDicoElement = UniversalDicoElement;
//# sourceMappingURL=UniversalDicoElement.js.map