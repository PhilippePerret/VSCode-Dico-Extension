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
      
      À tout moment, taper **?** pour afficher l'aide contextuelle.`,
      
      // Crétation d'un élément
      'create-element': `
      ## Création d'un élément
      
      Vous pouvez vous déplacer de champ en champ avec les touches <shortcut>a</shortcut>, <shortcut>b</shortcut>, etc. ou la touche tabulation.`,
      

      // Création d'une œuvre
      'create-oeuvre': `
      ## Création d'une œuvre

      Jouer la touche <shortcut>n</shortcut> pour créer le nouvel élément.

      Une fois le titre rentré, grâce à la touche <shortcut>i</shortcut>, vous pouvez obtenir les infos qu'on peut trouver sur le net. En précisant l'année (approximative), la langue et/ou le pays, vous pouvez être presque certain de trouver l'œuvre du premier coup.

      L'année (approximative à 10 ans près) se met dans le champs dédie, la langue et le pays peuvent s'indiquer dans le champs 'notes' sous la forme JSON. Par exemple <code>{"langue": "en", "pays": "us"}</code>.

      Ensuite, TMDB renvoie la liste de toutes les œuvres correspondantes qu'il a trouvé et les passe en revue pour choisir laquelle garder. Ça se fait en deux temps :

      - relève de toutes les œuvres, d'un coup, avec infos minimales,
      - on fait un tri par rapport à celles-ci,
      - TMDB relève les informations complètes (principalement les crédits),
      - On choisit celle qui correspond vraiment.

      `,
      
      // ÉDITION d'un élément
      'edit-element': `
      ## Édition d'un élément
      
      Vous pouvez aller de champ en champ avec les touches etc.`,

      // ÉDITION D'UNE OEUVRE
      'edit-oeuve': `
      ## Édition d'une œuvre

      Déplacez-vous de champ en champ avec la touche tabulation ou en jouant les lettres en regard des champs.
      `,
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