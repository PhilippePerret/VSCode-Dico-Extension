import { UOeuvre } from '../../bothside/UOeuvre';
import { RpcChannel } from '../../bothside/RpcChannel';
import { createRpcClient } from '../RpcClient';
import { ClientItem } from '../ClientItem';
import { OeuvreType, DBOeuvreType, AnyItemType } from '../../bothside/types';
import { StringNormalizer } from '../../bothside/StringUtils';
import { AnyElementType } from './AnyClientElement';
import { PanelClient } from '../PanelClient';
import { AccessTable } from '../services/AccessTable';
import { OeuvreForm } from './OeuvreForm';
import { ComplexRpc } from '../services/ComplexRpc';

export class Oeuvre extends ClientItem<OeuvreType> {
  readonly type = 'oeuvre';
  static readonly minName = 'oeuvre';
  static readonly klass = Oeuvre;
  static currentItem: Oeuvre;
  
  // Constructor and data access
  constructor(public data: OeuvreType) {
    super(data);
  }
  
  // Getters pour accès direct aux propriétés courantes
  get titre_affiche(): string { return this.data.dbData.titre_affiche; }
  get titre_original(): string | undefined { return this.data.dbData.titre_original; }
  get titre_francais(): string | undefined { return this.data.dbData.titre_francais; }
  get annee(): number | undefined { return this.data.dbData.annee; }
  get auteurs(): string | undefined { return this.data.dbData.auteurs; }
  get notes(): string | undefined { return this.data.dbData.notes; }
  get resume(): string | undefined { return this.data.dbData.resume; }

  static setAccessTableWithItems(items: OeuvreType[]) {
    this._accessTable = new AccessTable<OeuvreType>(items);
  }
  public static _accessTable: AccessTable<OeuvreType>;
  
  // retourn le premier item visible après l'item +item+
  static getFirstVisibleAfter(refItem: Oeuvre): AnyElementType | undefined {
    const aT = this.accessTable ;
    return aT.findAfter(
      (item: AnyElementType) => { return aT.getAccKey(item.id).visible === true; },
      refItem.id
    );
  }
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
    RpcOeuvre.notify('save-oeuvre', {CRId: compRpcId, item: item});
  }

  public static onSavedOeuvre(params: {CRId: string, ok: boolean, errors: any, item: DBOeuvreType}){
    console.log("[CLIENT OEUVRE] Retour dans le panneau des oeuvres", params);
    ComplexRpc.resolveRequest(params.CRId, params);
  }
}


class OeuvrePanelClass extends PanelClient<OeuvreType> {
  protected get accessTable(){ return Oeuvre.accessTable ; }

  searchMatchingItems(searched: string): OeuvreType[] {
    const searchLower = StringNormalizer.toLower(searched);
    return this.filter(Oeuvre.accessTable, (oeuvre: AnyItemType) => {
      return (oeuvre as OeuvreType).cachedData.titresLookUp.some((titre: string) => {
        return titre.substring(0, searchLower.length) === searchLower;
      });
    }) as OeuvreType[];
  }

  // initKeyManager() {
  //   this._keyManager = new VimLikeManager(document.body as HTMLBodyElement, this, Oeuvre);
  // }
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
  const items = Oeuvre.deserializeItems(params.data);
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

RpcOeuvre.on('after-save-oeuvre', (params) => {
  console.log("[CLIENT Oeuvre] Réception du after-save-oeuvre", params);
  Oeuvre.onSavedOeuvre(params);
});

(window as any).Oeuvre = Oeuvre ;