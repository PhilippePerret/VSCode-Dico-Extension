"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UOeuvre = void 0;
const UniversalDicoElement_1 = require("./UniversalDicoElement");
class UOeuvre extends UniversalDicoElement_1.UniversalDicoElement {
    static klass;
    static names = {
        min: { sing: "œuvre", plur: "œuvres" },
        maj: { sing: "ŒUVRE", plur: "ŒUVRES" },
        tit: { sing: "Œuvre", plur: "Œuvres" },
        tech: { sing: "oeuvre", plur: "oeuvres" }
    };
    // Mettre en forme les auteurs
    static mef_auteurs(auteurs) {
        const regauteurs = /(.+?) ([A-Z \-]+?)\(([HF]), (.+?)\)/;
        while (auteurs.match(regauteurs)) {
            auteurs = auteurs.replace(regauteurs, (_, prenom, nom, sexe, fonctions) => {
                return `
        <span class="prenom">${prenom}</span>
        <span class="nom">${nom}</span>
        <span class="sexe">${sexe}</span>
        (<span class="fonctions">${fonctions}</span>)
        `;
            });
        }
        return auteurs.trim();
    }
    constructor(data) {
        super(data);
    }
}
exports.UOeuvre = UOeuvre;
//# sourceMappingURL=UOeuvre.js.map