import { RpcChannel } from "../bothside/RpcChannel";

declare function acquireVsCodeApi(): {
  postMessage: (msg: any) => void;
};

export function createRpcClient() {
  const vscode = acquireVsCodeApi();

  return new RpcChannel(
    // sender : envoie vers l'extension
    (msg) => vscode.postMessage(msg),
    // receiver : reçoit les messages de l'extension
    (cb) => window.addEventListener("message", (event) => cb(event.data))
  );
}