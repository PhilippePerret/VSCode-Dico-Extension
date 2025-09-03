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

  initKeyManager() {
    this._keyManager = new VimLikeManager(document.body as HTMLBodyElement, this, Oeuvre);
  }
}

const OeuvrePanel = new OeuvrePanelClass({
  minName: 'oeuvre',
  titName: 'Œuvre',
  klass: Oeuvre,
  form: new OeuvreForm()
});
Oeuvre.panel = OeuvrePanel;

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
});

(window as any).Oeuvre = Oeuvre ;