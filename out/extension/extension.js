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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const App_1 = require("./services/App");
function activate(context) {
    const disposable = vscode.commands.registerCommand('dico-cnario.ouvre', () => {
        App_1.App.run(context);
    });
    const devToolsDisposable = vscode.commands.registerCommand('dico-cnario.dev-tools', () => {
        vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
    });
    const reloadDbDisposable = vscode.commands.registerCommand('dico-cnario.reload-db', async () => {
        try {
            const { DatabaseService } = require('./services/db/DatabaseService');
            const { TestData } = require('../xtest/fixtures/TestData');
            const fs = require('fs');
            const path = require('path');
            const os = require('os');
            vscode.window.showInformationMessage('🗄️ Reconstruction de la base de données...');
            // 1. Reset singleton
            await DatabaseService.reset();
            // 2. Supprimer le fichier de développement
            const devDbPath = path.join(os.homedir(), 'Library/Application Support/Code - Insiders/User/globalStorage/undefined_publisher.dico-cnario/dico.db');
            if (fs.existsSync(devDbPath)) {
                fs.rmSync(devDbPath, { force: true });
            }
            // 3. Ré-initialiser avec nouvelles données
            const dbService = DatabaseService.getInstance(context, false);
            await dbService.initialize();
            // 4. Peupler avec TestData
            await TestData.populateTestDatabase(dbService);
            // 5. Vérifier les données
            const counts = await Promise.all([
                dbService.all('SELECT COUNT(*) as count FROM entrees'),
                dbService.all('SELECT COUNT(*) as count FROM oeuvres'),
                dbService.all('SELECT COUNT(*) as count FROM exemples')
            ]);
            vscode.window.showInformationMessage(`✅ Base reconstruite ! ${counts[0][0].count} entrées, ${counts[1][0].count} œuvres, ${counts[2][0].count} exemples`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Erreur lors de la reconstruction : ${error}`);
        }
    });
    context.subscriptions.push(disposable, devToolsDisposable, reloadDbDisposable);
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map