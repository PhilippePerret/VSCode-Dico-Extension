import { ConsoleManager } from "./ConsoleManager";
import { Entry } from "./models/Entry";
import { Exemple } from "./models/Exemple";
import { Oeuvre } from "./models/Oeuvre";
import { AccedableItem, AccessTable } from "./services/AccessTable";
import { FormManager } from "./services/FormManager";
import { Help } from "./services/HelpManager";
import { VimLikeManager } from "./services/VimLikeManager";
import "../bothside/class_extensions";
import { AnyItemType } from "../bothside/types";
import { stringify } from "querystring";


export type FlashMessageType = 'notice' | 'warn' | 'error' | 'action';

interface PanelConstructorData {
  minName: string;
  titName: string;
  klass: typeof Entry | typeof Oeuvre | typeof Exemple;
  form: any; // gestionnaire de formulaire
}

export class PanelClient<T extends AnyItemType> {
  
  // ========== A P I ================

  public tableKeys: Record<string, Function> = {}; // shortcuts propres aux panneaux
  public context: string = 'start';
  public form!: FormManager<any, any>;
  public get isActif(): boolean { return this._actif === true ; }
  public get isInactif(): boolean { return this._actif === false ; }
  public get keyManager(){ return this._keyManager; }
  // Pour marquer le panneau actif ou inactif
  public activate() { this.setPanelFocus(true); }
  public desactivate() { this.setPanelFocus(false); }

  /**
   * Méthode puissante permettant d'attendre une réaction de l'utilisateur en affichant un 
   * message. Typiquement, c'est le "Pour faire ça, tapez 1, pour faire ça, tapez 2".
   * 
   * Noter que ça n'est pas une méthode asynchrone. Si on l'utilise, c'est à l'ancienne, en
   * arrêtant le flux après elle.
   * 
   * @param msg Le message à afficher
   * @param buttons La table des raccourcis/fonctions qui doivent court-circuiter le fonctionnement
   *    Ils peuvent avoir deux formes : 
   *    - seulement la fonction buttons.set('<touche>', this.<fonction>.bind(this))
   *    - le message et la fonction : buttons.set('<touche>', ['le message', this.<fonction>.bind(this)])
   *      Dans ce dernier cas, le message sera affiché au-dessus et les boutons sous la console, dans la
   *      partie des outils du panneau.
   */
  public flashAction(msg: string, buttons: Map<string, any>) {
    let realButtons = buttons;
    this.flash(msg, 'action');
    if (Array.isArray(buttons.firstValue())) {
      realButtons = new Map();
      const outils: string[] = [];
      buttons.forEach((ary: any, lettre: string ) => {
        const [ordre, fonction] = ary;
        outils.push(`<shortcut>${lettre}</shortcut> ${ordre}`);
        realButtons.set(lettre, fonction);
      });
      // console.log("outils", outils);
      // On écrit les raccourcis dans le pied de page
      const o = document.createElement('div');
      o.id = 'footer-shortcuts';
      o.innerHTML = outils.join('&nbsp;&nbsp;');
      this.footer.appendChild(o); 
    } 
    // On donne les boutons au manager de clavier
    this.keyManager.keyboardBypass = realButtons;
  }


  /**
   * Affichage d'un message en haut du panneau.
   * 
   * @param msg Le message
   * @param type Le type de message
   */
  public flash(msg:string, type: FlashMessageType) {
    const o = document.createElement('div');
    o.className = type;
    o.innerHTML = msg;
    this.messageBox.appendChild(o);
    this.messageBox.style.zIndex = '10';
    if ( type === 'notice' ) {
      // Temporiser le message
      setTimeout(() => { this.cleanFlash.call(this); }, 10 * 1000);
    } else if ( type === 'action' ) {
      // Bloquer le message avec quelques lettres possibles seulement
    } else {
      // Sinon, on clique le message pour le fermer
      o.addEventListener('click', (ev: MouseEvent) => { this.cleanFlash(); });
    }
  }
  public cleanFlash(){ 
    const msgbox = this.messageBox;
    msgbox.innerHTML = '';
    msgbox.style.zIndex = '-1';
  }
  public cleanFooterShortcuts(){
    if ( this.footer.querySelector('div#footer-shortcuts')){
      (this.footer.querySelector('div#footer-shortcuts') as HTMLElement).remove();
    }
  }

  public activateContextualHelp() {
    this.help.activateContextualHelp();
  }
  
  // ========== MÉTHODES D'ÉLÉMENT =============
  // La sélection, sous la forme d'identifiant de l'élément
  private selection: string | undefined = undefined;
  public getSelection(){ return this.selection ; }

  /**
   * Méthode sélectionnant un élément. L'opération est complexe car
   * elle met non seulement en forme l'élément dans le DOM, mais elle
   * conserve en plus l'état de l'élément dans l'accessTable et gère
   * la sélection (sélection qui le moment est simple).
   */
  select(itemId: string) {
    this.selection && this.deselect(this.selection);
    this.setSelectState(itemId, true); 
    this.scrollTo(this._klass.getObj(itemId));
  }
  deselect(itemId: string) { this.setSelectState(itemId, false); }

  // Scroll jusqu'à l'élément et le sélectionne
  scrollToAndSelect(itemId: string){
    const klass = this._klass;
    const item = klass.get(itemId);
    if ( ! item ) { return ; }
    klass.isVisible(itemId) || klass.setVisible(itemId) ; 
    const ak = klass.getAccKey(itemId) ;
    this.select(itemId);
  }
  public scrollTo(obj: HTMLElement) {
    obj.scrollIntoView({behavior: 'auto', block: 'center'});
  }

  // Pour créer le nouvel élément 
  public insertInDom(item: T, before: T | undefined) {
    const clone = this.cloneItemTemplate() as DocumentFragment;
    const mainElement = clone.querySelector('.' + this.minName);
    if (mainElement) {
      mainElement.setAttribute('data-id', item.id);
    }
    // Et on l'ajoute au conteneur
    if (before) {
      this.container.insertBefore(clone, this.accessTable.getObj(before.id));
    } else {
      this.container.appendChild(clone);
    }
    // On actualise ou on renseigne ses valeurs
    this.updateInDom(item);
  }

  // Pour actualiser les valeurs dans le DOM
  public updateInDom(item: T): boolean {
    const obj = this.accessTable.getObj(item.id); // || throwError('item-obj-unfound');
    if (!obj){
      this.flash(`Impossible de trouver l'objet DOM de ${item.id}… Je ne peux pas actualiser l'affichage.`, 'error');
      return false;
    }
    // Régler les props
    // (maintenant, elles peuvent se trouver dans dbData, qui 
    // contient les données persistantes, ou dans cachedData, qui
    // contient les données formatées)
    Object.keys(item.dbData).forEach((prop: string) => {
      let value = ((item.dbData as unknown) as Record<string, string>)[prop] as string;
      // console.log("Actualisation de prop '%s' avec valeur '%s'", prop, value);
      this.setPropValue(obj, item, prop, value);
    });
    Object.keys(item.cachedData).forEach((prop: string) => {
      let value = ((item.cachedData as unknown) as Record<string, string>)[prop] as string;
      this.setPropValue(obj, item, prop, value);
    });
    return true;
  }

  // Pour peupler le panneau
  public populate(accessTable: AccessTable<any>): void {
    const container = this.container;
    container.innerHTML = '';
    accessTable.each((item: AnyItemType) => { this.insertInDom(item as T, undefined); });

    // Pour opérer après le peuplement du panneau. Par exemple, pour 
    // les exemples, on va ajouter les titres des œuvres.
    this.afterDisplayItems(accessTable);

    // Pour observer le panneau (les boutons, le champ de filtre, etc.)
    this.observePanel();
  }

  private setPropValue(obj: HTMLElement, item: Record<string, any>, prop: string, value: string | number) {
    // value = String(value);
    value = this.formateProp(item, prop, value);
    obj
      .querySelectorAll(`[data-prop="${prop}"]`)
      .forEach(element => {
        if (value.startsWith('<')) {
          element.innerHTML = value;
        } else {
          element.textContent = value;
        }
      });
  }

  // ========== PRIVATE METHODS ==============
  // Pour la propriété public keyManager
  initKeyManager() {
    this._keyManager = new VimLikeManager(document.body as HTMLBodyElement, this, this._klass);
  }

  private setSelectState(itemId: string, state: boolean){
    const obj = this.accessTable.getObj(itemId);
    obj.classList[state?'add':'remove']('selected');
    this.accessTable.setSelectState(itemId, state);
    this.selection = state ? itemId : undefined ;
  }
  private cloneItemTemplate(): DocumentFragment {
    return this.itemTemplate.content.cloneNode(true) as DocumentFragment;
  }
  // Méthode à surclasser pour traitement particulier de certaines valeurs
  // à afficher. Mais normalement, elles sont surtout traitées lors de la
  // mise en cache
  /* surclassed */ protected formateProp(item: any, prop: string, value: string | number | boolean) { return String(value); }
  /* surclassed */protected afterDisplayItems(accessTable: AccessTable<any>):void {}
  /* surclassed */ protected searchMatchingItems(searched: string): T[] { return []; }
  protected observePanel(): void {
    // Écouter le champ de filtre
    const field = this.searchInput;
    field.addEventListener('input', this.filterItems.bind(this));
    field.addEventListener('keyup', this.filterItems.bind(this));
    // Écouter le champ de console
    const cons = this.consoleInput;
    cons.addEventListener('keyup', this.watchAndRunConsole.bind(this));
  };
  // Méthode générique de filtrage des items du panneau
  private filterItems(ev: Event ) {
    const searched = this.searchInput.value.trim();
    const matchingItems: T[] = this.searchMatchingItems(searched);
    const matchingCount = matchingItems.length;
    console.log('[CLIENT %s] Filtrage %s - %i founds / %i élément', this.titName, searched, matchingCount, this.accessTable.size);
    const matchingIds = new Set(matchingItems.map((item: T) => item.id));
    // Avant, on bouclait sur les items (dans accessTable). Mais maintenant,
    // l'état des éléments n'étant pas consigné dans leur item, on boucle
    // sur leur 'accKey'
    this.accessTable.eachAccKey((ak: AccedableItem) => {
      const visible = matchingIds.has(ak.id);
      const display = visible ? 'block' : 'none';
      if ( ak.display !== display ) {
        // Pour le moment, on prend le parti de ne définir l'obj qu'au besoin,
        // plutôt que de faire une boucle pour tous les traiter.
        if (ak.obj === undefined) { ak.obj = this.accessTable.DOMElementOf(ak.id); }
        ak.obj.style.display = display;
        ak.display = display ;
        ak.visible = visible; 
      }
    });
  }
  filter(accessTable: AccessTable<any>, fnFiltre: (item: AnyItemType) => boolean): AnyItemType[] {
    return accessTable.findAll(
      (item: AnyItemType) => { return fnFiltre(item); },
      {}
    );
  }

  // ========== PRIVATE PROPERTIES ===========
  protected get container(){ return this._container || (this._container = document.querySelector('main#items') as HTMLDivElement);}
  private get itemTemplate(){ return this._itemTemplate || (this._itemTemplate = document.querySelector('template#item-template') as HTMLTemplateElement);}
  private get searchInput(){ return this._searchInput || (this._searchInput = document.querySelector('input#search-input') as HTMLInputElement);}
  public get consoleInput(){return this._consInput || (this._consInput = document.querySelector('input#panel-console') as HTMLInputElement);}
  private get messageBox(){ return document.querySelector('div#message') as HTMLDivElement;}
  private get footer(){return document.querySelector('footer') as HTMLElement; }
  private get help(){return this._help || (this._help = new Help(this));}

  private minName:string;
  private titName: string;
  private _klass: typeof Entry | typeof Oeuvre | typeof Exemple;
  protected get accessTable(): AccessTable<any> { return {} as AccessTable<any>; };
  private _actif: boolean = false;
  private _container!: HTMLDivElement;
  private _itemTemplate!: HTMLTemplateElement;
  private _searchInput!: HTMLInputElement;
  private _consInput!: HTMLInputElement;
  protected _keyManager!: VimLikeManager;
  private consoleManager!: ConsoleManager;
  private _help!: Help;
  
  constructor(data: PanelConstructorData) {
    this.minName = data.minName;
    this.titName = data.titName;
    this._klass = data.klass;
    this.form = data.form;
  }

  private setPanelFocus(actif: boolean) {
    // console.log("[setPanelFocus] Focus mis sur le panneau %s", this.titName);
    document.body.classList[actif ?'add':'remove']('actif');
    this._actif = actif ;
    this.keyManager.setMode('normal');
  }

  /** 
   * Méthode appelée quand on joue une touche dans la console
   */
  watchAndRunConsole(ev: KeyboardEvent) { 
    this.consoleManager || (this.consoleManager = new ConsoleManager(this));
    if ( ev.key === 'Enter') {
      // On ne la charge qu'au besoin
      this.consoleManager.runCode();
    } else if ( ev.key === 'ArrowDown') {
      this.consoleManager.forwardHistory();
    } else if ( ev.key === 'ArrowUp') {
      this.consoleManager.backHistory();
    }

  }
}