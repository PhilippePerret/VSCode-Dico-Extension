import * as vscode from "vscode";
import { RpcChannel } from '../../../bothside/RpcChannel';

export function createRpcServer(panel: vscode.WebviewPanel) {
  return new RpcChannel(
    (msg) => panel.webview.postMessage(msg),
    (cb) => panel.webview.onDidReceiveMessage(cb)
  );
}
