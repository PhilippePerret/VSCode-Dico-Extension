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
suite('Panneau Oeuvres', () => {
    suiteSetup(async () => {
        // Ensure test database is populated before running tests
        await (0, test_utils_1.ensureDatabaseFixtures)();
    });
    test('Le panneau Oeuvres possède la structure HTML correcte', async () => {
        // Configurer le zoom dès l'ouverture
        await (0, test_utils_1.setZoomLevel)(2);
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await (0, test_utils_1.sleep)(0.5);
        //-CHECK: Le panneau Oeuvres existe
        const oeuvresPanel = PanelManager_1.PanelManager.getPanel('Oeuvres');
        assert.ok(oeuvresPanel, 'Le panneau Oeuvres existe');
        //-CHECK: Header avec titre et search-bar
        const header = await oeuvresPanel.getElement('header');
        assert.ok(header, 'Le header existe');
        const title = await oeuvresPanel.getElement('header h2');
        assert.ok(title, 'Le titre existe dans le header');
        assert.strictEqual(title.textContent, 'Oeuvres', 'Le titre est "Oeuvres"');
        const searchBar = await oeuvresPanel.getElement('#search-bar');
        assert.ok(searchBar, 'La search-bar existe');
        const searchInput = await oeuvresPanel.getElement('#search-input');
        assert.ok(searchInput, 'L\'input de recherche existe');
        const tips = await oeuvresPanel.getElement('.tips');
        assert.ok(tips, 'Les tips existent');
        assert.ok(tips.textContent.includes('f: rechercher'), 'Les tips contiennent les raccourcis');
        //-CHECK: Main avec id="items"
        const itemsContainer = await oeuvresPanel.getElement('#items');
        assert.ok(itemsContainer, 'Le container #items existe');
        assert.strictEqual(itemsContainer.tagName.toLowerCase(), 'main', 'Le container items est un élément main');
        //-CHECK: Formulaire d\'édition caché
        const editForm = await oeuvresPanel.getElement('#edit-form');
        assert.ok(editForm, 'Le formulaire d\'édition existe');
        assert.strictEqual(editForm.tagName.toLowerCase(), 'form', 'L\'élément edit-form est un formulaire');
        assert.ok(editForm.classList.includes('hidden'), 'Le formulaire d\'édition est caché');
        //-CHECK: Footer avec console et outils
        const footer = await oeuvresPanel.getElement('footer');
        assert.ok(footer, 'Le footer existe');
        const console = await oeuvresPanel.getElement('#panel-console');
        assert.ok(console, 'La console existe');
        assert.strictEqual(console.tagName.toLowerCase(), 'input', 'La console est un input');
        const toolsContainer = await oeuvresPanel.getElement('#main-tools-container');
        assert.ok(toolsContainer, 'Le container d\'outils existe');
    });
    test('Le panneau Oeuvres affiche au moins une oeuvre avec la structure attendue', async () => {
        await vscode.commands.executeCommand('dico-cnario.ouvre');
        await (0, test_utils_1.allPanelsReady)(); // Attendre que tous les panneaux soient prêts
        const oeuvresPanel = PanelManager_1.PanelManager.getPanel('Oeuvres');
        assert.ok(oeuvresPanel, 'Le panneau Oeuvres existe');
        //-CHECK: Au moins une oeuvre existe
        const oeuvre = await oeuvresPanel.getElement('div.oeuvre');
        assert.ok(oeuvre, 'Au moins une oeuvre div.oeuvre existe');
        //-CHECK: Structure de l'oeuvre - header
        const oeuvreHeader = await oeuvresPanel.getElement('div.oeuvre .oeuvre-header');
        assert.ok(oeuvreHeader, 'L\'oeuvre contient un .oeuvre-header');
        //-CHECK: Éléments dans le header
        const oeuvreTitreAffiche = await oeuvresPanel.getElement('div.oeuvre .oeuvre-titre_affiche');
        assert.ok(oeuvreTitreAffiche, 'L\'oeuvre contient .oeuvre-titre_affiche');
        const oeuvreTitreOriginal = await oeuvresPanel.getElement('div.oeuvre .oeuvre-titre_original');
        assert.ok(oeuvreTitreOriginal, 'L\'oeuvre contient .oeuvre-titre_original');
        const oeuvreTitreFrancais = await oeuvresPanel.getElement('div.oeuvre .oeuvre-titre_francais');
        assert.ok(oeuvreTitreFrancais, 'L\'oeuvre contient .oeuvre-titre_francais');
        //-CHECK: Auteurs
        const oeuvreAuteurs = await oeuvresPanel.getElement('div.oeuvre .oeuvre-auteurs');
        assert.ok(oeuvreAuteurs, 'L\'oeuvre contient .oeuvre-auteurs');
        //-CHECK: Résumé
        const oeuvreResume = await oeuvresPanel.getElement('div.oeuvre .oeuvre-resume');
        assert.ok(oeuvreResume, 'L\'oeuvre contient .oeuvre-resume');
        //-CHECK: Notes (cachées)
        const oeuvreNotes = await oeuvresPanel.getElement('div.oeuvre .oeuvre-notes');
        assert.ok(oeuvreNotes, 'L\'oeuvre contient .oeuvre-notes');
        assert.ok(oeuvreNotes.classList.includes('hidden'), 'Les notes sont cachées par défaut');
        //-CHECK: Footer caché avec boutons
        const oeuvreFooter = await oeuvresPanel.getElement('div.oeuvre .item-footer');
        assert.ok(oeuvreFooter, 'L\'oeuvre contient .item-footer');
        assert.ok(oeuvreFooter.classList.includes('hidden'), 'Le footer est caché par défaut');
        const btnEdit = await oeuvresPanel.getElement('div.oeuvre .btn-edit');
        assert.ok(btnEdit, 'L\'oeuvre contient .btn-edit');
        const btnNewExemple = await oeuvresPanel.getElement('div.oeuvre .btn-new-exemple');
        assert.ok(btnNewExemple, 'L\'oeuvre contient .btn-new-exemple');
        const btnRemove = await oeuvresPanel.getElement('div.oeuvre .btn-remove');
        assert.ok(btnRemove, 'L\'oeuvre contient .btn-remove');
        const btnMove = await oeuvresPanel.getElement('div.oeuvre .btn-move');
        assert.ok(btnMove, 'L\'oeuvre contient .btn-move');
    });
});
//# sourceMappingURL=oeuvres.test.js.map