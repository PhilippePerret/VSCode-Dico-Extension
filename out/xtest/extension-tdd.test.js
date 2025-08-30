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
suite('Extension Main Functionality', () => {
    test('La commande "dico-cnario.ouvre" ouvre 3 panneaux possédant les bons titres', async () => {
        // Nettoyer tous les onglets existants
        await (0, test_utils_1.closeAllTabs)();
        await (0, test_utils_1.sleep)(0.2);
        // TODO: Configurer le zoom
        // await setZoomLevel(2);
        // await sleep(0.2);
        // État précédent
        const initTabCount = (0, test_utils_1.tabGroupsCount)();
        // --- Test ---
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await (0, test_utils_1.allPanelsReady)(); // Attendre que tous les panneaux soient prêts
        //-TEST Trois nouveaux onglets créés
        const newTabCount = (0, test_utils_1.tabGroupsCount)();
        assert.strictEqual(newTabCount, initTabCount + 3, 'Trois onglets auraient dû être créés');
        //-TEST Trois panneaux sont créés
        const panels = PanelManager_1.PanelManager.getActivePanels();
        assert.strictEqual(panels.length, 3, 'Should open exactly 3 panels');
        //--TEST Panneau "Dictionnaire", "Oeuvres" et "Exemples"
        assert.strictEqual(panels[0].title, 'Dictionnaire', 'First panel should be "Dictionnaire"');
        assert.strictEqual(panels[1].title, 'Oeuvres', 'Second panel should be "Oeuvres"');
        assert.strictEqual(panels[2].title, 'Exemples', 'Third panel should be "Exemples"');
    });
});
//# sourceMappingURL=extension-tdd.test.js.map