import { EntryType, OeuvreType, ExempleType, AnyItemType } from "../bothside/types";
import { SelectionManager } from "./services/SelectionManager";
import { PanelClient } from "./PanelClient";

type ItemDataType = EntryType | OeuvreType | ExempleType;

/**
 * Class abstraite pour tous les Items (Entry, Oeuvre, Exemple)
 */
export abstract class ClientItem<Tdt extends ItemDataType> {
  static klass: any;
  public static get accessTable(){ return this.klass._accessTable;}
  public static panel: PanelClient<any>;

  // protected static _accessTable: AccessTable<any>;
  private static _selector: SelectionManager;
  public static get Selector(){ 
    return this._selector || (this._selector = new SelectionManager(this.klass));
  }

  // Raccourcis vers l'accessTable, pour obtenir des informations
  // sur les items ou les items eux-même
  static get(itemId: string): AnyItemType | undefined {
    return this.accessTable.get(itemId);
  } 
  static getObj(itemId: string): HTMLDivElement {
    return this.accessTable.getObj(itemId);
  }
  static each(method:(item: AnyItemType) => void){ this.accessTable.each(method);}

  static isVisible(id: string): boolean { return this.accessTable.isVisible(id); }
  static setVisible(id: string) { this.accessTable.setVisibility(id, true); }
  static setInvisible(id: string) { this.accessTable.setVisibility(id, false); }

  static selectFirstItem() { this.panel.select(this.accessTable.firstItem);}

  static editItem(itemId: string): void { this.panel.form.editItem(this.get(itemId)); }
  static createNewItem(){ 
    // Créer un objet DB vide pour nouveau item
    const emptyDbData = { id: '' }; // Les autres champs seront initialisés dans le formulaire
    this.panel.form.editItem(new this.klass(emptyDbData)); 
  }

  // toRow(){ return {};}
  /**
   * Méthode qui reçoit les items sérialisés depuis l'extension et va les
   * consigner dans le panneau, dans une AccessTable qui permettra de 
   * parcourrir les éléments. 
   */
  static deserializeItems(items: string[]): void {
    const allItems: AnyItemType[] = items.map( (item: string) => JSON.parse(item) as AnyItemType);
    // console.log("Tous les items", allItems);
    this.setAccessTableWithItems(allItems);
  }
  /* Surclassée */ static setAccessTableWithItems(items: any){};

  public get id(): string {return this.item.id;}

  constructor(
    public item: Tdt
  ){ } 

  // Pour obtenir l'AccKey (ak) de l'item
  static getAccKey(id: string) { return this.accessTable.getAccKey(id) ; }
}