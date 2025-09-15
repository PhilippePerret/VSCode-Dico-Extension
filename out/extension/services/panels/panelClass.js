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
exports.PanelClass = void 0;
const vscode = __importStar(require("vscode"));
const PanelManager_1 = require("./PanelManager");
const App_1 = require("../App");
/**
 * Classe d'un panneau quelconque
 */
class PanelClass {
    _panel;
    _type;
    _title;
    _column = 0;
    _context;
    get type() { return this._type; }
    get title() { return this._title; }
    get column() { return this._column; }
    get panel() { return this._panel; }
    get classe() { return this._classe; }
    get webview() { return this.panel.webview; }
    get rpc() { return this._rpc; }
    constructor(context, type, title, column) {
        this._context = context;
        this._type = type;
        this._title = title;
        this._column = column;
        this.build();
    }
    build() {
        this._panel = vscode.window.createWebviewPanel(this.type, this.title, this.column, PanelClass.commonPanelOptions);
        this.panel.webview.html = this.getPanelHtml();
        PanelManager_1.PanelManager.addActivePanel(this.panel);
    }
    getPanelHtml() {
        const fs = require('fs');
        const path = require('path');
        const context = this._context;
        const webview = this.panel.webview;
        const panelId = this.type;
        // const plurName = this.modelClass.names.tech.plur;
        const plurName = 'items';
        const mainContent = `<div class="loading">Chargement des ${plurName}…</div>`;
        const toolsContent = "";
        // Load form template using uniform convention: {panelId}/display.html
        const formTemplatePath = path.join(context.extensionPath, 'media', panelId, 'form.html');
        const editFormContent = fs.readFileSync(formTemplatePath, 'utf8');
        // Load display template using uniform convention: {panelId}/display.html
        const displayTemplatePath = path.join(context.extensionPath, 'media', panelId, 'display.html');
        const displayTemplate = fs.readFileSync(displayTemplatePath, 'utf8');
        const templateHtmlItem = `<template id="item-template">${displayTemplate}</template>`;
        const options = {
            specificStyles: '',
            specificScripts: '',
            templates: templateHtmlItem
        };
        // Lire le template général
        const templatePath = path.join(context.extensionPath, 'media', 'panel-template.html');
        let html = fs.readFileSync(templatePath, 'utf8');
        // Générer les URIs pour les ressources
        const commonCssPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'common.css'));
        const codiconCssPath = vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css');
        // URI pour le bundle JS du panneau
        const mainJsPath = vscode.Uri.file(path.join(context.extensionPath, 'media', `${this.type}-bundle.js`));
        // Utiliser les URIs webview correctes
        const commonCssUri = webview.asWebviewUri(commonCssPath).toString();
        const mainJsUri = webview.asWebviewUri(mainJsPath).toString();
        const codiconCssUri = webview.asWebviewUri(codiconCssPath).toString();
        // CSS spécifique au panneau si panelId est fourni - utilise la convention item.css
        let specificCssLink = '';
        const specificCssPath = path.join(context.extensionPath, 'media', this.type, 'item.css');
        if (fs.existsSync(specificCssPath)) {
            const specificCssUri = webview.asWebviewUri(vscode.Uri.file(specificCssPath)).toString();
            specificCssLink = `<link rel="stylesheet" href="${specificCssUri}">`;
        }
        // Ajouter l'ID au body
        const bodyId = this.type ? `id="panel-${this.type}"` : '';
        html = html.replace('<body>', `<body ${bodyId}>`);
        // Remplacements
        html = html.replace(/{{PANEL_TITLE}}/g, this.title);
        html = html.replace(/{{COMMON_CSS_URI}}/g, commonCssUri);
        html = html.replace(/{{CODICON_CSS_URI}}/g, codiconCssUri);
        html = html.replace(/{{MAIN_JS_URI}}/g, mainJsUri);
        html = html.replace(/{{MAIN_CONTENT}}/g, mainContent);
        html = html.replace(/{{EDIT_FORM_CONTENT}}/g, editFormContent);
        html = html.replace(/{{TOOLS_CONTENT}}/g, toolsContent);
        html = html.replace(/{{SPECIFIC_STYLES}}/g, specificCssLink + (options.specificStyles || ''));
        html = html.replace(/{{SPECIFIC_SCRIPTS}}/g, options.specificScripts || '');
        html = html.replace(/{{TEMPLATES}}/g, options.templates || '');
        html = html.replace(/{{ITEM_FOOTER}}/g, PanelClass.COMMON_ITEM_FOOTER);
        return html;
    }
    // C'est la méthode côté serveur qui demande à la webview de
    // peupler la vue en affichant les données.
    async populate() {
        if (this.canalRpc) {
            await this.canalRpc.askForPopulate(this.classe.getDataSerialized());
        }
        App_1.App.incAndCheckReadyCounter();
    }
    // Fonction qui doit être surclassée par les héritières
    sortFonction() { }
    // Fonction qui doit être surclassée par les héritières
    getDB() { }
    // Les options communes pour construire tous les panneaux
    static get commonPanelOptions() { return this._commonPanelOptions; }
    static _commonPanelOptions;
    static defineCommonPanelOptions(context) {
        this._commonPanelOptions = {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true,
            enableCommandUris: true,
            localResourceRoots: [vscode.Uri.file(context.extensionPath)]
        };
    }
    // Common footer HTML for all items
    static COMMON_ITEM_FOOTER = `
  <div class="item-footer hidden">
    <button class="btn-edit"><i class="codicon codicon-edit"></i></button>
    <button class="btn-new-exemple"><i class="codicon codicon-add"></i> Ex.</button>
    <button class="btn-remove"><i class="codicon codicon-trash"></i></button>
    <button class="btn-move"><i class="codicon codicon-move"></i></button>
  </div>`;
}
exports.PanelClass = PanelClass;
//# sourceMappingURL=panelClass.js.map