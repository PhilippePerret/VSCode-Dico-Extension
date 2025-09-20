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
import { AnyElementType } from './AnyClientElement';
import { PanelClient } from '../PanelClient';
import { AccessTable } from '../services/AccessTable';
import { EntryForm } from './EntryForm';
import { ComplexRpc } from '../services/ComplexRpc';
import { DBEntryType, EntryType, AnyItemType } from '../../bothside/types';


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
    this._accessTable = new AccessTable<EntryType>(items);
  }
  public static _accessTable: AccessTable<EntryType>;

  // retourn le premier item visible après l'item +item+
  static getFirstVisibleAfter(refItem: Entry): AnyElementType | undefined {
    const aT = this.accessTable ;
    return aT.findAfter(
      (item: AnyElementType) => { return aT.getAccKey(item.id).visible === true; },
      refItem.item.id
    );
  }

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

  // public static onSavedItem(params: {CRId: string, ok: boolean, error: any, item: DBEntryType, itemPrepared: EntryType}){
  //   // console.log("[CLIENT ENTRY] Retour dans le panneau Entry avec le résultat de l'enregistrement", params);
  //   ComplexRpc.resolveRequest(params.CRId, params);
  // }

}// class Entry




/**
 * 
 * ============== PANNEAUX DES ENTRÉES ===============
 */



class EntryPanelClass extends PanelClient<EntryType> {
  protected get accessTable(){ return Entry.accessTable ; }

  public tableKeys = {
    C: this.chooseSelectedItemForExemple.bind(this),
    E: this.createExempleForSelectedItem.bind(this),
  };

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
  console.log("[CLIENT Entry] Réception du after-saved-item", params);
  // Entry.onSavedItem(params);
  ComplexRpc.resolveRequest(params.CRId, params);

});

// Pour exposer globalement
(window as any).Entry = Entry ;
// (window as any).RpcEntry = RpcEntry;
