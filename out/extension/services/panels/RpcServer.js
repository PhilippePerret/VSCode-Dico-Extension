"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRpcServer = createRpcServer;
const RpcChannel_1 = require("../../../bothside/RpcChannel");
function createRpcServer(panel) {
    return new RpcChannel_1.RpcChannel((msg) => panel.webview.postMessage(msg), (cb) => panel.webview.onDidReceiveMessage(cb));
}
//# sourceMappingURL=RpcServer.js.map