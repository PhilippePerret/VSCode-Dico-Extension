import { AnyDbType, AnyItemType } from "../../bothside/types";
import { Entry } from "../models/Entry";
import { PanelClient } from "../PanelClient";
import { AccessTable } from "./AccessTable";
import { stopEvent } from "./DomUtils";
import { FormManager } from "./FormManager";
import { SelectionManager } from "./SelectionManager";

type MODES = 'normal' | 'edit' | 'null' | 'form' | 'console' ;

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
  private form: FormManager<AnyItemType, AnyDbType>;
  public setMode(mode: MODES) { this.mode = mode; }
  protected set mode(mode: MODES) { // de l'extérieur, utiliser la méthode setMode 
    // console.info("[VimLikeManager mode] Mise du mode à '%s')", mode);
    this._mode = mode ;
    // Le mode détermine le capteur d'évènement
    switch(mode) {
      case 'console':
        this._keylistener = this.onKeyDownModeConsole.bind(this);
        break;
      case 'edit':
        // console.log("[VimLikeManager.mode] Passage du mode clavier au mode edit");
        this._keylistener = this.onKeyDownModeEdit.bind(this);
        break;
      case 'normal':
        // console.log("[VimLikeManager.mode] Passer le mode clavier en mode NORMAL");
        this._keylistener = this.onKeyDownModeNormal.bind(this);
        break;
      case 'null':
        // console.log('Le panneau est en mode NULL (sans action');
        this._keylistener = this.onKeyDownModeNull.bind(this);
        break;
      case 'form':
        // console.log("Panneau en mode FORMulaire");
        this._keylistener = this.onKeyDownModeForm.bind(this);
        break;
    }
    // Indiquer dans l'interface le mode
    this.root.dataset.mode = `mode-${mode}` ;
    
    if (this.root.querySelector('span#mode-name')){
      const spanName = this.root.querySelector('span#mode-name') as HTMLSpanElement;
      spanName.innerHTML = mode.toLocaleUpperCase();
    } else {
      console.warn("Bizarrement, le span #mode-name affichant le mode du panneau est introuvable.");
    }
  }

  readonly searchInput: HTMLInputElement;
  readonly consoleInput: HTMLInputElement;

  constructor(
    private root: HTMLBodyElement, 
    private panel: PanelClient<AnyItemType>, 
    private klass: any,
  ) {
    this.mode = 'null';
    this.loadConsoleManager(); // Promise
    // @DEPRECATED Il faut être plus précis. Si on fait ça, dans le formulaire
    // le mode est toujours remis au mode normal et edit
    // this.root.addEventListener('focusin', this.onFocusIn.bind(this));
    // this.root.addEventListener('focusout', this.onFocusOut.bind(this));

    this.form = this.panel.form; // cached

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
    this.consoleInput.addEventListener('focus', this.onFocusConsole.bind(this, this.consoleInput));
    this.consoleInput.addEventListener('blur', this.onBlurConsole.bind(this, this.consoleInput));
  }

  onFocusConsole(field: HTMLInputElement, ev: FocusEvent) {
    this.setMode('console');
  }
  onBlurConsole(field: HTMLInputElement, ev: FocusEvent){
    this.setMode('normal');
  }
  onFocusEditField(field: HTMLInputElement, ev: FocusEvent) {
    this.setMode('edit');
  }
  onBlurEditField(field: HTMLInputElement, ev: FocusEvent ) {
    // console.log("-> onBlurEditField");
    this.setMode('normal');
    // console.log("<- onBlurEditField");
  }
  keyboardBypass:Map<string, Function> | undefined;
  // La méthode qui choppe normalement toutes les touches, quel que soit le mode
  /**
   * Capteur Universel de Touche clavier
   * 
   * Quel que soit le mode, cette méthode reçoit les touches clavier
   * avant tout le monde.

   * Cela permet : 
   *    - d'implémenter un système de "coupe-circuit" qui est
   *      utilisé par exemple pour les messages de type "action 
   *      demandée". (voir le manuel pour le détail). 
   *    - d'implémenter la gestion de touche "?" qui permet, quelle
   *      que soit la situation, d'obtenir de l'aide.
   */
  universelKeyboardCapture(ev: KeyboardEvent) {
    // Pour voir toutes les touches qui sont pressées, toutes
    // console.log("[universel capture (mode %s)] Key up = ", this.mode, ev.key, ev);

    if ( ev.key === '?' ) {
      // <= L'user a tapé la touche '?'
      // => On doit afficher l'aide circonstantielle (voir le manuel)
      //    (même quand on est dans l'ide circonstantielle)
      this.panel.activateContextualHelp();
      return stopEvent(ev); 
    } else if ((ev.target as HTMLElement).tagName.toLowerCase() === 'select') {
      const select = ev.target as HTMLSelectElement;
      switch(ev.key) {
        case 'j':
        case 'ArrowDown': // Sur les menus <select>
          select.selectedIndex += 1;
          break;
        case 'k':
        case 'ArrowUp': // Sur les menus <select>
          select.selectedIndex -= 1;
          break;
      }
      return true;
    } else if (this.keyboardBypass) {
      // <= Un bypass existe (bloquant toutes les touches)
      // => Il faut voir si la touche est connue
      if (this.keyboardBypass.has(ev.key)) {
        /* Ici, c'est un peu compliqué, car il faut détruire le bypass
         * avant de jouer la méthode car cette méthode pourrait
         * redéfinir un autre coupe-circuit à prendre en compte
         */
        const methodBypass = (this.keyboardBypass as Map<string, any>).get(ev.key);
        // console.log('methodBypass dans VimLike', methodBypass);
        delete this.keyboardBypass;
        // Attention, ci-dessous, j'ai peut-être un souci de niveau
        // du "effacer avant de jouer la méthode bypass ou effacer
        // après ?" Si j'ai plusieurs flashAction qui se suivent, il
        // faut effacer avant. Vérifier si dans d'autres cas, c'est
        // le contraire et voir comment on peut faire.
        this.panel.cleanFlash();
        this.panel.cleanFooterShortcuts(); // Les raccourcis ont pu y être affichés
        methodBypass(); 
      }
      // Dans tous les cas on bloque la touche et on supprime le
      // coupe-circuit clavier
      return ev && stopEvent(ev);
    }
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
      // console.log("Discrimination du champ ", field);
      field.addEventListener('focus', this.setMode.bind(this, modes.edit));
      field.addEventListener('blur', this.setMode.bind(this, modes.normal));
    });
  }

  // Sera remplacé par la bonne méthode suivant le mode.
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
  private get accessTable(): AccessTable<AnyItemType>{
    return this._accesstable || (this._accesstable = this.klass.accessTable);
  }
  private get selectionManager(): SelectionManager {
    return this._selmanager || (this._selmanager = this.accessTable.selectionManager);
  } 
  private _accesstable!: AccessTable<AnyItemType>;
  private _selmanager!: SelectionManager;
  
  onKeyDownModeNormal(ev: KeyboardEvent) {
    // console.log("-> VimLikeManager.onKeyDownModeNormal", ev.key, ev);
    if (ev.metaKey) { return this.onKeyDownWithMeta(ev); }
    stopEvent(ev);
    switch (ev.key) {
      case 's': // focus dans champ de filtre
        this.searchInput.focus(); break;
      case 'j': // Sélection item après
        this.selectionManager.selectNextVisibleItem(); break;
      case 'k': // Sélection item avant
        this.selectionManager.selectPreviousVisibleItem(); break;
      case 'b': // back to sélection précédente
        this.selectionManager.historyBack(); break;
      case 'f': // forward to sélection précédentes
        this.selectionManager.historyNext();break;
      case 'r': // remove courante sélection from historique sélections
      this.selectionManager.removeCurrentFromHistory();break;
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
      case 'Tab':
        this.panel.nextLinkSelection(ev.shiftKey);
        break;
      case 'g': 
        this.panel.activeLinkSelection();
        break;
      default: 
         // Le panneau peut aussi définir sa propre table
        if (this.panel.tableKeys[ev.key]) {this.panel.tableKeys[ev.key].fn.call(null);}
        else {
          console.log("Pour le moment, je ne fais rien de '%s'", ev.key);
        }
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
      //*
        switch(this.threelast.join('')){
          case 'dim':
            ev.stopPropagation();
            return this.klass.autocompleteDim(ev);
        }
        
        switch(this.twolast.join('')){
          case '>(':
            ev.stopPropagation();
            return this.klass.autoCompleteBaliseTerm('->', ev);
          case 'tp': 
            ev.stopPropagation();
            return this.klass.autoCompleteBaliseTerm('ttp', ev);
          case 'tt':
            ev.stopPropagation();
            return this.klass.autoCompleteBaliseTerm('tt', ev);
        }
            //*/
        (ev.target as HTMLElement).blur();
        return stopEvent(ev);
      default:
        console.log("Touche non traitée : %s", ev.key);
    }
    // Pour toujours conserver les trois dernières lettres
    this.threelast.shift();
    this.threelast.push(ev.key);
    // Pour toujours conserver les deux dernières touches
    this.twolast.shift();
    this.twolast.push(ev.key);
    console.log("Deux dernières lettres = '%s'", this.twolast.join(''));
    return true;

  }
  private twolast: [string, string] = ['', ''];
  private threelast: [string, string, string] = ['', '', ''];

  // Mode clavier pour la console
  private consoleManager!: any; // Instance ConsoleManager;
  onKeyDownModeConsole(ev: KeyboardEvent){
    switch(ev.key) {
      case 'Enter':
        this.consoleManager.runCode();
        break;
      case 'ArrowDown':
        this.consoleManager.forwardHistory();
        break;
      case 'ArrowUp':
        this.consoleManager.backHistory();
        break;
      default:
        console.log("Console. Lettre %s", ev.key);
    }
  }
  async loadConsoleManager(){
    const module = await import('../ConsoleManager');
    this.consoleManager = new module.ConsoleManager(this.panel);
  }

  // Mode clavier pour le formulaire
  onKeyDownModeForm(ev: KeyboardEvent) {
    // console.log("-> onKeyDownModeForm", ev);
    // Pour empêcher toute action pendant la sauvegarde
    if ( this.form.saving === true ) { return; }
    if (ev.metaKey) { return this.onKeyDownWithMeta(ev); }
    switch (ev.key) {
      case 'a': // focusser dans premier champ (avec shortcut)
        this.form.focusField(1); break;
      case 'b': // focusser dans le second champ
        this.form.focusField(2); break;
      case 'c': // focusser dans le 3e champ
        this.form.focusField(3); break;
      case 'd': // focusser dans le 4e champ
        this.form.focusField(4); break;
      case 'e': // focusser dans le 5e champ
        this.form.focusField(5); break;
       case 'f': // focusser dans le 6e champ
        this.form.focusField(6); break;
      case 'g':
        this.form.focusField(7); break;
      case 'l': // Bloquer/débloquer le verrouillage de l'id
        this.form.toggleIdLock(); break;
      case 's': // Sauvegarder
        this.form.saveItem(false); break;
      case 'w': // 
        this.form.saveItem(true); break;
      case 'q': // Annuler
        this.form.cancelEdit(); break;
     default:
        // Le formulaire peut définir une table `tableKeys' pour
        // définir les fonctions à appeler par touche
        if (this.form.tableKeys[ev.key]) {this.form.tableKeys[ev.key].fn.call(null);}
    }
    // On annule l'évènement
    return stopEvent(ev);
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