export class App {
  /**
   * 
   * Les méthodes suivantes peuvent s'appeler en tapant simplement leur
   * nom en console (bas des panneaux — 'c' pour rejoindre la console)
   */

  private static openSupport() {
    console.log("je dois apprendre à ouvrir le dossier support");
    return "Ouverture du dossier Support";
  }

  private static exportAllData(){
    console.log("Je dois apprendre à backuper les données dans les fichiers.");
    return "Exportation des données demandée.";
  }


  /**
   * 
   * Méthode fonctionnelles
   * 
   * @param code Code à évaluer
   * @returns True si tout s'est bien passé (le code à pu être évalué), False sinon
   * 
   */
  static eval(code: string){
    // console.log("Code à évaluer dans App", code);
    const ok = this.tryEval(code) || this.tryEval('this.' + code) || this.tryEval(code + '()') || this.tryEval('this.' + code + '()') || console.warn("Code non évaluable dans App : %s", code)
      ;
    if ( ok ) { return true ; }
    else { return false; }
  }
  private static tryEval(code: string){
    try {
      // eval(code);
      const result = new Function('return ' + code).call(this);
      if (undefined === result) { throw new Error("Code qui ne renvoie rien");}
      if ( 'function' === typeof result) { result(); }
      return true;
    } catch(erreur) {
      // console.error(erreur);
      return false;
    }
  }

}