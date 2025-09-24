import { PanelClient } from "../PanelClient";
import { App } from "./App";

export class Help {
  /**
   * Définitions des aides contextuelles.
   * Soit un simple string (si pas de raccourcis clavier)
   * Soit un array [aide, {lettre: methode-string}] 
   */
  static get(keyHelp: string): string |undefined {
    switch(keyHelp){

      // FENÊTRE DE DÉMARRAGE
      case 'start': return `
      ## Démarrage de l'extension

      Pour commencer, activer le premier panneau (entrées) avec ⌘1.

      À tout moment, vous pouvez obtenir de l'aide contextuelle en tapant "?" (donc "⇧,").
      
      Les raccourcis de base, utilisable dans les trois panneaux, sont les suivants :

      ${this.buildShortcutsTable([
        {s: 's', m: 'NORMAL', d: 'Pour se placer dans le champ de filtre et filtrer la liste.'},
        {s: 'n', m: 'NORMAL', d:'Pour créer un nouvel élément.'},
        {s: 'j', m: 'NORMAL', d: 'Pour sélectionner l’élément suivant ou le premier.'},
        {s: 'k', m: 'NORMAL', d: 'Pour remonter à l’élément précédent'},
        {s: 'b', m: 'NORMAL', d: '(comme « back ») Pour sélectionner l’élément précédemment sélectionné'},
        {s: 'f', m: 'NORMAL', d: 'Pour repasser à l’élément suivant de l’historique des sélections'},
        {s: 'r', m: 'NORMAL', d: 'Pour retirer la sélection de l’historique des sélections'},
        {s: 'e', m: 'NORMAL', d: 'Pour mettre en édition l’élément sélectionné.'},
        {s: 'm', m: 'NORMAL', d: '(comme « mise en forme ») pour mettre en forme le texte.'},
        {s: 'Tab', m: 'NORMAL', d: 'pour passer de lien en lien (définition et exemple)'},
        {s: '⇧Tab', m: 'NORMAL', d: 'Passer de lien en lien en remontant'},
        {s: 'g', m: 'NORMAL', d: 'Rejoindre la cible du lien'},
        {s: 'c', m: 'NORMAL', d: 'Pour se placer dans la console et jouer une commande.'},
        {s: 'C (⇧c)', m: 'NORMAL', d: 'Choisir l’entrée sélectionnée pour le nouvel exemple déjà en édition.'},
        {s: 'E (⇧e)', m: 'NORMAL', d: 'Créer un nouvel exemple pour l’entrée.'},
      ])}
      
      À tout moment, taper **?** pour afficher l'aide contextuelle.
      
      ## Commandes

      ${this.buildCommandsTable([
        {c: 'openSupport', d:'… pour ouvrir le dossier support dans le Finder, qui contient la base et tous les backups.' },
        {c: 'exportAllData', d: '… pour faire un export des données dans quatre formats, JSON, YAML, CSV et Simple Text.'},
      ])}

      ## Édition de la définition

      ### Autocomplétion


      ${this.buildShortcutsTable([
        {s: 'tt⇥', m:'EDIT', d: 'Ajouter un mot technique indexé'},
        {s: '->(⇥', m:'EDIT', d: 'Ajouter un mot technique avec numéro de page'},
        {s: 'ttp⇥', m:'EDIT', d: 'Ajouter la page d’un mot technique'}
      ])}


      ### Insertion d'un exemple (existant)


      Avec l'item en édition et le curseur placé au bon endroit, rejoindre le panneau des exemples (⌘3), filtrer pour n'afficher que le film (<shortcut>s</shortcut> puis 1res lettres), sélectionner l'exemple voulu (<shortcut>j</shortcut>/<shortcut>k</shortcut>) et enfin tapez <shortcut>i</shortcut> (comme « identifiant » ou « insérer »).

      Automatiquement, l'identifiant de l'exemple sera inséré dans l'entrée éditée.
      `
      ;

      // CRÉATION D'UN ÉLÉMENT QUELCONQUE
      case 'create-element': return `
      ## Création d'un élément
      
      Vous pouvez vous déplacer de champ en champ avec les touches 
      <shortcut>a</shortcut>, <shortcut>b</shortcut>, etc. ou la touche 
      tabulation.`;

      // CRÉATION D'UNE OEUVRE
      case 'create-oeuvre': return `
      ## Création d'une œuvre

      Jouer la touche <shortcut>n</shortcut> pour créer le nouvel élément.

      Une fois le titre rentré, grâce à la touche <shortcut>i</shortcut>, vous 
      pouvez obtenir les infos qu'on peut trouver sur le net. En précisant l'année 
      (approximative), la langue et/ou le pays, vous pouvez être presque certain 
      de trouver l'œuvre du premier coup.

      L'année (approximative à 10 ans près) se met dans le champs dédie, la langue 
      et le pays peuvent s'indiquer dans le champs 'notes' sous la forme JSON. Par 
      exemple <code>{"langue": "en", "pays": "us"}</code>.

      Ensuite, TMDB renvoie la liste de toutes les œuvres correspondantes qu'il a 
      trouvé et les passe en revue pour choisir laquelle garder. Ça se fait en deux 
      temps :

      - relève de toutes les œuvres, d'un coup, avec infos minimales,
      - on fait un tri par rapport à celles-ci,
      - TMDB relève les informations complètes (principalement les crédits),
      - On choisit celle qui correspond vraiment.
      `;

      // ÉDITION D'UN ÉLÉMENT
      case 'edit-element': return `
      ## Édition d'un élément
      
      Vous pouvez aller de champ en champ avec les touches etc.`;

      // ÉDITION D'UNE OEUVRE
      case 'edit-oeuvre': return `
      ## Édition d'une œuvre

      Déplacez-vous de champ en champ avec la touche tabulation ou en jouant 
      les lettres en regard des champs.
      `;
    }
  }
  /**
   * Pour construire une table de commande 
   * 
   * @param shortcuts Définition des commandes
   * @returns  La table HTML
   */
  private static buildCommandsTable(commands: {c: string, d: string}[]): string{
    const rows: string[] = [];
    rows.push('<tr><td>Commande</td><td>Effet</td></tr>');
    commands.forEach(sc => rows.push(`<tr><td>${sc.c}</td><td>${sc.d}</td></tr>`));
    return '<table class="commands">' + rows.join('') + '</table>';
  }

  /**
   * Pour construire une table de raccourcis-clavier
   * 
   * @param shortcuts Définition des raccourcis
   * @returns  La table HTML
   */
  private static buildShortcutsTable(shortcuts: {s: string, m: string, d: string}[]): string{
    const rows: string[] = [];
    rows.push('<tr><td>Racc.</td><td>MODE</td><td>Effet</td></tr>');
    shortcuts.forEach(sc => rows.push(`<tr><td><shortcut>${sc.s}</shortcut></td><td>${sc.m}</td><td>${sc.d}</td></tr>`));
    return '<table class="shortcuts">' + rows.join('') + '</table>';
  }


  constructor(private panel: PanelClient<any>) {
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
    let content: string = Help.get(context) as string;
    return [this.formate(content as string) as string, kbb];
  }

  formate(str: string): string {
    // console.log("-> formate (formatage du texte d'aide", str);
   return str
      // Pour "compacter" les codes HTML de paragraphe, table, etc.
      .trim()
      .replace(/^\s+/gm, '')
      .replace(/>\n+/g, '>')
      .replace(/\n+<\//g, '</')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/mg, '<h3>$1</h3>')
      .replace(/^## (.+)$/mg, '<h2>$1</h2>')
      .replace(/^# (.+)$/mg, '<h1>$1</h1>')
      .split("\n\n")
      .map(s => {
        // console.log("Segment: ", s);
        if (s.startsWith('<')){return s;}
        else {return `<p>${s}</p>`;}
      })
      .join('');
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