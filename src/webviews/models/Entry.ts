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
import { FullEntry } from '../../extension/models/Entry';
import { StringNormalizer } from '../../bothside/StringUtils';
import { ClientItem } from '../ClientItem';
import { createRpcClient } from '../RpcClient';
import { AnyElementType } from './AnyClientElement';
import { AccessTable } from '../services/AccessTable';
import { PanelClient } from '../PanelClient';
import { EntryForm } from './EntryForm';

export class Entry extends ClientItem<UEntry, FullEntry> {
  declare public data: FullEntry;
  readonly type = 'entry';
  static readonly minName = 'entry';
  static readonly klass = Entry;
  static currentItem: Entry;

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
    return this.accessTable.find((item) => item.data.entree.toLowerCase() === entree) !== undefined ;
  }
  // @return true si l'identifiant +id+ existe déjà
  public static doesIdExist(id: string): boolean {
    if (this.accessTable.existsById(id)) { return true; }
    return false;
  }
}

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
      return entry.data.entree_min.startsWith(prefixLower) || 
             entry.data.entree_min_ra.startsWith(prefixRa);
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

// Evènement reçu de l'extension à l'ouverture (après l'installation 
// complète) permettant essentiellement d'afficher la première aide.
RpcEntry.on('start', () => {
  setTimeout(EntryPanel.activateContextualHelp.bind(EntryPanel), 1000);
});

RpcEntry.on('activate', () => {
  if ( EntryPanel.isActif ) { return ; }
  console.log("[CLIENT ENTRY] Je dois marquer le panneau Entry actif");
  EntryPanel.activate();
});
RpcEntry.on('desactivate', () => {
  if ( EntryPanel.isInactif ) { return ; } 
  console.log("[CLIENT ENTRY] Je dois marquer le panneau Entry comme inactif.");
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

// Pour exposer globalement
(window as any).Entry = Entry ;
