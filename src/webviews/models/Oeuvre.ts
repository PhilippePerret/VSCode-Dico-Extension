import { StringNormalizer } from '../../bothside/StringUtils';
import { RpcChannel } from '../../bothside/RpcChannel';
import { createRpcClient } from '../RpcClient';
import { ClientItem } from '../ClientItem';
import { PanelClient } from '../PanelClient';
import { AccessTable } from '../services/AccessTable';
import { OeuvreForm } from './OeuvreForm';
import { ComplexRpc } from '../services/ComplexRpc';
import { OeuvreType, DBOeuvreType, AnyItemType } from '../../bothside/types';

export class Oeuvre extends ClientItem<OeuvreType> {
  readonly type = 'oeuvre';
  static readonly minName = 'oeuvre';
  static readonly klass = Oeuvre;
  static currentItem: Oeuvre;
  
  // Constructor and data access
  constructor(public item: OeuvreType) {
    super(item);
  }
  
  // Getters pour accès direct aux propriétés courantes
  get titre_affiche(): string { return this.item.dbData.titre_affiche; }
  get titre_original(): string | undefined { return this.item.dbData.titre_original; }
  get titre_francais(): string | undefined { return this.item.dbData.titre_francais; }
  get annee(): number | undefined { return this.item.dbData.annee; }
  get auteurs(): string | undefined { return this.item.dbData.auteurs; }
  get notes(): string | undefined { return this.item.dbData.notes; }
  get resume(): string | undefined { return this.item.dbData.resume; }

  static setAccessTableWithItems(items: OeuvreType[]) {
    this._accessTable = new AccessTable<OeuvreType>(this.panel, items);
  }
  public static _accessTable: AccessTable<OeuvreType>;

  /**
        ==== MÉTHODES DE CHECK ===
   */

  /**
   * Méthode qui checke l'existence de l'identifiant
   */
  public static doIdExist(id: string): boolean {
    return this.accessTable.exists(id);
  }
  /**
   * Méthode qui checke l'existence des oeuvres
   * 
   * @param oeuvres Liste des oeuvres, désignées par leur identifiant ou un de leurs titres
   * @return Une table avec les clés :known (oeuvres connues) et :unknown (oeuvres inconnues)
   */
  public static doOeuvresExist(oeuvres: string[]): {known: string[], unknown: string[]} {
    const retour: {known: string[], unknown: string[]} = {known: [], unknown: []};
    oeuvres.forEach(oeuvre => {
      if (this.accessTable.exists(oeuvre) || this.oeuvreExistsByTitle(oeuvre) ) {
        retour.known.push(oeuvre);
      } else {
        retour.unknown.push(oeuvre);
      }
    });
    return retour;
  }
  private static oeuvreExistsByTitle(title: string): boolean {
    title = StringNormalizer.rationalize(title);
    return !!this.accessTable.find((item: OeuvreType) => item.cachedData.titresLookUp.includes(title));
  }

  /**
   * 
   * Méthodes pour enregistrer les oeuvres
   */
  public static saveItem(item: DBOeuvreType, compRpcId: string) {
    RpcOeuvre.notify('save-item', {CRId: compRpcId, item: item});
  }

  public static onSavedItem(params: {CRId: string, ok: boolean, errors: any, item: DBOeuvreType, itemPrepared: OeuvreType}){
    // console.log("[CLIENT OEUVRE] Retour dans le panneau des oeuvres", params);
    ComplexRpc.resolveRequest(params.CRId, params);
  }
   
  public static autoCompleteBaliseTerm(triggre: string, ev: Event){
    return this.panel.flash('Auto complétion seulement pour panneau des entrées.', 'notice');
  }


}


/**
 * 
 * 
 * ============== PANNEAU OEUVRES ====================
 * 
 * 
 * 
 */


class OeuvrePanelClass extends PanelClient<OeuvreType> {
  public get accessTable(){ return Oeuvre.accessTable ; }

  public tableKeys = {
    C: {lab: 'choisir pour exemple', fn: this.chooseSelectedItemForExemple.bind(this)},
    E: {lab: 'nouvel exemple pour sélection', fn: this.createExempleForSelectedItem.bind(this)},
  };

  chooseSelectedItemForExemple(confirmed: boolean | undefined) {
    if (confirmed === true) {
      // on y va
      const oeuvreId: string = this.getSelection() as string;
      RpcOeuvre.notify('oeuvre-for-exemple', {oeuvreId: oeuvreId, oeuvreTitre: this.accessTable.get(oeuvreId).dbData.titre_affiche});
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
        this.flashAction("Veux-tu choisir cette œuvre pour l'exemple édité ?", boutons);
      } else {
        this.flash("Il faut sélectionner l'œuvre voulue !", 'warn');
      }
    }


  }
  createExempleForSelectedItem(){
    this.flash("Je dois créer un exemple pour l'entrée courante.", 'notice');
  }

  // Méthode permettant de filtrer la liste des exemples
  searchMatchingItems(searched: string): OeuvreType[] {
    const searchLower = StringNormalizer.toLower(searched);
    return this.filter(Oeuvre.accessTable, (oeuvre: AnyItemType) => {
      return (oeuvre as OeuvreType).cachedData.titresLookUp.some((titre: string) => {
        return titre.substring(0, searchLower.length) === searchLower;
      });
    }) as OeuvreType[];
  }
  protected formateProp(item: OeuvreType, prop: string, value: string | number | boolean): string {
    switch(prop){
      case 'titre_francais':
        const titfr: string | undefined = item.dbData.titre_francais;
        if (!titfr || titfr === item.dbData.titre_original) { return ''; }
    }
    return String(value);
  }
}

const OeuvrePanel = new OeuvrePanelClass({
  minName: 'oeuvre',
  titName: 'Œuvre',
  klass: Oeuvre,
  form: new OeuvreForm()
});
OeuvrePanel.form.setPanel(OeuvrePanel);
Oeuvre.panel = OeuvrePanel;


/**
 * Canal RPC du panneau Oeuvre
 */
export const RpcOeuvre:RpcChannel = createRpcClient();

RpcOeuvre.on('activate', () => {
  if ( OeuvrePanel.isActif ) { return ; }
  console.log("[CLIENT OEUVRE] Je dois marquer le panneau Oeuvre actif");
  OeuvrePanel.activate();
});
RpcOeuvre.on('desactivate', () => {
  if ( OeuvrePanel.isInactif ) { return ; }
  console.log("[CLIENT OEUVRE] Je dois marquer le panneau Oeuvre comme inactif.");
  OeuvrePanel.desactivate();
});


RpcOeuvre.on('populate', (params) => {
  Oeuvre.deserializeItems(params.data);
  OeuvrePanel.populate(Oeuvre.accessTable);
  OeuvrePanel.initKeyManager();
});

RpcOeuvre.on('display-oeuvre', (params) => {
  console.log("[CLIENT Oeuvre] Afficher oeuvre %s", params.oeuvreId);
  OeuvrePanel.scrollToAndSelect(params.oeuvreId);
});

RpcOeuvre.on('check-oeuvres', (params) => {
  console.log("[CLIENT-OEUVRES] Vérification demandée des œuvres :", params);
  const resultat = Oeuvre.doOeuvresExist(params.oeuvres);
  console.log("résultat du check", resultat);
  RpcOeuvre.notify('check-oeuvres-resultat', { CRId: params.CRId, resultat: resultat });
});

RpcOeuvre.on('after-saved-item', (params) => {
  console.log("[CLIENT Oeuvre] Réception du after-saved-item", params);
  Oeuvre.onSavedItem(params);
});

(window as any).Oeuvre = Oeuvre ;