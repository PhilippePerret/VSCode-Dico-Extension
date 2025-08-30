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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const PanelManager_1 = require("../extension/services/panels/PanelManager");
const test_utils_1 = require("./test_utils");
suite('Recherche/Filtrage des Entrées', () => {
    suiteSetup(async () => {
        // Ensure test database is populated before running tests
        await (0, test_utils_1.ensureDatabaseFixtures)();
    });
    test('Le filtrage des entrées fonctionne correctement avec différents préfixes', async () => {
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await (0, test_utils_1.allPanelsReady)(); // Attendre que tous les panneaux soient prêts
        const dictionaryPanel = PanelManager_1.PanelManager.getPanel('Dictionnaire');
        assert.ok(dictionaryPanel, 'Le panneau Dictionnaire existe');
        const searchInput = await dictionaryPanel.getElement('#search-input');
        assert.ok(searchInput, 'Le champ de recherche existe');
        // 1. Vérifier que tous les mots sont bien visibles (35 entrées total)
        const allEntries = await dictionaryPanel.getElements('div.entry');
        assert.strictEqual(allEntries.length, 35, 'Toutes les 35 entrées sont visibles initialement');
        // 2. Filtrer avec "c" (minuscule) - doit rester 4 mots
        await dictionaryPanel.typeInElement('#search-input', 'c');
        await (0, test_utils_1.sleep)(0.1); // Laisser le temps au filtrage de s'exécuter
        const entriesWithC = await dictionaryPanel.getVisibleElements('div.entry');
        assert.strictEqual(entriesWithC.length, 4, 'Avec "c", il reste 4 entrées visibles');
        // 3. Filtrer avec "cO" ("o" majuscule) - doit rester 3 mots
        await dictionaryPanel.clearAndTypeInElement('#search-input', 'cO');
        await (0, test_utils_1.sleep)(0.1);
        const entriesWithCO = await dictionaryPanel.getVisibleElements('div.entry');
        assert.strictEqual(entriesWithCO.length, 3, 'Avec "cO", il reste 3 entrées visibles');
        // 4. Filtrer avec "cOn" - doit rester 1 mot ("Conflit fondamental")
        await dictionaryPanel.clearAndTypeInElement('#search-input', 'cOn');
        await (0, test_utils_1.sleep)(0.1);
        const entriesWithCOn = await dictionaryPanel.getVisibleElements('div.entry');
        assert.strictEqual(entriesWithCOn.length, 1, 'Avec "cOn", il reste 1 entrée visible');
        // Vérifier que c'est bien "Conflit fondamental"
        const visibleEntry = entriesWithCOn[0];
        const entryTitle = await dictionaryPanel.getElementFromParent(visibleEntry, '.entry-entree');
        assert.strictEqual(entryTitle.textContent, 'Conflit fondamental', 'L\'entrée visible est "Conflit fondamental"');
        // 5. Revenir à "c" - doit avoir à nouveau 4 mots
        await dictionaryPanel.clearAndTypeInElement('#search-input', 'c');
        await (0, test_utils_1.sleep)(0.1);
        const entriesBackToC = await dictionaryPanel.getVisibleElements('div.entry');
        assert.strictEqual(entriesBackToC.length, 4, 'Retour à "c" : 4 entrées visibles à nouveau');
        // 6. Vider le champ - tous les mots doivent être affichés
        await dictionaryPanel.clearElement('#search-input');
        await (0, test_utils_1.sleep)(0.1);
        const allEntriesAgain = await dictionaryPanel.getVisibleElements('div.entry');
        assert.strictEqual(allEntriesAgain.length, 35, 'Champ vidé : toutes les 35 entrées sont visibles à nouveau');
    });
});
//# sourceMappingURL=search_entries.test.js.map