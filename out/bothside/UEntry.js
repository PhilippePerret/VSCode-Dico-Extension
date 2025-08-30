"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UEntry = void 0;
/**
 * Ce module contient les éléments utiles aussi bien côté extension (serveur)
 * que côté client (webview)
 */
const UConstants_1 = require("./UConstants");
const Entry_1 = require("../extension/models/Entry");
const UniversalDicoElement_1 = require("./UniversalDicoElement");
const GENRES = UConstants_1.Constants.ENTRIES_GENRES;
class UEntry extends UniversalDicoElement_1.UniversalDicoElement {
    static klass = Entry_1.Entry;
    static names = {
        min: { sing: "entrée", plur: "entrées" },
        maj: { sing: "ENTRÉE", plur: "ENTRÉES" },
        tit: { sing: "Entrée", plur: "Entrées" },
        tech: { sing: "entry", plur: "entries" }
    };
    static genre(id) { return GENRES[id]; }
    constructor(data) {
        super(data);
        // TODO D'autres traitement ici propres à l'élément, sinon le
        // constructeur ne se justifie pas.
    }
}
exports.UEntry = UEntry;
//# sourceMappingURL=UEntry.js.map