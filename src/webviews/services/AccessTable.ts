/**
 * Grande classe qui permet de parcourir très vite les éléments en
 * sachant s'ils sont visibles, sélectionnés, etc.
 * 
 * La class AccessTable<T> fonctionne avec deux éléments principaux :
 * 
 *  arrayItems :  une simple Array des éléments mis les uns au bouts 
 *                des autres. Tous les ajouts se mettront au bout de
 *                la liste. Donc, dans cette liste, des Entry, Oeuvre
 *                et Exemple. Ce sont les valeurs retournées par la
 *                plupart des méthodes API.
 *  keysMap:      Une Map qui consigne en clé l'identifiant de
 *                l'élément et en valeur un type AcceedItem qui con-
 *                signe : l'index de l'élément dans arrayItems,
 *                l'index de l'élément suivant et précédent, pour des
 *                boucles dans les deux sens, ainsi que l'état de 
 *                l'élément (visible, selected, modified, etc.)
 *                Usage interne pour relier le tableau ArrayItems
 *                Noter que cette table consigne aussi l'état courant
 *                des éléments au niveau de leur visibilité et leur
 *                sélection, afin de permettre une gestion plus rapi-
 *                sans avoir à passer par l'item lui-même.
 * 
 * MÉTHODES
 * 
 *  .find(method): AnyElementType
 *      Retourne le premier élément qui répond positivement à +method+
 *  .findAfter(method, id): AnyElementType | undefined
 *      Idem que précédente, mais à partir de +id+ NON compris
 *  .findAll(method): AnyElementType[]
 *      Retourne tous les éléments qui répondent à +method+ par true
 *  .findAllAfter(method, id): AnyElementType[]
 *      Idem que précédente, mais à partir de +id+ NON compris
 *  .each(method): void
 *      Boucle sur tous les éléments en appliquant la méthode +method+
 *  .eachSince(method, id): void
 *      Idem que la précédente, mais à partir de l'élément +id+ compris
 *  .map(method): Array
 *      Boucle sur tous les éléments en collectant dans un tableau le
 *      retour de la méthode +method+
 *  .mapSince(method, id): Array
 *      Idem que précédente mais à partir de l'élément +id+ compris
 *  .collect(method): Map
 *      Boucle sur tous les éléments en collectant le retour de la
 *      méthode +method+ et en le mettant dans une Map avec en clé
 *      l'identifiant de l'item concerné.
 *  .collectSince(method, id): Map
 *      Idem que précédente mais à partir de l'élément +id+ compris.
 *  .selectNextItem(selection)
 *  .selectPrevItem(selection)
 *      Permet de sélectionner l'item suivant ou précédent.
 */
import { AnyElementClass, AnyElementType } from "../models/AnyClientElement";
import { Entry } from "../models/Entry";
import { Exemple } from "../models/Exemple";
import { Oeuvre } from "../models/Oeuvre";
import { PanelClient } from "../PanelClient";

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

type AnyAccParam = string | number | Entry | Oeuvre | Exemple | AccedableItem ;

export class AccessTable<T extends Entry | Oeuvre | Exemple> {
  keysMap: Map<string, AccedableItem> = new Map();
  arrayItems: T[] = [];
  _size!: number | null ;

  constructor(
    private klass: AnyElementClass, 
    items: T[]
  ) {
    this.populateInTable(items);
  }
  
  // après un ajout ou une suppression, par exemple
  reset(){
    this._size = null;
  }

  get size(){ return this._size || (this._size = this.keysMap.size);}

  isVisible(id: string) { return this.getAccKeyById(id).visible === true ;}
  setVisibility(id: string, state: boolean) {
    const ak = this.getAccKeyById(id);
    if ( ak.visible !== state ) {
      // <= L'état change => Il faut le changer dans la donnée et le DOM
      ak.visible = state;
      if ( ak.obj === undefined ) { ak.obj = this.DOMElementOf(id) ; }
      const display = state ? 'block' : 'none';
      ak.display = display ;
      ak.obj.style.display = display ;
    }
  }

  selectNextItem(panel: PanelClient<any, any>): void {
    const selection = panel.getSelection();
    let nextId: string | undefined ;
    if ( selection ) {
      let nextItemVisible: AnyElementType | undefined;
      nextItemVisible = this.getNextVisibleById(selection);
      if ( nextItemVisible ) { nextId = nextItemVisible.data.id ; }
    }
    nextId = nextId || this.firstItem.data.id;
    panel.select(nextId);
  }
  selectPrevItem(panel: PanelClient<any, any>): void {
    const selection = panel.getSelection();
    let prevId: string | undefined;
    if ( selection ) {
      let prevItemVisible: AnyElementType | undefined ;
      prevItemVisible = this.getPrevVisibleById(selection);
      if ( prevItemVisible ) { prevId = prevItemVisible.data.id ;}
    }
    prevId = prevId || this.firstItem.data.id;
    panel.select(prevId);
  }


  getNextVisibleById(refId: string): AnyElementType | undefined {
    let ak: AccedableItem | undefined;
    let nextAk: AccedableItem | undefined;
    while (ak = this.getNextAccKeyById(refId)) {
      if (ak.visible) {return this.getById(ak.id);}
    }
  }
  getPrevVisibleById(refId: string): AnyElementType | undefined {
    let ak: AccedableItem | undefined;
    let prevAk: AccedableItem | undefined;
    while (ak = this.getPrevAccKeyById(refId)) {
      if (ak.visible) {return this.getById(ak.id);}
    }
  }

  setSelectState(id: string, state: boolean) {
    this.getAccKeyById(id).selected = state;
  }

  traverseAnyTypeWith(
    value: AnyAccParam,
    fnIfId: (id: string) => any | undefined,
    fnIfIndex: (index: number) => any | undefined,
    fnIfAccKey: (accKey: AccedableItem) => any | undefined,
    fnIfItem: (item: Entry | Oeuvre | Exemple) => any | undefined
  ): any {
    switch(typeof value) {
      case 'string': return fnIfId(value);
      case 'number': return fnIfIndex(value);
      case 'object':
        switch(value.type) {
          case 'accedable-item': return fnIfAccKey(value as AccedableItem);
          case 'entry':
          case 'oeuvre':
          case 'exemple': return fnIfItem(value);
        }
    }
  }

  /**
   * Retourne l'item d'identifiant +id+ 
   * 
   * On peut l'obtenir en envoyant l'identifiant (string), l'index dans
   * la liste (number), l'accedable-key (AccedableItem) ou l'item 
   * lui-même.
   */
  get( foo: AnyAccParam ){ 
    return this.traverseAnyTypeWith(
      foo,
      this.getById.bind(this),
      this.getByIndex.bind(this),
      this.getByAccKey.bind(this),
      (foo: Entry | Oeuvre | Exemple) => { return foo ; }
    );
  }
  // @return true si l'élément d'identifiant +id+ existe.
  existsById(id: string): boolean { return this.keysMap.has(id); }

  getById(id: string): T { return this.arrayItems[(this.keysMap.get(id) as AccedableItem).index]; }
  getByIndex(index: number): T { return this.arrayItems[index]; }
  getByAccKey(ak: AccedableItem): T { return this.getById(ak.id); }

  /**
   * Retourne l'objet DOM de l'item en s'assurant qu'il est défini
   * dans l'AccKey (ce qui n'est pas fait par défaut)
   */
  getObj(id: string): HTMLDivElement {
    const ak = this.getAccKeyById(id);
    if ( ! ak ) {
      console.error("Impossible d'obtenir l'AK de l'id '%s'…", id, this.arrayItems);
    }
    ak.obj || Object.assign(ak, { obj: this.DOMElementOf(id)});
    if ( ! ak.obj ) {
      console.error("Impossible d'obtenir l'objet de l'item '%'…", id);
    }
    return ak.obj as HTMLDivElement;
  }
  /**
   *  Retourne l'accKey de l'élément foo
   * TODO : doit fonctionner pour tout élément (cf. getNextAccKey)
   */
  getAccKey( foo: AnyAccParam ) {
    return this.traverseAnyTypeWith(
      foo,
      this.getAccKeyById.bind(this),
      this.getAccKeyByIndex.bind(this),
      (foo: AccedableItem) => { return foo ; },
      this.getAccKeyByItem.bind(this)
    );
  }
  getAccKeyById(itemId: string): AccedableItem { return this.keysMap.get(itemId) as AccedableItem ; }
  getAccKeyByIndex(index: number): AccedableItem { return this.getAccKeyById(this.getByIndex(index).data.id) ; }
  getAccKeyByItem(item: Entry | Oeuvre | Exemple): AccedableItem { return this.getAccKeyById(item.data.id);}

  /**
   *  Retourne l'Item (Entry, Oeuvre, Exemple) de l'élément foo
   */
  getNextItem( foo: AnyAccParam ) {
    return this.traverseAnyTypeWith(
      foo,
      this.getNextItemById.bind(this),
      this.getNextItemByIndex.bind(this),
      this.getNextItemByAccKey.bind(this),
      this.getNextItemByItem.bind(this)
    );
  }
  getNextItemById(id: string): T | undefined {
    const nextAK = this.getNextAccKeyById(id);
    return nextAK ? this.getById(nextAK.id) : undefined ;
  }
  getNextItemByIndex(index: number): T | undefined {
    return this.getNextItemById(this.arrayItems[index].data.id);
  }
  getNextItemByAccKey(ak: AccedableItem) : T | undefined {
    return ak.next ? this.getById(ak.next) : undefined ;
  }
  getNextItemByItem(item: Entry | Oeuvre | Exemple) : T | undefined {
    return this.getNextItemById(item.data.id);
  }

  /**
   *  Retourne l'Item (Entry, Oeuvre, Exemple) qui suit l'élément
   * défini par +foo+ qui peut être l'id, l'index, l'accessKey
   * {AccedableItem} ou l'item lui-mêmeK
   */
  getPrevItem( foo: AnyAccParam ) {
    return this.traverseAnyTypeWith(
      foo,
      this.getPrevItemById.bind(this),
      this.getPrevItemByIndex.bind(this),
      this.getPrevItemByAccKey.bind(this),
      this.getPrevItemByItem.bind(this)
    );
  }
  getPrevItemById(id: string): T | undefined {
    const prevAK = this.getPrevAccKeyById(id);
    return prevAK ? this.getById(prevAK.id) : undefined ;
  }
  getPrevItemByIndex(index: number): T | undefined {
    return this.getPrevItemById(this.arrayItems[index].data.id);
  }
  getPrevItemByAccKey(ak: AccedableItem) : T | undefined {
    return ak.prev ? this.getById(ak.prev) : undefined ;
  }
  getPrevItemByItem(item: Entry | Oeuvre | Exemple) : T | undefined {
    return this.getPrevItemById(item.data.id);
  }


  /**
   *  Retourne l'accedableKey {AccedableItem} de l'élément désigné
   * par +foo+ qui peut être l'identifiant, l'index, l'access-key ou
   * l'item lui-même de l'item de référence. 
   *
   * Note : la version LA PLUS RAPIDE (O)1 consiste à fournir l'IDENTIFIANT
   * 
   */
  getNextAccKey(
    foo: AnyAccParam,
  ) {
    return this.traverseAnyTypeWith(
      foo,
      this.getNextAccKeyById.bind(this),
      this.getNextAccKeyByIndex.bind(this),
      this.getNextAccKeyByAccKey.bind(this),
      this.getNextAccKeyByItem.bind(this)
    );
  }
  getNextAccKeyById(id: string): AccedableItem | undefined {
    const ak = this.getAccKey(id);
    return ak.next ? this.getAccKey(ak.next) : undefined;
  }
  getNextAccKeyByIndex(index: number): AccedableItem | undefined {
    return this.getNextAccKeyById(this.arrayItems[index].data.id);
  }
  getNextAccKeyByAccKey(ak: AccedableItem): AccedableItem | undefined {
    return ak.next ? this.getNextAccKeyById(ak.next) : undefined ;
  }
  getNextAccKeyByItem(item: AnyElementType): AccedableItem | undefined {
   return this.getNextAccKeyById(item.data.id); 
  }
  
  /**
   * Retourne l'AccessKey {AccedableItem} précédent de l'élément 
   * désigné par +foo+ qui peut être l'id, l'index, l'access-key ou
   * l'item lui-même de l'élément.
   */
  getPrevAccKey(
    foo: AnyAccParam,
  ) {
    return this.traverseAnyTypeWith(
      foo,
      this.getPrevAccKeyById.bind(this),
      this.getPrevAccKeyByIndex.bind(this),
      this.getPrevAccKeyByAccKey.bind(this),
      this.getPrevAccKeyByItem.bind(this)
    );
  }
  getPrevAccKeyById(id: string): AccedableItem | undefined {
    const ak = this.getAccKey(id);
    return ak.prev ? this.getAccKey(ak.prev) : undefined;
  }
  getPrevAccKeyByIndex(index: number): AccedableItem | undefined {
    return this.getPrevAccKeyById(this.arrayItems[index].data.id);
  }
  getPrevAccKeyByAccKey(ak: AccedableItem): AccedableItem | undefined {
    return ak.prev ? this.getPrevAccKeyById(ak.prev) : undefined ;
  }
  getPrevAccKeyByItem(item: AnyElementType): AccedableItem | undefined {
   return this.getPrevAccKeyById(item.data.id); 
  }
 

  // Boucle sur tous les éléments (sans retour)
  each(traverseMethod: (item: T) => void){
    this.eachSince(traverseMethod, this.firstItem.data.id);
  }

  // Boucle depuis l'élément d'identifiant +id+
  eachSince(
    traverseMethod: (item: T) => any,
    id: string 
  ){
    let item: T | undefined = this.getById(id);
    do {
      if ( item ) {
        traverseMethod(item);
        item = this.getNextItemById(item.data.id);
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
    let item: T | undefined = this.getById(id);
    do {
      if ( item ) {
        let retour: any = traverseMethod(item);
        collected.push(retour);
        item = this.getNextItemById(item.data.id);
      } else { break ;}
    } while ( item ); 
    return collected;
  }
  // Boucle sur TOUTES les données en collectant une donnée
  map(
    traverseMethod: (item: T) => any
  ): any[] {
    return this.mapSince(traverseMethod, this.firstItem.data.id);
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
    let item: T | undefined = this.getById(itemId);
    do {
      if ( item ) {
        let retour: any = traverseMethod(item);
        collected.set(item.data.id, retour);
        item = this.getNextItemById(item.data.id);
      } else { break ;}
    } while ( item ); 
    return collected;
  }
  // Boucle sur tous les éléments en récoltant une valeur qu'on met
  // dans une Map qui a en clé l'identifiant de l'item
  collect(traverseMethod: (item: T) => any): Map<string, any> {
    return this.collectSince(traverseMethod, this.firstItem.data.id);
  }
 

  /**
   * Retourne le premier item. Par convention, c'est le premier
   * de la liste.
   */
  get firstItem(): T { return this.arrayItems[0]; }


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
      item = this.getNextItemById(id);
    }
    let found: T | undefined ;
    do {
      if ( item ) {
        if (condition(item) === true ) { 
          found = item;
          break ;
        }
        item = this.getNextItemById(item.data.id);
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
      item = this.getNextItemById(id);
    }
    do {
      if ( item ) {
        if (condition(item) === true ) { 
          collected.push(item);
          collected_count ++ ;
          if ( options.count && collected_count === options.count) { break ;}
        }
        item = this.getNextItemById(item.data.id);
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
      const chained: AccedableItem = {
        type: 'accedable-item',
        id: item.data.id,
        obj: undefined,
        index: i, 
        next: nextItem ? nextItem.data.id : undefined,
        prev: prevItem ? prevItem.data.id : undefined,
        visible: true,
        display: 'block',
        selected: false,
        modified: false
      } ;
      // console.log("[POPULATE ACCESSTABLE] ak = ", chained);
      this.keysMap.set(item.data.id, chained);
      this.arrayItems.push(item);
    }
  }
  DOMElementOf(id: string) {
    return document.querySelector(`main#items > div[data-id="${id}"]`) as HTMLDivElement;
  }
}