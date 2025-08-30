/**
 * Canal RPC pour communiquer entre extension et webview.
 * Les deux côtés chargent ce module.
 */
type Request = {
  id: number;
  method: string;
  params: any;
};

type Response = {
  id: number;
  result: any;
};

type Notification = {
  method: string;
  params: any;
};

export class RpcChannel {
  private counter = 0;
  private pending = new Map<number, (value: any) => void>();
  private handlers = new Map<string, (params: any) => any>();

  constructor(
    private sender: (msg: any) => void,
    private receiver: (cb: (msg: any) => void) => void
  ) {
    this.receiver(this.handleMessage.bind(this));
  }

  private handleMessage(msg: any) {
    if ("id" in msg && "method" in msg) {
      // C’est une requête (ask côté opposé)
      const handler = this.handlers.get(msg.method);
      if (handler) {
        Promise.resolve(handler(msg.params)).then((result) => {
          this.sender({ id: msg.id, result });
        });
      }
    } else if ("id" in msg && "result" in msg) {
      // Réponse
      const cb = this.pending.get(msg.id);
      if (cb) {
        cb(msg.result);
        this.pending.delete(msg.id);
      }
    } else if ("method" in msg) {
      // Notification (notify côté opposé)
      const handler = this.handlers.get(msg.method);
      if (handler) {
        handler(msg.params);
      }
    }
  }

  ask(method: string, params?: any): Promise<any> {
    const id = this.counter++;
    const req: Request = { id, method, params };
    this.sender(req);
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
    });
  }

  notify(method: string, params?: any) {
    // console.log("Message reçu dans le 'notify' du RpcChannel", method, params);
    const notif: Notification = { method, params };
    this.sender(notif);
  }

  on(method: string, handler: (params: any) => any) {
    // console.log("Message reçu dans le 'on' du RpcChannel", method, handler);
    this.handlers.set(method, handler);
  }
}
