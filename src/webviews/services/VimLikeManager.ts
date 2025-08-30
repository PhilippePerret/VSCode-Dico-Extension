import { Entry } from "../models/Entry";
import { Exemple } from "../models/Exemple";
import { Oeuvre } from "../models/Oeuvre";
import { PanelClient } from "../PanelClient";
import { stopEvent } from "./DomUtils";

type MODES = 'normal' | 'edit' ;

export class VimLikeManager {
  // 
  /**
   * MODE DU PANNEAU
   * 
   * Pour le moment, le panneau peut être dans deux états, en
   * fonction du fait que le curseur se trouve dans un champ
   * éditable ou non.
   */
  protected _keylistener: (ev: KeyboardEvent) => true | false | undefined;
  protected _mode: MODES = 'normal' ; 
  protected get mode() { return this._mode ; }
  protected set mode(mode: MODES) { 
    this._mode = mode ;
    // Le mode détermine le capteur d'évènement
    switch(mode) {
      case 'edit':
        console.log("Passage du mode clavier au mode edit");
        this._keylistener = this.onKeyDownModeEdit.bind(this);
        break;
      case 'normal':
        console.log("Passage du mode clavier au mode normal");
        this._keylistener = this.onKeyDownModeNormal.bind(this);
    }
    // Indiquer dans l'interface le mode
    this.root.dataset.mode = `mode-${mode}` ;
    const spanName = this.root.querySelector('span#mode-name') as HTMLSpanElement;
    spanName.innerHTML = mode.toLocaleUpperCase();
  }

  readonly searchInput: HTMLInputElement;
  readonly consoleInput: HTMLInputElement;

  constructor(
    private root: HTMLElement, 
    private panel: PanelClient<any, any>, 
    private klass: typeof Entry | typeof Oeuvre | typeof Exemple,
  ) {
    this.mode = 'normal';
    this.root.addEventListener('focusin', this.onFocusIn.bind(this));
    this.root.addEventListener('focusout', this.onFocusOut.bind(this));
    this.root.addEventListener('keydown', this.onKeyDown.bind(this));
    this._keylistener = this.onKeyDownModeNormal.bind(this);
    this.searchInput = this.root.querySelector('input#search-input') as HTMLInputElement;
    this.consoleInput = this.root.querySelector('input#panel-console') as HTMLInputElement;
  }
  onFocusIn(ev: FocusEvent) {
    console.log("Focus dans ", ev);
    this.mode = this.targetEventIsEditable(ev) ? 'edit' : 'normal'; 
    console.log("Mode après focus : %s", this.mode);
  }
  
  onFocusOut(ev: FocusEvent) {
    if ( this.targetEventIsEditable(ev) ) { this.mode = 'normal' ;}
  }
  onKeyDown(ev: KeyboardEvent) { 
    return this._keylistener(ev);
  }
  onKeyDownModeNormal(ev: KeyboardEvent) {
    if ( ev.metaKey ) { return true ; }
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
    switch(ev.key) {
      case 'Tab': 
        // TODO il faut voir si on est dans la champ de filtrage
        this.searchInput.blur();
        this.klass.selectFirstItem();
        return stopEvent(ev);
    }
    return true;
  }

  // @return true si la cible de l'évènement +ev+ est un champ éditable
  targetEventIsEditable(ev: any) : boolean {
    return (ev.target as HTMLElement).matches('input, textarea, [contenteditable]');
  }
}