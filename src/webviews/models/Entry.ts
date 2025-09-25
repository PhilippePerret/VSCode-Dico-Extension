/**
 * Module pour les Entrées
 * 
 * Chaque module Entrée, Oeuvres et Exemples est composé de trois
 * parties interactives :
 * 
 *  1) Le modèle, gérant les éléments en tant que tels, les Entry par exemple
 *  2) Le panneau, qui interagit avec le Dom (DOMEntry ou EntryPanel)
 *  3) La section Rpc (RpcEntry) qui permet de communiquer avec l'extension,
 *     pour enregistrer des informations ou obtenir des données des autres
 *     panneaux.
 */
import { StringNormalizer } from '../../bothside/StringUtils';
import { ClientItem } from '../ClientItem';
import { createRpcClient } from '../RpcClient';
import { PanelClient } from '../PanelClient';
import { AccessTable } from '../services/AccessTable';
import { EntryForm } from './EntryForm';
import { ComplexRpc } from '../services/ComplexRpc';
import { DBEntryType, EntryType, AnyItemType } from '../../bothside/types';
import { stopEvent } from '../services/DomUtils';
import { TextFormater } from '../services/TextFormater';
import { AutoComplete } from '../services/AutoCompletion';


export class Entry extends ClientItem<EntryType> {
  readonly type = 'entry';
  static readonly minName = 'entry';
  static readonly klass = Entry;
  static currentItem: Entry;
  
  // Constructor and data access
  constructor(item: EntryType) {
    super(item);
  }
  
  // Getters pour accès direct aux propriétés courantes
  get entree(): string { return this.item.dbData.entree; }
  get genre(): string { return this.item.dbData.genre; }
  get categorie_id(): string | undefined { return this.item.dbData.categorie_id; }
  get definition(): string { return this.item.dbData.definition; }

  static setAccessTableWithItems(items: EntryType[]) {
    this._accessTable = new AccessTable<EntryType>(this.panel, items);
  }
  public static _accessTable: AccessTable<EntryType>;

  /*
      === MÉTHODES DE CHECK ===
   */
  // @return true si l'entrée +entree+ existe déjà
  public static doesEntreeExist(entree: string): boolean {
    entree = entree.toLowerCase();
    return this.accessTable.find((item: EntryType) => item.cachedData.entree_min === entree) !== undefined ;
  }
  // @return true si l'identifiant +id+ existe déjà
  public static doesIdExist(id: string): boolean { return this.accessTable.exists(id); }

  /**
   * Méthode pour enregistrer l'item dans la table
   * 
   * 
   */
  public static saveItem(item: DBEntryType, compRpcId: string) {
    RpcEntry.notify('save-item', {CRId: compRpcId, item: item});
  }

  public static autoCompleteBaliseTerm(trigger: string, ev: KeyboardEvent): false {
    //*
    stopEvent(ev);
    AutoComplete.start({
      target: ev.target as HTMLElement,
      accessTable: this.accessTable,
      balIn: '(',
      balOut: ')',
    });
    //*/
    return false;
  }

  public static autocompleteDim(ev: KeyboardEvent): false {
    const edItem = this.panel.form.getEditedItem();
    if (edItem) {
      const entree = this.accessTable
        .get((edItem.original as DBEntryType).id)
        .cachedData.entree_min;
      const target = ev.target as HTMLTextAreaElement;
      target.setRangeText(
        '(' + entree + ')',
        target.selectionStart,
        target.selectionEnd,
        'end'
      );

    }
    return stopEvent(ev);
  }

  // Juste parce que cette méthode doit exister pour chaque panneau,
  // mais pour le panneau entrée, elle ne sert à rien
  // (elle est invoquée sur les deux autres panneaux pour transmettre
  // à ce panneau l'identifiant de l'item sélectionné — l'exemple ou 
  // l'œuvre)
  public static sendIdCurrentToDefinition(){ }

}// class Entry




/**
 * 
 * ============== PANNEAUX DES ENTRÉES ===============
 */



class EntryPanelClass extends PanelClient<EntryType> {

  // Raccourcis
  public get accessTable(){ return Entry.accessTable ; }
  private get selection(){return this.accessTable.getSelection();}

  /**
   * Raccourcis clavier propre au panneau
   */
  public tableKeys = {
    C: {lab: 'choisir pour l’exemple', fn: this.chooseSelectedItemForExemple.bind(this)},
    E: {lab: 'exemple pour sélection', fn: this.createExempleForSelectedItem.bind(this)},
    m: {lab: 'mettre en forme', fn: this.miseEnFormSelection.bind(this)},
  };

  miseEnFormSelection(ev: Event){
    if (this.selection) {
      TextFormater.formate(
        this, 
        this.accessTable.getObj(this.selection).querySelector('div.entry-definition'), 
        'definition'
      );
    } else {
      this.flash('Il faut sélectionner (f/k) l’entrée à mettre en forme.', 'warn');
    }
    return ev && stopEvent(ev);
  }

  chooseSelectedItemForExemple(confirmed: boolean | undefined) {
    if (confirmed === true) {
      // on y va
      const entryId: string = this.getSelection() as string;
      RpcEntry.notify('entry-for-exemple', {entryId: entryId, entryEntree: this.accessTable.get(entryId).dbData.entree});
    } else if (confirmed === false) {
      this.flash("Ok, on renonce.", 'notice');
    } else {
      // On demande confirmation
      const selected: string | undefined = this.getSelection();
      if (selected) {
        // On demande confirmation
        const boutons: Map<string, any> = new Map();
        boutons.set('o', ['Oui', this.chooseSelectedItemForExemple.bind(this, true)]);
        boutons.set('n', ['Renoncer', this.chooseSelectedItemForExemple.bind(this, false)]);
        this.flashAction("Veux-tu choisir cette entrée pour l'exemple édité ?", boutons);
      } else {
        this.flash("Il faut sélectionner l'entrée voulue !", 'warn');
      }
    }


  }
  createExempleForSelectedItem(){
    this.flash("Je dois créer un exemple pour l'entrée courante.", 'notice');
  }

  /**
   * Méthode de filtrage propre aux Entrées (Entry)
   * 
   * @param searched Texte à trouver
   * @returns Liste des items trouvés
   */
  // Méthode de filtrage des entrées
  // Retourne celles qui commencent par +searched+
  searchMatchingItems(searched: string): EntryType[] {
    const prefixLower = StringNormalizer.toLower(searched);
    const prefixRa = StringNormalizer.rationalize(searched);
    return this.filter(Entry.accessTable, (item: AnyItemType) => {
      item = item as EntryType;
      return item.cachedData.entree_min.startsWith(prefixLower) || 
             item.cachedData.entree_min_ra.startsWith(prefixRa);
    }) as EntryType[];
  }
  
  // Méthode jouée quand on clique sur un lien dans une définition
  goToDef(id:string): void {
    console.log("Le goToDef du panneau ave l'identifiant :", id);
    this.scrollToAndSelect(id);
    this.flash('Utiliser la touche <shortcut>b</shortcut> (comme « back ») pour revenir à la définition.', 'notice');
  }
  goToExemple(id: string) {
    RpcEntry.notify('show-exemple', {exId: id});
  }


  // Pour insérer l'identifiant de l'exemple dans la définition
  insertExempleIdInDefinition(exempleId: string): void {
    if (this.form.isActive()){
      (this.form as EntryForm).insertInTextField('definition', exempleId);
    } else {
      this.flash('Pour coller un identifiant d’exemple, il faut éditer une définition.', 'warn');
    }
  }
}

const EntryPanel = new EntryPanelClass({
  minName: 'entry',
  titName: 'Entries',
  klass: Entry,
  form: new EntryForm(),
});
EntryPanel.form.setPanel(EntryPanel);
Entry.panel = EntryPanel;


/**
 * 
 * ================= R P C  ENTRY  ====================
 * 
 */

export const RpcEntry = createRpcClient();

/**
 * Méthode générique pour envoyer un message depuis l'extension avec
 * CanalEntry.notify('flash', {message: "Le message à écrire"})
 * note : utilisable par les trois panneaux/classes
 */
RpcEntry.on('flash', (params) => {
  EntryPanel.flash(params.message, params.type || 'notice');
});

// Evènement reçu de l'extension à l'ouverture (après l'installation 
// complète) permettant essentiellement d'afficher la première aide.
RpcEntry.on('start', () => {
  // Pour activer le panneau d'aide à l'ouverture
  // setTimeout(EntryPanel.activateContextualHelp.bind(EntryPanel), 1000);
});

RpcEntry.on('activate', () => {
  if ( EntryPanel.isActif ) { return ; }
  // console.log("[CLIENT ENTRY] Je dois marquer le panneau Entry actif");
  EntryPanel.activate();
});
RpcEntry.on('desactivate', () => {
  if ( EntryPanel.isInactif ) { return ; } 
  // console.log("[CLIENT ENTRY] Je dois marquer le panneau Entry comme inactif.");
  EntryPanel.desactivate();
});

RpcEntry.on('populate', (params) => {
  Entry.deserializeItems(params.data);
  EntryPanel.populate(Entry.accessTable);
  EntryPanel.initKeyManager();
});

RpcEntry.on('display-entry', (params) => {
  console.log("[CLIENT] Je dois afficher l'entrée '%s'", params.entry_id);
  EntryPanel.scrollToAndSelect(params.entry_id);
});

RpcEntry.on('check-oeuvres-resultat', (params: {CRId: string, resultat: {[x: string]: any}}) => {
  // console.log("[CLIENT ENTRY] Je reçois le résultat du check des oeuvres", params );
  ComplexRpc.resolveRequest(params.CRId, params.resultat);
});

RpcEntry.on('check-exemples-resultat', (params: {CRId: string, resultat: {known: string[], unknown: string[]}}) => {
  // console.log("[CLIENT ENTRY] Réception du résultat du check des exemples : ", params);
  ComplexRpc.resolveRequest(params.CRId, params.resultat);
});

RpcEntry.on('after-saved-item', (params) => {
  // console.log("[CLIENT Entry] Réception du after-saved-item", params);
  // Entry.onSavedItem(params);
  ComplexRpc.resolveRequest(params.CRId, params);
});

RpcEntry.on('send-id-exemple-to-definition', (params) => {
  // console.log("[WEBVIEW Entrées] Réception id-exemple '%s'", params.exempleId);
  EntryPanel.insertExempleIdInDefinition(params.exempleId);
});

// Pour exposer globalement
(window as any).Entry = Entry ;

// Pour éviter les imports circulaires
(window as any).RpcEntry = RpcEntry;
