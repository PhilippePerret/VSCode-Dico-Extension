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
import { UEntry } from '../../bothside/UEntry';
import { DBEntryType, EntryType, CachedEntryType, DomStateType } from '../../bothside/types';
import { StringNormalizer } from '../../bothside/StringUtils';
import { ClientItem } from '../ClientItem';
import { createRpcClient } from '../RpcClient';
import { AnyElementType } from './AnyClientElement';
import { AccessTable } from '../services/AccessTable';
import { PanelClient } from '../PanelClient';
import { EntryForm } from './EntryForm';
import { ComplexRpc } from '../services/ComplexRpc';

// Types legacy pour transition - à supprimer après migration complète
export type FullEntry = EntryType;
export type IEntry = DBEntryType;


export class Entry extends ClientItem<DBEntryType, EntryType> {
  readonly type = 'entry';
  static readonly minName = 'entry';
  static readonly klass = Entry;
  static currentItem: Entry;
  
  // Constructor and data access
  constructor(public data: EntryType) {
    super(data);
  }
  
  // Getters pour accès direct aux propriétés courantes
  get id(): string { return this.data.id; }
  get entree(): string { return this.data.dbData.entree; }
  get genre(): string { return this.data.dbData.genre; }
  get categorie_id(): string | undefined { return this.data.dbData.categorie_id; }
  get definition(): string { return this.data.dbData.definition; }

  static setAccessTable(items: Entry[]) {
    this._accessTable = new AccessTable<Entry>(Entry, items);
  }

  // retourn le premier item visible après l'item +item+
  static getFirstVisibleAfter(refItem: Entry): AnyElementType | undefined {
    const aT = this.accessTable ;
    return aT.findAfter(
      (item: AnyElementType) => { return aT.getAccKeyById(item.data.id).visible === true; },
      refItem.data.id
    );
  }

  /*
      === MÉTHODES DE CHECK ===
   */
  // @return true si l'entrée +entree+ existe déjà
  public static doesEntreeExist(entree: string): boolean {
    entree = entree.toLowerCase();
    return this.accessTable.find((item) => item.data.dbData.entree.toLowerCase() === entree) !== undefined ;
  }
  // @return true si l'identifiant +id+ existe déjà
  public static doesIdExist(id: string): boolean {
    if (this.accessTable.existsById(id)) { return true; }
    return false;
  }

  /**
   * Méthode pour enregistrer l'item dans la table
   * 
   * 
   */
  public static saveItem(item: DBEntryType, compRpcId: string) {
    RpcEntry.notify('save-item', {CRId: compRpcId, item: item});
  }

  public static onSavedItem(params: {CRId: string, ok: boolean, error: any, item: DBEntryType}){
    // console.log("[CLIENT ENTRY] Retour dans le panneau Entry avec le résultat de l'enregistrement", params);
    ComplexRpc.resolveRequest(params.CRId, params);
  }

}// class Entry

class EntryPanelClass extends PanelClient<Entry, typeof Entry> {
  protected get accessTable(){ return Entry.accessTable ; }

  /**
   * Méthode de filtrage propre aux Entrées (Entry)
   * 
   * @param searched Texte à trouver
   * @returns Liste des items trouvés
   */
  // Méthode de filtrage des entrées
  // Retourne celles qui commencent par +searched+
  searchMatchingItems(searched: string): Entry[] {
    const prefixLower = StringNormalizer.toLower(searched);
    const prefixRa = StringNormalizer.rationalize(searched);
    return this.filter(Entry.accessTable, (entry: AnyElementType) => {
      entry = entry as Entry;
      return entry.data.cachedData.entree_min.startsWith(prefixLower) || 
             entry.data.cachedData.entree_min_ra.startsWith(prefixRa);
    }) as Entry[];
  }

  // initKeyManager() {
  //   this._keyManager = new VimLikeManager(document.body, this, Entry);
  // }
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
 * ================= R P C ====================
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
  setTimeout(EntryPanel.activateContextualHelp.bind(EntryPanel), 1000);
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
  const items = Entry.deserializeItems(params.data, Entry);
  // console.log("[CLIENT Entry] Items désérialisés", items);
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
  Entry.onSavedItem(params);
});

// Pour exposer globalement
(window as any).Entry = Entry ;
(window as any).RpcEntry = RpcEntry;
