// import * as vscode from "vscode";
// import { createRpcServer } from "./RpcServer";

// export function activate(context: vscode.ExtensionContext) {
//   const panel = vscode.window.createWebviewPanel(
//     "demo",
//     "Demo RPC",
//     vscode.ViewColumn.One,
//     { enableScripts: true }
//   );

//   const rpc = createRpcServer(panel);

//   // handler pour une commande avec réponse
//   rpc.on("getTime", () => {
//     return new Date().toISOString();
//   });

//   // handler pour une notification fire-and-forget
//   rpc.on("logMessage", (msg) => {
//     console.log("Depuis webview:", msg);
//   });

//   // Exemple : envoyer une notification à la webview
//   setTimeout(() => {
//     rpc.notify("ping", { from: "extension" });
//   }, 2000);
// }
