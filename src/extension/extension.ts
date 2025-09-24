import * as vscode from 'vscode';
import { App } from './services/App';

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('dico-cnario.ouvre', () => {
		App.run(context);
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
			const devDbPath = path.join(
				os.homedir(),
				'Library/Application Support/Code - Insiders/User/globalStorage/undefined_publisher.dico-cnario/dico.db'
			);

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

			vscode.window.showInformationMessage(
				`✅ Base reconstruite ! ${counts[0][0].count} entrées, ${counts[1][0].count} œuvres, ${counts[2][0].count} exemples`
			);

		} catch (error) {
			vscode.window.showErrorMessage(`❌ Erreur lors de la reconstruction : ${error}`);
		}
	});

	context.subscriptions.push(disposable, devToolsDisposable, reloadDbDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
