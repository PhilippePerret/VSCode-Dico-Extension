import { Entry } from "./models/Entry";
import { Exemple } from "./models/Exemple";
import { Oeuvre } from "./models/Oeuvre";
import { FullEntry } from "../extension/models/Entry";
import { FullOeuvre } from "../extension/models/Oeuvre";
import { FullExemple } from "../extension/models/Exemple";
import { AccessTable } from "./services/AccessTable";
import { AnyElementType } from "../extension/models/AnyElement";
import { SelectionManager } from "./services/SelectionManager";
import { PanelClient } from "./PanelClient";
import { App } from "./services/App";

type Tel_u = FullEntry | FullOeuvre | FullExemple;
type Tel = typeof Entry | typeof Oeuvre | typeof Exemple;


/**
 * Class abstraite pour tous les Items (Entry, Oeuvre, Exemple)
 */
export abstract class ClientItem<Tel, Tel_u> {
  static klass: any;
  public static get accessTable(){ return this._accessTable;}
  public static panel: PanelClient<any, any>;

  protected static _accessTable: AccessTable<any>;
  private static _selector: SelectionManager;
  public static get Selector(){ 
    return this._selector || (this._selector = new SelectionManager(this.klass));
  }

  public static get app() { return App; } 

  // Raccourcis vers l'accessTable, pour obtenir des informations
  // sur les items ou les items eux-même
  static get(itemId: string): AnyElementType | undefined {
    return this.accessTable.getById(itemId);
  } 
  static getObj(itemId: string): HTMLDivElement {
    return this.accessTable.getObj(itemId);
  }
  static each(method:(item: AnyElementType) => void){ this.accessTable.each(method);}

  static isVisible(id: string): boolean { return this.accessTable.isVisible(id); }
  static setVisible(id: string) { this.accessTable.setVisibility(id, true); }
  static setInvisible(id: string) { this.accessTable.setVisibility(id, false); }

  static selectFirstItem() { this.panel.select(this.accessTable.firstItem);}

  static editItem(itemId: string): void { this.panel.form.editItem(this.get(itemId)); }
  static createNewItem(){ this.panel.form.editItem(new this.klass({id: ''})); }

  toRow(){ return {};}
  /**
   * Méthode qui reçoit les items sérialisés depuis l'extension et va les
   * consigner dans le panneau, dans une AccessTable qui permettra de 
   * parcourrir les éléments. 
   */
  static deserializeItems(items: string[], klass: typeof Entry | typeof Oeuvre | typeof Exemple) {
    const allItems = items.map( item => new this.klass(JSON.parse(item)));
    this.klass.setAccessTable(allItems);
  }

  public data: Tel_u;

  constructor(itemData: Tel_u){
    this.data = itemData;
  } 

  // Pour obtenir l'AccKey (ak) de l'item
  static getAccKey(id: string) { return this.accessTable.getAccKeyById(id) ; }

  // public get obj(){ return this._obj ;}
  // protected get isNotVisible(){ return this._visible === false;}
  // protected get isVisible(){ return this._visible === true ;}

  // private _obj!: HTMLDivElement;
  // private _visible: boolean = true;
}