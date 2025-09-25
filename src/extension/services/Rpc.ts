import * as vscode from 'vscode';
import { createRpcServer } from './panels/RpcServer';
import { Entry } from '../models/Entry';
import { Oeuvre } from '../models/Oeuvre';
import { App } from './App';
import { execSync } from 'child_process';
import { Exemple } from '../models/Exemple';

abstract class Rpc {
  protected panel: any;
  protected rpc: any;
  protected abstract panelName: string;

  // Appelée après l'enregistrement de l'item, pour confirmation ou 
  // signalement d'une erreur
  afterSaveItem(params: {CRId: string, ok: boolean, errors: any, item: any, itemPrepared: any}){
    // console.log("[ENTENSIONS] Remontée au panneau après sauvegarde Item", params);
    this.rpc.notify('after-saved-item', params);
  }

  // C'est ici qu'on détermine le panneau, quand il est fait
  initialize(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.rpc = createRpcServer(panel);

    // ON peut définir ici les méthodes communes à tous les canaux.


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
  

  // Pour demander au panneau le peuplement du panneau en lui
  // transmettant les données des entrées.
  async askForPopulate(data: {[k:string]: any}): Promise<void>{
    console.log("[EXTENSION] Envoi des données du %s pour peuplement", this.panelName);
    this.rpc.ask("populate", { data: data }).then( (retour: {[k:string]:any}) => {
      console.log("Retour après populate des données du %s.", this.panelName, retour);
    });
  }

}



/**
 * 
 * 
 * ================== RPC ENTRY ==================
 * 
 * 
 */

// Toutes les commandes de message doivent être définies ici
class RpcEntry extends Rpc {
  protected panelName = 'panneau des entrées';

  // Pour afficher une entrée (en la sélectionnant);
  displayEntry(param: { entry_id: string }) {
    this.rpc.notify('display-entry', param);
  }

  // Pour retourner le résultat du check des oeuvres au panneau des oeuvres
  resultatCheckingOeuvres(params: {CRId: string, resultat: {known: string[], unknown: string[]}}){
    // console.log("[EXTENSION] Envoi des résultats du check des oeuvres au panneau Entrées");
    this.rpc.notify('check-oeuvres-resultat', params);
  }
  // Pour retourner le résultat du check des oeuvres au panneau des oeuvres
  resultatCheckingExemples(params: {CRId: string, resultat: {known: string[], unknown: string[]}}){
    // console.log("[EXTENSION] Envoi des résultats du check des exemples au panneau Entrées");
    this.rpc.notify('check-exemples-resultat', params);
  }

  initialize(panel: vscode.WebviewPanel): void {
    super.initialize(panel);

    this.rpc.on('check-oeuvres', async (params: { CRId: string, oeuvres: string[] }) => {
      // console.log("[EXTENSION Demande de vérification des oeuvres : ", params);
      CanalOeuvre.checkOeuvres(params);
    });

    this.rpc.on('check-exemples', async (params: {CRId: string, exemples: string[][]}) => {
      // console.log("[EXTENTION] Demande de vérification des exemples :", params);
      CanalExemple.checkExemples(params);
    });

    this.rpc.on('save-item', async (params: any) => {
      // console.log("[EXTENSION] Reception de l'entrée à sauver", params);
      Object.assign(params, { ok: null, errors: [] });
      Entry.saveItem(params);
    });

    this.rpc.on('entry-for-exemple', async (params: {entryId: string, entryEntree: string}) => {
      CanalExemple.notify('entry-for-exemple', params);
    });

    this.rpc.on('show-exemple', async (params: {exId: string}) => {
      console.log("EXTENSION ENTRY] Demander à voir l'exemple", params.exId);
      CanalExemple.notify('show-exemple', params);
    });

    // === COMMANDES CONSOLE ===

    this.rpc.on('export-all-data', async () => {
      console.log("[EXTENSION] Demande de sauvegarde des données");
      execSync(`ruby ${App._context.extensionPath}/src/data/export-data.rb`);
      this.notify('flash', {message: "Toutes les données ont été backupées dans des fichiers."});
    });

    this.rpc.on('open-support-folder', async () => {
      console.log("[EXTENTION] Ouverture du dossier support");
      execSync(`open -a Finder "${App.supportFolder}"`, {encoding: 'utf8'});
      this.notify('flash', {message: "Dossier support ouvert dans le finder"});
    });

    this.rpc.on('export-antidote-relecture', async () => {
      execSync(`ruby ${App._context.extensionPath}/src/data/export-for-antidote.rb`);
      this.notify('flash', {message: "Export relecture (et Antidote) effectué."});
    });
    
    this.rpc.on('export-pfb', async () => {
      execSync(`ruby ${App._context.extensionPath}/src/data/export-pfb.rb`);
     this.notify('flash', {message: "Export pour Prawn-for-book effectué avec succès."}); 
    });
  }
}


/**
 * 
 * 
 * =================== RPC OEUVRE =====================
 * 
 * 
 * 
 */


class RpcOeuvre extends Rpc {
  protected panelName = 'panneau des œuvres';
  checkOeuvres(params: {CRId: string, oeuvres: string[]}) {
    this.rpc.notify('check-oeuvres', params);
  }
  // Définir ici les méthodes messages avec le panneau des Oeuvres
  displayOeuvre(param: {oeuvreId: string}){
    this.rpc.notify('display-oeuvre', param);
  }


  // Définition des récepteurs on
  initialize(panel: vscode.WebviewPanel): void {
    super.initialize(panel);
    
    this.rpc.on('check-oeuvres-resultat', (params: {CRId: string, resultat: {known: string[], unknown: string[]}}) => {
      // console.log("[EXTENSION] Réception du résultat du check des oeuvres", params);
      CanalEntry.resultatCheckingOeuvres(params);
    });

    this.rpc.on('save-item', async (params: any) => {
      // console.log("[EXTENSION OEUVRE] Réception de l'œuvre à sauver", params);
      Object.assign(params, {ok: null, errors: []});
      Oeuvre.saveItem(params);
    });

    this.rpc.on('oeuvre-for-exemple', async (params: {oeuvreId: string, oeuvreTitre: string}) => {
      CanalExemple.notify('oeuvre-for-exemple', params);
    });

    this.rpc.on('tmdb-secrets', async () => {
      console.log("[EXTENSION] Demande des secrets TMDB");
      const secrets = App.getTMDBSecrets();
      return secrets;
    });
 }
}




/**
 * 
 * 
 * ============= RPC EXEMPLES =====================
 * 
 * 
 * 
 */

class RpcExemple extends Rpc {
  protected panelName = 'panneau des exemples';
  // Définir ici les méthodes messages avec le panneau des exemples

  checkExemples(params: {CRId: string, exemples: string[][]}) {
    this.rpc.notify('check-exemples', params);
  }

  // Appelée après l'enregistrement de l'item, pour confirmation ou 
  // signalement d'une erreur
  afterSaveItem(params: {CRId: string, ok: boolean, errors: any, item: any}){
    // console.log("[ENTENSIONS] Remontée au panneau après sauvegarde Item", params);
    this.rpc.notify('after-saved-item', params);
  }


  initialize(panel: vscode.WebviewPanel) {
    super.initialize(panel);
    // console.log("-> initialisation du rpc et des méthodes", this.rpc);

    this.rpc.on("display-entry", async (params: { entry_id: string }) => {
      // console.log("[EXTENSION] Demande d'affichage de l'Entrée ", params.entry_id);
      // return { ok: true };
      // On le relaye au panneau des entrées
      CanalEntry.displayEntry(params);
    });
    this.rpc.on('display-oeuvre', async (params: { oeuvreId: string }) => {
      // console.log("[EXTENSION] Demande affichage oeuvre %s", params.oeuvreId, params);
      CanalOeuvre.displayOeuvre(params);
    });

    this.rpc.on('check-exemples-resultat', async (params: {CRId: string, resultat: {known: string[], unknown: string[]}}) => {
      // console.log("[EXTENSION] Réception du résultat du check des exemples", params);
      CanalEntry.resultatCheckingExemples(params);
    });

    this.rpc.on('save-item', async (params: any) => {
      // console.log("[EXTENSION] Reception de l'exemple à sauver", params);
      Object.assign(params, { ok: null, errors: [] });
      Exemple.saveItem(params);
    });

    this.rpc.on('send-id-exemple-to-definition', async (params: {exempleId: string}) => {
      // console.log("[EXTENSION Canal Exemple] Réception id-exemple '%s' pour définition", params.exempleId);
      CanalEntry.notify('send-id-exemple-to-definition', params);
      App.activatePanel('entries');
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
