import { PanelClient } from "../PanelClient";

export class Help {
  /**
   * Définitions des aides contextuelles.
   * Soit un simple string (si pas de raccourcis clavier)
   * Soit un array [aide, {lettre: methode-string}] 
   */
  static get CHELPS(): {[x: string]: any} {
    return {
    'start': 
      `Pour commencer, activer la fenêtre avec ⌘1.

      À tout moment, vous pouvez obtenir de l'aide contextuelle en tapant "?".
      
      Les raccourcis de base sont les suivants :
      
      **s** : (comme "search") pour rechercher un élément (par filtrage).
      **f**/**k** : pour sélectionner d'élément en élément en montant et en descendant.
      **n** : (comme "nouveau") pour créer un nouvel élément avant la sélection.
      **e**: (comme "éditer") pour modifier l'élément sélectionné.
      
      À tout moment, taper **?** pour afficher l'aide contextuelle.`
    };    
  }
  constructor(private panel: PanelClient<any, any>) {
  }
  /**
   * API
   * Méthode activant l'aide circonstantielle.
   * (voir le manuel)
   */
  public activateContextualHelp(){
    const context = this.panel.context;
    const extraParams = this.affineContexte(context);
    const [content, KbBypass] = this.defineCHelp(context, extraParams);
    this.showCHelp(content);
    this.panel.keyManager.keyboardBypass = KbBypass;
  }

  private affineContexte(context: string): Record<string, any> | undefined {
    switch(context) {
      case 'create-new-element': 
        // il faut voir si l'user est au début ou à la fin
        return {};
      default: return;
    }
  }


  private defineCHelp(context:string, params: Record<string, any> | undefined): [string, Map<string, any>] {
    const kbb = new Map();
    kbb.set('q', this.closeCHelp.bind(this));
    let bypass: {[x:string]: any};
    let content: string | Array<any> = Help.CHELPS[context];
    if ( Array.isArray(content)) {
      [content, bypass] = content;
      for (var k in bypass) { kbb.set(k, bypass[k]); }
    }
    return [this.formate(content as string) as string, kbb];
  }

  formate(str: string): string {
    return str
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split("\n").map(s => `<div>${s} </div>`).join('');
  }
  /**
   * Affichage du texte d'aide contextuelle et mise en attente
   * 
   * (note : le "C" de "Chelp" pour "contextual")
   * 
   * @param content Le contenu textuel à afficher
   */
  private showCHelp(content: string) {
    this.CHbuilt || this.CHbuild();
    this.CHObj.classList.remove('hidden');
    const divCont = (this.CHObj.querySelector('.content') as HTMLElement);
    divCont.innerHTML = content;
  }
  private CHObj!: HTMLDivElement;
  private CHbuilt: boolean = false;

  public closeCHelp(){
    this.CHObj.classList.add('hidden');
  }
  
  // Construction du div de l'aide contextuelle
  CHbuild(){
    let o = document.createElement('div');
    o.className = "aide-contextuelle hidden";
    let cont = document.createElement('div');
    cont.className = 'content';
    o.appendChild(cont);
    let btns = document.createElement('div');
    btns.className = 'buttons';
    btns.innerHTML = 'q: quitter l’aide';
    o.appendChild(btns);
    document.body.appendChild(o);
    this.CHObj = o;
    this.CHbuilt = true;
  }
}