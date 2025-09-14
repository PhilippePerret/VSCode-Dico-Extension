import { UOeuvre } from '../../bothside/UOeuvre';
import { RpcChannel } from '../../bothside/RpcChannel';
import { createRpcClient } from '../RpcClient';
import { ClientItem } from '../ClientItem';
import { FullOeuvre } from '../../extension/models/Oeuvre';
import { StringNormalizer } from '../../bothside/StringUtils';
import { VimLikeManager } from '../services/VimLikeManager';
import { AnyElementType } from './AnyClientElement';
import { PanelClient } from '../PanelClient';
import { AccessTable } from '../services/AccessTable';
import { OeuvreForm } from './OeuvreForm';

export class Oeuvre extends ClientItem<UOeuvre, FullOeuvre> {
  declare public data: FullOeuvre;
  readonly type = 'oeuvre';
  static readonly minName = 'oeuvre';
  static readonly klass = Oeuvre;
  static currentItem: Oeuvre;

  static setAccessTable(items: Oeuvre[]) {
    this._accessTable = new AccessTable<Oeuvre>(Oeuvre, items);
  }


  // retourn le premier item visible après l'item +item+
  static getFirstVisibleAfter(refItem: Oeuvre): AnyElementType | undefined {
    const aT = this.accessTable ;
    return aT.findAfter(
      (item: AnyElementType) => { return aT.getAccKeyById(item.data.id).visible === true; },
      refItem.data.id
    );
  }
  /**
        ==== MÉTHODES DE CHECK ===
   */

  /**
   * Méthode qui checke l'existence des oeuvres
   * 
   * @param oeuvres Liste des oeuvres, désignées par leur identifiant ou un de leurs titres
   * @return Une table avec les clés :known (oeuvres connues) et :unknown (oeuvres inconnues)
   */
  public static doOeuvresExist(oeuvres: string[]): {known: string[], unknown: string[]} {
    const retour: {known: string[], unknown: string[]} = {known: [], unknown: []};
    oeuvres.forEach(oeuvre => {
      if (this.accessTable.existsById(oeuvre) || this.oeuvreExistsByTitle(oeuvre) ) {
        retour.known.push(oeuvre);
      } else {
        retour.unknown.push(oeuvre);
      }
    });
    return retour;
  }
  private static oeuvreExistsByTitle(title: string): boolean {
    title = StringNormalizer.rationalize(title);
    return !!this.accessTable.find(item => item.data.titresLookUp.includes(title));
  }

  constructor(data: FullOeuvre) {
    super(data);
  }
}


class OeuvrePanelClass extends PanelClient<Oeuvre, typeof Oeuvre> {
  protected get accessTable(){ return Oeuvre.accessTable ; }

  searchMatchingItems(searched: string): Oeuvre[] {
    const searchLower = StringNormalizer.toLower(searched);
    return this.filter(Oeuvre.accessTable, (oeuvre: AnyElementType) => {
      oeuvre = oeuvre as Oeuvre;
      return oeuvre.data.titresLookUp.some((titre: string) => {
        return titre.substring(0, searchLower.length) === searchLower;
      });
    }) as Oeuvre[];
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
  const items = Oeuvre.deserializeItems(params.data, Oeuvre);
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

(window as any).Oeuvre = Oeuvre ;