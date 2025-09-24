import { StringNormalizer } from "../../bothside/StringUtils";
import { FlashMessageType, PanelClient } from "../PanelClient";

export class TextFormater {

  public static formate(
    panel: PanelClient<any>,
    obj: HTMLElement,
    as: 'definition' | 'exemple'
  ){
    const Formater = new TextFormater({panel, obj, as});
    Formater.formate();
  }
  private panel: PanelClient<any>;
  private obj: HTMLElement;
  private as: string;
  constructor(params: {panel: PanelClient<any>, obj: HTMLElement, as: string}){
      this.panel = params.panel;
      this.obj = params.obj;
      this.as = params.as;
  }
  // Raccourci
  private flash(msg: string, type: FlashMessageType){ this.panel.flash(msg, type);}

  public formate(){
    const rawContent = this.obj.innerText;
    if ( rawContent.startsWith('<formated>')){
      this.flash('Ce contenu a déjà été mis en forme…', 'warn');
      return ;
    }
    const formater = this.formaterPerType(this.as) as Function;
    const formatedText = '<formated>' + formater(this.obj.innerText);
    this.obj.innerHTML = formatedText;

    // On place les observateurs sur les liens
    this.obj.querySelectorAll('a').forEach((alink: HTMLElement) => {
      alink.addEventListener('click', this.panel.onClickALink.bind(this.panel, alink) as any);
    });
    this.flash('Contenu mis en forme.', 'notice');
  }

  private formaterPerType(as: string) {
    switch(as){
      case 'definition': return this.formateDefinition.bind(this);
      case 'exemple': return this.formateExemple.bind(this);
    }
  }
  
  private REG_EXEMPLES: RegExp = /EXEMPLES\[([^\]]+)\]/g;

  private formateDefinition(content: string): string {
    return content
      // Tous les liens vers les définitions
      .replace(/ttp\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLinkWithPage.bind(this, 'tt'))
      .replace(/tt\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLink.bind(this, 'tt'))
      .replace(/ttw\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLink.bind(this, 'no-style'))
      .replace(/\-\>\(([^)|]+)(?:\|([^)]+))?\)/g, this.replacerEntryLink.bind(this, 'arrowed'))
      // Les diminutifs
      .replace(/dim\(([^)]+)\)/g, this.formateDiminutif.bind(this))
      // Les exemples
      .replace(this.REG_EXEMPLES, this.replacerExemples.bind(this))
      ;
  }
  private formateExemple(content: string): string {
    return content;
  }


  /**
   * 
   * === MÉTHODES DE FORMATAGE ===
   * 
   * 
   */

  private TABLE_DIMS: Map<string, string> = new Map(); 

  private formateDiminutif(_tout:string, term: string): string {
    term = term.trim();
    if (this.TABLE_DIMS.has(term)) {
      return this.TABLE_DIMS.get(term) as string;
    }
    const dimi: string = '<em>' + term
      .split(/([ \-’])/)
      .map( (mot: string) => {
        switch(mot) {
          case ' ': return ' ';
          case '-': return '-';
          case 'de': case 'du': case 'des': case 'la': case 'le': case 'd':
            return mot;
          default: 
            return mot.replace(/^(.)[^œaeiouyéèêëîïàâôùûü]*/i, '$1.'); 
        }
      })
      .join('') + '</em>';
      this.TABLE_DIMS.set(term, dimi);

    return dimi;
  }

  private replacerExemples(_tout: string, exemples_marks: string): string {
    return 'EXEMPLES : ' + exemples_marks
      .split(',')
      .map((ex: string) => {
        let [oeuvreId, exIndice] = ex.trim().split(':');
        return `<a data-type="exemple" data-id="${ex}" data-method="goToExemple">Exemple n°${exIndice} de l’œuvre ${oeuvreId}</a>`;
      })
      .join(', ');
  }
  
  private replacerEntryLinkWithPage(type: string, tout: string, idOrText: string, id: string|undefined): string {
    return this.replacerEntryLink(type, tout, idOrText, id) + ' (p. xxx)';
  }

  private replacerEntryLink(type: string, _tout: string, idOrText: string, id: string | undefined){
    let defId: string = StringNormalizer.rationalize(String(id || idOrText));
    // Vérification de l'existence de la définition
    if( false === this.idExists(defId)) {
      if (defId.endsWith('s')){ defId = defId.substring(0, defId.length - 1) as string; }
    }
    if (false === this.idExists(defId)){
      this.flash("Identifiant inconnu : " + defId, 'error');
      return `[Unknown ID ${idOrText}]` ;
    }

    const text: string = String(idOrText);
    return `<a class="${type}" data-id="${defId}" data-method="goToDef">${text}</a>`;
  }

  idExists(itemId: string): boolean{
    return this.panel.accessTable.exists(itemId);
  }
}