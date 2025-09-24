import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/xtest/**/*.test.js',
	launchArgs: [
		'--force-device-scale-factor=2.0'
	],
	workspaceConfig: {
		'window.zoomLevel': 2
	},
	mocha: {
		timeout: 30000 // 15 secondes pour permettre l'attente de debug
	}
});
