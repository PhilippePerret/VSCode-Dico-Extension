/**
 * Grande classe qui permet de parcourir très vite les éléments en
 * sachant s'ils sont visibles, sélectionnés, etc.
 */
import { EntryType, OeuvreType, ExempleType, AnyItemType } from "../../bothside/types";
import { PanelClient } from "../PanelClient";

/**
 * Le type propre aux données enregistrées dans les AccessTables de chaque élément.
 */
export interface AccedableItem {
  readonly type: 'accedable-item';
  id: string;         // Identifiant absolu de l'élément, quel qu'il soit
  index: number;      // Index précis dans l'Array
  obj: HTMLDivElement | undefined ;        // L'objet HTML de l'élément, dans le listing
  next:  string | undefined ;      // Id de l'élément suivant dans l'Array (pas forcément contigu)
  prev:  string | undefined ;      // Id de l'élément précédent dans l'Array (idem)
  visible: boolean;   // Pour savoir si l'élément est visible
  display: 'block' | 'none';  // Le display actuel de l'élément
  selected: boolean;  // Pour savoir si l'élément est sélectionné
  modified: boolean;  // Pour savoir si l'item a été modifié
  // On pourra ajouter ici d'autres données volatiles
}

export class AccessTable<T extends EntryType | OeuvreType | ExempleType> {
  // Table des pointeurs de données
  keysMap: Map<string, AccedableItem> = new Map();
  // Table de toutes les données des items, dans un ordre
  // d'arrivée jamais changé.
  arrayItems: T[] = [];
  // Table de la table (pour vérification)
  _size!: number | null ;
  // Le premier item, qui doit forcément être le premier chargé
  _firstItem!: T;
  public get firstItem(){
    return this._firstItem || (this._firstItem = this.arrayItems[0]); }

  constructor(
    items: T[]
  ) {
    this.populateInTable(items);
  }
  
  // après un ajout ou une suppression, par exemple
  reset(){
    this._size = null;
  }

  get size(){ return this._size || (this._size = this.keysMap.size);}

  isVisible(id: string) { return this.getAccKey(id).visible === true ;}
  setVisibility(id: string, state: boolean) {
    const ak = this.getAccKey(id);
    if ( ak.visible !== state ) {
      // <= L'état change => Il faut le changer dans la donnée et le DOM
      ak.visible = state;
      if ( ak.obj === undefined ) { ak.obj = this.DOMElementOf(id) ; }
      const display = state ? 'block' : 'none';
      ak.display = display ;
      ak.obj.style.display = display ;
    }
  }

  selectNextItem(panel: PanelClient<any>): void {
    const selection = panel.getSelection();
    let nextId: string | undefined ;
    if ( selection ) {
      let nextItemVisible: AnyItemType | undefined;
      nextItemVisible = this.getNextVisible(selection);
      if ( nextItemVisible ) { nextId = nextItemVisible.id ; }
    }
    const finalNextId = nextId || this.firstItem.id;
    panel.select(finalNextId);
  }
  selectPrevItem(panel: PanelClient<any>): void {
    const selection = panel.getSelection();
    let prevId: string | undefined;
    if ( selection ) {
      let prevItemVisible: AnyItemType | undefined ;
      prevItemVisible = this.getPrevVisible(selection);
      if ( prevItemVisible ) { prevId = prevItemVisible.id ;}
    }
    const finalPrevId = prevId || this.firstItem.id;
    panel.select(finalPrevId);
  }


  getNextVisible(refId: string): AnyItemType | undefined {
    let ak: AccedableItem | undefined;
    let nextAk: AccedableItem | undefined;
    while (ak = this.getNextAccKey(refId)) {
      if (ak.visible) {return this.get(ak.id);}
    }
  }
  getPrevVisible(refId: string): AnyItemType | undefined {
    let ak: AccedableItem | undefined;
    let prevAk: AccedableItem | undefined;
    while (ak = this.getPrevAccKey(refId)) {
      if (ak.visible) {return this.get(ak.id);}
    }
  }

  setSelectState(id: string, state: boolean) {
    this.getAccKey(id).selected = state;
  }

  // @return true si l'élément d'identifiant +id+ existe.
  exists(id: string): boolean { return this.keysMap.has(id); }

  get(id: string): T { return this.arrayItems[(this.keysMap.get(id) as AccedableItem).index]; }
  getByAccKey(ak: AccedableItem): T { return this.get(ak.id); }

  /**
   * Retourne l'objet DOM de l'item en s'assurant qu'il est défini
   * dans l'AccKey (ce qui n'est pas fait par défaut)
   */
  getObj(id: string): HTMLDivElement {
    const ak = this.getAccKey(id);
    if ( ! ak ) {
      console.error("Impossible d'obtenir l'AK de l'id '%s'…", id, this.arrayItems);
    }
    ak.obj || Object.assign(ak, { obj: this.DOMElementOf(id)});
    if ( ! ak.obj ) {
      console.error("Impossible d'obtenir l'objet de l'item '%'…", id);
    }
    return ak.obj as HTMLDivElement;
  }
  
  getAccKey(itemId: string): AccedableItem { return this.keysMap.get(itemId) as AccedableItem ; }

  /**
   * Actualise ou Crée le nouvel item Item après son enregistrement.
   * 
   * Pour savoir si c'est une création ou une actualisation, il
   * suffit de voir si l'identifiant est connu de la table (noter
   * que pour les exemples, il n'y a pas d'identifiant autre que
   * volatile).
   * 
   * Noter que ce sont toujours les données compolètes qui sont
   * remontées, même pour une actualisation. Car l'actualisation
   * a pu modifier des données qui servent pour le tri, le formatage,
   * etc.
   * 
   */
  public upsert(item: AnyItemType): boolean {
    console.log("Item reçu par upsert", item);
    const checkedId: string = ((ity, item) => {
      switch(ity){
        case 'entry':
        case 'oeuvre':
          return item.id;  // Now at root level
        case 'exemple':
          return item.id;  // Composite ID already calculated
      }
    })(item.cachedData.itemType, item);

    let cachedItem;
    if ( this.exists(checkedId)) {
      // Update
      console.log("C'est une actualisation de l'item ", checkedId);
      cachedItem = this.get(checkedId);
      console.log("Actualisation de", this.get(checkedId));
      Object.assign(cachedItem, item);
    } else {
      // Create
      console.log("C'est une création de l'item", item);
      this.createNewAccedableItem(item);
   }
    return true; // en cas de succès
  }

  private createNewAccedableItem(item: AnyItemType) {
    let cachedItem: T = item as T;
    this.addInTable(cachedItem, 0, undefined, undefined);  // <===== TODO : LE ZÉRO EST À CALCULER !
  }
  
  getNextItem(id: string): T | undefined {
    const nextAK = this.getNextAccKey(id);
    return nextAK ? this.get(nextAK.id) : undefined ;
  }
  
  getNextItemByAccKey(ak: AccedableItem) : T | undefined {
    return ak.next ? this.get(ak.next) : undefined ;
  }

 getPrevItem(id: string): T | undefined {
    const prevAK = this.getPrevAccKey(id);
    return prevAK ? this.get(prevAK.id) : undefined ;
  }
  getPrevItemByAccKey(ak: AccedableItem) : T | undefined {
    return ak.prev ? this.get(ak.prev) : undefined ;
  }
  
 getNextAccKey(id: string): AccedableItem | undefined {
    const ak = this.getAccKey(id);
    return ak.next ? this.getAccKey(ak.next) : undefined;
  }
 getNextAccKeyByAccKey(ak: AccedableItem): AccedableItem | undefined {
    return ak.next ? this.getNextAccKey(ak.next) : undefined ;
  }
 
 getPrevAccKey(id: string): AccedableItem | undefined {
    const ak = this.getAccKey(id);
    return ak.prev ? this.getAccKey(ak.prev) : undefined;
  }
 getPrevAccKeyByAccKey(ak: AccedableItem): AccedableItem | undefined {
    return ak.prev ? this.getPrevAccKey(ak.prev) : undefined ;
  }


  // Boucle sur tous les éléments (sans retour)
  each(traverseMethod: (item: T) => void){
    this.eachSince(traverseMethod, this.firstItem.id);
  }

  // Boucle depuis l'élément d'identifiant +id+
  eachSince(
    traverseMethod: (item: T) => any,
    id: string 
  ){
    let item: T | undefined = this.get(id);
    do {
      if ( item ) {
        traverseMethod(item);
        item = this.getNextItem(item.id);
      } else { break ;}
    } while ( item ); 
  }

  /**
   * Boucle sur toutes les AcceedableItem (AccKey/ak)
   */
  eachAccKey(fnEach: (ak: AccedableItem) => void ) {
    this.keysMap.forEach(fnEach);
  }

  /**
   * Boucle sur tous les items à partir de l'item d'id +id+ en
   * collectant une donnée quelconque.
   */
  mapSince(
    traverseMethod: (item: T) => any,
    id: string 
  ): any[] {
    const collected = [];
    let item: T | undefined = this.get(id);
    do {
      if ( item ) {
        let retour: any = traverseMethod(item);
        collected.push(retour);
        item = this.getNextItem(item.id);
      } else { break ;}
    } while ( item );
    return collected;
  }
  // Boucle sur TOUTES les données en collectant une donnée
  map(
    traverseMethod: (item: T) => any
  ): any[] {
    return this.mapSince(traverseMethod, this.firstItem.id);
  }

  /**
   * Méthode qui boucle sur tous les éléments depuis l'élément d'id
   * +itemId+ et retourne une Map avec en clé l'identifiant de
   * l'item et en valeur la valeur retournée par la méthode
   * +traverseMethod+
   */
  collectSince(
    traverseMethod: (item: T) => any,
    itemId: string 
  ): Map<string, any> {
    const collected: Map<string, any> = new Map() ;
    let item: T | undefined = this.get(itemId);
    do {
      if ( item ) {
        let retour: any = traverseMethod(item);
        collected.set(item.id, retour);
        item = this.getNextItem(item.id);
      } else { break ;}
    } while ( item );
    return collected;
  }
  // Boucle sur tous les éléments en récoltant une valeur qu'on met
  // dans une Map qui a en clé l'identifiant de l'item
  collect(traverseMethod: (item: T) => any): Map<string, any> {
    return this.collectSince(traverseMethod, this.firstItem.id);
  }
 
 /**
  * Boucle sur les items, depuis l'item d'identifiant +id+ ou depuis le premier et 
  * retourne le premier qui répond à la condition +condition+
  */ 
  find(
    condition: (item: T) => boolean, 
  ): T | undefined {
    return this.findAfter(condition, undefined);
  }
  
  findAfter(
    condition: (item: T) => boolean,
    id: string | undefined
  ) {
    let item: T | undefined ;
    if ( id === undefined ) {
      item = this.firstItem ;
    } else {
      item = this.getNextItem(id);
    }
    let found: T | undefined ;
    do {
      if ( item ) {
        if (condition(item) === true ) { 
          found = item;
          break ;
        }
        item = this.getNextItem(item.id);
      }
    } while ( item ); 
    return found ; 
  }
  
  /**
   * Recherche dans l'ordre tous les éléments répondant à la condition +condition+
   * 
   * @param condition Methode qui doit retourner true pour que l'item soit retenu
   * @param options   Table d'options {count: nombre attendu} 
   * @returns 
   */
  findAll(condition: (item: T) => boolean, options: {[k:string]: any}){
    return this.findAllAfter(condition, undefined, options);
  }

  // Idem que précédente mais permet de spécifier le premier élément
  findAllAfter(
    condition: (item: T) => boolean,
    id: string | undefined,
    options: {[k:string]: any}
  ) {
    const collected: T[] = [];
    let collected_count = 0;

    let item: T | undefined ;
    if ( id === undefined ) {
      item = this.firstItem;
    } else {
      item = this.getNextItem(id);
    }
    do {
      if ( item ) {
        if (condition(item) === true ) { 
          collected.push(item);
          collected_count ++ ;
          if ( options.count && collected_count === options.count) { break ;}
        }
        item = this.getNextItem(item.id);
      }
    } while ( item ); 
    return collected ; 
  }

  /**
   * Peuplement de la table d'accès avec création des 'chainedItem'
   * 
   * @param items Les éléments transmis, tels que relevés dans les tables (Entry, Oeuvre, Exemple);
   */
  // Méthode qui "initie" la table d'accès en transformant chaque
  // item (Entry, Oeuvre, Exemple) en un AccedableItem, en prenant
  // son index et son index suivant pour les mettres dans la Map
  // qui consignes les valeurs d'accès
  populateInTable(items: T[]) {
    this.keysMap = new Map();
    this.arrayItems = [];
    for (let i: number = 0, len = items.length; i < len; ++i) {
      const item = items[i];
      const nextItem = items[i + 1] || undefined;
      const prevItem = items[i - 1] || undefined;
      this.addInTable(item, i, nextItem, prevItem);
    }
  }

  // Insertion séparée pour pouvoir ajouter en cours de travail
  addInTable(item: T, arrayIndex:number, nextItem: T | undefined, prevItem: T | undefined) {
    const chained: AccedableItem = {
      type: 'accedable-item',
      id: item.id,
      obj: undefined,
      index: arrayIndex,
      next: nextItem ? nextItem.id : undefined,
      prev: prevItem ? prevItem.id : undefined,
      visible: true,
      display: 'block',
      selected: false,
      modified: false
    };
     // console.log("[POPULATE ACCESSTABLE] ak = ", chained);
    this.keysMap.set(item.id, chained);
    this.arrayItems.push(item);
  }

  DOMElementOf(id: string) {
    return document.querySelector(`main#items > div[data-id="${id}"]`) as HTMLDivElement;
  }
}