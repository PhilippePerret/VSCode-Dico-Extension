import { Entry } from "../models/Entry";
import { Exemple } from "../models/Exemple";
import { Oeuvre } from "../models/Oeuvre";
import { PanelClient } from "../PanelClient";
import { stopEvent } from "./DomUtils";

type MODES = 'normal' | 'edit' | 'null' | 'form' ;

export class VimLikeManager {
  // 
  /**
   * MODE DU PANNEAU
   * 
   * Pour le moment, le panneau peut être dans deux états, en
   * fonction du fait que le curseur se trouve dans un champ
   * éditable ou non.
   */
  protected _keylistener: (ev: KeyboardEvent) => true | false | undefined | void;
  protected _mode: MODES = 'normal' ; 
  protected get mode() { return this._mode ; }
  public setMode(mode: MODES) { this.mode = mode; }
  protected set mode(mode: MODES) { // de l'extérieur, utiliser la méthode setMode 
    this._mode = mode ;
    // Le mode détermine le capteur d'évènement
    switch(mode) {
      case 'edit':
        console.log("[VimLikeManager.mode] Passage du mode clavier au mode edit");
        this._keylistener = this.onKeyDownModeEdit.bind(this);
        break;
      case 'normal':
        console.log("[VimLikeManager.mode] Passage du mode clavier au mode normal");
        this._keylistener = this.onKeyDownModeNormal.bind(this);
        break;
      case 'null':
        console.log('Le panneau est en mode null (sans action');
        this._keylistener = this.onKeyDownModeNull.bind(this);
        break;
      case 'form':
        console.log("Panneau en mode FORMulaire");
        this._keylistener = this.onKeyDownModeEdit.bind(this);
    }
    // Indiquer dans l'interface le mode
    this.root.dataset.mode = `mode-${mode}` ;
    const spanName = this.root.querySelector('span#mode-name') as HTMLSpanElement;
    spanName.innerHTML = mode.toLocaleUpperCase();
  }

  readonly searchInput: HTMLInputElement;
  readonly consoleInput: HTMLInputElement;

  constructor(
    private root: HTMLBodyElement, 
    private panel: PanelClient<any, any>, 
    private klass: typeof Entry | typeof Oeuvre | typeof Exemple,
  ) {
    this.mode = 'normal';
    // @DEPRECATED Il faut être plus précis. Si on fait ça, dans le formulaire
    // le mode est toujours remis au mode normal et edit
    // this.root.addEventListener('focusin', this.onFocusIn.bind(this));
    // this.root.addEventListener('focusout', this.onFocusOut.bind(this));

    // Pour placer une capture "universelle", c'est-à-dire qui capture les keydown
    // quel que soit le mode courant
    this.root.addEventListener('keydown', this.universelKeyboardCapture.bind(this), true);
    // La méthode qui capture les touches et les renvoie vers la méthode appropriée
    // en fonction du mode.
    this.root.addEventListener('keydown', this.onKeyDown.bind(this));
    this._keylistener = this.onKeyDownModeNull.bind(this);
    this.searchInput = this.root.querySelector('input#search-input') as HTMLInputElement;
    this.consoleInput = this.root.querySelector('input#panel-console') as HTMLInputElement;
    this.searchInput.addEventListener('focus', this.onFocusEditField.bind(this, this.searchInput));
    this.searchInput.addEventListener('blur', this.onBlurEditField.bind(this, this.searchInput));
    this.consoleInput.addEventListener('focus', this.onFocusEditField.bind(this, this.consoleInput));
    this.consoleInput.addEventListener('blur', this.onBlurEditField.bind(this, this.consoleInput));
  }

  onFocusEditField(field: HTMLInputElement, ev: FocusEvent) {
    this.setMode('edit');
  }
  onBlurEditField(field: HTMLInputElement, ev: FocusEvent ) {
    this.setMode('normal');
  }
  // La méthode qui choppe normalement toutes les touches, quel que soit le mode
  universelKeyboardCapture(ev: KeyboardEvent){
    console.log("[universel capture] Key up = ", ev.key, ev);
    return true;
  }

  /**
   * API
   * Méthode de discrimination dans l'objet +obj+. Tous les champs qu'il contient
   * qui sont des champs d'édition textuels vont faire basculer dans le mode :editMode
   * quand ils sont focusser et le mode :normalMode (souvent 'normal') quand on va
   * les blurer 
   * 
   * @param obj {HTMLElement} Bloc contenant les champs d'édition
   * @param modes {Hash} Table définisssant :edit et :normal pour savoir le nom des
   * modes à utiliser en édition (dans un champ éditable) et hors édition.
   */
  discrimineFieldsForModeIn(obj: HTMLElement, modes: {edit: MODES, normal: MODES}) {
    const selectors = 'input[type="text"], input[type="email"], input[type="password"], textarea, [contenteditable]';
    obj.querySelectorAll(selectors).forEach(field => {
      field.addEventListener('focus', this.setMode.bind(this, modes.edit));
      field.addEventListener('blur', this.setMode.bind(this, modes.normal));
    });
  }

  onKeyDown(ev: KeyboardEvent) { 
    return this._keylistener(ev);
  }

  /**
   * ============ TOUS LES MODES DE CLAVIER ================
   */

  // Quand la touche meta est pressée, on passe toujours par là
  onKeyDownWithMeta(ev: KeyboardEvent) {
    switch(ev.key) {
      case 'q': case 'Q':
        stopEvent(ev);
        console.log("On ne peut pas quitter comme ça…");
        break;
      case 's': case 'S':
        stopEvent(ev);
        console.log("Demande de sauvegarde forcée.");
        break;
    }
  }
  
  onKeyDownModeNormal(ev: KeyboardEvent) {
    console.log("-> VimLikeManager.onKeyDownModeNormal", ev.key, ev);
    if ( ev.metaKey ) { return this.onKeyDownWithMeta(ev) ; }
    stopEvent(ev);
    switch(ev.key) {
      case 'j': // Sélection item après
        this.klass.accessTable.selectNextItem(this.panel); break;
      case 'k': // Sélection item avant
        this.klass.accessTable.selectPrevItem(this.panel); break;
      case 's': // focus dans champ de filtre
        this.searchInput.focus(); break;
      case 'c': // focus dans console
        this.consoleInput.focus(); break;
      case 'e':
        if ( this.panel.getSelection() ) {
          this.klass.editItem(this.panel.getSelection() as string);
        } else { console.log("Pas de sélection à éditer");}
        break;
      case 'n':
        this.klass.createNewItem();
        break;
      default: 
        console.log("Pour le moment, je ne fais rien de '%s'", ev.key);
    }
    return false;
  }

  /**
   * Gestionnaire des touches de clavier en mode EDIT (dans un
   * champ d'édition) 
   */
  onKeyDownModeEdit(ev: KeyboardEvent) {
    if ( ev.metaKey ) { return this.onKeyDownWithMeta(ev) ; }
    switch(ev.key) {
      case 'Tab': 
        // TODO il faut voir si on est dans la champ de filtrage
        this.searchInput.blur();
        this.klass.selectFirstItem();
        return stopEvent(ev);
    }
    return true;
  }

  // Mode clavier pour le formulaire
  onKeyDownModeForm(ev: KeyboardEvent) {
    if (ev.metaKey) { return this.onKeyDownWithMeta(ev); }
    switch (ev.key) {
      case 'l':
        console.log("Je dois délocker le bouton du formulaire");
        break;
    }
  }
  
  onKeyDownModeNull(ev: KeyboardEvent) {
    console.error("Il faut activer un mode de clavier");
    return stopEvent(ev);
  }

  // @return true si la cible de l'évènement +ev+ est un champ éditable
  targetEventIsEditable(ev: any) : boolean {
    return (ev.target as HTMLElement).matches('input, textarea, [contenteditable]');
  }
}