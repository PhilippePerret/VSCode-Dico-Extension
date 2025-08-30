import * as vscode from 'vscode';
import { createRpcServer } from './panels/RpcServer';

abstract class Rpc {
  protected panel: any;
  protected rpc: any;
  protected abstract panelName: string;

  // C'est ici qu'on détermine le panneau, quand il est fait
  initialize(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.rpc = createRpcServer(panel);
  }

  // raccourcis
  // Ces raccourcis permettent de faire, avec le panneau PanelClass :
  // panel.rpc.notify(...) ou panel.rpc.ask(...)
  notify(command: string, params?: {[k:string]: any}) {
    params = params || {};
    this.rpc.notify(command, params);
  }
  ask(command: string, params: {[k:string]: any}) {
    this.rpc.ask(command, params);
  }
  
  // ON peut définir ici les méthodes communes à tous les canaux.

  // Pour demander au panneau le peuplement du panneau en lui
  // transmettant les données des entrées.
  async askForPopulate(data: {[k:string]: any}): Promise<void>{
    console.log("[EXTENSION] Envoi des données du %s pour peuplement", this.panelName);
    this.rpc.ask("populate", { data: data }).then( (retour: {[k:string]:any}) => {
      console.log("Retour après populate des données du %s.", this.panelName, retour);
    });
  }

}

// Toutes les commandes de message doivent être définies ici
class RpcEntry extends Rpc {
  protected panelName = 'panneau des entrées';

  // Pour afficher une entrée (en la sélectionnant);
  displayEntry(param: {entry_id: string}){
    this.rpc.notify('display-entry', param);
  }
}

class RpcOeuvre extends Rpc {
  protected panelName = 'panneau des œuvres';
  // Définir ici les méthodes messages avec le panneau des Oeuvres
  displayOeuvre(param: {oeuvreId: string}){
    this.rpc.notify('display-oeuvre', param);
  }
  
}
class RpcExemple extends Rpc {
  protected panelName = 'panneau des exemples';
  // Définir ici les méthodes messages avec le panneau des exemples

  initialize(panel: vscode.WebviewPanel) {
    super.initialize(panel);
    // console.log("-> initialisation du rpc et des méthodes", this.rpc);

    this.rpc.on("display-entry", async (params: { entry_id: string }) => {
      console.log("[EXTENSION] Demande d'affichage de l'Entrée ", params.entry_id);
      // return { ok: true };
      // On le relaye au panneau des entrées
      CanalEntry.displayEntry(params);
    });
    this.rpc.on('display-oeuvre', async (params: { oeuvreId: string }) => {
      console.log("[EXTENSION] Demande affichage oeuvre %s", params.oeuvreId, params);
      CanalOeuvre.displayOeuvre(params);
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

export const CanalEntry = new RpcEntry();
export const CanalOeuvre = new RpcOeuvre();
export const CanalExemple = new RpcExemple();
