"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanalExemple = exports.CanalOeuvre = exports.CanalEntry = void 0;
const RpcServer_1 = require("./panels/RpcServer");
class Rpc {
    panel;
    rpc;
    // C'est ici qu'on détermine le panneau, quand il est fait
    initialize(panel) {
        this.panel = panel;
        this.rpc = (0, RpcServer_1.createRpcServer)(panel);
    }
    // raccourcis
    // Ces raccourcis permettent de faire, avec le panneau PanelClass :
    // panel.rpc.notify(...) ou panel.rpc.ask(...)
    notify(command, params) {
        params = params || {};
        this.rpc.notify(command, params);
    }
    ask(command, params) {
        this.rpc.ask(command, params);
    }
    // ON peut définir ici les méthodes communes à tous les canaux.
    // Pour demander au panneau le peuplement du panneau en lui
    // transmettant les données des entrées.
    async askForPopulate(data) {
        console.log("[EXTENSION] Envoi des données du %s pour peuplement", this.panelName);
        this.rpc.ask("populate", { data: data }).then((retour) => {
            console.log("Retour après populate des données du %s.", this.panelName, retour);
        });
    }
}
// Toutes les commandes de message doivent être définies ici
class RpcEntry extends Rpc {
    panelName = 'panneau des entrées';
    // Pour afficher une entrée (en la sélectionnant);
    displayEntry(param) {
        this.rpc.notify('display-entry', param);
    }
}
class RpcOeuvre extends Rpc {
    panelName = 'panneau des œuvres';
    // Définir ici les méthodes messages avec le panneau des Oeuvres
    displayOeuvre(param) {
        this.rpc.notify('display-oeuvre', param);
    }
}
class RpcExemple extends Rpc {
    panelName = 'panneau des exemples';
    // Définir ici les méthodes messages avec le panneau des exemples
    initialize(panel) {
        super.initialize(panel);
        // console.log("-> initialisation du rpc et des méthodes", this.rpc);
        this.rpc.on("display-entry", async (params) => {
            console.log("[EXTENSION] Demande d'affichage de l'Entrée ", params.entry_id);
            // return { ok: true };
            // On le relaye au panneau des entrées
            exports.CanalEntry.displayEntry(params);
        });
        this.rpc.on('display-oeuvre', async (params) => {
            console.log("[EXTENSION] Demande affichage oeuvre %s", params.oeuvreId, params);
            exports.CanalOeuvre.displayOeuvre(params);
        });
    }
}
// C'est cette constante exposée que l'EXTENSION doit appeler de partout
/**
 * Pour envoyer un message à la webvew des entrées :
 *  1)  Implémenter la méthode '<methode>' dans la classe RpcEntry ci-dessus, qui
 *      envoi le message '<mon-message>'
 *  Z)  Côté webview, implémenter la réception du message '<mon-message>' (et
 *      le retour si ça n'est pas une simple notification)
 *  3)  Appeler 'CanalEntry.<methode>(...)' depuis n'importe où de l'extension
 */
exports.CanalEntry = new RpcEntry();
exports.CanalOeuvre = new RpcOeuvre();
exports.CanalExemple = new RpcExemple();
//# sourceMappingURL=Rpc.js.map