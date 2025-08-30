"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcChannel = void 0;
class RpcChannel {
    sender;
    receiver;
    counter = 0;
    pending = new Map();
    handlers = new Map();
    constructor(sender, receiver) {
        this.sender = sender;
        this.receiver = receiver;
        this.receiver(this.handleMessage.bind(this));
    }
    handleMessage(msg) {
        if ("id" in msg && "method" in msg) {
            // C’est une requête (ask côté opposé)
            const handler = this.handlers.get(msg.method);
            if (handler) {
                Promise.resolve(handler(msg.params)).then((result) => {
                    this.sender({ id: msg.id, result });
                });
            }
        }
        else if ("id" in msg && "result" in msg) {
            // Réponse
            const cb = this.pending.get(msg.id);
            if (cb) {
                cb(msg.result);
                this.pending.delete(msg.id);
            }
        }
        else if ("method" in msg) {
            // Notification (notify côté opposé)
            const handler = this.handlers.get(msg.method);
            if (handler) {
                handler(msg.params);
            }
        }
    }
    ask(method, params) {
        const id = this.counter++;
        const req = { id, method, params };
        this.sender(req);
        return new Promise((resolve) => {
            this.pending.set(id, resolve);
        });
    }
    notify(method, params) {
        // console.log("Message reçu dans le 'notify' du RpcChannel", method, params);
        const notif = { method, params };
        this.sender(notif);
    }
    on(method, handler) {
        // console.log("Message reçu dans le 'on' du RpcChannel", method, handler);
        this.handlers.set(method, handler);
    }
}
exports.RpcChannel = RpcChannel;
//# sourceMappingURL=RpcChannel.js.map