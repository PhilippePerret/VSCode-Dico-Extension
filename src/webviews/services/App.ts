import { RpcChannel } from "../../bothside/RpcChannel";

export class App {
  /**
   * Les méthodes suivantes peuvent s'appeler en tapant simplement leur
   * nom en console (bas des panneaux — 'c' pour rejoindre la console)
   */

  private static async exportAntidote() {
    App.rpc.notify('export-antidote-relecture');
    return "Export pour Antidote et relecture";
  }
  private static async exportLecture(){ return this.exportAntidote(); }

  private static async exportPFB() {
    App.rpc.notify('export-pfb');
    return "Export pour Prawn-for-book";
  }

  private static async openSupport() {
    console.log("-> openSupport");
    App.rpc.notify('open-support-folder');
    return "Ouverture du dossier Support";
  }

  private static async exportAllData(){
    console.log("-> exportAllData");
    App.rpc.notify('export-all-data');
    return "Exportation des données demandée.";
  }

  private static get rpc(): RpcChannel {return (window as any).RpcEntry; }

  /**
   * 
   * Méthode fonctionnelles
   * 
   * @param code Code à évaluer
   * @returns True si tout s'est bien passé (le code à pu être évalué), False sinon
   * 
   */
  static eval(code: string){
    const ok = this.tryEval(code) || this.tryEval('this.' + code) || this.tryEval(code + '()') || this.tryEval('this.' + code + '()') || console.warn("Code non évaluable dans App : %s", code)
      ;
    if ( ok ) { return true ; }
    else { return false; }
  }
  private static tryEval(code: string){
    // console.log("Code à évaluer dans App.tryEval", code);
    try {
      // eval(code);
      const result = new Function('return ' + code).call(this);
      if (undefined === result) { throw new Error("Code qui ne renvoie rien");}
      if ( 'function' === typeof result) { result(); }
      return true;
    } catch(erreur) {
      // console.warn(erreur);
      return false;
    }
  }

}